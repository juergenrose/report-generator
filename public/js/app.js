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
  if (reportname === "-- Select a report --") {
    paramList.innerHTML = `<p class="error">Please select a valid report.</p>`;
    return;
  }
  try {
    const response = await fetch(`/report/${reportname}`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const { parameters } = await response.json();
    if (Object.keys(parameters).length === 0) {
      paramList.innerHTML = `<p class="error">No parameters found for ${reportname}.</p>`;
      return;
    }

    const paramInputs = Object.keys(parameters)
      .map((param) => {
        const { type } = parameters[param];
        const inputType = type === "date" ? "date" : "text";
        return `
        <div class="paramInput">
          <label for="${param}">${param} (${type})</label><br>
          <input type="${inputType}" id="${param}" name="${param}" oninput="fetchSuggestions('${reportname}', '${param}', this.value)">
          <div id="${param}-results" class="results"></div>
        </div>
      `;
      })
      .join("");
    //populate the parameter list with generated input fields
    paramList.innerHTML = paramInputs;
  } catch (error) {
    console.error("Error fetching parameters:", error);
    //display error message
    paramList.innerHTML = `<p class="error">An error occurred while fetching parameters.</p>`;
  }
}

//handles the form submission to display the JSON report data
async function showJsonOutput(event) {
  //prevent the default form submission behavior
  event.preventDefault();
  const reportname = document.getElementById("reportList").value;
  const form = document.getElementById("reportForm");
  const jsonOutput = document.getElementById("jsonOutput");
  //check if a valid report is selected
  if (reportname === "-- Select a report --") {
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

//function to handle downloading the report
async function downloadReport(event) {
  event.preventDefault();
  const reportname = document.getElementById("reportList").value;
  const format = document.getElementById("format").value;
  const form = document.getElementById("reportForm");
  //Validate selected report name and format
  if (reportname === "-- Select a report --") {
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
function openTab(event, tabName) {
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
  //show the current tab and add an "active" class to the button that opened the tab
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

//execute code when the DOM content has finished loading
document.addEventListener("DOMContentLoaded", () => {
  fetchReports();
});
