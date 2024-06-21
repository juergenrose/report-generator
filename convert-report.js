const { exec } = require("child_process");
const jsonCsv = require("json2csv");
const { create } = require("xmlbuilder2");
const fs = require("fs");
const fsPromise = require("fs").promises;
const path = require("path");

// handler for CSV reports
async function handleCsvReport(reportname, reportData, res) {
  const csvDir = path.join(__dirname, "csv");
  try {
    //create the CSV directory if it doesn't exist
    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir);
    }
    const csvData = jsonCsv.parse(reportData); //convert JSON data to CSV
    const csvFilePath = path.join(csvDir, `${reportname}.csv`);
    await fsPromise.writeFile(csvFilePath, csvData); //write CSV data to file

    //set HTTP headers for download
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

// handler for XML/PDF reports
async function handleXmlReport(reportname, reportData, res, queryParams) {
  try {
    //validate reportData format
    if (!Array.isArray(reportData.data)) {
      throw new Error("Report data is not an array");
    }
    //create the XML structure
    const root = create({ version: "1.0" }).ele(reportname);
    //iterate through each record in the reportData
    reportData.data.forEach((record, index) => {
      const recordElement = root.ele(`record_${index}`);
      // Iterate through key-value pairs of each record
      Object.entries(record).forEach(([key, value]) => {
        //handle keys that start with a digit by prefixing with an underscore
        const xmlKey = key.replace(/^\d/, "_$&");

        //check if value is an object to handle nested structures
        if (typeof value === "object" && value !== null) {
          Object.entries(value).forEach(([subKey, subValue]) => {
            //handle nested keys that start with a digit similarly
            const subXmlKey = subKey.replace(/^\d/, "_$&");
            recordElement.ele(subXmlKey).txt(subValue);
          });
        } else {
          //add text content to XML element
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

    //create directories if they don't exist
    if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir);
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);
    fs.writeFileSync(xmlFile, xmlData);

    //determine which XSL file to use
    const xslFile = fs.existsSync(specificXsl) ? specificXsl : defaultXsl;

    //construct the permalink using the query parameters
    const queryParamsString = new URLSearchParams(queryParams).toString();
    const permalink = `/report/${reportname}?${queryParamsString}`;
    //construct the command dynamically
    const cmd = `${fopCmd} -xml ${xmlFile} -xsl ${xslFile} -pdf ${pdfFile} -param Permalink "${permalink}" -param Code ${reportData.data[0].Code}`;

    //execute Apache FOP command to generate PDF
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Apache FOP: ${error}`);
        res.status(500).send(`Error executing Apache FOP: ${error.message}`);
        return;
      }
      //set headers to force download
      res.setHeader(
        "Content-disposition",
        `attachment; filename=${reportname}.pdf`
      );
      res.setHeader("Content-Type", "application/pdf");
      //send the PDF file
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
