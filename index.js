const express = require("express");
const cors = require("cors");
const fsPromise = require("fs").promises;
const path = require("path");
const SwaggerGenerator = require("./generate-api");
const {
  JsonReportHandler,
  CsvReportHandler,
  PdfReportHandler,
} = require("./convert-report");

class ReportServer {
  constructor(port) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSwagger();
  }

  // Set up middleware for the Express application
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.static("public"));
    // Serve static files from the "node_modules" directory
    this.app.use(
      "/node_modules",
      express.static(path.join(__dirname, "node_modules"))
    );
    this.app.set("views", path.join(__dirname, "views"));
    this.app.set("view engine", "html");
  }

  // Set up routes for the Express application
  setupRoutes() {
    // Route for serving the index.html file
    this.app.get("/", this.serveStartPage);
    // Route for serving the report.html file
    this.app.get("/report/:reportname", this.serveReportPage);
    // API route for listing available reports
    this.app.get("/api/report", this.listReports.bind(this));
    // API route for getting parameters for a specific report
    this.app.get(
      "/api/report/:reportname",
      this.getReportParameters.bind(this)
    );
    // API route for generating a specific report
    this.app.get(
      "/api/report/:reportname/generate",
      this.generateReport.bind(this)
    );
    // API route for getting suggestions for a specific report
    this.app.get(
      "/api/report/:reportname/suggestions",
      this.getSuggestions.bind(this)
    );
  }

  serveStartPage(req, res) {
    res.sendFile(path.join(__dirname, "views", "index.html"));
  }

  serveReportPage(req, res) {
    res.sendFile(path.join(__dirname, "views", "report.html"));
  }

  // List all available reports by reading the "routes" directory
  async listReports(req, res) {
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
  }

  // Get parameters required for a specific report by loading the report module
  async getReportParameters(req, res) {
    const { reportname } = req.params;
    const reportFilePath = path.join(__dirname, "routes", `${reportname}.js`);

    try {
      // Check if the report file exists
      await fsPromise.access(reportFilePath);
      // Require the report module
      const { getQueryParams } = require(reportFilePath);
      // Get query parameters for the report
      const parameters = await getQueryParams();
      res.json({ reportname, parameters });
    } catch (err) {
      console.error(`Error handling report ${reportname}:`, err);
      res.status(404).send("Report not found");
    }
  }

  // Generate a report based on provided parameters and format
  async generateReport(req, res) {
    const { reportname } = req.params;
    const { barcode, download, format } = req.query;
    const queryParams = req.query;
    const reportFilePath = path.join(__dirname, "routes", `${reportname}.js`);

    try {
      // Check if the report file exists
      await fsPromise.access(reportFilePath);
      // Require the report module
      const { runReport, checkBarcode } = require(reportFilePath);

      // Check if the barcode exists, if provided
      if (barcode) {
        const barcodeExists = await checkBarcode(barcode);
        if (!barcodeExists) {
          throw new Error(`Barcode ${barcode} not found in database.`);
        }
      }

      // Run the report with the provided query parameters
      const reportData = await runReport(queryParams);
      if (format) {
        // Handle different formats: JSON, CSV, PDF
        switch (format) {
          case "json":
            await new JsonReportHandler().handleJsonReport(
              reportname,
              reportData,
              res,
              queryParams,
              download
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
              download
            );
            res.status(200).contentType("application/pdf").send(pdfContent);
            break;
          default:
            res.status(400).send("Invalid format specified.");
        }
      } else {
        // If no format specified, return the report data as JSON
        res.json(reportData);
      }
    } catch (err) {
      console.error(`Error handling report ${reportname}:`, err);
      res
        .status(500)
        .json({ error: `Error handling report ${reportname}: ${err.message}` });
    }
  }

  // Get suggestions for a specific report based on query parameters
  async getSuggestions(req, res) {
    const { reportname } = req.params;
    try {
      const queryParams = req.query;
      const filePath = path.join(__dirname, "routes", `${reportname}.js`);
      await fsPromise.access(filePath);
      const { getSuggestions } = require(filePath);

      // Check if the getSuggestions function exists
      if (typeof getSuggestions !== "function") {
        throw new Error(
          `getSuggestions function not found in ${reportname}.js`
        );
      }

      // Get suggestions for the report
      const suggestions = await getSuggestions(queryParams);
      res.json({ suggestions });
    } catch (err) {
      console.error(`Error handling suggestions for ${reportname}:`, err);
      res
        .status(500)
        .send(`Error handling suggestions for ${reportname}: ${err.message}`);
    }
  }

  // Set up Swagger for API documentation
  setupSwagger() {
    const routesDir = path.join(__dirname, "routes");
    const outputPath = path.join(__dirname, "swagger.yaml");
    const swaggerGenerator = new SwaggerGenerator(
      this.app,
      routesDir,
      outputPath
    );
    swaggerGenerator.setupSwagger();
  }

  // Start the server
  start() {
    this.app.listen(this.port, () => {
      console.log(`Server is running at http://localhost:${this.port}`);
    });
  }
}

// Create and start the server on port 3000
const server = new ReportServer(3000);
server.start();
