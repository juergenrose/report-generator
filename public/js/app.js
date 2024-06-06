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


//fetch reports when the page is loaded
document.addEventListener("DOMContentLoaded", fetchReports);
