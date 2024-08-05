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

// Dynamic mapping of parameters to their respective column names in the database
const paramColumnMapping = {
  BIDNR: "barcode",
};

const tableName = predefinedQueries[0].tableName;

// Wrapper function to get query parameters by invoking the getQueryParams function
async function getQueryParamsWrapper() {
  const params = await mssqlMeta.getQueryParams(
    predefinedQueries,
    paramColumnMapping
  );
  return params;
}

// Wrapper function to get suggestions based on the input parameters
async function getSuggestionsWrapper(params) {
  const suggestions = await mssqlMeta.getSuggestions(predefinedQueries, params);
  return suggestions;
}

// Wrapper function to run the report based on the provided parameters, page number, and page size
async function runReportWrapper(params, pageNumber = 1, pageSize = 10) {
  const reportData = await mssqlMeta.runReport(
    predefinedQueries,
    paramColumnMapping,
    params,
    tableName,
    pageNumber,
    pageSize
  );
  return reportData;
}

module.exports = {
  getQueryParams: getQueryParamsWrapper,
  getSuggestions: getSuggestionsWrapper,
  runReport: runReportWrapper,
};
