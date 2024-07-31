const MssqlMeta = require("../meta/mssqlMeta");

const pool = "pool2";
const mssqlMeta = new MssqlMeta(pool);

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
  return await mssqlMeta.getQueryParams(predefinedQueries, paramColumnMapping);
}

// Wrapper function to get suggestions based on the input parameters
async function getSuggestionsWrapper(params) {
  return await mssqlMeta.getSuggestions(predefinedQueries, params);
}

// Wrapper function to run the report based on the provided parameters, page number, and page size
async function runReportWrapper(params, pageNumber = 1, pageSize = 10) {
  return await mssqlMeta.runReport(
    predefinedQueries,
    paramColumnMapping,
    params,
    tableName,
    pageNumber, 
    pageSize
  );
}

module.exports = {
  getQueryParams: getQueryParamsWrapper,
  getSuggestions: getSuggestionsWrapper,
  runReport: runReportWrapper,
};
