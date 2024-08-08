/**
 * Helper function to check if a value is an object (and not an array).
 * @param {any} obj - The value to check.
 * @returns {boolean} True if the value is an object and not an array, false otherwise.
 */
function isObject(obj) {
  return obj && typeof obj === "object" && !Array.isArray(obj);
}

/**
 * Function to flatten a nested object.
 * @param {Object} obj - The object to flatten.
 * @param {string} [parentPrefix=""] - The prefix for nested keys.
 * @returns {Object} The flattened object.
 */
function flattenObject(obj, parentPrefix = "") {
  let result = {}; // Initialize the result object

  // Iterate over all properties of the object
  for (let key in obj) {
    if (!obj.hasOwnProperty(key)) continue; // Skip inherited properties

    // Construct the new property name
    let propName = parentPrefix ? `${parentPrefix}.${key}` : key;

    // If the property is an object, recursively flatten it
    if (typeof obj[key] === "object" && obj[key] !== null) {
      Object.assign(result, flattenObject(obj[key], propName));
    } else {
      // Otherwise, add the property to the result
      result[propName] = obj[key];
    }
  }
  return result;
}

/**
 * Function to generate CSV content from JSON data.
 * @param {Array} data - The JSON data to convert.
 * @returns {string} The CSV content.
 */
function generateCsvContent(data) {
  if (!data || data.length === 0) return ""; // Return an empty string if data is empty

  // Flatten each item in the data array
  let flatJson = data.map((item) => flattenObject(item));
  // Get the headers (keys) from the first item in the flattened JSON
  let headers = Object.keys(flatJson[0]);

  // Map each row in the flattened JSON to a CSV row
  let csvArray = flatJson.map((row) => {
    return headers
      .map((header) => `"${String(row[header]).replace(/"/g, '""')}"`) // Escape double quotes in values
      .join(","); // Join values with commas
  });
  csvArray.unshift(headers.join(",")); // Add headers at the top of the CSV
  return csvArray.join("\r\n"); // Join all rows with newline characters
}

/**
 * Function to convert JSON data to CSV and trigger a download.
 * @param {Object} jsonData - The JSON data to convert.
 */
function convertJsonToCsv(jsonData) {
  if (!jsonData.data || !Array.isArray(jsonData.data)) {
    console.error("Invalid data: No data array found.");
    return;
  }
  // Assume jsonData.data is an array of objects
  const csvContent = generateCsvContent(jsonData.data);
  downloadBlob(csvContent, "text/csv", "report.csv");
}

/**
 * Function to download a blob as a file.
 * @param {string} content - The content to download.
 * @param {string} type - The MIME type of the content.
 * @param {string} filename - The name of the file to download.
 */
function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type: type }); // Create a blob with the specified content and MIME type
  const url = URL.createObjectURL(blob); // Create a URL for the blob
  const a = document.createElement("a"); // Create an anchor element
  a.href = url; // Set the URL as the href of the anchor
  a.download = filename; // Set the filename for the download
  document.body.appendChild(a); // Append the anchor to the document
  a.click(); // Click the anchor to trigger the download
  a.remove(); // Remove the anchor from the document
  URL.revokeObjectURL(url); // Revoke the object URL to free up resources
}

/**
 * Function to convert CSV content to an HTML table.
 * @param {string} csvContent - The CSV content to convert.
 * @returns {string} The HTML table as a string.
 */
function csvToHtmlTable(csvContent) {
  const rows = csvContent.split("\n");
  const table = document.createElement("table");

  rows.forEach((rowContent, rowIndex) => {
    const row = document.createElement("tr");
    // Use a regular expression to properly split CSV row considering fields with commas and quotes
    const cells = rowContent.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

    cells.forEach((cellContent) => {
      const cell = document.createElement(rowIndex === 0 ? "th" : "td");
      // Remove surrounding quotes from cell content if present
      cell.textContent = cellContent.replace(/^"(.+(?="$))"$/, "$1").trim();
      row.appendChild(cell);
    });

    table.appendChild(row);
  });
  return table.outerHTML;
}

/**
 * Async function to handle PDF generation.
 * @param {Event} event - The event object.
 */
async function convertToPDF(event) {
  event.preventDefault();
  // Fetch the selected report name from the dropdown
  const reportname = document.getElementById("reportList").value;
  const jsonOutput = document.getElementById("jsonOutput");
  const pdfOutput = document.getElementById("pdfData");
  const form = document.getElementById("reportForm");
  const format = "pdf";

  // Extract form data and remove the 'reportList' field
  const formData = new FormData(form);
  formData.delete("reportList");
  const params = new URLSearchParams(formData).toString(); // Convert form data to URL parameters

  try {
    // Find and parse JSON data from the JSON output section
    const jsonDataElement = jsonOutput.querySelector("pre");
    if (!jsonDataElement) {
      throw new Error("No JSON data found");
    }
    const jsonData = JSON.parse(jsonDataElement.innerText);
    console.log("Fetched JSON data:", jsonData);
    // Validate the structure of JSON data
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
    // Construct the URL for fetching the PDF, including parameters and format
    const url = `/report/${reportname}?${params}&format=${format}`;
    console.log("Request URL:", url);
    // Send a GET request to generate the PDF
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate PDF: ${errorText}`);
    }
    // Convert the response to a blob representing the PDF
    const pdfBlob = await response.blob();
    // Create a URL for the PDF blob and display it in the PDF output section
    const pdfUrl = URL.createObjectURL(pdfBlob);
    console.log("PDF URL:", pdfUrl);

    pdfOutput.innerHTML = `<embed src="${pdfUrl}" type="application/pdf" width="100%" height="800px" />`;
    const event = {
      currentTarget: document.querySelector(
        ".tablinks[onclick=\"openTab(event, 'pdfOutput')\"]"
      ),
    };
    openTab(event, "pdfOutput");
  } catch (error) {
    console.error("Error generating PDF:", error);
    pdfOutput.innerHTML = `<p class="error">Error generating PDF: ${error.message}. Please try again.</p>`;
  }
}
