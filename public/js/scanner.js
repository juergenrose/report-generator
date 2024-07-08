const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const result = document.getElementById("result");
const scanHeader = document.getElementById("scanHeader");
const scanner = new Html5Qrcode("reader");

startBtn.addEventListener("click", startScanning);

function startScanning() {
  scanner
    .start(
      { facingMode: "environment" }, // or { facingMode: "user" } for front camera
      {
        fps: 20,
        qrbox: { width: 350, height: 350 },
      },
      (codeMessage) => {
        // Handle QR Code result
        document.getElementById("result").innerHTML = `
        <h2>Success!</h2>
        <p>Code information:</p>
        <p><a href="${codeMEssage}">${codeMessage}</a></p>
        <button id="scanAnotherBtn">Scan another barcode</button>
        `;
        scanner.stop();
        document.getElementById("reader").style.display = "none";
        scanHeader.style.display = "none";
        stopBtn.style.display = "none";

        document
          .getElementById("scanAnotherBtn")
          .addEventListener("click", () => {
            document.getElementById("reader").style.display = "block";
            startBtn.innerHTML = "Start Scanning";
            result.innerHTML = "";
            startScanning();
          });
      },
      (errorMessage) => {
        console.log(`QR Code no longer in front of camera.`);
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
  // Automatically click the first tab when the page loads
  const firstTab = document.querySelector(
    ".tablinks[onclick=\"openTab(event, 'jsonOutput')\"]"
  );
  if (firstTab) {
    firstTab.click();
    startBtn.style.display = "block";
    stopBtn.style.display = "none";
  }
  fetchReports();

  // Add click event listener to the Scan Code button
  const scanBtn = document.getElementById("scanBtn");
  scanBtn.addEventListener("click", () => {
    const scannerTab = document.querySelector(
      ".tablinks[onclick=\"openTab(event, 'scannerOutput')\"]"
    );
    if (scannerTab) {
      scannerTab.click();
      startBtn.style.display = "block";
      stopBtn.style.display = "none";
    }
  });
});
