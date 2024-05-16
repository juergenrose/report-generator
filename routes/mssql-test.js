const config = require("../config/mssql_db");
const sql = require("mssql");

async function runQuery(params) {
  try {
    const pool = await sql.connect(config);
    //define an array of predefined queries along with their respectiuve params 
    const predefinedQueries = [
      {
        query: "SELECT * FROM MMTeilnehmer WHERE Vorname = @vorname",
        params: { vorname: params.vorname }, //param for the first query
      },
      {
        query: "SELECT * FROM Messwerte WHERE Sollwert = @sollwert",
        params: { sollwert: params.sollwert },//param for the second query
      },
      {
        query: "SELECT * FROM Standort WHERE Werksnummer = @werksnummer",
        params: { werksnummer: params.werksnummer },//param for the third query
      },
    ];
    //execute all predefined querries asynchron and in parallel
    const results = await Promise.all(
      predefinedQueries.map(({ query, params }) => {
        const request = pool.request();//create a new req instance for each query
        //bind params to the req
        for (const [key, value] of Object.entries(params)) {
          request.input(key, value);
        }
        //execute the query and return the result promise 
        return request.query(query);
      })
    );
    //extract record sets from the results of each query
    const recordSets = results.map((result) => result.recordset);
    //flattern the array of record sets into a single array of records
    return recordSets.flat();
    //error handling
  } catch (err) {
    console.error(err);
    throw new Error(err.message);
  }
}

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
