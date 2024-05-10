const express = require("express");
const app = express();
const port = 3000;

const fs = require("fs");
const fsPromise = require("fs").promises;
const path = require("path");

const jsonCsv = require("json2csv");
const PDFDocument = require("pdfkit");

app.get("/report", (req, res) => {
  res.send("now you can search for a report");
});

//search <reportname>.js file and run it
app.get("/report/:reportname", async (req, res, next) => {
  try {
    const { reportname } = req.params;
    const filePath = `./routes/${reportname}.js`;
    try {
      await fsPromise.access(filePath); //check if file exists
    } catch (err) {
      console.error(`file ${reportname} not found.`);
      res.status(404).send(`file ${reportname} not found.`);
      return;
    }
    // if file exists, import the module
    const { runQuery } = require(filePath); //import runQuery from <reportname>.js
    if (typeof runQuery === "function") {
      //checks if runQuery is an function
      const result = await runQuery(reportname);
      console.log(`file ${reportname} exists, getting querys...`);
      res.json(result);
    }
  } catch (err) {
    console.error(`error running ${reportname}, error:`, err);
    res.status(500).send(`error running ${reportname}, error: ${err.message}`);
  }
});

//download report as csv file
app.get("/report/:reportname/csv", async (req, res, next) => {
  try {
    const { reportname } = req.params;
    const { runReport } = require(`./routes/${reportname}`); //import runReport from <reportname>.js
    if (typeof runReport === "function") {
      //checks if runReport is a function
      const jsonData = await runReport(reportname);
      const csvData = jsonCsv.parse(jsonData); //convert json data to csv

      //set headers for download the csv file
      res.setHeader(
        "Content-disposition",
        `attachment; filename=${reportname}.csv`
      );
      res.set("Content-Type", "text/csv");
      //send the csv data as the response
      res.status(200).send(csvData);
    } else {
      throw error(`runReport not found for ${reportname}`);
    }
  } catch (err) {
    console.error(`error downloading report for ${reportname}`, err);
    res
      .status(500)
      .send(
        `error downloading report for ${reportname}, error: ${err.message}`
      );
  }
});


//download report as pdf
app.get("/report/:reportname/pdf", async (req, res, next) => {
  try {
    const reportname = req.params.reportname;
    const { runReport } = require(`./routes/${reportname}`);
    if (typeof runReport === "function") {
      const dbData = await runReport(); //call runReport function to fetch data

      //create a new pdf document
      const doc = new PDFDocument();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${reportname}.pdf`
      );
      // Write PDF content to the response
      doc.pipe(res);

      doc.text(`Report ${reportname}`, {
      });
      //write each record to the pdf
      dbData.forEach((record, index) => {
        doc.moveDown();
        doc.text(`Record ${index + 1}:`);
        doc.moveDown(); //move to next line
        Object.entries(record).forEach(([key, value]) => {
          doc.text(`${key}: ${value}`);
        });
        doc.moveDown();
      });

      //finalize the pdf
      doc.end();
    } else {
      throw new Error(`runReport not found for ${reportname}`);
    }
  } catch (err) {
    console.error(
      `error fetching report data for ${req.params.reportname}`,
      err
    );
    res
      .status(500)
      .send(
        `error fetching report data for ${req.params.reportname}, error: ${err.message}`
      );
  }
});

//port listening
app.listen(port, () => {
  console.log(`Server started, visit http://localhost:${port}/report`);
});
