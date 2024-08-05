document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const scanHeader = document.getElementById("scanHeader");
  const scanner = new Html5Qrcode("reader");
  const reportData = document.getElementById("reportData");

  //function to check if the scanned barcode exists in the database
  async function checkBarcodeInDB(barcode) {
    // get the selected report name
    const reportname = document.getElementById("reportList").value;
    if (reportname === "-- Select a report --") {
      alert("Please select a valid report.");
      return null;
    }
    try {
      //make a fetch request to check the barcode in the selected report
      const response = await fetch(`/report/${reportname}?barcode=${barcode}`);
      if (!response.ok) {
        const errorText = await response.text();
        reportData.innerHTML = `<p>${errorText}r</p>`;
        throw new Error(`Network response was not ok: ${errorText}`);
      }
      //parse and return the response data
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("API call error:", error);
      reportData.innerHTML = `<p class="error>API call error: ${error}</p>`;
      return null;
    }
  }

  //function to display the result of the barcode check
  async function displayBarcodeResult(response, barcode) {
    const reportname = document.getElementById("reportList").value;
    const paramList = document.getElementById("paramList");
    if (response && response.exists) {
      //display the response data if the barcode exists in the database
      const data = response.data;
      paramList.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    } else {
      //display an error message if the barcode is not found
      paramList.innerHTML = `<p class="error">Barcode not found in ${reportname}.</p>`;
    }

    if (reportname && reportname !== "-- Select a report --") {
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

  //function to generate a report and display PDF preview
  async function generateReportAndPreview() {
    const form = document.getElementById("reportForm");
    const pdfOutput = document.getElementById("pdfOutput");
    const reportname = document.getElementById("reportList").value;

    try {
      //generate the PDF URL with the form parameters
      const params = new URLSearchParams(new FormData(form)).toString();
      const pdfUrl = `/report/${reportname}?${params}&format=pdf`;
      //fetch the PDF from the server
      const pdfResponse = await fetch(pdfUrl, { method: "GET" });
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
          ".tablinks[onclick=\"openTab(event, 'pdfOutput')\"]"
        ),
      };
      openTab(event, "pdfOutput");
    } catch (error) {
      console.error("Error generating report:", error);
      reportData.innerHTML = `<p class="error">An error occurred while generating the report.</p>
    <p class="error">${error}</p>`;
      const event = {
        currentTarget: document.querySelector(
          ".tablinks[onclick=\"openTab(event, 'jsonOutput')\"]"
        ),
      };
      openTab(event, "jsonOutput");
    }
  }

  // Function to start scanning
  function startScanning() {
    scanner
      .start(
        { facingMode: "environment" }, // or { facingMode: "user" } for front camera
        {
          fps: 10,
          qrbox: { width: 350, height: 350 },
        },
        async (codeMessage) => {
          const barcode = codeMessage;
          const response = await checkBarcodeInDB(barcode);
          await displayBarcodeResult(response, barcode);
          await generateReportAndPreview();
          try {
            if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
              await scanner.stop();
              await scanner.clear();
            }
          } catch (err) {
            console.error("Error stopping the scanner:", err);
          }
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

  // Stop scanning function
  stopBtn.addEventListener("click", async () => {
    try {
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        await scanner.stop();
      }
      console.log("Scanning stopped.");
      startBtn.style.display = "block";
      stopBtn.style.display = "none";
      scanHeader.style.display = "block";
    } catch (err) {
      console.error(`Unable to stop scanning, error: ${err}`);
    }
  });

  // Event delegation for scanBtn click event
  document.addEventListener("click", (event) => {
    if (event.target.closest("#scanBtn")) {
      console.log("Scan button clicked");
      const scannerTab = document.querySelector(
        ".tablinks[onclick=\"openTab(event, 'scannerOutput')\"]"
      );
      if (scannerTab) {
        scannerTab.click();
        startScanning();
      }
    }
  });

  // Automatically click the first tab when the page loads
  const firstTab = document.querySelector(
    ".tablinks[onclick=\"openTab(event, 'jsonOutput')\"]"
  );
  if (firstTab) {
    firstTab.click();
  }

  // Fetch the reports when the page loads
  fetchReports();
});
