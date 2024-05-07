const db = require("../config/mysql_db").promise();

//some query...
async function runQuery() {
  try {
    const queries = [
      "SELECT * FROM city WHERE IsD = 12",
      "SELECT * FROM country WHERE Name = 'Austria'",
    ];
    const results = await Promise.all(queries.map((query) => db.query(query)));
    return results.map(([rows, fields]) => rows);
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
async function runReport() {
  try {
    const result = await runQuery();
    return result;
  } catch (err) {
    console.error(err);
    return { data: null, error: err.message };
  }
}

module.exports = { runQuery, runReport };
