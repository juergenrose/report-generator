const config = require("../config/mssql_db");
const sql = require("mssql");

//predefined queries
const predefinedQueries = [
  {
    query: "SELECT * FROM Kontrolle WHERE durchfuehrender = @name",
  },
  {
    query: "SELECT * FROM Hersteller WHERE hersteller = @hersteller",
  }
];

async function runQuery(params) {
  try {
    const pool = await sql.connect(config);
    //execute all predefined queries asynchronously and in parallel
    const results = await Promise.all(
      predefinedQueries.map(({ query }) => {
        const request = pool.request();//create a new req instance for each query
        //bind params to the request from the params passed to runQuery
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


//function to extract query parameters
function extractQueryParams(query) {
  const params = {};
  const regex = /@(\w+)/g;//regular expression to match parameters starting with '@'
  let match;
  //loop through all matches of the regex in the query string
  while ((match = regex.exec(query)) !== null) {
    const paramName = match[1];//extract the parameter name (without '@')
    //add the parameter to the params object
    params[paramName] = {
      type: 'string', // assuming all params are strings for simplicity
      required: true
    };
  }
  return params;
}


//function to extract and return query parameters
function getQueryParams() {
  const params = {};
  //iterate over each predefined query
  predefinedQueries.forEach(({ query }) => {
    //extract parameters from the current query and merge them into the params object
    Object.assign(params, extractQueryParams(query));
  });
  return params;
}


//function to run the report based on provided parameters
async function runReport(params) {
  try {
    // Extract query parameters
    const queryParams = getQueryParams();
    // Validate if the required parameters are present in the request
    const missingParams = Object.keys(queryParams).filter(
      paramName => queryParams[paramName].required && !params[paramName]
    );
    //if there are missing required parameters, throw an error
    if (missingParams.length > 0) {
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }
    // Run the query with the correct parameters
    const result = await runQuery(params);

    return { data: result, parameters: queryParams };
  } catch (err) {
    console.error(err);
    return { data: null, error: err.message };
  }
}


module.exports = { runQuery, runReport, getQueryParams };