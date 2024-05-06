# dynamic_db_reporter

Checks if there is a <reportname>.js file in the routes folder, if so it will try to run the query module.\
The filename and query are fully dynamic. \
The db config is for MS SQL Server and also for MySQL databases.\
It returns the response as a JSON file.\
It can also be downloaded as a csv file and, in the future, in pdf and xlsx formats.

### Dependencies:
```
dotenv
express
mysql2
mssql
json2csv
```

### To install all dependencies run:
```
npm install
```