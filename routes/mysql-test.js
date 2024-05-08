const db = require("../config/mysql_db").promise();

//some query...
async function runQuery() {
  try {
    const queries = [
      "SELECT * FROM city WHERE ID = 12",
      "SELECT * FROM country",
    ];
    //execute all the queries concurrently using Promise.all
    //Promise.all waits for all promises to be fulfilled and returns an array of their results
    const results = await Promise.all(queries.map((query) => db.query(query)));
    return results.map(([rows, fields]) => rows); //map over the results and extract the rows from each query result
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
