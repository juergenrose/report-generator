const express = require("express");
const app = express();
const port = 3000;
const cors = require("cors");
const fsPromise = require("fs").promises;
const path = require("path");
const SwaggerGenerator = require("./generate-api");
const {
  JsonReportHandler,
  CsvReportHandler,
  PdfReportHandler,
} = require("./convert-report");

// Middleware for static files and view engine
app.use(cors());
app.use(express.static("public"));
app.use("/node_modules", express.static(path.join(__dirname, "node_modules")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "html");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// Helper function to parse and format query parameters
const parseQuery = (queryParams) => {
  const format = queryParams.format || null;
  const value = { ...queryParams };
  delete value.format;
  return { value, format };
};

app.get("/report", async (req, res) => {
  try {
    const reportsDirectory = path.join(__dirname, "routes");
    const files = await fsPromise.readdir(reportsDirectory);
    const reportFiles = files.filter((file) => file.endsWith(".js"));
    const reportNames = reportFiles.map((file) => path.basename(file, ".js"));
    res.json({ reports: reportNames });
  } catch (err) {
    console.error("Error listing reports:", err);
    res.status(500).send("Error listing reports");
  }
});

// Define a route for generating reports based on the report name provided in the URL
app.get("/report/:reportname", async (req, res) => {
  const { reportname } = req.params;
  const { barcode, download } = req.query;

  try {
    const queryParams = req.query;
    const reportFilePath = path.join(__dirname, "routes", `${reportname}.js`);

    // Check if the report file exists, throw an error if not found
    await fsPromise.access(reportFilePath).catch(() => {
      throw new Error(`Report file for ${reportname} not found.`);
    });
    // Import functions from the report file
    const { runReport, getQueryParams, checkBarcode } = require(reportFilePath);

    // If barcode is provided, check its existence and update query parameters
    if (barcode) {
      await handleBarcodeCheck(checkBarcode, barcode, queryParams);
    }

    // If no query parameters are provided, return the required parameters for the report
    if (Object.keys(queryParams).length === 0) {
      await handleReportParameters(getQueryParams, reportname, res);
    } else {
      // Generate and send the report based on the provided query parameters
      await generateAndSendReport(
        runReport,
        reportname,
        queryParams,
        res,
        download
      );
    }
  } catch (err) {
    // Handle errors during the process and send an error response
    console.error(`Error handling report ${reportname}:`, err);
    res
      .status(500)
      .json({ error: `Error handling report ${reportname}: ${err.message}` });
  }
});

// Route to handle suggestions for a report
app.get("/report/:reportname/suggestions", async (req, res) => {
  const { reportname } = req.params;
  try {
    const queryParams = req.query;
    const filePath = path.join(__dirname, "routes", `${reportname}.js`);
    await fsPromise.access(filePath);
    const { getSuggestions } = require(filePath);

    if (typeof getSuggestions !== "function") {
      throw new Error(`getSuggestions function not found in ${reportname}.js`);
    }
    const suggestions = await getSuggestions(queryParams);

    res.json({ suggestions });
  } catch (err) {
    console.error(`Error handling suggestions for ${reportname}:`, err);
    res
      .status(500)
      .send(`Error handling suggestions for ${reportname}: ${err.message}`);
  }
});

// Handle checking if the provided barcode exists in the database
const handleBarcodeCheck = async (checkBarcode, barcode, queryParams) => {
  // Ensure the checkBarcode function is defined
  if (typeof checkBarcode !== "function") {
    throw new Error(`checkBarcode function not found.`);
  }

  // Check if the barcode exists in the database
  const barcodeExists = await checkBarcode(barcode);
  if (!barcodeExists) {
    throw new Error(`Barcode ${barcode} not found in database.`);
  }
  // Add the barcode to query parameters if it exists
  queryParams.BIDNR = barcode;
};

// Handle retrieval of report parameters
const handleReportParameters = async (getQueryParams, reportname, res) => {
  // Ensure the getQueryParams function is defined
  if (typeof getQueryParams !== "function") {
    throw new Error(`getQueryParams function not found.`);
  }

  // Retrieve the required parameters for the report
  const parameters = await getQueryParams();
  if (!parameters) {
    // Send an error response if no parameters are found
    res.status(404).json({ error: "No parameters found for this report." });
  } else {
    // Send the parameters as a JSON response
    res.json({ reportname, parameters });
  }
};

//Generate the report and send it in the requested format
const generateAndSendReport = async (
  runReport,
  reportname,
  queryParams,
  res,
  isDownload
) => {
  // Ensure the runReport function is defined
  if (typeof runReport !== "function") {
    throw new Error(`runReport function not found.`);
  }

  // Parse the query parameters and determine the format
  const { value: parsedQueryParams, format } = parseQuery(queryParams);
  const reportData = await runReport(parsedQueryParams);

  // Handle the report based on the requested format
  if (format) {
    await handleFormattedReport(
      reportname,
      reportData,
      res,
      format,
      queryParams,
      isDownload
    );
  } else {
    // Send the report data as a JSON response if no format is specified
    res.json(reportData);
  }
};

// Handle sending the report in the requested format
const handleFormattedReport = async (
  reportname,
  reportData,
  res,
  format,
  queryParams,
  isDownload
) => {
  // Handle different formats and send the report accordingly
  switch (format) {
    case "json":
      await new JsonReportHandler().handleJsonReport(
        reportname,
        reportData,
        res,
        queryParams,
        isDownload
      );
      break;
    case "csv":
      const csvData = await new CsvReportHandler().handleCsvReport(
        reportname,
        reportData
      );
      res.status(200).send(csvData);
      break;
    case "pdf":
      const pdfContent = await new PdfReportHandler().generatePdfContent(
        reportname,
        reportData,
        queryParams,
        isDownload
      );
      res.status(200).contentType("application/pdf").send(pdfContent);
      break;
    default:
      // Send an error response if the format is invalid
      res.status(400).send("Invalid format specified.");
  }
};

// Setup Swagger and start the server
const routesDir = path.join(__dirname, "routes");
const outputPath = path.join(__dirname, "swagger.yaml");
const swaggerGenerator = new SwaggerGenerator(app, routesDir, outputPath);
swaggerGenerator.setupSwagger();

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
