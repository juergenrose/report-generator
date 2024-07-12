const json2csv = require("json2csv");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const xml2js = require("xml2js");

// Helper function to flatten nested objects
function flattenObject(obj, parent = "", res = {}) {
  for (let key in obj) {
    const propName = parent ? `${parent}.${key}` : key;
    if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
      flattenObject(obj[key], propName, res);
    } else {
      res[propName] = obj[key];
    }
  }
  return res;
}

async function loadCountryFlags() {
  try {
    const xmlFile = path.join(__dirname, "countryFlags.xml");
    const xmlData = fs.readFileSync(xmlFile, "utf-8");
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlData);
    const flags = {};
    for (const [code, urls] of Object.entries(result.flags)) {
      flags[code] = urls[0];
    }
    return flags;
  } catch (err) {
    console.error("Error loading country flags:", err);
    throw new Error("Failed to load country flags.");
  }
}

async function handleCsvReport(reportname, reportData) {
  try {
    const data = reportData.data || reportData;
    const flattenedData = data.map((item) => flattenObject(item));
    const csvData = json2csv.parse(flattenedData);

    const csvDir = path.join(__dirname, "csv");
    const csvFile = path.join(csvDir, `${reportname}.csv`);

    if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir);
    fs.writeFileSync(csvFile, csvData);

    return csvData;
  } catch (err) {
    console.error(`Error generating CSV report for ${reportname}`, err);
    throw new Error(
      `Error generating CSV report for ${reportname}: ${err.message}`
    );
  }
}

async function handleJsonReport(
  reportname,
  reportData,
  res,
  queryParams,
  isDownload = false
) {
  try {
    const jsonDir = path.join(__dirname, "json");
    const jsonFile = path.join(jsonDir, `${reportname}.json`);

    if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir);
    // Write the JSON file
    fs.writeFileSync(jsonFile, JSON.stringify(reportData, null, 2));

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

async function generatePdfContent(
  reportname,
  reportData,
  queryParams,
  isDownload = false
) {
  const countryFlags = await loadCountryFlags();
  const htmlContent = generateHtmlContent(
    reportname,
    reportData,
    queryParams,
    countryFlags
  );

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

  const pdfBuffer = await page.pdf({ format: "A4" });
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

function generateHtmlContent(
  reportname,
  reportData,
  queryParams,
  countryFlags
) {
  // Remove unnecessary 'reportList' parameter
  const cleanQueryParams = { ...queryParams };
  delete cleanQueryParams.reportList;

  const queryParamsString = new URLSearchParams(cleanQueryParams).toString();
  const permalink = `/report/${reportname}?${queryParamsString}`;

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${reportname} Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 50px; }
        header { display: flex; justify-content: space-between; align-items: center; }
        header img { height: 40px; }
        header div { text-align: right; margin:0; }
        header div p { margin: 0; }
        h1 { font-size: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; border-bottom: 1px solid #ccc;}
        th, td { border: 1px solid #dddddd; text-align: left; padding: 8px; }
        th { background-color: #f2f2f2; }
        .section { margin-bottom: 20px; }
        .section h2 { margin-top: 10px; }
        img.flag { width: 40px; height: 30px; margin: 10px 0; justify-self: center; }
        p { font-size: 14px; margin: 10px 0; } /* Add margin to <p> elements for spacing */
        .entry { margin-bottom: 30px; border-bottom: 1px solid #ccc; } /* Add margin to each entry for spacing */
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
        <a href="${permalink}" style="display:block; margin: 20px 0 30px 0; text-align: center; font-size: 14px">${permalink}</a>
        <br>`;

  reportData.data.forEach((record) => {
    const countryCode = record.CountryCode;
    const flagUrl = countryFlags[countryCode] || "";

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
      if (key !== "CountryCode" && key !== "ID" && key !== "Durchfuehrender") {
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

module.exports = { handleJsonReport, handleCsvReport, generatePdfContent };
