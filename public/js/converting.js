//helper function to check if a value is an object (and not an array)
function isObject(obj) {
  return obj && typeof obj === "object" && !Array.isArray(obj);
}

//main function to handle conversion based on the selected format (CSV or PDF)
async function convert(event) {
  event.preventDefault();
  const format = document.getElementById("format").value;
  if (format === "csv") {
    convertJsonToCsv(event);
  } else if (format === "pdf") {
    convertToPDF(event);
  }
}

//function to generate CSV content from JSON data
function generateCsvContent(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return "";
  }
  //extract headers from the first object in the data array
  const headers = Object.keys(data[0]);
  //map each row of data to CSV format
  const csvRows = data.map((row) =>
    //map each header to JSON stringified cell value or empty string, join with commas
    headers.map((header) => JSON.stringify(row[header] || "")).join(",")
  );
  //join headers with comma, concatenate with CSV rows joined by newline character
  return `${headers.join(",")}\n${csvRows.join("\n")}`;
}

//function to convert CSV content to an HTML table
function csvToHtmlTable(csv) {
  //trim whitespace, split CSV into rows
  const rows = csv.trim().split("\n");
  //split first row into header cells
  const headerRow = rows[0].split(",");
  //slice remaining rows as data rows
  const dataRows = rows.slice(1);

  //construct HTML table structure using template literals
  return `
    <table>
      <thead>
        <tr>${headerRow.map((header) => `<th>${header}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${dataRows
          .map(
            (row) =>
              `<tr>${row
                .split(",")
                .map((cell) => `<td>${cell}</td>`)
                .join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

//function to convert JSON data to CSV and display it
async function convertJsonToCsv(event) {
  event.preventDefault();
  const jsonOutput = document.getElementById("jsonOutput");
  const csvOutput = document.getElementById("csvData");

  try {
    //find the JSON data element within the JSON output section
    const jsonDataElement = jsonOutput.querySelector("pre");
    if (!jsonDataElement) {
      throw new Error("No JSON data found");
    }
    //parse the JSON data
    const jsonData = JSON.parse(jsonDataElement.innerText);
    //validate the JSON data structure
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
    //generate CSV content from the JSON data
    const csvContent = generateCsvContent(jsonData.data);
    //convert CSV content to an HTML table
    const tableHTML = csvToHtmlTable(csvContent);
    //display the HTML table
    csvOutput.innerHTML = tableHTML;
    //switch to the CSV output tab
    openTab(event, "csvOutput");
  } catch (error) {
    //log and display the error if any occurs during the conversion
    console.error("Error converting JSON to CSV:", error);
    csvOutput.innerHTML = `<p class="error">Error converting JSON to CSV. Please try again.</p>`;
  }
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

//helper function to parse a CSV row correctly
function parseCsvRow(rowContent) {
  //regular expression to match CSV fields, accounting for quoted fields with commas
  const regex = /(?:,|^)"((?:""|[^"])+)"(?:,|$)|([^,]+)/g;
  const cells = [];
  let match;
  //loop through all matches of the regex in the row content
  while ((match = regex.exec(rowContent)) !== null) {
    //if the match is a quoted field, use the first capturing group; otherwise, use the second capturing group
    const cell = match[1] || match[2];
    cells.push(cell.replace(/""/g, '"')); //replace double quotes within quoted fields
  }
  return cells;
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
    openTab(event, "pdfOutput");
  } catch (error) {
    console.error("Error generating PDF:", error);
    pdfOutput.innerHTML = `<p class="error">Error generating PDF: ${error.message}. Please try again.</p>`;
  }
}
