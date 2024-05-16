const db = require("../config/mysql_db").promise();

async function runQuery(params) {
  try {
    const predefinedQueries = [
      "SELECT * FROM country WHERE Continent = ?",
      "SELECT * FROM countrylanguage WHERE Language = ?"
    ];

    const results = await Promise.all([
      db.query(predefinedQueries[0], [params.continent]),
      db.query(predefinedQueries[1], [params.language])
    ]);

    const combinedRows = results.flatMap(([rows]) => rows);
    return combinedRows;
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
    } catch (err) {
      console.error(err);
      return { data: null, error: err.message };
    }
  }


module.exports = { runQuery, runReport };
