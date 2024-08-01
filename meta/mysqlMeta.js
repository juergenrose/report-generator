const mysqlConfig = require("../config/mysql_db");

class MysqlMeta {
  constructor(tableSchema) {
    this.connection = mysqlConfig.getConnection();
    this.tableSchema = tableSchema;
  }

  // Ensure the connection is established
  ensureConnection() {
    mysqlConfig.ensureConnection();
  }

  // Function to get column types from INFORMATION_SCHEMA
  async getColumnTypes(columns, tableName) {
    const columnTypes = {};
    const query = `
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME IN (${columns
        .map(() => "?")
        .join(", ")})
    `;

    try {
      if (!Array.isArray(columns) || columns.length === 0) {
        throw new Error("Columns must be a non-empty array.");
      }

      if (!tableName || !this.tableSchema) {
        throw new Error("Table name and schema must be provided.");
      }

      console.log("Executing getColumnTypes query:", query, [
        this.tableSchema,
        tableName,
        ...columns,
      ]); // log the actual parameters sent to the query
      const results = await this.query(query, [
        this.tableSchema,
        tableName,
        ...columns,
      ]);

      results.forEach((row) => {
        columnTypes[row.COLUMN_NAME] = row.DATA_TYPE;
      });

      if (Object.keys(columnTypes).length === 0) {
        throw new Error(
          "No column types found. Check if the columns exist in the database."
        );
      }
    } catch (err) {
      console.error("Error fetching column types:", err);
      throw err;
    }
    return columnTypes;
  }

  // Function to extract and return query parameters with actual data types
  async getQueryParams(predefinedQueries) {
    const params = {};

    // Extract all column names from predefinedQueries
    const columns = predefinedQueries.reduce((acc, { params: queryParams }) => {
      queryParams.forEach((param) => {
        if (!acc.includes(param)) {
          acc.push(param);
        }
      });
      return acc;
    }, []);

    const tableName = predefinedQueries[0].tableName;
    // Get actual data types of columns
    const columnTypes = await this.getColumnTypes(columns, tableName);

    // Iterate over each predefined query
    predefinedQueries.forEach(({ params: queryParams }) => {
      // Iterate over each parameter in the query
      queryParams.forEach((param) => {
        params[param] = {
          type: columnTypes[param] || "Undefined", // Use actual data type or default to 'Undefined' if not found
          required: true,
        };
      });
    });
    return params;
  }

  // Function to fetch suggestions based on parameters
  async getSuggestions(predefinedQueries, params) {
    try {
      const { param, input } = params; // Extract the parameter to be suggested and input

      if (!param || !input) {
        throw new Error(
          "Parameters 'param' and 'input' are required for suggestions"
        );
      }
      // Find the corresponding query for the param
      const queryObject = predefinedQueries.find(
        (q) => q.suggestionParam === param
      );
      if (!queryObject) {
        throw new Error(`No suggestion query found for parameter: ${param}`);
      }
      const query = queryObject.suggestionQuery;
      const values = [`${input}%`]; // Adjust to match the first character of input

      const results = await this.query(query, values);
      // Extract the suggestions from the result
      const suggestions = results.map((row) => row[param]);

      return suggestions;
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  }

  async runQuery(params, pageNumber, pageSize, predefinedQueries) {
    try {
      // Extract the first query and its expected parameters
      const { query, params: queryParams } = predefinedQueries[0];
      const queryValues = queryParams.map((param) => params[param]);

      // Execute the query with the provided parameters
      const results = await this.query(query, queryValues);

      // Return the combined result rows
      return results;
    } catch (err) {
      console.error("MySQL Error:", err.sqlMessage);
      const error = {
        data: null,
        error: {
          message: err.message,
          sqlState: err.sqlState,
          errno: err.errno,
          code: err.code,
          sqlMessage: err.sqlMessage,
        },
      };
      return error;
    }
  }

  // Function to run the report based on provided parameters
  async runReport(
    predefinedQueries,
    params,
    tableName,
    pageNumber = 1,
    pageSize = 10
  ) {
    try {
      // Extract query parameters
      const queryParams = await this.getQueryParams(predefinedQueries);
      // Validate if the required parameters are present in the req
      const missingParams = Object.keys(queryParams).filter(
        (paramName) => queryParams[paramName].required && !params[paramName]
      );
      // If there are missing required parameters, throw an error
      if (missingParams.length > 0) {
        throw new Error(
          `Missing required parameters: ${missingParams.join(", ")}`
        );
      }
      // Run the query with the correct parameters
      const result = await this.runQuery(
        params,
        pageNumber,
        pageSize,
        predefinedQueries
      );

      return { data: result, parameters: queryParams };
    } catch (err) {
      console.error(`Error handling report for ${tableName}:`, err);
      return { data: null, error: err.message };
    }
  }

  // Helper function to run a query using the connection
  query(query, params) {
    return new Promise((resolve, reject) => {
      this.connection.query(query, params, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }
}

module.exports = MysqlMeta;
