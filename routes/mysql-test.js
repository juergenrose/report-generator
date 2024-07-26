/** @format */

const db = require('../config/mysql_db').promise();

//predefined queries
const predefinedQueries = [
  {
    query: `SELECT 
      city.CountryCode,
      country.Name AS Country,
      GROUP_CONCAT(DISTINCT city.Name SEPARATOR ', ') AS Cities,
      GROUP_CONCAT(DISTINCT countrylanguage.Language SEPARATOR ', ') AS Languages
    FROM 
        city
    INNER JOIN 
        country ON city.CountryCode = country.Code
    INNER JOIN 
        countrylanguage ON city.CountryCode = countrylanguage.CountryCode
    WHERE 
        city.CountryCode LIKE ? '%'
    GROUP BY 
      city.CountryCode, country.Name;`,
    params: ['CountryCode'], //specify the expected parameters
  },
  {
    suggestionParam: 'StartDate',
    suggestionQuery: `SELECT DISTINCT DATE_FORMAT(Datum, '%Y-%m-%d') AS StartDate 
                      FROM City 
                      WHERE DATE_FORMAT(Datum, '%Y-%m-%d') LIKE CONCAT(?, '%')`,
    params: [],
    tableName: 'City',
  },
  {
    suggestionParam: 'EndDate',
    suggestionQuery: `SELECT DISTINCT DATE_FORMAT(Datum, '%Y-%m-%d') AS EndDate 
                      FROM City 
                      WHERE DATE_FORMAT(Datum, '%Y-%m-%d') LIKE CONCAT(?, '%')`,
    params: [],
    tableName: 'City',
  },
  {
    suggestionParam: 'CountryCode',
    suggestionQuery: `SELECT DISTINCT CountryCode 
                      FROM City 
                      WHERE CountryCode LIKE CONCAT(?, '%')`,
    params: [],
    tableName: 'City',
  },
];

//function to get column types from INFORMATION_SCHEMA
async function getColumnTypes(columns) {
  const columnTypes = {};
  const query = `
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME IN (${columns
      .map(() => '?')
      .join(', ')})
  `;

  const tableSchema = 'world';

  try {
    if (!Array.isArray(columns) || columns.length === 0) {
      throw new Error('Columns must be a non-empty array.');
    }

    console.log('Executing getColumnTypes query:', query, [
      tableSchema,
      'city',
      ...columns,
    ]); //log the actual parameters sent to the query
    const [results] = await db.query(query, [tableSchema, 'city', ...columns]);

    results.forEach((row) => {
      columnTypes[row.COLUMN_NAME] = row.DATA_TYPE;
    });

    if (Object.keys(columnTypes).length === 0) {
      throw new Error(
        'No column types found. Check if the columns exist in the database.'
      );
    }
  } catch (err) {
    console.error('Error fetching column types:', err);
    throw err;
  }
  return columnTypes;
}

//function to extract and return query parameters with actual data types
async function getQueryParams() {
  const params = {};

  //extract all column names from predefinedQueries
  const columns = predefinedQueries.reduce((acc, { params: queryParams }) => {
    queryParams.forEach((param) => {
      if (!acc.includes(param)) {
        acc.push(param);
      }
    });
    return acc;
  }, []);
  //get actual data types of columns
  const columnTypes = await getColumnTypes(columns);

  //iterate over each predefined query
  predefinedQueries.forEach(({ params: queryParams }) => {
    //iterate over each parameter in the query
    queryParams.forEach((param) => {
      params[param] = {
        type: columnTypes[param] || 'Undefined', //use actual data type or default to 'Undefined' if not found
        required: true,
      };
    });
  });
  return params;
}

//function to fetch suggestions based on parameters
async function getSuggestions(params) {
  try {
    const { param, input } = params; //extract the parameter to be suggested and input

    if (!param || !input) {
      throw new Error(
        "Parameters 'param' and 'input' are required for suggestions"
      );
    }
    //find the corresponding query for the param
    const queryObject = predefinedQueries.find(
      (q) => q.suggestionParam === param
    );
    if (!queryObject) {
      throw new Error(`No suggestion query found for parameter: ${param}`);
    }
    const query = queryObject.suggestionQuery;
    const values = [`${input}%`]; //adjust to match the first character of input

    const [results] = await db.query(query, values);
    //extract the suggestions from the result
    const suggestions = results.map((row) => row[param]);

    return suggestions;
  } catch (err) {
    console.error(err);
    throw new Error(err.message);
  }
}

async function runQuery(params) {
  try {
    //extract the first query and its expected parameters
    const { query, params: queryParams } = predefinedQueries[0];
    const queryValues = queryParams.map((param) => params[param]);

    //execute the query with the provided parameters
    const [results] = await db.query(query, queryValues);

    //return the combined result rows
    return results;
  } catch (err) {
    console.error('MySQL Error:', err.sqlMessage);
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

//function to run the report based on provided parameters
async function runReport(params, reportname) {
  try {
    //extract query parameters
    const queryParams = await getQueryParams();
    //validate if the required parameters are present in the req
    const missingParams = Object.keys(queryParams).filter(
      (paramName) => queryParams[paramName].required && !params[paramName]
    );
    //if there are missing required parameters, throw an error
    if (missingParams.length > 0) {
      throw new Error(
        `Missing required parameters: ${missingParams.join(', ')}`
      );
    }
    //run the query with the correct parameters
    const result = await runQuery(params);

    return { data: result, parameters: queryParams };
  } catch (err) {
    console.error(`Error handling report for ${reportname}:`, err);
    return { data: null, error: err.message };
  }
}

module.exports = { runQuery, runReport, getQueryParams, getSuggestions };
