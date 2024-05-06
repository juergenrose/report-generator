const config = require("../config/mssql_db");
const sql = require("mssql");

//some query...
async function runQuery() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT * FROM SAPExchange");
    return result.recordsets;
  } catch (err) {
    console.error(err);
  }
}

//take runQuery and runs report function
async function runReport() {
  try {
    const result = await runQuery();
    return result;
  } catch (err) {
    console.error(err);
  }
}

module.exports = { runQuery, runReport };
