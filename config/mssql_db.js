const sql = require("mssql");

//dotenv config
const dotenv = require("dotenv");
dotenv.config();

//mssql config
const config = {
  server: process.env.MSSQL_HOST,
  authentication: {
    type: "default",
    options: {
      userName: process.env.MSSQL_USER,
      password: process.env.MSSQL_PASSWORD,
    },
  },
  options: {
    encrypt: false,
    database: process.env.MSSQL_DATABASE,
    trustServerCertificate: true,
  },
};

//connect to mssql db
sql
  .connect(config)
  .then(() => {
    console.log("connected to mssql db");
  })
  .catch((err) => {
    console.log("connection to mssql db failed!", err);
  });
