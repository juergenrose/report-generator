const mysql = require("mysql2");

//dotenv config
const dotenv = require("dotenv");
dotenv.config();

//mysql config
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
});

//connnect to mysql db
db.connect((err) => {
  if (err) {
    console.error("connection to mysql db failed!: " + err.stack);
    return;
  }
  console.log("connected to mysql db");
});

module.exports = db;
