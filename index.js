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

// Route to handle report previews and downloads
app.get("/report/:reportname", async (req, res) => {
  const { reportname } = req.params;
  const { barcode } = req.query; // Capture barcode from query parameters if provided

  try {
    const queryParams = req.query;
    const filePath = path.join(__dirname, "routes", `${reportname}.js`);

    // Check if the report file exists
    try {
      await fsPromise.access(filePath);
    } catch (fileErr) {
      console.error(`Report file for ${reportname} not found:`, fileErr);
      return res
        .status(404)
        .json({ error: `Report file for ${reportname} not found.` });
    }

    const { runReport, getQueryParams, checkBarcode } = require(filePath);

    // If barcode is provided, check its existence and handle report generation
    if (barcode) {
      if (typeof checkBarcode === "function") {
        try {
          const barcodeExists = await checkBarcode(barcode);
          if (barcodeExists) {
            queryParams.BIDNR = barcode; // Add barcode to query parameters
          } else {
            console.log(`Barcode ${barcode} not found in database.`);
            return res.json({ exists: false });
          }
        } catch (err) {
          console.error(`Error checking barcode ${barcode}:`, err);
          return res.status(500).json({
            error: "Internal server error during barcode check",
            details: err.message,
          });
        }
      } else {
        console.error(`checkBarcode function not found in ${reportname}.js`);
        return res.status(500).json({
          error: `checkBarcode function not found in ${reportname}.js`,
        });
      }
    }

    if (Object.keys(queryParams).length === 0) {
      if (typeof getQueryParams !== "function") {
        console.error(`getQueryParams function not found in ${reportname}.js`);
        return res.status(500).json({
          error: `getQueryParams function not found in ${reportname}.js`,
        });
      }
      const parameters = await getQueryParams();

      if (!parameters) {
        return res
          .status(404)
          .json({ error: "No parameters found for this report." });
      }
      return res.json({ reportname, parameters });
    } else {
      const { value: parsedQueryParams, format } = parseQuery(queryParams);

      if (typeof runReport !== "function") {
        console.error(`runReport function not found in ${reportname}.js`);
        return res
          .status(500)
          .json({ error: `runReport function not found in ${reportname}.js` });
      }
      try {
        const reportData = await runReport(parsedQueryParams);

        const isDownload = req.query.download === "true";

        if (format) {
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
              const pdfContent =
                await new PdfReportHandler().generatePdfContent(
                  reportname,
                  reportData,
                  queryParams,
                  isDownload
                );
              res.status(200).contentType("application/pdf").send(pdfContent);
              break;
            default:
              res.status(400).send("Invalid format specified.");
          }
        } else {
          res.json(reportData);
        }
      } catch (err) {
        console.error(`Error generating report for ${reportname}:`, err);
        res.status(500).json({
          error: `Error generating report for ${reportname}: ${err.message}`,
        });
      }
    }
  } catch (err) {
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

// Setup Swagger and start the server
const routesDir = path.join(__dirname, "routes");
const outputPath = path.join(__dirname, "swagger.yaml");
const swaggerGenerator = new SwaggerGenerator(app, routesDir, outputPath);
swaggerGenerator.setupSwagger();

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
