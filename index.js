//required modules
const express = require("express");
const app = express();
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const port = 3000;
const cors = require("cors");
const fs = require("fs");
const fsPromise = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const jsonCsv = require("json2csv");
const { create } = require("xmlbuilder2");
const yaml = require('yaml');


//middleware for static files and view engine
app.use(cors());
app.use(express.static('public'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
})

app.get("/api-docs", (req, res) => {
  res.sendFile(path.join(__dirname, "swagger.yaml"));
});


//dynamically generate the list of API files
async function getApiFiles() {
  const reportsDirectory = path.join(__dirname, "routes");
  const files = await fsPromise.readdir(reportsDirectory);
  const jsFiles = files.filter((file) => file.endsWith(".js"));
  return jsFiles.map((file) => path.join(reportsDirectory, file));
}


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
    res.status(500).send(`Error handling report ${reportname}: ${err.message}`);
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
      //set header
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


async function generateAndSaveSwaggerDocs() {
  // Retrieve list of API files
  const apiFiles = await getApiFiles();
  //define Swagger options
  const options = {
    definition: {
      openapi: "3.0.3",
      info: {
        title: "Reporter API",
        description: "Report API for generating and handling reports",
        version: "1.0",
      },
      servers: [
        {
          url: "http://localhost:3000",
        },
      ],
      paths: {},//initialize paths object for API endpoints
      components: {
        schemas: {
          ReportResponse: {
            type: "object",
            properties: {
              reportname: {
                type: "string",
                description: "The name of the report",
              },
              params: {
                type: "object",
                additionalProperties: {
                  type: "string",
                },
                description: "The query parameters used for generating the report.",
              },
            },
          },
        },
      },
    },
    //include all api files for swagger generation
    apis: apiFiles.concat(__filename),
  };
  //iterate over each API file to dynamically generate swagger paths
  apiFiles.forEach(file => {
    const reportname = path.basename(file, ".js");
    //define swagger path for retrieving a specific report
    options.definition.paths[`/report/${reportname}`] = {
      get: {
        //summary and description of the API endpoint
        summary: `Retrieve ${reportname} report`,
        description: `Retrieves the ${reportname} report, optionally in a specified format (CSV or PDF). Supports dynamic query parameters.`,
        //define path and query parameters
        parameters: [
          {
            in: "path",
            name: "reportname",
            required: true,
            schema: {
              type: "string",
            },
            description: "The name of the report to retrieve",
          },
          {
            in: "query",
            name: "params",
            style: "form",
            explode: true,
            schema: {
              type: "object",
              additionalProperties: {
                type: "string",
              },
            },
            description: "Additional dynamic query parameters for the report.",
          },
          {
            in: "query",
            name: "format",
            schema: {
              type: "string",
              enum: ["csv", "pdf"],
            },
            description: "Optional. The format in which to retrieve the report (e.g., csv, pdf)",
          },
        ],
        //define possible responses
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ReportResponse', //reference to the ReportResponse schema
                },
              },
            },
          },
          '404': {
            description: 'Report Not Found',
          },
          '500': {
            description: 'Internal Server Error',
          },
        },
      },
    };
  });
  //generate swagger documentation using swaggerJsdoc library
  const specs = swaggerJsdoc(options);
  //convert swagger specs to yaml format
  const yamlData = yaml.stringify(specs);
  //write yaml data to a file named 'swagger.yaml' in the current directory
  fs.writeFileSync(path.join(__dirname, 'swagger.yaml'), yamlData, 'utf8');
}


(async () => {
    //generate and save swagger documentation
  await generateAndSaveSwaggerDocs();
  const apiFiles = await getApiFiles();
  //swagger options
  const options = {
    definition: {
      openapi: "3.0.3",
      info: {
        title: "Reporter API",
        description: "Report API for generating and handling reports",
        version: "1.0",
      },
      servers: [
        {
          url: "http://localhost:3000",
        },
      ],
    },
    //include all api files
    apis: apiFiles.concat(__filename),
  };
  //generate Swagger specs from the options
  const specs = generateAndSaveSwaggerDocs(options);


  app.use(
    "/api-docs",
    swaggerUi.serve, //middleware to serve the swagger ui
    swaggerUi.setup(specs, { explorer: true }) //setup swagger ui with the generated specs and enable explorer
  );

  
  //port listening
  app.listen(port, () => {
    console.log(`Server started, visit http://localhost:${port}/`);
  });
})();
