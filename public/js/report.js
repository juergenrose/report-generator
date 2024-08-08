/**
 * Asynchronous function to fetch reports from the server.
 */
async function fetchReports() {
  try {
    const response = await fetch("/api/report");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error fetching reports:", error);
  }
}

/**
 * Function to parse URL parameters into an object.
 * @returns {Object} An object containing the URL parameters as key-value pairs.
 */
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const entries = params.entries();
  const result = {};
  for (const [key, value] of entries) {
    result[key] = value;
  }
  return result;
}

/**
 * Function to set URL parameters based on an input object.
 * @param {Object} newParams - An object containing the new URL parameters as key-value pairs.
 */
function changeURLParams(newParams) {
  const urlParams = new URLSearchParams(window.location.search);
  Object.keys(newParams).forEach((key) => {
    urlParams.set(key, newParams[key]);
  });
  window.history.replaceState(
    {},
    "",
    `${window.location.pathname}?${urlParams}`
  );
}

/**
 * Function to populate input fields with values from URL parameters.
 * @param {Object} params - An object containing the URL parameters as key-value pairs.
 */
function populateInputs(params) {
  for (const [key, value] of Object.entries(params)) {
    const input = document.getElementById(key);
    if (input) {
      input.value = value;
      console.log(`Setting input ${key} to ${value}`);
    } else {
      console.warn(`Input field with id ${key} not found`);
    }
  }
}

/**
 * Function to generate HTML input fields for report parameters.
 * @param {Object} parameters - The parameters to generate inputs for.
 * @param {string} reportname - The name of the report.
 * @param {string} barcode - The barcode value.
 * @param {string} today - Today's date.
 * @param {string} startDate - The start date for the report.
 * @returns {string} The generated HTML string for the parameter inputs.
 */
function generateParamInputs(
  parameters,
  reportname,
  urlParams,
  today,
  startDate
) {
  // Convert the parameters object to an array of entries and map over them to generate the HTML for each parameter input
  return Object.entries(parameters)
    .map(([param, { type }]) => {
      // Determine the input type based on the parameter type
      const inputType = getInputType(type);
      // Get the default value for the input field based on the parameter name, URL params, type, today, and startDate
      const defaultValue = getDefaultValue(
        param,
        urlParams[param],
        type,
        today,
        startDate
      );
      const label = splitCamelCase(param);
      // Conditionally render the scan button if the parameter type is "barcode"
      const scanButton =
        type.toLowerCase() === "barcode"
          ? `<button id="scanBtn" class="scanBtn" type="button"><img class="barcodeImg" src="/img/barcode.png" alt="Barcode Icon" /></button>`
          : "";
      // Return the HTML string for the parameter input field and scan button (if applicable)
      return `
            <div class="paramInput">
              <label for="${param}">${label} (${type})</label>
              <div class="input-button-container">
                <input type="${inputType}" id="${param}" name="${param}" ${defaultValue}
                  oninput="fetchSuggestions('${reportname}', '${param}', this.value)">
                ${scanButton}
              </div>
              <div id="${param}-results" class="results"></div>
            </div>
          `;
    })
    .join("");
}

/**
 * Fetches the parameters for a given report and populates the parameter inputs section on the page
 * while also updating the barcode URL parameter with the provided barcode value.
 *
 * @param {string} reportname - The name of the report.
 * @param {string} barcode - The barcode to fetch parameters for.
 */
async function fetchParamsForBarcode(reportname, barcode) {
  // Get the existing URL parameters and add the new barcode value
  const urlParams = getUrlParams();
  urlParams.barcode = barcode;
  await fetchParams(reportname, urlParams);
}

/**
 * Fetches the parameters for a given report and populates the parameter inputs section on the page.
 * @param {string} reportname - The name of the report. If not provided, the current report name is used.
 * @param {Object} urlParams - The URL parameters. If not provided, an empty object is used.
 */
async function fetchParams(reportname = null, urlParams = {}) {
  const paramList = document.getElementById("paramList");

  try {
    // Fetch the report parameters
    const parameters = await fetchReportParameters(reportname);
    // If no parameters are found, display an error message and return
    if (!Object.keys(parameters).length) {
      displayError(`No parameters found for ${reportname}.`, paramList);
      return;
    }
    // Get the default dates
    const { today, startDate } = getDefaultDates();

    // Generate the parameter inputs HTML and set it as the innerHTML of the parameter list element
    paramList.innerHTML = generateParamInputs(
      parameters,
      reportname,
      urlParams,
      today,
      startDate
    );
    // Populate the parameter input fields with the URL parameters after a short delay
    setTimeout(() => {
      console.log("URL Parameters:", urlParams);
      populateInputs(urlParams);
    }, 0);
  } catch (error) {
    // If an error occurs, display an error message
    console.error("Error fetching parameters:", error);
    displayError("An error occurred while fetching parameters.", paramList);
  }
}

/**
 * Event handler for the form submission event in the "report.html" view.
 * Fetches the report data and displays it in the JSON output section.
 * Generates a CSV table from the report data and displays it.
 * Fetches a PDF version of the report and displays it.
 * @param {Event} event - The form submission event.
 */
async function showJsonOutput(event) {
  event.preventDefault();
  const reportname = window.location.pathname.split("/").pop();
  // Get references to the form, CSV output, and PDF output elements
  const form = document.getElementById("reportForm");
  const csvOutput = document.getElementById("csvOutput");
  const pdfOutput = document.getElementById("pdfOutput");

  try {
    // Get the form data as a URL-encoded string
    const params = new URLSearchParams(new FormData(form)).toString();
    // Update the URL parameters with the new form data
    changeURLParams(Object.fromEntries(new URLSearchParams(params)));
    console.log(
      `Fetching report data for ${reportname} with params: ${params}`
    );
    // Fetch the report data from the server
    const response = await fetch(
      `/api/report/${reportname}/generate?${params}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const jsonData = await response.json();
    console.log("Fetched report data:", jsonData);

    // Format the JSON data as a prettified string
    const prettifiedJson = JSON.stringify(jsonData, null, 2);
    // Display the prettified JSON data in the JSON output section
    document.getElementById(
      "reportData"
    ).innerHTML = `<pre>${prettifiedJson}</pre>`;

    // Generate a CSV table from the report data
    const csvContent = generateCsvContent(jsonData.data);
    const tableHTML = csvToHtmlTable(csvContent);
    // Display the CSV table in the CSV output section
    csvOutput.innerHTML = tableHTML;

    // Construct the URL for fetching the PDF version of the report
    const pdfUrl = `/api/report/${reportname}/generate?${params}&format=pdf`;
    console.log(`Fetching PDF for ${reportname} with URL: ${pdfUrl}`);
    // Fetch the PDF report from the server
    const pdfResponse = await fetch(pdfUrl, { method: "GET" });
    if (!pdfResponse.ok) {
      throw new Error(`Failed to generate PDF: ${await pdfResponse.text()}`);
    }
    const pdfBlob = await pdfResponse.blob();
    const pdfUrlObject = URL.createObjectURL(pdfBlob);
    // Display the PDF report in the PDF output section
    pdfOutput.innerHTML = `<embed src="${pdfUrlObject}#zoom=110" type="application/pdf" width="100%" height="800px" />`;
    // Open the PDF output tab
    const eventTarget = document.querySelector(
      ".tablinks[onclick=\"openTab(event, 'pdfOutput')\"]"
    );
    const eventObj = { currentTarget: eventTarget };
    openTab(eventObj, "pdfOutput");
  } catch (error) {
    console.error("Error generating report:", error);
    document.getElementById(
      "reportData"
    ).innerHTML = `<p class="error">An error occurred while generating the report.</p>`;
  }
}

/**
 * Event handler for the DOMContentLoaded event.
 * Fetches the parameters for the current report and populates the parameter inputs section on the page.
 * Fetches the report data and displays it in the JSON output section.
 * Also fetches the list of available reports and populates the report list dropdown.
 */
document.addEventListener("DOMContentLoaded", async () => {
  const reportname = window.location.pathname.split("/").pop();
  const urlParams = getUrlParams();
  // Fetch the parameters for the current report and populate the parameter inputs section
  await fetchParams(reportname, urlParams);

  try {
    // Fetch the report data from the server
    const response = await fetch(`/api/report/${reportname}`);
    // If the request fails, throw an error
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    // Get the parameter list element
    const paramList = document.getElementById("paramList");
    // Set the report header to the current report name
    document.getElementsByClassName(
      "reportHeader"
    )[0].innerHTML = `Report: ${reportname}`;
    // Generate the parameter inputs HTML and set it as the innerHTML of the parameter list element
    paramList.innerHTML = generateParamInputs(
      data.parameters,
      reportname,
      urlParams
    );

    // Populate the parameter input fields with the URL parameters after a short delay
    setTimeout(() => {
      populateInputs(urlParams);
    }, 0);
  } catch (error) {
    console.error("Error fetching parameters:", error);
    document.getElementById("paramList").innerHTML =
      '<p class="error">Failed to fetch parameters. Please try again.</p>';
  }
  fetchReports();
});

/**
 * Function to download the generated report in the selected format.
 * @param {Event} event - The event object.
 */
async function downloadReport(event) {
  event.preventDefault();
  const reportname = window.location.pathname.split("/").pop();
  // Get the selected format from the format dropdown
  const format = document.getElementById("format").value;

  // Display an error if no report or format is selected
  if (reportname === "-- Select a report --" || format === "") {
    document.getElementById(
      "paramList"
    ).innerHTML = `<p class="error">Please select a valid report and format before downloading.</p>`;
    return;
  }

  // Get the report form element
  const form = document.getElementById("reportForm");
  // Create a URLSearchParams object from the form data
  const params = new URLSearchParams(new FormData(form)).toString();
  // Construct the URL with query parameters
  const url = `/api/report/${reportname}/generate?${params}&format=${format}&download=true`;

  try {
    // Fetch the report in the selected format and trigger a download
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    if (format === "json") {
      const jsonData = await response.json();
      const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: "application/json",
      });
      downloadBlob(jsonBlob, "application/json", `${reportname}.json`);
    } else if (format === "csv") {
      const csvData = await response.text();
      downloadBlob(csvData, "text/csv", `${reportname}.csv`);
    } else if (format === "pdf") {
      const pdfBlob = await response.blob();
      downloadBlob(pdfBlob, "application/pdf", `${reportname}.pdf`);
    } else {
      throw new Error("Invalid format specified.");
    }
  } catch (error) {
    console.error("Error downloading report:", error);
  }
}

/**
 * Handles tab navigation by showing the selected tab and hiding others.
 * @param {Event} event - The event that triggered the tab navigation.
 * @param {string} tabName - The ID of the tab to be displayed.
 */
function openTab(event, tabName) {
  // Get all elements with class "tabcontent" and hide them
  const tabcontent = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  // Remove the "active" class from all tab link elements
  const tablinks = document.getElementsByClassName("tablinks");
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  // Show the current tab and add an "active" class to the button that opened the tab
  const tabElement = document.getElementById(tabName);
  if (tabElement) {
    tabElement.style.display = "block";
  } else {
    console.error(`Tab element with id "${tabName}" not found.`);
  }
  if (event.currentTarget) {
    event.currentTarget.className += " active";
  } else {
    console.error("Event currentTarget is null or undefined.");
  }
}
