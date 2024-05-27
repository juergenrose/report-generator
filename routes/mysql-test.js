const db = require("../config/mysql_db").promise();

//predefined queries
const predefinedQueries = [
  `SELECT 
  city.CountryCode AS Code,
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
      city.CountryCode = ?
  GROUP BY 
      city.CountryCode, country.Name;`,
];

async function runQuery(params) {
  try {
    //execute all queries asynchon
    const results = await db.query(predefinedQueries[0], [params.countrycode]);
    //combine and flatten the result rows from all queries into a single array
    const combinedRows = results[0];
    //return the combined result rows
    return combinedRows;
    //error handling
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

function extractQueryParams(query) {
  //count the nubmer of parameter placeholders (?)
  const paramCount = (query.match(/\?/g) || []).length;
  const params = {};
  //loop through each parameter placeholder in the query string
  for (let i = 1; i <= paramCount; i++) {
    /*create a parameter key in the format param1, param2,... 
    and assign an object containing type, required and dessciption properties */
    params[`param${i}`] = {
      type: "string",
      required: true,
      //include a description indication the position of the parameter
      description: `Parameter ${i} for the query`
    };
  }
  return params;
}


function getQueryParams() {
  //call the extractQueryParams function with the predifined SQL query to retrieve and return the query params
  const params = extractQueryParams(predefinedQueries[0]);
  return params;
}


//take runQuery and runs report function
async function runReport(params) {
  try {
    const result = await runQuery(params);
    return result;
    //error handling
  } catch (err) {
    console.error(err);
    return { data: null, error: err.message };
  }
}

module.exports = { runQuery, runReport, getQueryParams };
