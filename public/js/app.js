//fetches the list of available reports and populates the dropdown menu
async function fetchReports() {
  try {
    const response = await fetch("/report");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    //parse the response body as JSON
    const data = await response.json();

    const reportList = document.getElementById("reportList");
    //populate the dropdown with the fetched reports
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
  //get the selected report name from the dropdown
  const reportname = document.getElementById("reportList").value;
  //get the element to display parameter input fields
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
    //populate the parameter list with generated input fields
    paramList.innerHTML = paramInputs;
  } catch (error) {
    console.error("Error fetching parameters:", error);
    //display error message
    paramList.innerHTML = `<p class="error">An error occurred while fetching parameters.</p>`;
  }
}

//function to fetch suggestions for a parameter based on user input
async function fetchSuggestions(reportname, param, input) {
  //get the div to display the results for the current parameter
  const resultsDiv = document.getElementById(`${param}-results`);
  //clear the results if the input is empty
  if (input.length < 1) {
    resultsDiv.innerHTML = "";
    return;
  }
  //create a FormData object and append the parameter name and user input
  const formData = new FormData(document.getElementById("reportForm"));
  formData.append("param", param);
  formData.append("input", input);

  try {
    //construct the URL with query parameters from the FormData object
    const url = `/report/${reportname}/suggestions?${new URLSearchParams(
      formData
    ).toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    //check if the data contains an array of suggestions
    if (Array.isArray(data.suggestions)) {
      //generate HTML for suggestions and display them
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
  //check if a valid report is selected
  if (reportname === "-- reportname --") {
    document.getElementById(
      "paramList"
    ).innerHTML = `<p class="error">Please select a valid report before generating.</p>`;
    jsonOutput.style.display = "none";
    return;
  }
  try {
    //create a query string from the form data
    const params = new URLSearchParams(new FormData(form)).toString();
    const response = await fetch(`/report/${reportname}?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    //parse the JSON response
    const jsonData = await response.json();
    //convert the JSON data to a prettified string
    const prettifiedJson = JSON.stringify(jsonData, null, 2);
    //display the prettified JSON data in the reportData element
    document.getElementById(
      "reportData"
    ).innerHTML = `<pre>${prettifiedJson}</pre>`;
    //show the JSON output container
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
    //get the JSON data from the JSON output element
    const jsonDataElement = jsonOutput.querySelector("pre");
    if (!jsonDataElement) {
      throw new Error("No JSON data found");
    }
    const jsonData = JSON.parse(jsonDataElement.innerText);
    //validate the JSON data structure
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
  //regular expression to match CSV fields, accounting for quoted fields with commas
  const regex = /(?:,|^)"((?:""|[^"])+)"(?:,|$)|([^,]+)/g;
  const cells = [];
  let match;
  //loop through all matches of the regex in the row content
  while ((match = regex.exec(rowContent)) !== null) {
    //if the match is a quoted field, use the first capturing group; otherwise, use the second capturing group
    const cell = match[1] || match[2];
    cells.push(cell.replace(/""/g, '"')); //replace double quotes within quoted fields
  }
  return cells;
}

//function for displaying a PDF preview
async function convertToPDF(event) {
  event.preventDefault();

  const reportname = document.getElementById("reportList").value; //get the selected report name from the dropdown
  const jsonOutput = document.getElementById("jsonOutput");
  const pdfOutput = document.getElementById("pdfData");
  const form = document.getElementById("reportForm");
  const params = new URLSearchParams(new FormData(form)).toString(); //convert form data to URL parameters
  const format = "pdf";

  try {
    //find the JSON data element within the JSON output section
    const jsonDataElement = jsonOutput.querySelector("pre");
    if (!jsonDataElement) {
      throw new Error("No JSON data found");
    }
    //parse the JSON data
    const jsonData = JSON.parse(jsonDataElement.innerText);
    console.log("Fetched JSON data:", jsonData);

    //validate the JSON data structure
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
    //construct the URL for fetching the PDF, including parameters and format
    const url = `/report/${reportname}?${params}&format=${format}`;
    console.log("Request URL:", url);
    //send a GET request to generate the PDF
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate PDF: ${errorText}`);
    }
    //convert the response to a blob representing the PDF
    const pdfBlob = await response.blob();
    //create a URL for the PDF blob
    const pdfUrl = URL.createObjectURL(pdfBlob);
    console.log("PDF URL:", pdfUrl);

    pdfOutput.innerHTML = `<embed src="${pdfUrl}" type="application/pdf" width="100%" height="800px" />`;
    openTab(event, "pdfOutput"); //show the PDF output tab
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
  //Validate selected report name and format
  if (!reportname || reportname === "-- reportname --" || !format) {
    document.getElementById(
      "paramList"
    ).innerHTML = `<p class="error">Please select a valid report and format before downloading.</p>`;
    return;
  }

  try {
    //convert form data to URL parameters
    const params = new URLSearchParams(new FormData(form)).toString();
    const response = await fetch(
      //fetch the report data in the specified format
      `/report/${reportname}?${params}&format=${format}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    //convert the response to a blob representing the downloaded file
    const blob = await response.blob();
    //create a URL for the blob
    const downloadUrl = URL.createObjectURL(blob);
    //create an <a> element to trigger the download
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${reportname}.${format}`;
    //append the <a> element to the document body and trigger the click event
    document.body.appendChild(a);
    a.click();
    //remove the <a> element from the document body
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading report:", error);
    alert("Failed to download report. Please try again.");
  }
}

//function to handle tab navigation
function openTab(evt, tabName) {
  //get all elements with class "tabcontent" and hide them
  const tabcontent = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  //get all elements with class "tablinks" and remove the "active" class
  const tablinks = document.getElementsByClassName("tablinks");
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  //show the selected tab content
  const selectedTab = document.getElementById(tabName);
  if (selectedTab) {
    selectedTab.style.display = "block";
  }
  //add the "active" class to the clicked tab link
  if (evt.currentTarget) {
    evt.currentTarget.className += " active";
  }
}

//execute code when the DOM content has finished loading
document.addEventListener("DOMContentLoaded", () => {
  const firstTab = document.querySelector(".tablinks");
  //if a tablink element is found, simulate a click on it
  if (firstTab) {
    firstTab.click();
  }
  //fetch reports data when the DOM is loaded
  fetchReports();
});

//helper function to check if a variable is an object
function isObject(variable) {
  /* check if the variable is not null or undefined and is of type 'object'
  also, ensure that the variable's constructor is Object (not an instance of a subclass)*/
  return (
    variable && typeof variable === "object" && variable.constructor === Object
  );
}
