const config = require("../config/mssql_db");
const sql = require("mssql");

//some query...
async function runQuery(params) {
  try {
    const pool = await sql.connect(config);

    //define parameters for each query
    const paramOne = params.vorname;
    const paramTwo = params.sollwert;

    const predefinedQueries = [
      {
        query: "SELECT * FROM MMTeilnehmer WHERE Vorname = @vorname",
        params: { vorname: paramOne },
      },
      {
        query: "SELECT * FROM Messwerte WHERE Sollwert = @sollwert",
        params: { sollwert: paramTwo },
      },
    ];
    console.log("Dynamic Queries:", predefinedQueries); //log dynamic queries

    //execute all queries using concurrently Promise.allSettled
    const results = await Promise.allSettled(
      predefinedQueries.map(({ query, params }) => {
        const request = pool.request();
        // Add parameters to the request
        for (const [key, value] of Object.entries(params)) {
          request.input(key, value);
        }
        return request.query(query);
      })
    );

    console.log("Query Results:", results); //log query results

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
