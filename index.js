const express = require("express");
const app = express();
const port = 3000;

const fs = require('fs').promises;

//required for downloads
const jsonCsv = require("json2csv");
const fastcsv = require("fast-csv");

//search <reportname> file and run it
app.get("/report/:reportname", async (req, res, next) => {
  try {
    const { reportname } = req.params;

    const filePath = `./routes/${reportname}.js`;
    try {
      await fs.access(filePath); // check if file exists
    } catch (err) {
      console.error(`file ${reportname} not found.`);
      res.status(404).send(`file ${reportname} not found.`);
      return; 
    }
    // if file exists, dynamically import the module
    const { runQuery } = require(filePath); // import specific query function from reportname
    if (typeof runQuery === "function") {
      const result = await runQuery(reportname);
      console.log(`file ${reportname} exists, getting querys...`);
      res.json(result);
    }
  } catch (err) {
    console.error(`Error running ${reportname} report:`, err);
    res.status(500).send(`Error running ${reportname} report: ${err.message}`);
  }
});


//port listening
app.listen(port, () => {
  console.log(`Server started, visit http://localhost:${port}/report`);
});