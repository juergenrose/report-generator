const sql = require("mssql");
const dotenv = require("dotenv");
dotenv.config();

// MSSQL config for first database
const config1 = {
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

// MSSQL config for second database
const config2 = {
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
    database: process.env.MSSQL_DATABASE2,
    trustServerCertificate: true,
  },
};

// Create connection pools
const pool1 = new sql.ConnectionPool(config1);
const pool2 = new sql.ConnectionPool(config2);

async function connectToDatabases() {
  try {
    await pool1.connect();
    console.log("connected to mssql1 db");
    await pool2.connect();
    console.log("connected to mssql2 db");
  } catch (err) {
    console.log("connection to one of the dbs failed!", err);
  }
}

async function ensureConnected(pool) {
  if (!pool.connected) {
    await pool.connect();
  }
}

connectToDatabases();

module.exports = { pool1, pool2, sql, ensureConnected };
