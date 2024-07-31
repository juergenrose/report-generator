const sql = require('mssql');
const dotenv = require('dotenv');
dotenv.config();

// MSSQL configuration and connection manager class
class DatabaseConnectionManager {
  constructor() {
    // Configuration for the first MSSQL database
    this.config1 = {
      server: process.env.MSSQL_HOST,
      authentication: {
        type: 'default',
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
    this.config2 = {
      server: process.env.MSSQL_HOST,
      authentication: {
        type: 'default',
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
    this.pool1 = new sql.ConnectionPool(this.config1);
    this.pool2 = new sql.ConnectionPool(this.config2);
  }

  // Initialize the connection pools for both databases
  async initializePools() {
    try {
      await this.pool1.connect();
      console.log('Connected to MSSQL1 database');
      await this.pool2.connect();
      console.log('Connected to MSSQL2 database');
    } catch (err) {
      console.error('Connection to one of the databases failed!', err);
    }
  }

  // Ensure that the specified pool is connected
  async ensureConnected(pool) {
    if (!pool || !pool.connected) {
      await pool.connect();
    }
    return pool;
  }

  // Get the connection pool based on the pool switch value
  getPool(poolSwitch) {
    if (poolSwitch === 'pool1') {
      return this.pool1;
    } else if (poolSwitch === 'pool2') {
      return this.pool2;
    } else {
      throw new Error('Invalid pool switch provided');
    }
  }
}

// Create an instance of the DatabaseConnectionManager
const mssqlConfig = new DatabaseConnectionManager();

// Initialize pools on startup
mssqlConfig.initializePools();

module.exports = mssqlConfig;
