const db = require("../config/mysql_db").promise();

async function runQuery(params) {
  try {
    //predefined queries
    const predefinedQueries = [
      `SELECT 
      city.CountryCode,
      GROUP_CONCAT(DISTINCT city.Name SEPARATOR ', ') AS Cities,
      GROUP_CONCAT(DISTINCT countrylanguage.Language SEPARATOR ', ') AS Languages
      FROM 
          city
      INNER JOIN 
          countrylanguage 
      ON 
          city.CountryCode = countrylanguage.CountryCode
      WHERE 
          city.CountryCode = 'AUT'
      GROUP BY 
          city.CountryCode; `,
    ];
    console.log("Params:", params);
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

module.exports = { runQuery, runReport };
