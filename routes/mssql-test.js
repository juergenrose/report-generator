const config = require("../config/mssql_db");
const sql = require("mssql");

//predefined queries
const predefinedQueries = [
  {
    suggestionParam: "StartDate",
    suggestionQuery:
      "SELECT DISTINCT FORMAT(Datum, 'yyyy-MM-dd') AS StartDate FROM Kontrolle WHERE FORMAT(Datum, 'yyyy-MM-dd') LIKE @input + '%'",
    params: [],
    query:
      "SELECT * FROM Kontrolle WHERE Durchfuehrender = @Durchfuehrender AND Datum = @StartDate",
    tableName: "Kontrolle",
  },
  {
    suggestionParam: "EndDate",
    suggestionQuery:
      "SELECT DISTINCT FORMAT(Datum, 'yyyy-MM-dd') AS EndDate FROM Kontrolle WHERE FORMAT(Datum, 'yyyy-MM-dd') LIKE @input + '%'",
    params: [],
    query:
      "SELECT * FROM Kontrolle WHERE Durchfuehrender = @Durchfuehrender AND Datum = @EndDate",
    tableName: "Kontrolle",
  },
  {
    suggestionParam: "Durchfuehrender",
    suggestionQuery:
      "SELECT DISTINCT Durchfuehrender FROM Kontrolle WHERE Durchfuehrender LIKE @input + '%'",
    params: ["Durchfuehrender", "StartDate", "EndDate"],
    query:
      "SELECT * FROM Kontrolle WHERE Durchfuehrender = @Durchfuehrender AND Datum BETWEEN @StartDate AND @EndDate",
    tableName: "Kontrolle",
  },
];

//function to map database type (dbType) to mssql data types
function sqlTypeFromDbType(dbType) {
  if (!dbType) {
    throw new Error(`Database type (dbType) cannot be null or undefined`);
  }
  switch (dbType.toLowerCase()) {
    case "int":
      return sql.Int;
    case "bigint":
      return sql.BigInt;
    case "smallint":
      return sql.SmallInt;
    case "tinyint":
      return sql.TinyInt;
    case "varchar":
      return sql.VarChar(sql.MAX);
    case "nvarchar":
      return sql.NVarChar(sql.MAX);
    case "smalldatetime":
      return sql.SmallDateTime;
    case "datetime":
      return sql.DateTime;
    case "date":
      return sql.Date;
    case "float":
      return sql.Float;
    case "decimal":
      return sql.Decimal;
    default:
      console.error(`Unknown dbType: ${dbType}`);
      throw new Error(`Unknown dbType: ${dbType}`);
  }
}

//function to fetch column types for specified columns from the database
async function getColumnTypes(columns) {
  const columnTypes = {}; //object to store column types grouped by table name

  if (columns.length === 0) {
    console.warn(`No columns specified. Skipping column type fetching.`);
    return columnTypes;
  }

  try {
    //iterate over predefinedQueries to get unique table names
    const tableNames = [...new Set(predefinedQueries.map((q) => q.tableName))];

    //loop through each table name and fetch column types
    for (let tableName of tableNames) {
      //construct SQL query to fetch column names and data types
      const query = `
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = @tableName
          AND COLUMN_NAME IN (${columns
            .map((col, index) => `@col${index}`)
            .join(", ")})
      `;

      /*
      console.log(`Fetching column types for table: ${tableName}`);
      console.log(`Columns: ${columns.join(", ")}`);
      console.log(`Constructed query: ${query}`);
      */

      const pool = await sql.connect(config);
      const request = pool.request();

      //bind parameters for the SQL query
      request.input("tableName", sql.NVarChar, tableName);
      columns.forEach((col, index) => {
        request.input(`col${index}`, sql.NVarChar, col);
      });

      //execute the query to fetch column types
      const result = await request.query(query);

      //process query result to populate columnTypes object
      result.recordset.forEach((row) => {
        if (!columnTypes[tableName]) {
          columnTypes[tableName] = {}; //initialize object for table if not exists
        }
        columnTypes[tableName][row.COLUMN_NAME] = row.DATA_TYPE; // Store column name and data type
      });

      console.log("Fetched column types:", columnTypes);
    }
    return columnTypes;
  } catch (err) {
    console.error("Error fetching column types:", err.message);
    throw err;
  }
}

//function to retrieve query parameters for predefined queries
async function getQueryParams() {
  //extract unique query parameters from predefinedQueries
  const columns = predefinedQueries.reduce((acc, { params: queryParams }) => {
    queryParams &&
      queryParams.forEach((param) => {
        if (!acc.includes(param)) {
          acc.push(param);
        }
      });
    return acc;
  }, []);

  //assume all queries use the same table
  const tableName = predefinedQueries[0].tableName;
  //fetch column types for the extracted columns
  const columnTypes = await getColumnTypes(columns, tableName);
  //construct params object mapping each parameter to its type and marking it as required
  const params = {};
  predefinedQueries.forEach(({ params: queryParams, tableName }) => {
    queryParams &&
      queryParams.forEach((param) => {
        if (columnTypes[tableName] && columnTypes[tableName][param]) {
          //ensure StartDate and EndDate are treated as SmallDateTime types
          if (param === "StartDate" || param === "EndDate") {
            params[param] = {
              type: "Date",
              required: true,
            };
          } else {
            params[param] = {
              type: columnTypes[tableName][param],
              required: true,
            };
          }
        } else {
          //handle case where column type is not found
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
    //validate required parameters
    if (!param || !input) {
      throw new Error(
        "Parameters 'param' and 'input' are required for suggestions"
      );
    }
    //find the corresponding query object based on the provided parameter
    const queryObject = predefinedQueries.find(
      (q) => q.suggestionParam === param
    );
    //throw an error if no suggestion query object is found for the parameter
    if (!queryObject) {
      throw new Error(`No suggestion query found for parameter: ${param}`);
    }
    //extract the suggestion query from the query object
    const query = queryObject.suggestionQuery;

    //connect to MSSQL db
    const pool = await sql.connect(config);
    const request = pool.request();

    //bind input parameter for the suggestion query
    request.input("input", sql.NVarChar, input);

    //execute the suggestion query and retrieve results
    const result = await request.query(query);

    //extract suggestions from the query result
    const suggestions = result.recordset.map(
      (row) => row[queryObject.suggestionParam]
    );
    return suggestions;
  } catch (err) {
    console.error(err);
    throw new Error(err.message);
  }
}

async function runQuery(params) {
  try {
    //extract query and its expected parameters from predefinedQueries
    const { query, params: queryParams } = predefinedQueries[0];

    //map query parameters to query values
    const queryValues = queryParams.map((param) => params[param]);

    //execute the query using db.query method or similar
    const [results] = await db.query(query, queryValues);

    return results;
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

async function runReport(params) {
  try {
    const pool = await sql.connect(config);
    const queryParams = await getQueryParams();
    console.log("Query parameters fetched:", queryParams);

    // Fetch column types for all parameters in 'params'
    const paramTypes = await getColumnTypes(Object.keys(queryParams));
    console.log("Param types fetched:", paramTypes);

    //execute all predefined queries concurrently
    const results = await Promise.all(
      predefinedQueries.map(({ query, params: queryParams }) => {
        //ensure the query is defined
        if (!query) {
          console.error("Query is undefined");
          throw new Error("Query is undefined");
        }

        //create a new request object for each query execution
        const request = pool.request();

        //extract parameter placeholders from the query
        const matches = query.match(/@[a-zA-Z0-9]+/g);
        if (matches) {
          matches.forEach((param) => {
            //extract parameter name from the placeholder
            const paramName = param.substring(1);

            //determine SQL type for the parameter
            let dbType = paramTypes[paramName];
            if (!dbType) {
              console.warn(
                `Unknown type for parameter '${paramName}'. Defaulting to sql.NVarChar.`
              );
              dbType = sql.NVarChar; // default to sql.NVarChar if type not found
            } else {
              dbType = sqlTypeFromDbType(dbType); //convert dbType from string to SQL type if necessary
            }

            //set input parameter for the query execution
            console.log(
              `Setting parameter: ${paramName} with type: ${dbType} and value: ${params[paramName]}`
            );

            //set the parameter based on its type
            if (
              dbType === sql.Date ||
              dbType === sql.DateTime ||
              dbType === sql.SmallDateTime
            ) {
              //handle Date types separately
              request.input(paramName, dbType, params[paramName]);
            } else {
              //handle other types including default sql.NVarChar
              request.input(paramName, dbType, params[paramName].toString());
            }
          });
        }
        //execute the query with the prepared parameters
        return request.query(query);
      })
    );
    //extract recordsets from query results and flatten them
    const recordSets = results.map((result) => result.recordset);
    const flattenedRecordSets = recordSets.flat();

    //return data property with the flattened recordsets
    return { data: flattenedRecordSets };
  } catch (err) {
    //handle and log any errors that occur during query execution
    console.error("Error in runReport:", err);
    throw new Error(err.message);
  }
}

module.exports = { runQuery, runReport, getQueryParams, getSuggestions };
