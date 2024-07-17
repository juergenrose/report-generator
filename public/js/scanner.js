/** @format */

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const result = document.getElementById('result');
const statusMessage = document.getElementById('statusMessage');
const scanHeader = document.getElementById('scanHeader');
const scanner = new Html5Qrcode('reader');
const barcodeInput = document.getElementById('barcodeInput');
const scanBtn = document.getElementById('scanBtn');

//function to check if the scanned barcode exists in the database
async function checkBarcodeInDB(barcode) {
  // get the selected report name
  const reportname = document.getElementById('reportList').value;
  if (reportname === '-- Select a report --') {
    alert('Please select a valid report.');
    return null;
  }
  try {
    //fake a fetch request to check the barcode in the selected report
    const response = await fetch(`/report/${reportname}?BIDNR=${barcode}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Network response was not ok: ${errorText}`);
    }
    // Parse and return the response data
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("API call error:", err);
    return null;
  }
}

//function to handle manual barcode input
async function handleManualBarcodeCheck() {
  const barcode = barcodeInput.value.trim();
  if (barcode) {
    const response = await checkBarcodeInDB(barcode);
    displayBarcodeResult(response, barcode);
  }
}

//function to display the result of the barcode check
function displayBarcodeResult(response, barcode) {
  const reportname = document.getElementById('reportList').value;
  const paramList = document.getElementById('paramList');
  if (response && response.exists) {
    //if barcode exists, display success message and barcode information
    const data = response.data;
    const pdfUrl = `/report/${reportname}?BIDNR=${barcode}&format=pdf&download=true`;
    result.innerHTML = `
      <h2 class="success">Success!</h2>
      <p>Barcode information:</p>
      <pre>${JSON.stringify(data, null, 2)}</pre>
      <a href="${pdfUrl}" target="_blank">Download PDF</a>
      <button id="scanAnotherBtn">Scan another barcode</button>
    `;
  } else {
    // if barcode does not exist, display not found message
    result.innerHTML = `
      <h2 class="noCode">Not Found</h2>
      <p>Barcode: ${barcode}</p>
      <button id="scanAnotherBtn">Try Again</button>
    `;
  }

  //fetch and display parameters for the scanned barcode
  if (reportname && reportname !== '-- Select a report --') {
    fetchParamsForBarcode(reportname, barcode);
  } else {
    paramList.innerHTML = `<p class="error">Please select a valid report.</p>`;
  }

  //add event listener to the "Scan another barcode" button
  document.getElementById("scanAnotherBtn").addEventListener("click", () => {
    result.innerHTML = "";
    statusMessage.innerHTML = "";
    barcodeInput.value = "";
    startScanning();
  });
}

//function to fetch and display parameters for the scanned barcode
async function fetchParamsForBarcode(reportname, barcode) {
  const paramList = document.getElementById('paramList');
  try {
    //make a fetch request to get parameters for the selected report
    const response = await fetch(`/report/${reportname}`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const { parameters } = await response.json();
    if (Object.keys(parameters).length === 0) {
      paramList.innerHTML = `<p class="error">No parameters found for ${reportname}.</p>`;
      return;
    }

    //generate HTML for parameter inputs based on the fetched parameters
    const paramInputs = Object.keys(parameters)
      .map((param) => {
        const { type } = parameters[param];
        const inputType = type.toLowerCase() === 'date' || type.toLowerCase() === 'smalldatetime' || type.toLowerCase() === 'datetime' ? 'date' : 'text';
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
    paramList.innerHTML = paramInputs;
  } catch (error) {
    console.error('Error fetching parameters:', error);
    paramList.innerHTML = `<p class="error">An error occurred while fetching parameters.</p>`;
  }
}

//start scanning function
function startScanning() {
  scanner
    .start(
      { facingMode: "environment" }, // or { facingMode: "user" } for front camera
      {
        fps: 30,
        qrbox: { width: 350, height: 350 },
      },
      async (codeMessage) => {
        //handle code result when a QR code is scanned
        const barcode = codeMessage;
        const response = await checkBarcodeInDB(barcode);
        displayBarcodeResult(response, barcode);

        //stop the scanner after a barcode is scanned
        scanner.stop();
        document.getElementById("reader").style.display = "none";
        scanHeader.style.display = "none";
        stopBtn.style.display = "none";
        startBtn.style.display = "none";
      }
    )
    .then(() => {
      startBtn.style.display = "none";
      stopBtn.style.display = "block";
    })
    .catch((err) => {
      console.error(`Unable to start scanning, error: ${err}`);
    });
}

//stop scanning function
stopBtn.addEventListener("click", () => {
  scanner
    .stop()
    .then(() => {
      console.log("Scanning stopped.");
      startBtn.style.display = "block";
      stopBtn.style.display = "none";
      scanHeader.style.display = "block";
    })
    .catch((err) => {
      console.error(`Unable to stop scanning, error: ${err}`);
    });
});

document.addEventListener("DOMContentLoaded", () => {
  //automatically click the first tab when the page loads
  const firstTab = document.querySelector(
    ".tablinks[onclick=\"openTab(event, 'jsonOutput')\"]"
  );
  if (firstTab) {
    firstTab.click();
  }
  fetchReports();

  //add click event listener to the Scan Code button
  scanBtn.addEventListener("click", () => {
    const scannerTab = document.querySelector(
      ".tablinks[onclick=\"openTab(event, 'scannerOutput')\"]"
    );
    if (scannerTab) {
      scannerTab.click();
      startScanning();
    }
  });
});
