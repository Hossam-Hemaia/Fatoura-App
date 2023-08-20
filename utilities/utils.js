const dbConnect = require("../dbConnect/dbConnect");

exports.cloneTable = async (sourceTable, clonedTable) => {
  try {
    const connection = await dbConnect.getConnection();
    await connection.execute(
      `CREATE TABLE ${clonedTable} AS SELECT * FROM ${sourceTable} WHERE 1 = 0`
    );
  } catch (err) {
    throw new Error(err);
  }
};

exports.getLastId = async (tableName, idColumn, columnName, filter) => {
  try {
    const connection = await dbConnect.getConnection();
    let lastId;
    if (filter) {
      lastId = await connection.execute(
        `SELECT MAX(${idColumn}) FROM ${tableName} WHERE ${columnName} = ${filter}`
      );
    } else {
      lastId = await connection.execute(`SELECT MAX(ID) FROM ${tableName}`);
    }
    const upComingId = lastId.rows[0][0] + 1;
    return upComingId;
  } catch (err) {
    throw new Error(err);
  }
};

exports.getLocalDate = (date) => {
  try {
    const isoDate = new Date(date);
    const localDate = new Date(
      isoDate.getTime() - isoDate.getTimezoneOffset() * 60000
    );
    return localDate;
  } catch (err) {
    throw new Error(err);
  }
};
