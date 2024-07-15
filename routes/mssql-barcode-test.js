const { pool2, sql } = require('../config/mssql_db');

//predefined queries
const predefinedQueries = [
  {
    suggestionParam: "BIDNR",
    suggestionQuery:
      "SELECT DISTINCT BIDNR FROM BEHAELTER WHERE BIDNR LIKE @input + '%'",
    params: ["BIDNR"],
    query:
      "SELECT * FROM BEHAELTER WHERE BIDNR = @BIDNR",
    tableName: "BEHAELTER",
  },
];

//mapping parameter names to column names
const paramColumnMapping = {
  BIDNR: "BIDNR",
};

// Function to check if the scanned barcode exists in the database
async function checkBarcode(barcode) {
  try {
    const pool = pool2;
    const request = pool.request();
    const queryObject = predefinedQueries.find(
      (q) => q.suggestionParam === "BIDNR"
    );
    if (!queryObject) {
      throw new Error(`No query found for parameter: BIDNR`);
    }
    request.input("BIDNR", sql.NVarChar, barcode);
    const result = await request.query(queryObject.query);
    return result.recordset.length > 0 ? result.recordset : null;
  } catch (err) {
    console.error("Database query error:", err);
    throw err;
  }
}


//startDate is default set to the first day of the previous month
const now = new Date();
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const startDate = lastMonth.toISOString().split("T")[0]; //format as "YYYY-MM-DD"

//function to map database type (dbType) to mssql data types
function sqlTypeFromDb(dbType) {
  if (!dbType) {
    throw new Error(`Database type (dbType) cannot be null or undefined`);
  }
  const lowerDbType = dbType.toLowerCase();
  switch (lowerDbType) {
    case "int":
      return sql.Int;
    case "bigint":
      return sql.BigInt;
    case "smallint":
      return sql.SmallInt;
    case "tinyint":
      return sql.TinyInt;
    case "bit":
      return sql.Bit;
    case "varchar":
      return sql.VarChar(sql.MAX);
    case "nvarchar":
      return sql.NVarChar(sql.MAX);
    case "char":
      return sql.Char;
    case "nchar":
      return sql.NChar;
    case "text":
      return sql.Text;
    case "ntext":
      return sql.NText;
    case "binary":
      return sql.Binary;
    case "varbinary":
      return sql.VarBinary;
    case "image":
      return sql.Image;
    case "uniqueidentifier":
      return sql.UniqueIdentifier;
    case "date":
      return sql.Date;
    case "datetime":
      return sql.DateTime;
    case "smalldatetime":
      return sql.SmallDateTime;
    case "datetime2":
      return sql.DateTime2;
    case "datetimeoffset":
      return sql.DateTimeOffset;
    case "time":
      return sql.Time;
    case "float":
      return sql.Float;
    case "real":
      return sql.Real;
    case "decimal":
      return sql.Decimal;
    case "numeric":
      return sql.Numeric;
    case "money":
      return sql.Money;
    case "smallmoney":
      return sql.SmallMoney;
    case "boolean":
      return sql.Bit; //use sql.Bit for boolean types
    case "barcode":
      return sql.VarChar(sql.MAX); // new case for barcode, mapped to varchar
    default:
      console.warn(`Unknown dbType: ${dbType}. Defaulting to sql.NVarChar.`);
      return sql.NVarChar; // default to sql.NVarChar for unknown types
  }
}

// Function to fetch column types for specified columns from the database
async function getColumnTypes(columns, tableName) {
  const columnTypes = {};

  if (columns.length === 0) {
    console.warn(`No columns specified. Skipping column type fetching.`);
    return columnTypes;
  }

  try {
    const pool = pool2;

    // Fetch column types from INFORMATION_SCHEMA.COLUMNS
    for (let col of columns) {
      const query = `
        SELECT DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = @tableName
          AND COLUMN_NAME = @columnName
      `;
      const request = pool.request();
      request.input("tableName", sql.NVarChar, tableName);
      request.input("columnName", sql.NVarChar, col);

      // Execute the query to fetch column types
      const result = await request.query(query);
      if (result.recordset.length > 0) {
        const dbType = result.recordset[0].DATA_TYPE;
        columnTypes[col] = dbType.toLowerCase();
      } else {
        console.warn(`Column '${col}' not found in table '${tableName}'.`);
        columnTypes[col] = "Undefined";
      }
    }

    console.log("Fetched column types:", columnTypes);
    return columnTypes;
  } catch (err) {
    console.error("Error fetching column types:", err.message);
    throw err;
  }
}

// Function to retrieve query parameters for predefined queries
async function getQueryParams() {
  // Extract unique query parameters from predefinedQueries
  const columns = predefinedQueries.reduce((acc, { params: queryParams }) => {
    queryParams &&
      queryParams.forEach((param) => {
        const columnName = paramColumnMapping[param];
        if (columnName && !acc.includes(columnName)) {
          acc.push(columnName);
        }
      });
    return acc;
  }, []);

  // Assume all queries use the same table
  const tableName = predefinedQueries[0].tableName;
  // Fetch column types for the extracted columns
  const columnTypes = await getColumnTypes(columns, tableName);
  // Construct params object mapping each parameter to its type and marking it as required
  const params = {};
  predefinedQueries.forEach(({ params: queryParams }) => {
    queryParams &&
      queryParams.forEach((param) => {
        const columnName = paramColumnMapping[param];
        if (columnTypes[columnName]) {
          params[param] = {
            type: columnTypes[columnName],
            required: true,
          };
        } else {
          // Handle case where column type is not found
          params[param] = {
            type: "Undefined",
            required: true,
          };
        }
      });
  });
  return params;
}

async function getSuggestions(params) {
  try {
    const { param, input } = params;
    // Validate required parameters
    if (!param || !input) {
      throw new Error(
        "Parameters 'param' and 'input' are required for suggestions"
      );
    }
    // Find the corresponding query object based on the provided parameter
    const queryObject = predefinedQueries.find(
      (q) => q.suggestionParam === param
    );
    // Throw an error if no suggestion query object is found for the parameter
    if (!queryObject) {
      throw new Error(`No suggestion query found for parameter: ${param}`);
    }
    // Extract the suggestion query from the query object
    const query = queryObject.suggestionQuery;

    // Connect to MSSQL db
    const pool = pool2;
    const request = pool.request();

    // Bind input parameter for the suggestion query
    request.input("input", sql.NVarChar, input);

    // Execute the suggestion query and retrieve results
    const result = await request.query(query);

    // Extract suggestions from the query result
    const suggestions = result.recordset.map(
      (row) => row[queryObject.suggestionParam]
    );

    return suggestions;
  } catch (err) {
    console.error(err);
    throw new Error(err.message);
  }
}

async function runQuery(params, pageNumber = 1, pageSize = 10) {
  try {
    // Extract query and its expected parameters from predefinedQueries
    const { query, params: queryParams } = predefinedQueries[0];

    // Map query parameters to query values
    const queryValues = queryParams.map((param) => params[param]);

    // Pagination logic
    const offset = (pageNumber - 1) * pageSize;

    // Update query to include pagination
    const paginatedQuery = `${query} ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;

    const pool = pool2;
    const request = pool.request();

    // Bind parameters
    queryParams.forEach((param, index) => {
      request.input(param, sql.NVarChar, queryValues[index]);
    });

    const results = await request.query(paginatedQuery);
    console.log(`Query returned ${results.recordset.length} rows`);

    return results.recordset;
  } catch (err) {
    console.error("MS SQL Server Error:", err.sqlMessage);
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

async function runReport(params, pageNumber = 1, pageSize = 10) {
  try {
    const pool = pool2;
    const queryParams = await getQueryParams();
    console.log("Query parameters fetched:", queryParams);

    // Fetch column types for all parameters in 'params'
    const paramTypes = await getColumnTypes(Object.keys(queryParams));
    console.log("Param types fetched:", paramTypes);

    // Pagination logic
    const offset = (pageNumber - 1) * pageSize;

    // Execute all predefined queries concurrently
    const results = await Promise.all(
      predefinedQueries.map(({ query, params: queryParams }) => {
        // Ensure the query is defined
        if (!query) {
          console.error("Query is undefined");
          throw new Error("Query is undefined");
        }

        // Create a new request object for each query execution
        const request = pool.request();

        // Extract parameter placeholders from the query
        const matches = query.match(/@[a-zA-Z0-9]+/g);
        if (matches) {
          matches.forEach((param) => {
            // Extract parameter name from the placeholder
            const paramName = param.substring(1);

            // Determine SQL type for the parameter
            let dbType = paramTypes[paramName];
            if (!dbType) {
              console.warn(
                `Unknown type for parameter '${paramName}'. Defaulting to sql.NVarChar.`
              );
              dbType = sql.NVarChar; // Default to sql.NVarChar if type not found
            } else {
              dbType = sqlTypeFromDb(dbType); // Convert dbType from string to SQL type if necessary
            }

            // Set input parameter for the query execution
            console.log(
              `Setting parameter: ${paramName} with type: ${dbType} and value: ${params[paramName]}`
            );

            // Set the parameter based on its type
            if (
              dbType === sql.Date ||
              dbType === sql.DateTime ||
              dbType === sql.SmallDateTime
            ) {
              // Handle Date types separately
              request.input(paramName, dbType, params[paramName]);
            } else {
              // Handle other types including default sql.NVarChar
              request.input(paramName, dbType, params[paramName].toString());
            }
          });
        }

        // Update query to include pagination
        const paginatedQuery = `${query} ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;

        // Execute the query with the prepared parameters
        return request.query(paginatedQuery);
      })
    );

    // Extract recordsets from query results and flatten them
    const recordSets = results.map((result) => result.recordset);
    const flattenedRecordSets = recordSets.flat();

    console.log(`Report returned ${flattenedRecordSets.length} rows`);

    // Return data property with the flattened recordsets
    return { data: flattenedRecordSets };
  } catch (err) {
    // Handle and log any errors that occur during query execution
    console.error("Error in runReport:", err);
    throw new Error(err.message);
  }
}


module.exports = { runQuery, runReport, getQueryParams, getSuggestions, checkBarcode };
