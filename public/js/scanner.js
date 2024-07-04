const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const result = document.getElementById("result");
const scanner = new Html5Qrcode("reader");

startBtn.addEventListener("click", () => {
  scanner
    .start(
      { facingMode: "environment" }, // or { facingMode: "user" } for front camera
      {
        fps: 20,
        qrbox: { width: 350, height: 350 },
      },
      (qrCodeMessage) => {
        // Handle QR Code result
        document.getElementById("result").innerHTML = `
        <h2>Success!</h2>
        <p>Code information</p>
        <p><a href="${result}">${result}</a></p>
        `;
        scanner.stop();
        document.getElementById("reader").remove();
        document.getElementById("startBtn").innerHTML="Retry";
        startBtn.style.display = "block";
        stopBtn.style.display = "none";
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
});

stopBtn.addEventListener("click", () => {
  scanner
    .stop()
    .then(() => {
      console.log("Scanning stopped.");
      startBtn.style.display = "block";
      stopBtn.style.display = "none";
    })
    .catch((err) => {
      console.error(`Unable to stop scanning, error: ${err}`);
    });
});



document.addEventListener("DOMContentLoaded", () => {
  // Automatically click the first tab when the page loads
  const firstTab = document.querySelector(
    ".tablinks[onclick=\"openTab(event, 'scannerOutput')\"]"
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
