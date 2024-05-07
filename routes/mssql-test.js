const config = require("../config/mssql_db");
const sql = require("mssql");

//some query...
async function runQuery() {
  try {
    const pool = await sql.connect(config);
    const queries = [
      "SELECT * FROM SAdExchange WHERE excID = 15",
      "SELECT * FROM SAPExchange WHERE excID = 17",
    ];
    const results = await Promise.allSettled(
      queries.map((query) => pool.request().query(query))
    );
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
