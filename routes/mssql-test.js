const MssqlMeta = require("../meta/mssqlMeta");

const pool = "pool1";
const mssqlMeta = new MssqlMeta(pool);

const predefinedQueries = [
  {
    suggestionParam: "StartDate",
    suggestionQuery:
      "SELECT DISTINCT FORMAT(Datum, 'yyyy-MM-dd') AS StartDate FROM Kontrolle WHERE FORMAT(Datum, 'yyyy-MM-dd') LIKE @input + '%'",
    params: [],
    query:
      "SELECT * FROM Kontrolle WHERE Durchfuehrender = @Durchfuehrender AND Datum = @StartDate",
    tableName: "Kontrolle",
  },
  {
    suggestionParam: "EndDate",
    suggestionQuery:
      "SELECT DISTINCT FORMAT(Datum, 'yyyy-MM-dd') AS EndDate FROM Kontrolle WHERE FORMAT(Datum, 'yyyy-MM-dd') LIKE @input + '%'",
    params: [],
    query:
      "SELECT * FROM Kontrolle WHERE Durchfuehrender = @Durchfuehrender AND Datum = @EndDate",
    tableName: "Kontrolle",
  },
  {
    suggestionParam: "Durchfuehrender",
    suggestionQuery:
      "SELECT DISTINCT Durchfuehrender FROM Kontrolle WHERE Durchfuehrender LIKE @input + '%'",
    params: ["Durchfuehrender", "StartDate", "EndDate"],
    query:
      "SELECT * FROM Kontrolle WHERE Durchfuehrender = @Durchfuehrender AND Datum BETWEEN @StartDate AND @EndDate",
    tableName: "Kontrolle",
  },
];

// Dynamic mapping of parameters to their respective column names in the database
const paramColumnMapping = {
  StartDate: "Datum",
  EndDate: "Datum",
  Durchfuehrender: "Durchfuehrender",
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
