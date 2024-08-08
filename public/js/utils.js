/**
 * Helper function to display error messages.
 * @param {string} message - The error message to display.
 * @param {HTMLElement} paramList - The element to display the error message in.
 * @param {HTMLElement} [barcodeInputDiv=null] - Optional element to hide if an error occurs.
 */
function displayError(message, paramList, barcodeInputDiv = null) {
  paramList.innerHTML = `<p class="error">${message}</p>`;
  if (barcodeInputDiv) {
    barcodeInputDiv.style.display = "none";
  }
}

/**
 * Helper function to convert camelCase to Title Case.
 * @param {string} input - The camelCase string to convert.
 * @returns {string} The converted Title Case string.
 */
function splitCamelCase(input) {
  return input
    .replace(/([A-Z])/g, " $1")
    .replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
    })
    .trim();
}

/**
 * Helper function to get default dates.
 * @returns {Object} An object containing today's date and the start date of the previous month.
 */
function getDefaultDates() {
  const today = new Date().toISOString().split("T")[0];
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1));
  const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  return { today, startDate };
}

/**
 * Helper function to get input type based on parameter type.
 * @param {string} type - The type of the parameter.
 * @returns {string} The input type (either "date" or "text").
 */
function getInputType(type) {
  return ["date", "smalldatetime", "datetime"].includes(type.toLowerCase())
    ? "date"
    : "text";
}

/**
 * Helper function to get default value for an input field.
 * @param {string} param - The name of the parameter.
 * @param {string} value - The current value of the parameter.
 * @param {string} type - The type of the parameter.
 * @param {string} today - Today's date.
 * @param {string} startDate - The start date of the previous month.
 * @returns {string} The default value attribute for the input field.
 */
function getDefaultValue(param, value, type, today, startDate) {
  if (type && type.toLowerCase() === "barcode" && value) {
    return `value="${value}"`;
  } else if (type && getInputType(type) === "date") {
    return `value="${param === "EndDate" ? today : startDate}"`;
  } else if (value) {
    return `value="${value}"`;
  } else {
    return "";
  }
}

/**
 * Helper function to fetch report parameters.
 * @param {string} reportname - The name of the report.
 * @returns {Promise<Object>} The report parameters.
 * @throws Will throw an error if the HTTP request fails.
 */
async function fetchReportParameters(reportname) {
  const response = await fetch(`/api/report/${reportname}`);
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  const { parameters } = await response.json();
  return parameters;
}

/**
 * Helper function to fetch parameters for a specific barcode.
 * @param {string} reportname - The name of the report.
 * @param {string} barcode - The barcode to fetch parameters for.
 * @returns {Promise<void>}
 */
async function fetchParamsForBarcode(reportname, barcode) {
  await fetchParams(reportname, barcode);
}
