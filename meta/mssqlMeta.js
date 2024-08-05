const mssqlConfig = require("../config/mssql_db");
const sql = require("mssql");

// Class to handle MSSQL metadata and operations
class MssqlMeta {
  constructor(poolSwitch) {
    this.poolSwitch = poolSwitch;
    this.pool = mssqlConfig.getPool(poolSwitch);
  }

  // Static method to map database type (dbType) to MSSQL data types
  static sqlTypeFromDb(dbType) {
    if (!dbType) {
      throw new Error("Database type (dbType) cannot be null or undefined");
    }

    const typeMapping = {
      int: sql.Int,
      bigint: sql.BigInt,
      smallint: sql.SmallInt,
      tinyint: sql.TinyInt,
      bit: sql.Bit,
      varchar: sql.VarChar(sql.MAX),
      nvarchar: sql.NVarChar(sql.MAX),
      char: sql.Char,
      nchar: sql.NChar,
      text: sql.Text,
      ntext: sql.NText,
      binary: sql.Binary,
      varbinary: sql.VarBinary,
      image: sql.Image,
      uniqueidentifier: sql.UniqueIdentifier,
      date: sql.Date,
      datetime: sql.DateTime,
      smalldatetime: sql.SmallDateTime,
      datetime2: sql.DateTime2,
      datetimeoffset: sql.DateTimeOffset,
      time: sql.Time,
      float: sql.Float,
      real: sql.Real,
      decimal: sql.Decimal,
      numeric: sql.Numeric,
      money: sql.Money,
      smallmoney: sql.SmallMoney,
      boolean: sql.Bit, // use sql.Bit for boolean types
      barcode: sql.VarChar(sql.MAX), // new case for barcode, mapped to varchar
    };

    const lowerDbType = dbType.toLowerCase();
    const sqlType = typeMapping[lowerDbType];

    if (!sqlType) {
      return sql.NVarChar; // default to sql.NVarChar for unknown types
    }

    return sqlType;
  }

  // Ensure the pool is connected
  async ensureConnected() {
    await mssqlConfig.ensureConnected(this.pool);
  }

  // Helper method to execute a query with inputs
  async executeQuery(query, inputs) {
    // Ensure the pool is connected before executing the query
    await this.ensureConnected();
    const request = this.pool.request();

    // Bind inputs to the request
    inputs.forEach(({ name, type, value }) => {
      request.input(name, type, value);
    });

    // Execute the query and return the result
    return request.query(query);
  }

  // Fetch column types for specified columns from the database
  async getColumnTypes(columns, tableName) {
    // Ensure the pool is connected
    await this.ensureConnected();

    if (columns.length === 0) {
      console.warn("No columns specified. Skipping column type fetching.");
      return {};
    }

    const columnTypes = {};

    try {
      const query = `
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = @tableName
          AND COLUMN_NAME IN (${columns.map((col) => `'${col}'`).join(", ")})
      `;

      // Execute the query to fetch column types
      const result = await this.executeQuery(query, [
        { name: "tableName", type: sql.NVarChar, value: tableName },
      ]);

      // Map column names to their data types
      result.recordset.forEach((row) => {
        columnTypes[row.COLUMN_NAME] = row.DATA_TYPE.toLowerCase();
      });

      // Ensure all requested columns have an entry in the result
      columns.forEach((col) => {
        if (!columnTypes[col]) {
          columnTypes[col] = "Undefined";
        }
      });
    } catch (err) {
      console.error("Error fetching column types:", err.message);
      throw err;
    }

    return columnTypes;
  }

  // Retrieve query parameters for predefined queries
  async getQueryParams(predefinedQueries, paramColumnMapping) {
    if (!Array.isArray(predefinedQueries)) {
      throw new Error("predefinedQueries must be an array");
    }

    // Extract unique query parameters from predefinedQueries
    const columns = predefinedQueries.reduce((acc, { params: queryParams }) => {
      queryParams?.forEach((param) => {
        const columnName = paramColumnMapping[param];
        if (columnName && !acc.includes(columnName)) {
          acc.push(columnName);
        }
      });
      return acc;
    }, []);

    const tableName = predefinedQueries[0].tableName;
    const columnTypes = await this.getColumnTypes(columns, tableName);

    // Construct params object mapping each parameter to its type and marking it as required
    const params = {};
    predefinedQueries.forEach(({ params: queryParams }) => {
      queryParams?.forEach((param) => {
        const columnName = paramColumnMapping[param];
        const type = columnTypes[columnName] || "Undefined";
        params[param] = {
          type:
            type === "Undefined" && columnName === "barcode" ? "barcode" : type,
          required: true,
        };
      });
    });

    return params;
  }

  // Get suggestions based on predefined queries and input parameters
  async getSuggestions(predefinedQueries, params) {
    const { param, input } = params;
    if (!param || !input) {
      throw new Error(
        "Parameters 'param' and 'input' are required for suggestions"
      );
    }

    // Find the query object that matches the suggestion parameter
    const queryObject = predefinedQueries.find(
      (q) => q.suggestionParam === param
    );
    if (!queryObject) {
      throw new Error(`No suggestion query found for parameter: ${param}`);
    }

    // Ensure the pool is connected before fetching suggestions
    await this.ensureConnected();

    try {
      // Execute the suggestion query
      const result = await this.executeQuery(queryObject.suggestionQuery, [
        { name: "input", type: sql.NVarChar, value: input },
      ]);

      // Return the suggestions as an array of values
      return result.recordset.map((row) => row[queryObject.suggestionParam]);
    } catch (err) {
      console.error("Error fetching suggestions:", err.message);
      throw err;
    }
  }

  // Run a query with pagination
  async runQuery(params, pageNumber, pageSize, predefinedQueries) {
    try {
      const { query, params: queryParams } = predefinedQueries[0];
      const queryValues = queryParams.map((param) => params[param]);
      const offset = (pageNumber - 1) * pageSize;
      const paginatedQuery = `${query} ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;

      // Ensure the pool is connected before executing the query
      await this.ensureConnected();

      // Bind parameters to the request
      const inputs = queryParams.map((param, index) => ({
        name: param,
        type: sql.NVarChar,
        value: queryValues[index],
      }));
      // Execute the paginated query
      const results = await this.executeQuery(paginatedQuery, inputs);
      console.log(`Query returned ${results.recordset.length} rows`);

      return results.recordset;
    } catch (err) {
      console.error("MS SQL Server Error:", err.sqlMessage);
      return {
        data: null,
        error: {
          message: err.message,
          sqlState: err.sqlState,
          errno: err.errno,
          code: err.code,
          sqlMessage: err.sqlMessage,
        },
      };
    }
  }
  // Run a report with pagination
  async runReport(
    predefinedQueries,
    paramColumnMapping,
    params,
    tableName,
    pageNumber = 1,
    pageSize = 10
  ) {
    // Ensure predefinedQueries is an array
    if (!Array.isArray(predefinedQueries)) {
      throw new Error("predefinedQueries must be an array");
    }

    try {
      // Retrieve query parameters and their types for all predefined queries
      const queryParams = await this.getQueryParams(
        predefinedQueries,
        paramColumnMapping
      );

      // Fetch the column types for the specified table and parameters
      const paramTypes = await this.getColumnTypes(
        Object.keys(queryParams),
        tableName
      );
      // Calculate the offset for pagination
      const offset = (pageNumber - 1) * pageSize;

      // Execute all predefined queries with pagination
      const results = await Promise.all(
        predefinedQueries.map(async ({ query, params: queryParams }) => {
          // Check if the query is defined
          if (!query) throw new Error("Query is undefined");

          // Ensure the pool is connected before executing the query
          await this.ensureConnected();

          // Create a new request from the pool
          const request = this.pool.request();

          // Match parameters in the query (e.g., @param)
          const matches = query.match(/@[a-zA-Z0-9]+/g);

          // Bind each matched parameter to the request with its type and value
          if (matches) {
            matches.forEach((param) => {
              const paramName = param.substring(1); // Remove the '@' prefix
              let dbType = paramTypes[paramName] || sql.NVarChar; // Default to sql.NVarChar if type is not found
              dbType = MssqlMeta.sqlTypeFromDb(dbType); // Convert to MSSQL type

              const paramValue = params[paramName]; // Get the parameter value from the provided params
              if (paramValue === undefined) {
                throw new Error(
                  `Parameter '${paramName}' is required but was not provided.`
                );
              }
              // Add the parameter to the request
              request.input(paramName, dbType, paramValue.toString());
            });
          }
          // Modify the query to include pagination
          const paginatedQuery = `${query} ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
          // Execute the paginated query and return the result
          return request.query(paginatedQuery);
        })
      );

      // Flatten the results from all executed queries into a single array
      const recordSets = results.map((result) => result.recordset);
      const flattenedRecordSets = recordSets.flat();

      // Log the number of rows returned by the report
      console.log(`Report returned ${flattenedRecordSets.length} rows`);
      // Return the flattened record sets
      return { data: flattenedRecordSets };
    } catch (err) {
      // Log and throw the error if any operation fails
      console.error("Error in runReport:", err.message);
      throw err;
    }
  }
}

module.exports = MssqlMeta;
