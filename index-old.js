const express = require("express");
const app = express();
const port = 3000;
const cors = require("cors");
const fsPromise = require("fs").promises;
const path = require("path");
const { setupSwagger } = require("./generate-api");
const { handleXmlReport, handleCsvReport } = require("./convert-report");

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

// Route to handle reports
app.get("/report/:reportname", async (req, res) => {
  try {
    const { reportname } = req.params;
    const queryParams = req.query;

    const filePath = path.join(__dirname, "routes", `${reportname}.js`);
    await fsPromise.access(filePath); // Check if file exists

    const { runReport, getQueryParams } = require(filePath);

    if (Object.keys(queryParams).length === 0) {
      if (typeof getQueryParams !== "function") {
        throw new Error(
          `getQueryParams function not found in ${reportname}.js`
        );
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
        throw new Error(`runReport function not found in ${reportname}.js`);
      }
      const reportData = await runReport(parsedQueryParams);

      if (format) {
        switch (format) {
          case "json":
            res.json(reportData);
            break;
          case "csv":
            await handleCsvReport(reportname, reportData, res);
            break;
          case "pdf":
            await handleXmlReport(reportname, reportData, res, queryParams);
            break;
          default:
            res.status(400).send("Invalid format specified.");
        }
      } else {
        res.json(reportData);
      }
    }
  } catch (err) {
    console.error(`Error handling report ${reportname}:`, err);
    res.status(500).send(`Error handling report ${reportname}: ${err.message}`);
  }
});

// Route to handle suggestions for a report
app.get("/report/:reportname/suggestions", async (req, res) => {
  try {
    const { reportname } = req.params;
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
(async () => {
  await setupSwagger(app);

  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
})();
