const db = require("../config/mysql_db").promise();

//some query...
async function runQuery(params) {
  try {
    //define parameters for each query
    const paramOne = [params.continent];
    const paramTwo = [params.language];

    const predefinedQueries = [
      "SELECT * FROM country WHERE Continent = ?",
      "SELECT * FROM countrylanguage WHERE Language = ?",
    ];

    //construct dynamic queries
    const dynamicQueries = predefinedQueries.map((query, index) => {
      return {
        query: query,
        params: index === 0 ? paramOne : paramTwo, //use appropriate parameters for each query
      };
    });

    console.log("Dynamic Queries:", dynamicQueries); //log dynamic queries

    //execute all the queries concurrently using Promise.all
    const results = await Promise.all(
      dynamicQueries.map(({ query, params }) => db.query(query, params))
    );

    console.log("Query Results:", results); //log query results

    //combine the results from all queries
    const combinedRows = results.flatMap(([rows, fields]) => rows);
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
