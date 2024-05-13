# dynamic_db_reporter

Checks if there is a .js file in the routes folder, if so it will try to run the query module.\
The filename and query are fully dynamic. \
The db config is for MS SQL Server and also for MySQL databases.\
It returns the response as a JSON file.\
It can also be downloaded as a csv and pdf file.

There are two ways to download the report as a pdf file: \
The first way is to download and convert the data as xml, then it will be automatically converted to pdf using Apache Fop. \
The second way is to use pdfkit.

### Dependencies:
```
dotenv
express
mysql2
mssql
json2csv
pdfkit
xmlbuilder2
child_process
```

### To install all dependencies run:
```
npm install
```