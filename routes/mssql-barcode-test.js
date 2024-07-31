const {
  getSuggestions,
  getQueryParams,
  runReport,
} = require("../meta/mssql_meta_functions");

pool = 'pool2';

// Define the set of predefined queries to be used for fetching data
const predefinedQueries = [
  {
    suggestionParam: "BIDNR",
    suggestionQuery:
      "SELECT DISTINCT BIDNR FROM BEHAELTER WHERE BIDNR LIKE @input + '%'",
    params: ["BIDNR"],
    query: "SELECT * FROM BEHAELTER WHERE BIDNR = @BIDNR",
    tableName: "BEHAELTER",
  },
];

// Mapping of parameters to their respective column names in the database
const paramColumnMapping = {
  BIDNR: "BIDNR",
};

const tableName = predefinedQueries[0].tableName;

// Wrapper function to get query parameters by invoking the getQueryParams function
async function getQueryParamsWrapper() {
  return await getQueryParams(
    predefinedQueries,
    paramColumnMapping,
    pool,
    tableName
  );
}

// Wrapper function to get suggestions based on the input parameters
async function getSuggestionsWrapper(params) {
  return await getSuggestions(predefinedQueries, params, pool, tableName);
}

// Wrapper function to run the report based on the provided parameters, page number, and page size
async function runReportWrapper(params) {
  return await runReport(
    predefinedQueries,
    paramColumnMapping,
    params,
    tableName,
    pool
  );
}

module.exports = {
  getQueryParams: getQueryParamsWrapper,
  getSuggestions: getSuggestionsWrapper,
  runReport: runReportWrapper,
};
