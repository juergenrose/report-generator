const sql = require("mssql");
const dotenv = require("dotenv");
dotenv.config();

// MSSQL configuration and connection manager class
class DatabaseConnectionManager {
  constructor() {
    // Configuration for the first MSSQL database
    this.config1 = {
      server: process.env.MSSQL_HOST,
      authentication: {
        type: "default",
        options: {
          userName: process.env.MSSQL_USER,
          password: process.env.MSSQL_PASSWORD,
        },
      },
      options: {
        encrypt: false, // Set to true if using SSL/TLS
        database: process.env.MSSQL_DATABASE,
        trustServerCertificate: true, // Trust the server certificate
      },
    };

    // Configuration for the second MSSQL database
    this.config2 = {
      server: process.env.MSSQL_HOST,
      authentication: {
        type: "default",
        options: {
          userName: process.env.MSSQL_USER,
          password: process.env.MSSQL_PASSWORD,
        },
      },
      options: {
        encrypt: false, // Set to true if using SSL/TLS
        database: process.env.MSSQL_DATABASE2,
        trustServerCertificate: true, // Trust the server certificate
      },
    };

    // Create connection pools for both databases
    this.pool1 = new sql.ConnectionPool(this.config1);
    this.pool2 = new sql.ConnectionPool(this.config2);
  }

  /**
   * Initialize the connection pools for both databases.
   * @returns {Promise<void>}
   */
  async initializePools() {
    try {
      // Connect to the first MSSQL database
      await this.pool1.connect();
      console.log("Connected to MSSQL1 database");
      // Connect to the second MSSQL database
      await this.pool2.connect();
      console.log("Connected to MSSQL2 database");
    } catch (err) {
      console.error("Connection to one of the databases failed!", err);
    }
  }

  /**
   * Ensure that the specified pool is connected.
   * @param {sql.ConnectionPool} pool - The connection pool to ensure connection for.
   * @returns {Promise<sql.ConnectionPool>}
   */
  async ensureConnected(pool) {
    if (!pool || !pool.connected) {
      await pool.connect();
    }
    return pool;
  }

  /**
   * Get the connection pool based on the pool switch value.
   * @param {string} poolSwitch - The pool switch value ('pool1' or 'pool2').
   * @returns {sql.ConnectionPool} The corresponding connection pool.
   * @throws {Error} If an invalid pool switch is provided.
   */
  getPool(poolSwitch) {
    if (poolSwitch === "pool1") {
      return this.pool1;
    } else if (poolSwitch === "pool2") {
      return this.pool2;
    } else {
      throw new Error("Invalid pool switch provided");
    }
  }
}

// Create an instance of the DatabaseConnectionManager
const mssqlConfig = new DatabaseConnectionManager();

// Initialize pools on startup
mssqlConfig.initializePools();

module.exports = mssqlConfig;
