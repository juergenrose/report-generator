const express = require("express");
const app = express();
const port = 3000;

const fs = require("fs");
const fsPromise = require("fs").promises;
const path = require("path");

const { exec } = require("child_process");
const jsonCsv = require("json2csv");
const { create } = require("xmlbuilder2");
const PDFDocument = require("pdfkit");

app.get("/report", (req, res) => {
  res.send("now you can search for a report");
});

//helper function to parse sollwert and format
const parseSollwert = (sollwert) => {
  const formatMatch = sollwert.match(/(\/pdf|\/csv|\/xml)$/);
  if (formatMatch) {
    const format = formatMatch[0].substring(1); //remove leading slash
    const value = sollwert.substring(0, formatMatch.index);
    return { value, format };
  }
  return { value: sollwert, format: null };
};

//search <reportname>.js file and run it
app.get("/report/:reportname", async (req, res, next) => {
  try {
    const { reportname } = req.params;
    let { vorname, sollwert } = req.query;

    //parse sollwert to separate value and format
    const { value: parsedSollwert, format } = parseSollwert(sollwert);

    const filePath = `./routes/${reportname}.js`;

    try {
      await fsPromise.access(filePath); //check if file exists
    } catch (err) {
      console.error(`File ${reportname} not found.`);
      res.status(404).send(`File ${reportname} not found.`);
      return;
    }

    // if file exists, import the module
    const { runReport } = require(filePath);
    if (typeof runReport === "function") {
      // update queryParams with parsed sollwert
      const queryParams = { vorname, sollwert: parsedSollwert };

      if (format) {
        switch (format) {
          case "pdf":
            await handlePdfReport(reportname, queryParams, res);
            break;
          case "csv":
            await handleCsvReport(reportname, queryParams, res);
            break;
          case "xml":
            await handleXmlReport(reportname, queryParams, res);
            break;
          default:
            res.status(400).send("Invalid format specified.");
        }
      } else {
        const result = await runReport(queryParams);
        console.log(`File ${reportname} exists, getting queries...`);
        res.json(result);
      }
    } else {
      throw new Error(`runReport not found for ${reportname}`);
    }
  } catch (err) {
    console.error(`Error running ${reportname}, error:`, err);
    res.status(500).send(`Error running ${reportname}, error: ${err.message}`);
  }
});

// handler for csv reports
async function handleCsvReport(reportname, queryParams, res) {
  try {
    const { runReport } = require(`./routes/${reportname}`);
    const jsonData = await runReport(queryParams);
    const csvData = jsonCsv.parse(jsonData); //convert json data to csv

    //set headers for downloading the csv file
    res.setHeader(
      "Content-disposition",
      `attachment; filename=${reportname}.csv`
    );
    res.set("Content-Type", "text/csv");
    //send the csv data as the response
    res.status(200).send(csvData);
  } catch (err) {
    console.error(`error downloading report for ${reportname}`, err);
    res
      .status(500)
      .send(
        `error downloading report for ${reportname}, error: ${err.message}`
      );
  }
}

//handler for pdf reports
async function handlePdfReport(reportname, queryParams, res) {
  try {
    const { runReport } = require(`./routes/${reportname}`);
    const dbData = await runReport(queryParams);

    //create a new pdf document
    const doc = new PDFDocument();

    //set headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${reportname}.pdf`
    );

    //write pdf content to the response
    doc.pipe(res);
    doc
      .font("Helvetica-Bold")
      .text(`Report ${reportname}`, { align: "center" });
    //write each record to the pdf
    dbData.forEach((record, index) => {
      if (index > 0) {
        doc
          .moveTo(doc.x, doc.y - 10)
          .lineTo(550, doc.y - 10)
          .stroke(); //draw a line between records
      }
      doc.moveDown();
      doc.text(`Record ${index + 1}:`, { underline: true });
      doc.moveDown(); //move to the next line
      Object.entries(record).forEach(([key, value]) => {
        doc.font("Helvetica").text(`${key}: ${value}`);
        doc.font("Helvetica-Bold");
      });
      doc.moveDown();
    });

    //finalize the PDF
    doc.end();
  } catch (err) {
    console.error(`Error fetching PDF report data for ${reportname}`, err);
    res
      .status(500)
      .send(
        `Error fetching PDF report data for ${reportname}, error: ${err.message}`
      );
  }
}

//handler for XML reports
async function handleXmlReport(reportname, queryParams, res) {
  try {
    const { runReport } = require(`./routes/${reportname}`);
    const jsonData = await runReport(queryParams);
    const root = create({ version: "1.0" }).ele(reportname); //create a single root element
    //add child elements for each record
    jsonData.forEach((record, index) => {
      const recordElement = root.ele(`record_${index}`); //use prefix for element names
      //assuming each record is represented as key-value pairs in the json
      Object.entries(record).forEach(([key, value]) => {
        const xmlKey = key.replace(/^\d/, "_$&"); //add underscore prefix if key starts with a digit
        if (typeof value === "object" && value !== null) {
          //if value is an object, recursively create child elements
          Object.entries(value).forEach(([subKey, subValue]) => {
            const subXmlKey = subKey.replace(/^\d/, "_$&");
            recordElement.ele(subXmlKey).txt(subValue);
          });
        } else {
          //if value is not an object, create a text node
          recordElement.ele(xmlKey).txt(value);
        }
      });
    });
    const xmlData = root.end({ prettyPrint: true });
    const filename = `${reportname}.xml`;
    const xmlPath = path.join(__dirname, "xml", filename);
    fs.writeFileSync(xmlPath, xmlData); //write xml data to file

    const fopPath = path.join(__dirname, "fop/fop", "fop.cmd");
    const pdfPath = path.join(__dirname, "pdf", reportname + ".pdf");
    const xslPath = path.join(__dirname, "styles", "report-style.xsl");
    const cmd = `${fopPath} -xml ${xmlPath} -xsl ${xslPath} -pdf ${pdfPath}`; // Fop command

    //execute fop cmd
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Apache FOP: ${error}`);
        res.status(500).send(`Error executing Apache FOP: ${error}`);
        return;
      }
      console.log(`PDF generated successfully for ${reportname}`);
      const pdfPath = path.join(__dirname, "pdf", reportname + ".pdf");
      res.download(pdfPath); //send pdf file as response
    });
  } catch (err) {
    console.error(`error fetching report data for ${reportname}`, err);
    res
      .status(500)
      .send(
        `error fetching report data for ${reportname}, error: ${err.message}`
      );
  }
}

//port listening
app.listen(port, () => {
  console.log(`Server started, visit http://localhost:${port}/report`);
});
