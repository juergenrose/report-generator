/** @format */

//fetches the list of available reports and populates the dropdown menu
async function fetchReports() {
  try {
    const response = await fetch('/report');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    //parse the response body as JSON
    const data = await response.json();

    const reportList = document.getElementById('reportList');
    //populate the dropdown with the fetched reports
    reportList.innerHTML = `
      <option value="">-- Select a report --</option>
      ${data.reports
        .map((report) => `<option value="${report}">${report}</option>`)
        .join('')}
    `;
  } catch (error) {
    console.error('Error fetching reports:', error);
    alert('Failed to fetch reports. Please try again.');
  }
}

//helper function to convert camelCase to Title Case
function splitCamelCase(input) {
  const spacedString = input.replace(/([A-Z])/g, ' $1');
  const titleCaseString = spacedString.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
  return titleCaseString.trim();
}

//function to fetch parameters for the selected report
async function fetchParams(reportname = null, barcode = null) {
  //get the selected report name from the dropdown if not provided
  reportname = reportname || document.getElementById('reportList').value;
  const paramList = document.getElementById('paramList');
  const barcodeInputDiv = document.getElementById('barcodeInputDiv');

  //check if a valid report is selected
  if (!reportname || reportname === '-- Select a report --') {
    paramList.innerHTML = `<p class="error">Please select a valid report.</p>`;
    barcodeInputDiv.style.display = 'none';
    return;
  }

  //show the barcode input div
  barcodeInputDiv.style.display = 'flex';

  try {
    const response = await fetch(`/report/${reportname}`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const { parameters } = await response.json();
    if (Object.keys(parameters).length === 0) {
      paramList.innerHTML = `<p class="error">No parameters found for ${reportname}.</p>`;
      return;
    }

    //startDate is default set to the first day of the previous month
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startDate = lastMonth.toISOString().split('T')[0];

    const paramInputs = Object.keys(parameters)
      .map((param) => {
        const { type } = parameters[param];
        const inputType =
          type.toLowerCase() === 'date' ||
          type.toLowerCase() === 'smalldatetime' ||
          type.toLowerCase() === 'datetime'
            ? 'date'
            : 'text';

        let defaultValue;
        if (param === 'BIDNR' && barcode) {
          defaultValue = `value="${barcode}"`;
        } else if (inputType === 'date') {
          defaultValue = `value="${param === 'endDate' ? today : startDate}"`;
        } else {
          defaultValue = '';
        }
        const label = splitCamelCase(param);

        return `
          <div class="paramInput">
            <label for="${param}">${label} (${type})</label><br>
            <input type="${inputType}" id="${param}" name="${param}" ${defaultValue} oninput="fetchSuggestions('${reportname}', '${param}', this.value)" ${defaultValue}>
            <div id="${param}-results" class="results"></div>
          </div>
        `;
      })
      .join('');
    paramList.innerHTML = paramInputs;
  } catch (error) {
    console.error('Error fetching parameters:', error);
    paramList.innerHTML = `<p class="error">An error occurred while fetching parameters.</p>`;
  }
}

document.getElementById('barcodeInput').addEventListener('input', (event) => {
  const barcode = event.target.value;
  const reportname = document.getElementById('reportList').value;

  if (barcode) {
    fetchParamsForBarcode(reportname, barcode);
  }
});

//modified fetchParamsForBarcode function to use fetchParams
async function fetchParamsForBarcode(reportname, barcode) {
  await fetchParams(reportname, barcode);
}

//handles the form submission to display the JSON report data
async function showJsonOutput(event) {
  //prevent the default form submission behavior
  event.preventDefault();
  const reportname = document.getElementById('reportList').value;
  const form = document.getElementById('reportForm');
  const jsonOutput = document.getElementById('jsonOutput');
  const csvOutput = document.getElementById('csvOutput');
  const pdfOutput = document.getElementById('pdfOutput');

  //check if a valid report is selected
  if (reportname === '-- Select a report --') {
    document.getElementById(
      'paramList'
    ).innerHTML = `<p class="error">Please select a valid report before generating.</p>`;
    jsonOutput.style.display = 'none';
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

    document.getElementById(
      'reportData'
    ).innerHTML = `<pre>${prettifiedJson}</pre>`;

    //convert to CSV and display
    const csvContent = generateCsvContent(jsonData.data);
    const tableHTML = csvToHtmlTable(csvContent);
    csvOutput.innerHTML = tableHTML;

    //set up PDF preview but don't download it yet
    const pdfUrl = `/report/${reportname}?${params}&format=pdf`;
    const pdfResponse = await fetch(pdfUrl, { method: 'GET' });
    if (!pdfResponse.ok) {
      throw new Error(`Failed to generate PDF: ${await pdfResponse.text()}`);
    }
    const pdfBlob = await pdfResponse.blob();
    const pdfUrlObject = URL.createObjectURL(pdfBlob);
    pdfOutput.innerHTML = `<embed src="${pdfUrlObject}#zoom=125" type="application/pdf" width="100%" height="800px" />`;

    //set PDF as the default active tab
    const event = {
      currentTarget: document.querySelector(
        '.tablinks[onclick="openTab(event, \'pdfOutput\')"]'
      ),
    };
    openTab(event, 'pdfOutput');
  } catch (error) {
    console.error('Error generating report:', error);
    document.getElementById(
      'reportData'
    ).innerHTML = `<p class="error">An error occurred while generating the report.</p>`;
  }
}

//function to handle downloading the report
async function downloadReport(event) {
  event.preventDefault();
  const reportname = document.getElementById('reportList').value;
  const format = document.getElementById('format').value;

  //Validate selected report name and format
  if (reportname === '-- Select a report --' || format === '') {
    document.getElementById(
      'paramList'
    ).innerHTML = `<p class="error">Please select a valid report and format before downloading.</p>`;
    return;
  }

  const form = document.getElementById('reportForm');
  const params = new URLSearchParams(new FormData(form)).toString();
  //construct the URL with query parameters
  const url = `/report/${reportname}?${params}&format=${format}&download=true`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    //process the response based on the selected format
    if (format === 'json') {
      const jsonData = await response.json(); //get JSON data
      const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: 'application/json',
      });
      downloadBlob(jsonBlob, 'application/json', `${reportname}.json`); //download JSON file
    } else if (format === 'csv') {
      const csvData = await response.text(); //get CSV data as text
      downloadBlob(csvData, 'text/csv', `${reportname}.csv`); //download CSV file
    } else if (format === 'pdf') {
      const pdfBlob = await response.blob(); //get PDF data as blob
      downloadBlob(pdfBlob, 'application/pdf', `${reportname}.pdf`); //download PDF file
    } else {
      throw new Error('Invalid format specified.');
    }
  } catch (error) {
    console.error('Error downloading report:', error);
  }
}

//function to download a blob as a file
function downloadBlob(blobContent, mimeType, filename) {
  const blob = new Blob([blobContent], { type: mimeType }); //create a blob with the specified content and MIME type
  const url = URL.createObjectURL(blob); //create a URL for the blob
  const a = document.createElement('a'); // create an anchor element
  a.href = url; //set the URL as the href of the anchor
  a.download = filename; //set the filename for the download
  document.body.appendChild(a); //append the anchor to the document
  a.click(); //click the anchor to trigger the download
  a.remove(); //remove the anchor from the document
  URL.revokeObjectURL(url); //revoke the object URL to free up resources
}

//function to handle tab navigation
function openTab(event, tabName) {
  //get all elements with class "tabcontent" and hide them
  const tabcontent = document.getElementsByClassName('tabcontent');
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = 'none';
  }
  //get all elements with class "tablinks" and remove the "active" class
  const tablinks = document.getElementsByClassName('tablinks');
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(' active', '');
  }
  //show the current tab and add an "active" class to the button that opened the tab
  const tabElement = document.getElementById(tabName);
  if (tabElement) {
    tabElement.style.display = 'block';
  } else {
    console.error(`Tab element with id "${tabName}" not found.`);
  }
  if (event.currentTarget) {
    event.currentTarget.className += ' active';
  } else {
    console.error('Event currentTarget is null or undefined.');
  }
}

//execute code when the DOM content has finished loading
document.addEventListener('DOMContentLoaded', () => {
  fetchReports();
});
