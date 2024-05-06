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

//download report as csv file
app.get("/report/:reportname/csv", async (req, res, next) => {
  try {
    const {reportname} = req.params;
    const {runReport} = require(`./routes/${reportname}`);
    if (typeof runReport === "function") {
      const jsonData = await runReport(reportname);
      const csvData = jsonCsv.parse(jsonData);

      // set headers for download
      res.setHeader('Content-disposition', `attachment; filename=${reportname}.csv`);
      res.set('Content-Type', 'text/csv');
      // send the csv datda as response
      res.status(200).send(csvData);
    } else{
      throw new Error(`runReport not found for ${reportname}`);
    }
  } catch (err){
    console.error(`error downloading report for ${reportname}`, err);
    res.status(500).send(`error downloading report for ${reportname}, error: ${err.message}`);
  }
});


//port listening
app.listen(port, () => {
  console.log(`Server started, visit http://localhost:${port}/report`);
});