/**
 * Event listener for DOMContentLoaded to initialize various elements and functions.
 */
document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const scanHeader = document.getElementById("scanHeader");
  const scanner = new Html5Qrcode("reader");
  const reportData = document.getElementById("reportData");

  /**
   * Function to get the report name based on the context.
   * @returns {string} The report name.
   */
  function getReportName() {
    // Check if the reportList element exists and return its value
    if (document.getElementById("reportList")) {
      return document.getElementById("reportList").value;
    }
    // Extract the report name from the URL path
    return window.location.pathname.split("/").pop();
  }

  /**
   * Function to check if the scanned barcode exists in the database.
   * @param {string} barcode - The scanned barcode.
   * @returns {Promise<Object|null>} The response data or null if an error occurred.
   */
  async function checkBarcodeInDB(barcode) {
    const reportname = getReportName();
    if (reportname === "-- Select a report --") {
      alert("Please select a valid report.");
      return null;
    }
    try {
      // Fetch the report data for the given barcode
      const response = await fetch(
        `/api/report/${reportname}?barcode=${barcode}`
      );
      if (!response.ok) {
        const errorText = await response.text();
        reportData.innerHTML = `<p>${errorText}</p>`;
        throw new Error(`Network response was not ok: ${errorText}`);
      }
      // Parse and return the response data
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("API call error:", error);
      reportData.innerHTML = `<p class="error">API call error: ${error}</p>`;
      return null;
    }
  }

  /**
   * Function to display the result of the barcode check.
   * @param {Object} response - The response data from the barcode check.
   * @param {string} barcode - The scanned barcode.
   */
  async function displayBarcodeResult(response, barcode) {
    const reportname = getReportName();
    const paramList = document.getElementById("paramList");
    if (response && response.exists) {
      const data = response.data;
      // Display the data in a preformatted text block
      paramList.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    } else {
      // Display an error message if the barcode is not found
      paramList.innerHTML = `<p class="error">Barcode not found in ${reportname}.</p>`;
    }

    if (reportname && reportname !== "-- Select a report --") {
      // Fetch additional parameters for the barcode
      await fetchParamsForBarcode(reportname, barcode);
    } else {
      // Display a message if a valid report is not selected
      paramList.innerHTML = `
      <div class="errCode">
        <p>Please select a valid report.</p>
        <p>The barcode scanner works only with a selected report.</p>
      </div>`;
    }
  }

  /**
   * Function to generate a report and display a PDF preview.
   * @param {string} barcode - The scanned barcode.
   */
  async function generateReportAndPreview(barcode) {
    const form = document.getElementById("reportForm");
    const pdfOutput = document.getElementById("pdfOutput");
    const reportname = getReportName();

    try {
      // Construct the URL parameters from the form data and include the barcode
      const params = new URLSearchParams(new FormData(form));
      params.set("BIDNR", barcode); // Ensure the barcode parameter is set
      const pdfUrl = `/api/report/${reportname}/generate?${params.toString()}&format=pdf`;
      const pdfResponse = await fetch(pdfUrl, { method: "GET" });
      if (!pdfResponse.ok) {
        throw new Error(`Failed to generate PDF: ${await pdfResponse.text()}`);
      }
      // Convert the response to a Blob and create a URL for the PDF
      const pdfBlob = await pdfResponse.blob();
      const pdfUrlObject = URL.createObjectURL(pdfBlob);
      // Display the PDF in an embed element
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
   * Function to start scanning barcodes.
   */
  function startScanning() {
    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 350, height: 350 },
        },
        async (codeMessage) => {
          const barcode = codeMessage;
          // Check if the barcode exists in the database and display the result
          const response = await checkBarcodeInDB(barcode);
          await displayBarcodeResult(response, barcode);
          // Generate the report and display the PDF preview
          await generateReportAndPreview(barcode);
          try {
            if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
              await scanner.stop();
              await scanner.clear();
            }
          } catch (err) {
            console.error("Error stopping the scanner:", err);
          }
          // Hide scan header and buttons after scanning
          scanHeader.style.display = "none";
          stopBtn.style.display = "none";
          startBtn.style.display = "none";
        }
      )
      .then(() => {
        // Update button visibility after starting the scanner
        startBtn.style.display = "none";
        stopBtn.style.display = "block";
      })
      .catch((err) => {
        console.error(`Unable to start scanning, error: ${err}`);
      });
  }

  // Event listener for the stop button to stop scanning
  stopBtn.addEventListener("click", async () => {
    try {
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        await scanner.stop();
      }
      console.log("Scanning stopped.");
      // Update button visibility after stopping the scanner
      startBtn.style.display = "block";
      stopBtn.style.display = "none";
      scanHeader.style.display = "block";
    } catch (err) {
      console.error(`Unable to stop scanning, error: ${err}`);
    }
  });

  // Event listener for the scan button to start scanning
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

  // Automatically click the first tab to initialize the view
  const firstTab = document.querySelector(
    ".tablinks[onclick=\"openTab(event, 'jsonOutput')\"]"
  );
  if (firstTab) {
    firstTab.click();
  }

  fetchReports();
});
