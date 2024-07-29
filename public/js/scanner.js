/** @format */

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusMessage = document.getElementById('statusMessage');
const scanHeader = document.getElementById('scanHeader');
const scanner = new Html5Qrcode('reader');
const barcodeInput = document.getElementById('barcodeInput');
const scanBtn = document.getElementById('scanBtn');
const reportData = document.getElementById('reportData');

//function to check if the scanned barcode exists in the database
async function checkBarcodeInDB(barcode) {
  // get the selected report name
  const reportname = document.getElementById('reportList').value;
  if (reportname === '-- Select a report --') {
    alert('Please select a valid report.');
    return null;
  }
  try {
    //make a fetch request to check the barcode in the selected report
    const response = await fetch(`/report/${reportname}?BIDNR=${barcode}`);
    if (!response.ok) {
      const errorText = await response.text();
      reportData.innerHTML = `<p>${errorText}r</p>`;
      throw new Error(`Network response was not ok: ${errorText}`);
    }
    //parse and return the response data
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API call error:', error);
    reportData.innerHTML = `<p class="error>API call error: ${error}</p>`;
    return null;
  }
}

//function to handle manual barcode input
async function handleManualBarcodeCheck() {
  const barcode = barcodeInput.value.trim();
  if (barcode) {
    //check the barcode in the database and display the result
    const response = await checkBarcodeInDB(barcode);
    await displayBarcodeResult(response, barcode);
    //generate and preview the report
    await generateReportAndPreview();
  }
}

//function to display the result of the barcode check
async function displayBarcodeResult(response, barcode) {
  const reportname = document.getElementById('reportList').value;
  const paramList = document.getElementById('paramList');
  if (response && response.exists) {
    //display the response data if the barcode exists in the database
    const data = response.data;
    paramList.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  } else {
    //display an error message if the barcode is not found
    paramList.innerHTML = `<p class="error">Barcode not found in ${reportname}.</p>`;
  }

  if (reportname && reportname !== '-- Select a report --') {
    //fetch parameters for the selected report
    await fetchParamsForBarcode(reportname, barcode);
  } else {
    //display an error message if no valid report is selected
    paramList.innerHTML = `
      <div class="errCode">
        <p>Please select a valid report.</p>
        <p>The barcode scanner works only with a selected report.</p>
      </div>`;
  }
}

//function to fetch parameters for the selected report
async function fetchParamsForBarcode(reportname, barcode) {
  const paramList = document.getElementById('paramList');

  try {
    //make a fetch request to get parameters for the selected report
    const response = await fetch(`/report/${reportname}`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const { parameters } = await response.json();

    if (!Object.keys(parameters).length) {
      //display an error message if no parameters are found
      reportData.innerHTML = `<p class="error">No parameters found for ${reportname}.</p>`;
      return;
    }

    //display the parameters in a form format
    paramList.innerHTML = Object.entries(parameters)
      .map(([param, { type }]) => {
        const inputType = ['date', 'smalldatetime', 'datetime'].includes(
          type.toLowerCase()
        )
          ? 'date'
          : 'text';
        const defaultValue = param === 'BIDNR' ? `value="${barcode}"` : '';
        const label = splitCamelCase(param);
        return `
          <div class="paramInput">
            <label for="${param}">${label} (${type})</label><br>
            <input type="${inputType}" id="${param}" name="${param}" ${defaultValue}>
            <div id="${param}-results" class="results"></div>
          </div>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Error fetching parameters:', error);
    paramList.innerHTML = `<p class="error">An error occurred while fetching parameters.</p>`;
  }
}

//function to split camel case text into words
function splitCamelCase(text) {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2');
}

//function to generate a report and display PDF preview
async function generateReportAndPreview() {
  const form = document.getElementById('reportForm');
  const pdfOutput = document.getElementById('pdfOutput');
  const reportname = document.getElementById('reportList').value;

  try {
    //generate the PDF URL with the form parameters
    const params = new URLSearchParams(new FormData(form)).toString();
    const pdfUrl = `/report/${reportname}?${params}&format=pdf`;
    //fetch the PDF from the server
    const pdfResponse = await fetch(pdfUrl, { method: 'GET' });
    if (!pdfResponse.ok) {
      throw new Error(`Failed to generate PDF: ${await pdfResponse.text()}`);
    }
    //create a blob and object URL for the PDF
    const pdfBlob = await pdfResponse.blob();
    const pdfUrlObject = URL.createObjectURL(pdfBlob);
    //display the PDF preview
    pdfOutput.innerHTML = `<embed src="${pdfUrlObject}#zoom=110" type="application/pdf" width="100%" height="600px" />`;

    //simulate a click event to open the PDF tab
    const event = {
      currentTarget: document.querySelector(
        '.tablinks[onclick="openTab(event, \'pdfOutput\')"]'
      ),
    };
    openTab(event, 'pdfOutput');
  } catch (error) {
    console.error('Error generating report:', error);
    reportData.innerHTML = `<p class="error">An error occurred while generating the report.</p>
    <p class="error">${error}</p>`;
    const event = {
      currentTarget: document.querySelector(
        '.tablinks[onclick="openTab(event, \'jsonOutput\')"]'
      ),
    };
    openTab(event, 'jsonOutput');
  }
}

// Function to start scanning
function startScanning() {
  scanner
    .start(
      { facingMode: 'environment' }, // or { facingMode: "user" } for front camera
      {
        fps: 10,
        qrbox: { width: 350, height: 350 },
      },
      async (codeMessage) => {
        //process the scanned barcode
        const barcode = codeMessage;
        const response = await checkBarcodeInDB(barcode);
        await displayBarcodeResult(response, barcode);
        await generateReportAndPreview();
        try {
          //check if the scanner is running before stopping it
          if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
            await scanner.stop();
            await scanner.clear();
          }
        } catch (err) {
          console.error('Error stopping the scanner:', err);
        }
        scanHeader.style.display = 'none';
        stopBtn.style.display = 'none';
        startBtn.style.display = 'none';
      }
    )
    .then(() => {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
    })
    .catch((err) => {
      console.error(`Unable to start scanning, error: ${err}`);
    });
}

//stop scanning function
stopBtn.addEventListener('click', async () => {
  try {
    //check if the scanner is running before stopping it
    if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
      await scanner.stop();
    }
    console.log('Scanning stopped.');
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    scanHeader.style.display = 'block';
  } catch (err) {
    console.error(`Unable to stop scanning, error: ${err}`);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  //automatically click the first tab when the page loads
  const firstTab = document.querySelector(
    '.tablinks[onclick="openTab(event, \'jsonOutput\')"]'
  );
  if (firstTab) {
    firstTab.click();
  }
  //fetch the reports when the page loads
  fetchReports();

  //add click event listener to the Scan Code button
  scanBtn.addEventListener('click', () => {
    const scannerTab = document.querySelector(
      '.tablinks[onclick="openTab(event, \'scannerOutput\')"]'
    );
    if (scannerTab) {
      //open the scanner tab and start scanning
      scannerTab.click();
      startScanning();
    }
  });
  //add input event listener to handle manual barcode checks
  barcodeInput.addEventListener('input', handleManualBarcodeCheck);
});
