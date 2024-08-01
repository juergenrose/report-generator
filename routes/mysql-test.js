const MysqlMeta = require("../meta/mysqlMeta");

const tableSchema = "world";
const mysqlMeta = new MysqlMeta(tableSchema);

// Predefined queries
const predefinedQueries = [
  {
    query: `SELECT 
      city.CountryCode,
      country.Name AS Country,
      GROUP_CONCAT(DISTINCT city.Name SEPARATOR ', ') AS Cities,
      GROUP_CONCAT(DISTINCT countrylanguage.Language SEPARATOR ', ') AS Languages
    FROM 
        city
    INNER JOIN 
        country ON city.CountryCode = country.Code
    INNER JOIN 
        countrylanguage ON city.CountryCode = countrylanguage.CountryCode
    WHERE 
        city.CountryCode LIKE ? '%'
    GROUP BY 
      city.CountryCode, country.Name;`,
    params: ["CountryCode"],
    tableName: "city",
  },
  {
    suggestionParam: "CountryCode",
    suggestionQuery: `SELECT DISTINCT CountryCode 
                      FROM city 
                      WHERE CountryCode LIKE CONCAT(?, '%')`,
    params: [],
    tableName: "city",
  },
];

const tableName = predefinedQueries[0].tableName;

// Wrapper function to get query parameters by invoking the getQueryParams function
async function getQueryParamsWrapper() {
  return await mysqlMeta.getQueryParams(predefinedQueries);
}

// Wrapper function to get suggestions based on the input parameters
async function getSuggestionsWrapper(params) {
  return await mysqlMeta.getSuggestions(predefinedQueries, params);
}

// Wrapper function to run the report based on the provided parameters, page number, and page size
async function runReportWrapper(params) {
  return await mysqlMeta.runReport(predefinedQueries, params, tableName);
}

module.exports = {
  getQueryParams: getQueryParamsWrapper,
  getSuggestions: getSuggestionsWrapper,
  runReport: runReportWrapper,
};
