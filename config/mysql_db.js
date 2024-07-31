const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

class DatabaseConnectionManager {
  constructor() {
    this.config = {
      host: process.env.MYSQL_HOST,
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
    };
    this.connection = null;
  }

  // Initialize the database connection
  initializeConnection() {
    this.connection = mysql.createConnection(this.config);

    this.connection.connect((err) => {
      if (err) {
        console.error("Connection to MySQL DB failed!: " + err.stack);
        return;
      }
      console.log("Connected to MySQL DB");
    });
  }

  // Ensure the connection is established
  ensureConnection() {
    if (!this.connection) {
      this.initializeConnection();
    }
  }

  // Get the connection
  getConnection() {
    this.ensureConnection();
    return this.connection;
  }
}

const mysqlConfig = new DatabaseConnectionManager();
mysqlConfig.initializeConnection();

module.exports = mysqlConfig;
