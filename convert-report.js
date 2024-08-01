const json2csv = require("json2csv");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const xml2js = require("xml2js");

// Base class for handling reports with utility functions
class ReportHandler {
  constructor() {}

  // Helper function to flatten nested objects
  static flattenObject(obj, parent = "", res = {}) {
    for (let key in obj) {
      const propName = parent ? `${parent}.${key}` : key;
      if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
        // Recursively flatten the object
        ReportHandler.flattenObject(obj[key], propName, res);
      } else {
        res[propName] = obj[key];
      }
    }
    return res;
  }
}

// Class to handle loading and accessing country flags
class CountryFlags {
  constructor() {
    this.flags = {}; // Initialize an empty object to store flags
  }

  // Method to load country flags from an XML file
  async loadCountryFlags() {
    try {
      const xmlFile = path.join(__dirname, "countryFlags.xml");
      const xmlData = fs.readFileSync(xmlFile, "utf-8");
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlData);
      for (const [code, urls] of Object.entries(result.flags)) {
        this.flags[code] = urls[0]; // Store flag URLs by country code
      }
    } catch (err) {
      console.error("Error loading country flags:", err);
      throw new Error("Failed to load country flags.");
    }
  }

  // Method to get the flag URL for a given country code
  getFlagUrl(countryCode) {
    return this.flags[countryCode] || "";
  }
}

// Class to handle CSV report generation, inheriting from ReportHandler
class CsvReportHandler extends ReportHandler {
  constructor() {
    super();
  }

  // Method to generate and save CSV report
  async handleCsvReport(reportname, reportData) {
    try {
      const data = reportData.data || reportData;
      const flattenedData = data.map((item) =>
        ReportHandler.flattenObject(item)
      );
      const csvData = json2csv.parse(flattenedData);

      const csvDir = path.join(__dirname, "csv");
      const csvFile = path.join(csvDir, `${reportname}.csv`);

      if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir); // Create directory if it doesn't exist
      fs.writeFileSync(csvFile, csvData); // Write CSV data to file

      return csvData;
    } catch (err) {
      console.error(`Error generating CSV report for ${reportname}`, err);
      throw new Error(
        `Error generating CSV report for ${reportname}: ${err.message}`
      );
    }
  }
}

// Class to handle JSON report generation, inheriting from ReportHandler
class JsonReportHandler extends ReportHandler {
  constructor() {
    super();
  }

  // Method to generate and handle JSON report
  async handleJsonReport(
    reportname,
    reportData,
    res,
    queryParams,
    isDownload = false
  ) {
    try {
      const jsonDir = path.join(__dirname, "json");
      const jsonFile = path.join(jsonDir, `${reportname}.json`);

      if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir); // Create directory if it doesn't exist
      fs.writeFileSync(jsonFile, JSON.stringify(reportData, null, 2)); // Write JSON data to file

      if (isDownload) {
        // Send the JSON file to the client for download
        res.setHeader(
          "Content-disposition",
          `attachment; filename=${reportname}.json`
        );
        res.setHeader("Content-Type", "application/json");
        fs.createReadStream(jsonFile).pipe(res);
      }
    } catch (err) {
      console.error(`Error handling JSON report for ${reportname}:`, err);
      res
        .status(500)
        .send(`Error handling JSON report for ${reportname}: ${err.message}`);
    }
  }
}

// Class to handle PDF report generation, inheriting from ReportHandler
class PdfReportHandler extends ReportHandler {
  constructor() {
    super();
  }

  // Method to generate PDF content from report data
  async generatePdfContent(
    reportname,
    reportData,
    queryParams,
    isDownload = false
  ) {
    // Load country flags for the PDF
    const countryFlags = new CountryFlags();
    await countryFlags.loadCountryFlags();
    // Generate HTML content for the PDF
    const htmlContent = this.generateHtmlContent(
      reportname,
      reportData,
      queryParams,
      countryFlags
    );

    // Launch Puppeteer to generate the PDF
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      timeout: 60000, // Increase timeout to 60 seconds
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle2" });

    // Wait for all images to load
    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
        })
      );
    });

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "10mm",
        right: "10mm",
      },
    });

    await browser.close();

    // Ensure the pdfDir exists
    const pdfDir = path.join(__dirname, "pdf");
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);

    // Save the PDF buffer to the pdfDir if it's for download
    if (isDownload) {
      const pdfFile = path.join(pdfDir, `${reportname}.pdf`);
      fs.writeFileSync(pdfFile, pdfBuffer);
    }

    return pdfBuffer;
  }

  // Method to generate HTML content for the PDF
  generateHtmlContent(reportname, reportData, queryParams, countryFlags) {
    // Remove unnecessary 'reportList' parameter
    const cleanQueryParams = { ...queryParams };
    delete cleanQueryParams.reportList;

    const queryParamsString = new URLSearchParams(cleanQueryParams).toString();
    const permalink = `/report/${reportname}?${queryParamsString}`;

    // Start generating HTML content
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportname} Report</title>
        <style>
          body { font-family: Arial, sans-serif; }
          header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
          header img { height: 40px; }
          header div { text-align: right; margin:0;}
          header div p { margin: 0; }
          h1 { font-size: 20px; margin-bottom: 5px; text-align: left; }
          hr { border: 0; border-bottom: 1px solid #ccc; margin-top: 20px; }
          a { display:block; margin: 20px 0 30px 0; text-align: center; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px;}
          th, td { text-align: left; padding: 10px; }
          th { background-color: #f2f2f2; }
          .section { margin-bottom: 20px; }
          .section h2 { margin-top: 10px; }
          img.flag { width: 40px; height: 30px; margin: 10px 0; justify-self: center; }
          p { font-size: 14px; margin: 10px 0; } 
          .entry { margin-bottom: 25px; border-bottom: 1px solid #ccc; } 
          .entry-header { display: flex; justify-content: space-between; align-items: center; }
          .entry-header div { flex: 1; }
          .entry-header div:last-child { text-align: right; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>Report: ${reportname}</h1>
            <p>Created on: ${new Date().toLocaleString()}</p>
          </div>
          <img src="data:image/png;base64,${fs.readFileSync(
            path.join(__dirname, "logo.png"),
            { encoding: "base64" }
          )}" alt="Logo" />
        </header>
        <hr>
        <a href="${permalink}">${permalink}</a>
        <br>`;

    // Iterate over report data to populate the HTML content
    reportData.data.forEach((record) => {
      const countryCode = record.CountryCode;
      const flagUrl = countryFlags.getFlagUrl(countryCode);

      html += `<div class="entry">`;
      if (countryCode) {
        html += `
          ${
            flagUrl
              ? `<img src="${flagUrl}" alt="Flag of ${countryCode}" class="flag"/>`
              : ""
          }
          <p><strong>Country Code:</strong> ${countryCode}</p>`;
      }

      // Entry header with ID and Durchfuehrender
      if (record.ID && record.Durchfuehrender) {
        html += `<div class="entry-header">
        <div><p><strong>ID:</strong> ${record.ID}</p></div>
        <div><p><strong>Durchfuehrender:</strong> ${record.Durchfuehrender}</p></div>
      </div>`;
      }

      // Remaining entries
      Object.entries(record).forEach(([key, value]) => {
        if (
          key !== "CountryCode" &&
          key !== "ID" &&
          key !== "Durchfuehrender"
        ) {
          html += `<p><strong>${key}:</strong> ${value}</p>`;
        }
      });
      html += `</div>`;
    });

    html += `
        </div>
      </body>
      </html>`;

    return html;
  }
}

module.exports = { JsonReportHandler, CsvReportHandler, PdfReportHandler };
