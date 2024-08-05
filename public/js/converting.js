//helper function to check if a value is an object (and not an array)
function isObject(obj) {
  return obj && typeof obj === "object" && !Array.isArray(obj);
}

//function to flatten a nested object
function flattenObject(obj, parentPrefix = "") {
  let result = {}; // initialize the result object

  //iterate over all properties of the object
  for (let key in obj) {
    if (!obj.hasOwnProperty(key)) continue; // skip inherited properties

    //construct the new property name
    let propName = parentPrefix ? `${parentPrefix}.${key}` : key;

    //if the property is an object, recursively flatten it
    if (typeof obj[key] === "object" && obj[key] !== null) {
      Object.assign(result, flattenObject(obj[key], propName));
    } else {
      // otherwise, add the property to the result
      result[propName] = obj[key];
    }
  }
  return result;
}

//function to generate CSV content from JSON data
function generateCsvContent(data) {
  if (!data || data.length === 0) return ""; // return an empty string if data is empty

  //flatten each item in the data array
  let flatJson = data.map((item) => flattenObject(item));

  // get the headers (keys) from the first item in the flattened JSON
  let headers = Object.keys(flatJson[0]);

  // map each row in the flattened JSON to a CSV row
  let csvArray = flatJson.map((row) => {
    return headers
      .map((header) => `"${String(row[header]).replace(/"/g, '""')}"`) // escape double quotes in values
      .join(","); // join values with commas
  });

  csvArray.unshift(headers.join(",")); // add headers at the top of the CSV

  return csvArray.join("\r\n"); // join all rows with newline characters
}

//function to convert JSON data to CSV and display it
function convertJsonToCsv(jsonData) {
  if (!jsonData.data || !Array.isArray(jsonData.data)) {
    console.error("Invalid data: No data array found.");
    return;
  }

  // Assume jsonData.data is an array of objects
  const csvContent = generateCsvContent(jsonData.data);
  downloadBlob(csvContent, "text/csv", "report.csv");
}

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type: type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

//convert CSV content to HTML table
function csvToHtmlTable(csvContent) {
  const rows = csvContent.split("\n");
  const table = document.createElement("table");

  rows.forEach((rowContent, rowIndex) => {
    const row = document.createElement("tr");
    //use a regular expression to properly split CSV row considering fields with commas and quotes
    const cells = rowContent.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

    cells.forEach((cellContent) => {
      const cell = document.createElement(rowIndex === 0 ? "th" : "td");
      //remove surrounding quotes from cell content if present
      cell.textContent = cellContent.replace(/^"(.+(?="$))"$/, "$1").trim();
      row.appendChild(cell);
    });

    table.appendChild(row);
  });
  return table.outerHTML;
}

//async function to handle PDF generation
async function convertToPDF(event) {
  event.preventDefault();

  //fetch the selected report name from the dropdown
  const reportname = document.getElementById("reportList").value;
  const jsonOutput = document.getElementById("jsonOutput");
  const pdfOutput = document.getElementById("pdfData");
  const form = document.getElementById("reportForm");
  const format = "pdf";

  //extract form data and remove the 'reportList' field
  const formData = new FormData(form);
  formData.delete("reportList");
  const params = new URLSearchParams(formData).toString(); //convert form data to URL parameters

  try {
    //find and parse JSON data from the JSON output section
    const jsonDataElement = jsonOutput.querySelector("pre");
    if (!jsonDataElement) {
      throw new Error("No JSON data found");
    }
    const jsonData = JSON.parse(jsonDataElement.innerText);
    console.log("Fetched JSON data:", jsonData);
    //validate the structure of JSON data
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
    //construct the URL for fetching the PDF, including parameters and format
    const url = `/report/${reportname}?${params}&format=${format}`;
    console.log("Request URL:", url);
    //send a GET request to generate the PDF
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate PDF: ${errorText}`);
    }
    //convert the response to a blob representing the PDF
    const pdfBlob = await response.blob();
    //create a URL for the PDF blob and display it in the PDF output section
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
