const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

// Class to manage MySQL database connections
class DatabaseConnectionManager {
  constructor() {
    // Configuration for the MySQL database
    this.config = {
      host: process.env.MYSQL_HOST,
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
    };
    this.connection = null; // Variable to hold the database connection
  }

  /**
   * Initialize the database connection.
   */
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

  /**
   * Ensure the database connection is established.
   */
  ensureConnection() {
    if (!this.connection) {
      this.initializeConnection();
    }
  }

  /**
   * Get the database connection.
   * @returns {mysql.Connection} The MySQL connection.
   */
  getConnection() {
    this.ensureConnection();
    return this.connection;
  }
}

// Create an instance of the DatabaseConnectionManager
const mysqlConfig = new DatabaseConnectionManager();

// Initialize the connection on startup
mysqlConfig.initializeConnection();

module.exports = mysqlConfig;
