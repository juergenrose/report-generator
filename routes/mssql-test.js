const config = require("../config/mssql_db");
const sql = require("mssql");

//some query...
async function runQuery() {
  try {
    const pool = await sql.connect(config);
    const queries = [
      "SELECT * FROM AppConnect WHERE ac_ID = 7",
      "SELECT * FROM JobAttachments WHERE jf_ID = 25272",
    ];
    //execute all queries using concurrently Promise.allSettled
    //Promise.allSettled settles once all promises have completed, regardless of their resolution
    const results = await Promise.allSettled(
      queries.map((query) => pool.request().query(query))
    );
    //map over the results and extract the record sets from successful queries
    return results.map((result) =>
      result.value ? result.value.recordset : null
    );
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
