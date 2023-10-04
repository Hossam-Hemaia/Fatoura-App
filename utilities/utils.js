const { AQ_DEQ_NAV_NEXT_MSG } = require("oracledb");
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

exports.getLastCustomerCode = async (customerType) => {
  try {
    const connection = await dbConnect.getConnection();
    const lastCode = await connection.execute(
      `SELECT MAX(CUST_CODE) FROM CUSTOMERS WHERE CUST_TYPE = '${customerType}'`
    );
    let code = parseInt(lastCode.rows[0][0].split("0")[1]);
    if (isNaN(code)) {
      code = 0;
    }
    const nextCode = lastCode.rows[0][0]
      .split("0")[0]
      .concat("0")
      .concat(code + 1);
    return nextCode;
  } catch (err) {
    throw new Error(err);
  }
};
