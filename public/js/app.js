//fetches the list of available reports and populates the dropdown menu
async function fetchReports() {
  const response = await fetch("/report");
  const data = await response.json();
  const reportList = document.getElementById("reportList");
  //create an array containing all reports
  const allReports = ["-- reportname -- "]; //empty option
  allReports.push(...data.reports); //add actual reports
  //generate HTML options for each report in the array and set it as the content of the reportList element
  reportList.innerHTML = allReports
    .map((report) => `<option value="${report}">${report}</option>`)
    .join("");
}

//fetches the parameters for the selected report and populates the parameter input fields
async function fetchParams() {
  const reportname = document.getElementById("reportList").value;
  const paramList = document.getElementById("paramList");

  //check if a valid report is selected
  if (reportname === "-- reportname -- ") {
    paramList.innerHTML = `<p class="error">Please select a valid report.</p>`;
    return;
  }
  const response = await fetch(`/report/${reportname}`);

  //check if the response is successful
  if (response.ok) {
    const data = await response.json();
    //generate HTML for parameter input fields based on retrieved data
    paramList.innerHTML = Object.keys(data.parameters)
      .map(
        (param) => `
    <div class="paramInput">
      <label for="${param}">${param}</label>
      <br>
      <input type="text" id="${param}" name="${param}">
    </div>
  `
      )
      .join("");
  } else {
    paramList.innerHTML = `<p class="error">Report not found. Please select a valid report.</p>`;
  }
}

//handles the form submission to display the JSON report data
async function showJsonOutput(event) {
  //prevent the default form submission behavior
  event.preventDefault();
  const reportname = document.getElementById("reportList").value;
  const form = document.getElementById("reportForm");
  //serialize form data into URL-encoded format
  const params = new URLSearchParams(new FormData(form)).toString();
  const jsonOutput = document.getElementById("jsonOutput");
  jsonOutput.style.display = "block";

  //checks if a valid report is selected
  if (reportname === "-- reportname -- ") {
    paramList.innerHTML = `<p class="error">Please select a valid report before generating.</p>`;
    jsonOutput.style.display = "none";
    return;
  }
  const response = await fetch(`/report/${reportname}?${params}`);

  if (response.ok) {
    //parse the JSON response
    const jsonData = await response.json();
    // Log the fetched JSON data
    console.log("Fetched JSON data:", jsonData);
    //prettify the JSON data for display
    const prettifiedJson = JSON.stringify(jsonData, null, 2);
    document.getElementById(
      "reportData"
    ).innerHTML = `<pre>${prettifiedJson}</pre>`;
  } else {
    document.getElementById(
      "reportData"
    ).innerHTML = `<p class="error">Error fetching report data. Please try again.</p>`;
  }
}

async function convert(event) {
  event.preventDefault();
  const jsonOutput = document.getElementById("jsonOutput");
  const csvOutput = document.getElementById("csvData");

  try {
    //get JSON data from the jsonOutput tab
    const jsonDataElement = jsonOutput.querySelector("pre");

    if (!jsonDataElement) {
      throw new Error("No JSON data found");
    }
    const jsonData = JSON.parse(jsonDataElement.innerText);
    console.log("Fetched JSON data:", jsonData); // Log fetched JSON data

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
    const csvContent = convertJsonToCsv(jsonData.data);
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

//convert CSV content to HTML table
function csvToHtmlTable(csvContent) {
  const rows = csvContent.split("\n");
  let tableHTML = "<table>";

  rows.forEach((row, index) => {
    const columns = row.split(",");
    tableHTML += "<tr>";

    columns.forEach((column) => {
      if (index === 0) {
        tableHTML += `<th>${column}</th>`;
      } else {
        tableHTML += `<td>${column}</td>`;
      }
    });

    tableHTML += "</tr>";
  });

  tableHTML += "</table>";
  return tableHTML;
}

//check if a variable is an object
function isObject(variable) {
  return (
    variable && typeof variable === "object" && variable.constructor === Object
  );
}

function convertJsonToCsv(jsonData) {
  //check if jsonData is an array and not empty
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    throw new Error("Invalid JSON data: Expected an array of objects.");
  }

  //check if the first element of the array is an object
  if (typeof jsonData[0] !== "object" || jsonData[0] === null) {
    throw new Error("Invalid JSON data: Expected objects in the array.");
  }

  const headers = Object.keys(jsonData[0]);
  const rows = jsonData.map((obj) => headers.map((header) => obj[header]));
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");
  return csvContent;
}

//handles the form submission to download the report
async function downloadReport(event) {
  //prevent the default form submission behavior
  event.preventDefault();
  const reportname = document.getElementById("reportList").value;
  const format = document.getElementById("format").value;
  const form = document.getElementById("reportForm");
  //serialize form data into URL-encoded format
  const params = new URLSearchParams(new FormData(form)).toString();

  //validate if both report name and format are selected
  if (!reportname || reportname === "-- reportname -- " || !format) {
    paramList.innerHTML = `<p class="error">Please select a valid report and format before downloading.</p>`;
    return;
  }

  try {
    const response = await fetch(
      `/report/${reportname}?${params}&format=${format}`
    );

    if (!response.ok) {
      throw new Error("Failed to download report");
    }
    //retrieve the binary data (blob) from the response
    const blob = await response.blob();
    //create a temporary url for the downloaded file
    const downloadUrl = URL.createObjectURL(blob);
    //create a temporary <a> element to trigger the download
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${reportname}.${format}`;
    //append the <a> element to the document body, trigger the download, and remove the element
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading report:", error);
  }
}

// tab function
function openTab(evt, tabName) {
  let i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

document.addEventListener("DOMContentLoaded", (event) => {
  document.querySelector(".tablinks").click();
});

//fetch reports when the page is loaded
document.addEventListener("DOMContentLoaded", fetchReports);
