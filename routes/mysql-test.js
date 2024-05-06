const db = require("../config/mysql_db").promise();

//some query...
async function runQuery() {
  try {
    const query = `SELECT * FROM city`;
    const result = await db.query(query);
    return result;
  } catch (err) {
    console.error(err);
  }
}

//take runQuery and runs report function
async function runReport() {
  try {
    const result = await runQuery();
    return result;
  } catch (err) {
    console.error(err);
  }
}

module.exports = { runQuery, runReport };
