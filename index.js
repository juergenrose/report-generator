const express = require("express");
const app = express();
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc"); 
const swaggerDefinition = require("./swagger");

const port = 3000;
const cors = require("cors");

const fs = require("fs");
const fsPromise = require("fs").promises;
const path = require("path");

const { exec } = require("child_process");
const jsonCsv = require("json2csv");
const { create } = require("xmlbuilder2");

app.use(cors());


//dynamically generate the list of API files
async function getApiFiles() {
  const reportsDirectory = path.join(__dirname, "routes");
  const files = await fsPromise.readdir(reportsDirectory);
  const jsFiles = files.filter((file) => file.endsWith(".js"));
  return jsFiles.map((file) => path.join(reportsDirectory, file));
}

(async () => {
  const apiFiles = await getApiFiles();
  //swagger (OpenAPI) config
  const options = {
    swaggerDefinition,
    apis: apiFiles,
  };

  //initialize Swagger-jsdoc
  const specs = swaggerJsdoc(options);

  //serve Swagger UI
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));


  //shows all reports in the routes folder
  app.get("/report", async (req, res) => {
    try {
      const reportsDirectory = path.join(__dirname, "routes");
      const files = await fsPromise.readdir(reportsDirectory);
      //filter the files to include only js files
      const reportFiles = files.filter((file) => file.endsWith(".js"));
      //remove the .js extension to get the report names
      const reportNames = reportFiles.map((file) => path.basename(file, ".js"));
      res.json({ reports: reportNames });
    } catch (err) {
      console.error("Error listing reports:", err);
      res.status(500).send("Error listing reports");
    }
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
      const queryParams = req.query;

      const filePath = path.join(__dirname, "routes", `${reportname}.js`);
      await fsPromise.access(filePath); // Check if file exists

      const { runReport, getQueryParams } = require(filePath);

      //check if the request has query parameters
      if (Object.keys(queryParams).length === 0) {
        //no query parameters, return the parameters for the report
        if (typeof getQueryParams !== "function") {
          throw new Error(
            `getQueryParams function not found in ${reportname}.js`
          );
        }
        const parameters = getQueryParams();
        res.json({ reportname, parameters });
      } else {
        //parse the query params and determine the format (if any)
        const { value: parsedQueryParams, format } = parseQuery(queryParams);

        if (typeof runReport !== "function") {
          throw new Error(`runReport function not found in ${reportname}.js`);
        }
        const reportData = await runReport(parsedQueryParams);
        //check if a specific format is requested and handle accordingly
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
          //if no format is specified, send report as JSON
          res.json(reportData);
        }
      }
    } catch (err) {
      console.error(`Error handling report ${reportname}:`, err);
      res
        .status(500)
        .send(`Error handling report ${reportname}: ${err.message}`);
    }
  });

  // handler for csv reports
  async function handleCsvReport(reportname, reportData, res) {
    const csvDir = path.join(__dirname, "csv");
    try {
      const csvData = jsonCsv.parse(reportData); //convert JSON data to CSV
      const csvFilePath = path.join(csvDir, `${reportname}.csv`);
      await fsPromise.writeFile(csvFilePath, csvData); //write CSV data to file

      //set header
      res.setHeader(
        "Content-disposition",
        `attachment; filename=${reportname}.csv`
      );
      res.set("Content-Type", "text/csv");
      //send csv data with a 200 status
      res.status(200).send(csvData);
    } catch (err) {
      console.error(`Error generating CSV report for ${reportname}`, err);
      res
        .status(500)
        .send(`Error generating CSV report for ${reportname}: ${err.message}`);
    }
  }

  //handler for XML/PDF reports
  async function handleXmlReport(reportname, reportData, res) {
    try {
      if (!Array.isArray(reportData.data)) {
        throw new Error("Report data is not an array");
      }
      //create the XML structure
      const root = create({ version: "1.0" }).ele(reportname);

      reportData.data.forEach((record, index) => {
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
      const cmd = `${fopCmdPath} -xml ${xmlFilePath} -xsl ${xslFilePath} -pdf ${pdfFilePath} -param Code ${reportData.data[0].Code}`;

      //execute the command
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
        res.set("Content-Type", "application/pdf");
        res.status(200).sendFile(pdfFilePath);
      });
    } catch (err) {
      console.error(`Error handling XML report for ${reportname}:`, err);
      res
        .status(500)
        .send(`Error handling XML report for ${reportname}: ${err.message}`);
    }
  }

  //port listening
  app.listen(port, () => {
    console.log(`Server started, visit http://localhost:${port}/report`);
  });
})();
