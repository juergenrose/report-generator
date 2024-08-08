/**
 * Function to fetch available reports from the server and populate the report list dropdown.
 */
async function fetchReports() {
  try {
    const response = await fetch("/api/report");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();

    // Populate the report list dropdown with fetched reports
    const reportList = document.getElementById("reportList");
    reportList.innerHTML = `
      <option value="">-- Select a report --</option>
      ${data.reports
        .map((report) => `<option value="${report}">${report}</option>`)
        .join("")}
    `;
  } catch (error) {
    console.error("Error fetching reports:", error);
    alert("Failed to fetch reports. Please try again.");
  }
}

/**
 * Function to fetch parameters for the selected report and optionally for a specific barcode.
 * @param {string} [reportname=null] - The name of the report.
 * @param {string} [barcode=null] - The barcode to fetch parameters for.
 */
async function fetchParams(reportname = null, barcode = null) {
  const reportDropdown = document.getElementById("reportList");
  const paramList = document.getElementById("paramList");

  reportname = reportname || reportDropdown.value;
  // Display an error if no report is selected
  if (!reportname || reportname === "-- Select a report --") {
    displayError("Please select a valid report.", paramList);
    return;
  }

  try {
    // Fetch report parameters from the server
    const parameters = await fetchReportParameters(reportname);
    if (!Object.keys(parameters).length) {
      displayError(`No parameters found for ${reportname}.`, paramList);
      return;
    }
    const { today, startDate } = getDefaultDates();

    // Generate and display the input fields for the report parameters
    paramList.innerHTML = generateParamInputs(
      parameters,
      reportname,
      barcode,
      today,
      startDate
    );
  } catch (error) {
    console.error("Error fetching parameters:", error);
    displayError("An error occurred while fetching parameters.", paramList);
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
  barcode,
  today,
  startDate
) {
  // Iterate over each parameter and generate the corresponding input field
  return Object.entries(parameters)
    .map(([param, { type }]) => {
      const inputType = getInputType(type);

      const defaultValue = getDefaultValue(
        param,
        barcode,
        type,
        today,
        startDate
      );
      const label = splitCamelCase(param);

      // Add a scan button for barcode parameters
      const scanButton =
        type.toLowerCase() === "barcode"
          ? `<button id="scanBtn" class="scanBtn" type="button"><img class="barcodeImg" src="/img/barcode.png" alt="Barcode Icon" /></button>`
          : "";

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
 * Function to fetch parameters for a specific barcode.
 * @param {string} reportname - The name of the report.
 * @param {string} barcode - The barcode to fetch parameters for.
 */
async function fetchParamsForBarcode(reportname, barcode) {
  await fetchParams(reportname, barcode);
}

/**
 * Function to show JSON output for the generated report.
 * @param {Event} event - The event object.
 */
async function showJsonOutput(event) {
  event.preventDefault();
  const reportname = document.getElementById("reportList").value;
  const form = document.getElementById("reportForm");
  const jsonOutput = document.getElementById("jsonOutput");
  const csvOutput = document.getElementById("csvOutput");
  const pdfOutput = document.getElementById("pdfOutput");

  // Display an error if no report is selected
  if (reportname === "-- Select a report --") {
    document.getElementById(
      "paramList"
    ).innerHTML = `<p class="error">Please select a valid report before generating.</p>`;
    jsonOutput.style.display = "none";
    return;
  }

  try {
    // Generate the URL parameters from the form data
    const params = new URLSearchParams(new FormData(form)).toString();
    const response = await fetch(
      `/api/report/${reportname}/generate/?${params}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const jsonData = await response.json();
    const prettifiedJson = JSON.stringify(jsonData, null, 2);

    // Display the JSON output
    document.getElementById(
      "reportData"
    ).innerHTML = `<pre>${prettifiedJson}</pre>`;

    // Convert the JSON data to CSV and display it as an HTML table
    const csvContent = generateCsvContent(jsonData.data);
    const tableHTML = csvToHtmlTable(csvContent);
    csvOutput.innerHTML = tableHTML;

    // Generate and display the PDF output
    const pdfUrl = `/api/report/${reportname}/generate?${params}&format=pdf`;
    const pdfResponse = await fetch(pdfUrl, { method: "GET" });
    if (!pdfResponse.ok) {
      throw new Error(`Failed to generate PDF: ${await pdfResponse.text()}`);
    }
    const pdfBlob = await pdfResponse.blob();
    const pdfUrlObject = URL.createObjectURL(pdfBlob);
    pdfOutput.innerHTML = `<embed src="${pdfUrlObject}#zoom=110" type="application/pdf" width="100%" height="800px" />`;

    // Simulate a click event to open the PDF tab
    const event = {
      currentTarget: document.querySelector(
        ".tablinks[onclick=\"openTab(event, 'pdfOutput')\"]"
      ),
    };
    openTab(event, "pdfOutput");
  } catch (error) {
    console.error("Error generating report:", error);
    document.getElementById(
      "reportData"
    ).innerHTML = `<p class="error">An error occurred while generating the report.</p>`;
  }
}

/**
 * Function to download the generated report in the selected format.
 * @param {Event} event - The event object.
 */
async function downloadReport(event) {
  event.preventDefault();
  const reportname = document.getElementById("reportList").value;
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

document.addEventListener("DOMContentLoaded", () => {
  fetchReports();
});
