const express = require("express");
const app = express();
const port = 3000;

const fs = require("fs");
const fsPromise = require("fs").promises;
const path = require("path");

const { exec } = require("child_process");
const jsonCsv = require("json2csv");
const { create } = require("xmlbuilder2");

app.get("/report", (req, res) => {
  res.send("App is running, now you can search for a report");
});


//helper function to parse and format
const parseQuery = (queryParams) => {
  //extract the foramt params from the query params , if it exists, or set to null if it does not
  const format = queryParams.format || null;
  //create a copy of the query params to avoid mutaating the original object
  const value = { ...queryParams };
  //remove the format parameter from the copy of query params
  delete value.format;
  return { value, format };
};

//search <reportname>.js file and run it
app.get("/report/:reportname", async (req, res) => {
  try {
    const { reportname } = req.params;
    //parse the query params and determine the format (if any)
    const { value: queryParams, format } = parseQuery(req.query);

    const filePath = path.join(__dirname, "routes", `${reportname}.js`);
    await fsPromise.access(filePath); // Check if file exists

    const { runReport } = require(filePath);
    if (typeof runReport !== "function") {
      throw new Error(`runReport function not found in ${reportname}.js`);
    }
    const reportData = await runReport(queryParams);
    //check if a specific format is req. and handle accordingly
    if (format) {
      switch (format) {
        case "csv":
          await handleCsvReport(reportname, reportData, res);
          break;
        case "pdf":
          await handleXmlReport(reportname, reportData, res);
          break;
        default:
          res.status(400).send("Invalid format specified.");
      }
    } else {
      //if no format is specified , send report as json
      res.json(reportData);
    }
  } catch (err) {
    console.error(`Error running report ${reportname}:`, err);
    res.status(500).send(`Error running report ${reportname}: ${err.message}`);
  }
});

// handler for csv reports
async function handleCsvReport(reportname, reportData, res) {
  const csvDir = path.join(__dirname, "csv");
  try {
    const csvData = jsonCsv.parse(reportData); // Convert JSON data to CSV
    const csvFilePath = path.join(csvDir, `${reportname}.csv`);
    await fsPromise.writeFile(csvFilePath, csvData); // Write CSV data to file

    //set header
    res.setHeader("Content-disposition", `attachment; filename=${reportname}.csv`);
    res.set("Content-Type", "text/csv");
    //send csv data with a 200 status 
    res.status(200).send(csvData);
  } catch (err) {
    console.error(`Error generating CSV report for ${reportname}`, err);
    res.status(500).send(`Error generating CSV report for ${reportname}: ${err.message}`);
  }
}

//handler for XML/PDF reports
async function handleXmlReport(reportname, reportData, res) {
  try {
    //create the XML structure
    const root = create({ version: "1.0" }).ele(reportname);

    reportData.forEach((record, index) => {
      const recordElement = root.ele(`record_${index}`);
      //iterate over each key-value pair in the 'record' object
      Object.entries(record).forEach(([key, value]) => {
        const xmlKey = key.replace(/^\d/, "_$&");
        //check if the value is an object and not null
        if (typeof value === "object" && value !== null) {
          //iterate over each key-value pair in the nested 'value' object
          Object.entries(value).forEach(([subKey, subValue]) => {
            const subXmlKey = subKey.replace(/^\d/, "_$&");
            /*create a new xml element with the subXmlKey name under the recordElement
            and set subValue as the text content of this element */
            recordElement.ele(subXmlKey).txt(subValue);
          });
        } else {
          recordElement.ele(xmlKey).txt(value);
        }
      });
    });
    const xmlData = root.end({ prettyPrint: true });
    //define file paths
    const xmlDir = path.join(__dirname, "xml");
    const pdfDir = path.join(__dirname, "pdf");
    const xmlFilePath = path.join(xmlDir, `${reportname}.xml`);
    const pdfFilePath = path.join(pdfDir, `${reportname}.pdf`);
    const xslFilePath = path.join(__dirname, "styles", "report-style.xsl");
    const fopCmdPath = path.join(__dirname, "fop/fop", "fop.cmd");

    //ensure directories exist
    if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir);
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);    
    //write the xml data to a file
    fs.writeFileSync(xmlFilePath, xmlData);
    //cmd to convert xml to pdf using apache fop
    const cmd = `${fopCmdPath} -xml ${xmlFilePath} -xsl ${xslFilePath} -pdf ${pdfFilePath} -param Code ${reportData[0].Code}`;
 
    //execute the command
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Apache FOP: ${error}`);
        res.status(500).send(`Error executing Apache FOP: ${error.message}`);
        return;
      }
      res.setHeader("Content-disposition", `attachment; filename=${reportname}.pdf`);
      res.set("Content-Type", "application/pdf");
      res.status(200).sendFile(pdfFilePath);
    });
  } catch (err) {
    console.error(`Error handling XML report for ${reportname}:`, err);
    res.status(500).send(`Error handling XML report for ${reportname}: ${err.message}`);
  }
}
//port listening
app.listen(port, () => {
  console.log(`Server started, visit http://localhost:${port}/report`);
});
