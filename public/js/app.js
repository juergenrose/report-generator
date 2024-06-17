//fetches the list of available reports and populates the dropdown menu
async function fetchReports() {
  try {
    const response = await fetch("/report");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    const reportList = document.getElementById("reportList");
    reportList.innerHTML = `
      <option value="-- reportname --">-- Select a report --</option>
      ${data.reports
        .map((report) => `<option value="${report}">${report}</option>`)
        .join("")}
    `;
  } catch (error) {
    console.error("Error fetching reports:", error);
    alert("Failed to fetch reports. Please try again.");
  }
}

//function to fetch parameters for the selected report
async function fetchParams() {
  const reportname = document.getElementById("reportList").value;
  const paramList = document.getElementById("paramList");

  //check if a valid report is selected
  if (reportname === "-- reportname --") {
    paramList.innerHTML = `<p class="error">Please select a valid report.</p>`;
    return;
  }

  try {
    const response = await fetch(`/report/${reportname}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    //generate HTML for parameter input fields based on retrieved data
    const paramInputs = Object.keys(data.parameters)
      .map(
        (param) => `
        <div class="paramInput">
          <label for="${param}">${param}</label><br>
          <input type="text" id="${param}" name="${param}" oninput="fetchSuggestions('${reportname}', '${param}', this.value)">
          <div id="${param}-results" class="results"></div>
        </div>
      `
      )
      .join("");
    paramList.innerHTML = paramInputs;
  } catch (error) {
    console.error("Error fetching parameters:", error);
    paramList.innerHTML = `<p class="error">An error occurred while fetching parameters.</p>`;
  }
}

//function to fetch suggestions for a parameter based on user input
async function fetchSuggestions(reportname, param, input) {
  const resultsDiv = document.getElementById(`${param}-results`);

  if (input.length < 1) {
    resultsDiv.innerHTML = "";
    return;
  }

  const formData = new FormData(document.getElementById("reportForm"));
  formData.append("param", param);
  formData.append("input", input);

  try {
    const url = `/report/${reportname}/suggestions?${new URLSearchParams(
      formData
    ).toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data.suggestions)) {
      resultsDiv.innerHTML = data.suggestions
        .map(
          (suggestion) =>
            `<p onclick="selectSuggestion('${param}', '${suggestion}')">${suggestion}</p>`
        )
        .join("");
    } else {
      resultsDiv.innerHTML = `<p class="error">Invalid data format: expected an array of suggestions.</p>`;
    }
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    resultsDiv.innerHTML = `<p class="error">An error occurred while fetching suggestions.</p>`;
  }
}

//function to select a suggestion for a parameter
function selectSuggestion(param, suggestion) {
  document.getElementById(param).value = suggestion;
  document.getElementById(`${param}-results`).innerHTML = "";
}

//handles the form submission to display the JSON report data
async function showJsonOutput(event) {
  //prevent the default form submission behavior
  event.preventDefault();
  const reportname = document.getElementById("reportList").value;
  const form = document.getElementById("reportForm");
  const jsonOutput = document.getElementById("jsonOutput");

  if (reportname === "-- reportname --") {
    document.getElementById(
      "paramList"
    ).innerHTML = `<p class="error">Please select a valid report before generating.</p>`;
    jsonOutput.style.display = "none";
    return;
  }

  try {
    const params = new URLSearchParams(new FormData(form)).toString();
    const response = await fetch(`/report/${reportname}?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    //parse the JSON response
    const jsonData = await response.json();
    const prettifiedJson = JSON.stringify(jsonData, null, 2);
    document.getElementById(
      "reportData"
    ).innerHTML = `<pre>${prettifiedJson}</pre>`;
    jsonOutput.style.display = "block";
  } catch (error) {
    console.error("Error generating report:", error);
    document.getElementById(
      "reportData"
    ).innerHTML = `<p class="error">An error occurred while generating the report.</p>`;
  }
}

//converts JSON data to CSV format and displays it
async function convert(event) {
  event.preventDefault();
  const format = document.getElementById("format").value;

  if (format === "csv") {
    convertJsonToCsv(event);
  } else if (format === "pdf") {
    convertToPDF(event);
  }
}

//function to convert JSON data to CSV format and display it
async function convertJsonToCsv(event) {
  event.preventDefault();
  const jsonOutput = document.getElementById("jsonOutput");
  const csvOutput = document.getElementById("csvData");

  try {
    const jsonDataElement = jsonOutput.querySelector("pre");
    if (!jsonDataElement) {
      throw new Error("No JSON data found");
    }
    const jsonData = JSON.parse(jsonDataElement.innerText);

    if (
      !jsonData.data ||
      !Array.isArray(jsonData.data) ||
      jsonData.data.length === 0 ||
      !isObject(jsonData.data[0])
    ) {
      throw new Error(
        "Invalid JSON data: Expected 'data' property to be an array of objects."
      );
    }
    //convert JSON to CSV format using the 'data' array
    const csvContent = generateCsvContent(jsonData.data);
    //convert CSV content to HTML table
    const tableHTML = csvToHtmlTable(csvContent);
    //display table in the csvOutput tab
    csvOutput.innerHTML = tableHTML;
    //show csvOutput tab
    openTab(event, "csvOutput");
  } catch (error) {
    console.error("Error converting JSON to CSV:", error);
    csvOutput.innerHTML = `<p class="error">Error converting JSON to CSV. Please try again.</p>`;
  }
}

//helper function to generate CSV content from JSON data
function generateCsvContent(jsonArray) {
  if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
    throw new Error("Invalid JSON array: It must be a non-empty array.");
  }

  const headers = Object.keys(jsonArray[0]);
  //build CSV content with headers
  let csvContent = headers.join(",") + "\n";

  //build rows
  jsonArray.forEach((obj) => {
    const row = headers
      .map((header) => {
        let cell = obj[header];
        //check if the cell needs escaping (contains commas or quotes)
        if (
          typeof cell === "string" &&
          (cell.includes(",") || cell.includes('"'))
        ) {
          //escape quotes by doubling them and enclose in double quotes
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      })
      .join(",");
    csvContent += row + "\n";
  });
  return csvContent;
}

//convert CSV content to HTML table
function csvToHtmlTable(csvContent) {
  const rows = csvContent.split("\n");
  const table = document.createElement("table");

  rows.forEach((rowContent, rowIndex) => {
    const row = document.createElement("tr");
    //use a regular expression to properly split CSV row considering fields with commas and quotes
    const cells = rowContent.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

    cells.forEach((cellContent) => {
      const cell = document.createElement(rowIndex === 0 ? "th" : "td");
      //remove surrounding quotes from cell content if present
      cell.textContent = cellContent.replace(/^"(.+(?="$))"$/, "$1").trim();
      row.appendChild(cell);
    });

    table.appendChild(row);
  });

  return table.outerHTML;
}

//helper function to parse a CSV row correctly
function parseCsvRow(rowContent) {
  const regex = /(?:,|^)"((?:""|[^"])+)"(?:,|$)|([^,]+)/g;
  const cells = [];
  let match;

  while ((match = regex.exec(rowContent)) !== null) {
    const cell = match[1] || match[2];
    cells.push(cell.replace(/""/g, '"')); //replace double quotes within quoted fields
  }

  return cells;
}

// Function for displaying a PDF preview
async function convertToPDF(event) {
  event.preventDefault();

  const reportname = document.getElementById("reportList").value;
  const jsonOutput = document.getElementById("jsonOutput");
  const pdfOutput = document.getElementById("pdfData");
  const form = document.getElementById("reportForm");
  const params = new URLSearchParams(new FormData(form)).toString();
  const format = "pdf";

  try {
    const jsonDataElement = jsonOutput.querySelector("pre");
    if (!jsonDataElement) {
      throw new Error("No JSON data found");
    }

    const jsonData = JSON.parse(jsonDataElement.innerText);
    console.log("Fetched JSON data:", jsonData);

    if (
      !jsonData.data ||
      !Array.isArray(jsonData.data) ||
      jsonData.data.length === 0 ||
      !isObject(jsonData.data[0])
    ) {
      throw new Error(
        "Invalid JSON data: Expected 'data' property to be an array of objects."
      );
    }

    const url = `/report/${reportname}?${params}&format=${format}`;
    console.log("Request URL:", url);

    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate PDF: ${errorText}`);
    }

    const pdfBlob = await response.blob();
    const pdfUrl = URL.createObjectURL(pdfBlob);
    console.log("PDF URL:", pdfUrl);

    pdfOutput.innerHTML = `<embed src="${pdfUrl}" type="application/pdf" width="100%" height="800px" />`;
    openTab(event, "pdfOutput");
  } catch (error) {
    console.error("Error generating PDF:", error);
    pdfOutput.innerHTML = `<p class="error">Error generating PDF: ${error.message}. Please try again.</p>`;
  }
}

//function to handle downloading the report
async function downloadReport(event) {
  event.preventDefault();
  const reportname = document.getElementById("reportList").value;
  const format = document.getElementById("format").value;
  const form = document.getElementById("reportForm");

  if (!reportname || reportname === "-- reportname --" || !format) {
    document.getElementById(
      "paramList"
    ).innerHTML = `<p class="error">Please select a valid report and format before downloading.</p>`;
    return;
  }

  try {
    const params = new URLSearchParams(new FormData(form)).toString();
    const response = await fetch(
      `/report/${reportname}?${params}&format=${format}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${reportname}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading report:", error);
    alert("Failed to download report. Please try again.");
  }
}

//function to handle tab navigation
function openTab(evt, tabName) {
  const tabcontent = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  const tablinks = document.getElementsByClassName("tablinks");
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  const selectedTab = document.getElementById(tabName);
  if (selectedTab) {
    selectedTab.style.display = "block";
  }
  if (evt.currentTarget) {
    evt.currentTarget.className += " active";
  }
}

//initial setup on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  const firstTab = document.querySelector(".tablinks");
  if (firstTab) {
    firstTab.click();
  }
  fetchReports();
});

//helper function to check if a variable is an object
function isObject(variable) {
  return (
    variable && typeof variable === "object" && variable.constructor === Object
  );
}
