//required modules
const express = require("express");
const app = express();
const port = 3000;
const cors = require("cors");
const fsPromise = require("fs").promises;
const path = require("path");
const { setupSwagger } = require("./generate-api");
const { handleXmlReport, handleCsvReport } = require("./convert-report");

//middleware for static files and view engine
app.use(cors());
app.use(express.static("public"));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "html");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

//helper function to parse and format
const parseQuery = (queryParams) => {
  //extract the format params from the query params , if it exists, or set to null if it does not
  const format = queryParams.format || null;
  //create a copy of the query params to avoid mutaating the original object
  const value = { ...queryParams };
  //remove the format parameter from the copy of query params
  delete value.format;
  return { value, format };
};

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

//route to handle reports
app.get("/report/:reportname", async (req, res) => {
  try {
    const { reportname } = req.params;
    const queryParams = req.query;

    const filePath = path.join(__dirname, "routes", `${reportname}.js`);
    await fsPromise.access(filePath); //check if file exists

    const { runReport, getQueryParams } = require(filePath);

    if (Object.keys(queryParams).length === 0) {
      if (typeof getQueryParams !== "function") {
        throw new Error(
          `getQueryParams function not found in ${reportname}.js`
        );
      }
      const parameters = await getQueryParams(); // ensure to await getQueryParams()

      if (!parameters) {
        return res
          .status(404)
          .json({ error: "No parameters found for this report." });
      }
      // return report name and parameters object
      return res.json({ reportname, parameters });
    } else {
      const { value: parsedQueryParams, format } = parseQuery(queryParams);

      if (typeof runReport !== "function") {
        throw new Error(`runReport function not found in ${reportname}.js`);
      }
      const reportData = await runReport(parsedQueryParams);

      if (format) {
        switch (format) {
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

//route to handle suggestions for a report
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

//setup Swagger and start the server
(async () => {
  await setupSwagger(app);

  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
})();
