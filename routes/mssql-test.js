const config = require("../config/mssql_db");
const sql = require("mssql");

async function runQuery(params) {
  try {
    const pool = await sql.connect(config);
    const predefinedQueries = [
      {
        query: "SELECT * FROM MMTeilnehmer WHERE Vorname = @vorname",
        params: { vorname: params.vorname },
      },
      {
        query: "SELECT * FROM Messwerte WHERE Sollwert = @sollwert",
        params: { sollwert: params.sollwert },
      },
    ];

    const results = await Promise.all(
      predefinedQueries.map(({ query, params }) => {
        const request = pool.request();
        for (const [key, value] of Object.entries(params)) {
          request.input(key, value);
        }
        return request.query(query);
      })
    );

    const recordSets = results.map((result) => result.recordset);
    return recordSets.flat();
  } catch (err) {
    console.error(err);
    throw new Error(err.message);
  }
}

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
