const { exec } = require("child_process");
const json2csv = require("json2csv");
const { create } = require("xmlbuilder2");
const fs = require("fs");
const fsPromise = require("fs").promises;
const path = require("path");

async function handleCsvReport(reportname, reportData, res) {
  try {
    // Check if reportData contains the data key
    const data = reportData.data || reportData;

    // Flatten any nested structures in data if necessary
    const flattenedData = data.map((item) => flattenObject(item));

    const csvData = json2csv.parse(flattenedData); // Convert JSON data to CSV
    res.setHeader(
      "Content-disposition",
      `attachment; filename=${reportname}.csv`
    );
    res.set("Content-Type", "text/csv");
    res.status(200).send(csvData);
  } catch (err) {
    console.error(`Error generating CSV report for ${reportname}`, err);
    res
      .status(500)
      .send(`Error generating CSV report for ${reportname}: ${err.message}`);
  }
}

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

// Handler for XML/PDF reports
async function handleXmlReport(reportname, reportData, res, queryParams) {
  try {
    if (!Array.isArray(reportData.data)) {
      throw new Error("Report data is not an array");
    }
    const root = create({ version: "1.0" }).ele(reportname);
    reportData.data.forEach((record, index) => {
      const recordElement = root.ele(`record_${index}`);
      Object.entries(record).forEach(([key, value]) => {
        const xmlKey = key.replace(/^\d/, "_$&");
        if (typeof value === "object" && value !== null) {
          Object.entries(value).forEach(([subKey, subValue]) => {
            const subXmlKey = subKey.replace(/^\d/, "_$&");
            recordElement.ele(subXmlKey).txt(subValue);
          });
        } else {
          recordElement.ele(xmlKey).txt(value);
        }
      });
    });

    const xmlData = root.end({ prettyPrint: true });
    const xmlDir = path.join(__dirname, "xml");
    const pdfDir = path.join(__dirname, "pdf");
    const xmlFile = path.join(xmlDir, `${reportname}.xml`);
    const pdfFile = path.join(pdfDir, `${reportname}.pdf`);
    const specificXsl = path.join(__dirname, "styles", `${reportname}.xsl`);
    const defaultXsl = path.join(__dirname, "styles", "report-style.xsl");
    const fopCmd = path.join(__dirname, "fop/fop", "fop.cmd");

    if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir);
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);
    fs.writeFileSync(xmlFile, xmlData);

    const xslFile = fs.existsSync(specificXsl) ? specificXsl : defaultXsl;
    const queryParamsString = new URLSearchParams(queryParams).toString();
    const permalink = `/report/${reportname}?${queryParamsString}`;
    let cmd = `${fopCmd} -xml "${xmlFile}" -xsl "${xslFile}" -pdf "${pdfFile}" -param "Permalink" "${permalink}"`;

    if (reportData.data[0].CountryCode !== undefined) {
      cmd += ` -param "CountryCode" "${reportData.data[0].CountryCode}"`;
    }

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Apache FOP: ${error}`);
        res.status(500).send(`Error executing Apache FOP: ${error.message}`);
        return;
      }
      res.setHeader(
        "Content-disposition",
        `attachment; filename=${reportname}.pdf`
      );
      res.setHeader("Content-Type", "application/pdf");
      fs.createReadStream(pdfFile).pipe(res);
    });
  } catch (err) {
    console.error(`Error handling XML report for ${reportname}:`, err);
    res
      .status(500)
      .send(`Error handling XML report for ${reportname}: ${err.message}`);
  }
}

module.exports = { handleXmlReport, handleCsvReport };
