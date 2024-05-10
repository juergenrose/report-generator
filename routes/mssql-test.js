const config = require("../config/mssql_db");
const sql = require("mssql");

//some query...
async function runQuery() {
  try {
    const pool = await sql.connect(config);
    const queries = [
      "SELECT * FROM Parameter",
      "SELECT * FROM Jobs WHERE j_State = 10",
    ];
    //execute all queries using concurrently Promise.allSettled
    //Promise.allSettled settles once all promises have completed, regardless of their resolution
    const results = await Promise.allSettled(
      queries.map((query) => pool.request().query(query))
    );

    //filter out only fulfilled promises and extract record sets
    const recordSets = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value.recordset);

    //flatten the array of record sets into a single array of rows
    const combinedRows = recordSets.flatMap((rows) => rows);

    return combinedRows;
  } catch (err) {
    console.error(err);
    return { data: null, error: err.message };
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
