const db = require("../config/mysql_db").promise();

async function runQuery(params) {
  try {
    //predefined queries
    const predefinedQueries = [
      "SELECT * FROM country WHERE Continent = ?",
      "SELECT * FROM countrylanguage WHERE Language = ?",
      "SELECT * FROM city WHERE Name = ?"
    ];
    //execute both queries asynchon
    const results = await Promise.all([
      db.query(predefinedQueries[0], [params.continent]),
      db.query(predefinedQueries[1], [params.language]),
      db.query(predefinedQueries[2], [params.name])
    ]);
    //combine and flatten the result rows from all queries into a single array
    const combinedRows = results.flatMap(([rows]) => rows);
    //return the combined result rows
    return combinedRows;
    //error handling
  } catch (err) {
    console.error(err);
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
