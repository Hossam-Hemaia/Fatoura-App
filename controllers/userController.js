const oracledb = require("oracledb");
const dbConnect = require("../dbConnect/dbConnect");
const utilities = require("../utilities/utils");

exports.getItemDetails = async (req, res, next) => {
  try {
    const { barcode } = req.query;
    const connection = await dbConnect.getConnection();
    const item = await connection.execute(
      `SELECT * FROM ITEMS_V WHERE BARCODE = ${barcode}`
    );
    if (!item) {
      const error = new Error("Item is not found!");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ success: true, item });
  } catch (err) {
    next(err);
  }
};

exports.getCustomers = async (req, res, next) => {
  try {
    const connection = await dbConnect.getConnection();
    const customers = await connection.execute(`SELECT * FROM CUSTOMERS`);
    res.status(200).json({ success: true, customers });
  } catch (err) {
    next(err);
  }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customerId = req.query.customerId;
    const connection = await dbConnect.getConnection();
    const customer = await connection.execute(
      `SELECT * FROM CUSTOMERS WHERE ID = ${customerId}`
    );
    res.status(200).json({ success: true, customer });
  } catch (err) {
    next(err);
  }
};

exports.getCustomerBranch = async (req, res, next) => {
  try {
    const customerId = req.query.customerId;
    const connection = await dbConnect.getConnection();
    const customerBranches = await connection.execute(
      `SELECT * FROM CUST_BRANCHES_CLONE WHERE CUST_ID = ${customerId}`
    );
    res.status(200).json({ success: true, branches: customerBranches });
  } catch (err) {
    next(err);
  }
};

exports.getCustomersTypes = async (req, res, next) => {
  try {
    const connection = await dbConnect.getConnection();
    const customerTypes = await connection.execute(
      `SELECT * FROM LOOKUP_VALUES WHERE LOOKUP_TYPE = 'CUSTOMER_TYPE'`
    );
    if (customerTypes.rows.length <= 0) {
      const error = new Error("No Customers Found!");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ success: true, customerTypes });
  } catch (err) {
    next(err);
  }
};

exports.getAreas = async (req, res, next) => {
  try {
    const connection = await dbConnect.getConnection();
    const areas = await connection.execute(
      `SELECT * FROM LOOKUP_VALUES WHERE LOOKUP_TYPE = 'AREA' ORDER BY DESCR_AR`
    );
    const stores = await connection.execute(`SELECT * FROM STORES`);
    console.log(stores);
    if (areas.rows.length <= 0) {
      const error = new Error("No Customers Found!");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ success: true, areas });
  } catch (err) {
    next(err);
  }
};

exports.postSellsInvoice = async (req, res, next) => {
  try {
    const {
      transType,
      discount,
      customerName,
      customerId,
      storeId,
      paymentType,
      netAmount,
      username,
      branchName,
      customerBranchId,
      areaId,
      invoiceDetails,
    } = req.body;
    const connection = await dbConnect.getConnection();
    let custId = customerId;
    let custBranchId = customerBranchId;
    if (customerId === "") {
      // REGISTER NEW CUSTOMER
      const id = await utilities.getLastId("CUSTOMERS_CLONE");
      custId = id;
      await connection.execute(
        `INSERT INTO CUSTOMERS_CLONE (ID, NAME) VALUES(${id}, '${customerName}')`
      );
      await connection.tpcCommit();
    }
    if (customerBranchId === "") {
      // REGISTER NEW CUSTOMER BRANCH
      const id = await utilities.getLastId("CUST_BRANCHES_CLONE");
      custBranchId = id;
      await connection.execute(
        `INSERT INTO CUST_BRANCHES_CLONE (ID, CUST_ID, DESCR)
         VALUES(${id}, '${custId}', '${branchName}')`
      );
      await connection.tpcCommit();
    }
    // GET INVOICE HEADER ID AND TRANS NUMBER
    const invoiceHeaderId = await utilities.getLastId("STOCK_MOVE_HD_CLONE");
    const transNumber = await utilities.getLastId(
      "STOCK_MOVE_HD_CLONE",
      "TRANS_NO",
      "TRANS_TYPE",
      transType
    );
    // REGISTER INVOICE HEADER
    const currentDate = new Date();
    const localDate = utilities.getLocalDate(currentDate);
    const sql = `
      INSERT INTO STOCK_MOVE_HD_CLONE
      (ID, TRANS_NO, TRANS_TYPE, TRANS_DATE, DISCOUNT, CUST_ID, STORE_ID, STATUS,
       CREDIT, CREATED_BY, CREATION_DT, CUST_BRANCH, AREA_ID)
      VALUES (:id, :transNo, :transType, :transDate, :discount, :custId, :storeId,
      2, :amount, :username, :createDate, :custBranchId, :areaId)
    `;
    const binds = {
      id: invoiceHeaderId,
      transNo: transNumber,
      transType: transType,
      transDate: localDate,
      discount: discount,
      custId: custId,
      storeId: storeId,
      amount: netAmount,
      username: username,
      createDate: localDate,
      custBranchId: custBranchId,
      areaId: areaId,
    };
    // REGISTER INVOICE DETAILS
    await connection.execute(sql, binds);
    for (let detail of invoiceDetails) {
      let id = await utilities.getLastId("STOCK_MOVE_DT_CLONE");
      let sql = `
        INSERT INTO STOCK_MOVE_DT_CLONE (ID, HD_ID, ITEM_ID, QTY, COST, PRICE, UNIT_ID, SHAD,
        CREATED_BY, CREATION_DT)
        VALUES (:id, :headerId, :itemId, :qty, :cost, :price, :unitId, :shad, :createdBy,
        :creationDate)
      `;
      let binds = {
        id: id,
        headerId: invoiceHeaderId,
        itemId: detail.itemId,
        qty: detail.qty,
        cost: detail.cost,
        price: detail.price,
        unitId: detail.unitId,
        shad: detail.shad,
        createdBy: req.userId,
        creationDate: localDate,
      };
      await connection.execute(sql, binds);
    }
    await connection.tpcCommit();
    if (transType === 1) {
      const procedureSql = `BEGIN ONLINE_PKG.POST_UNPOSTT(:id, :param); END;`;
      const procedureBinds = {
        id: {
          dir: oracledb.BIND_IN,
          type: oracledb.NUMBER,
          val: invoiceHeaderId,
        },
        param: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: "P" },
      };
      await connection.execute(procedureSql, procedureBinds);
      await connection.tpcCommit();
      const nextProcedureSql = `BEGIN ONLINE_PKG.POST_SALES_INV (:id, :param); END;`;
      const nextProcedureBinds = {
        id: {
          dir: oracledb.BIND_IN,
          type: oracledb.NUMBER,
          val: invoiceHeaderId,
        },
        param: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: "P" },
      };
      await connection.execute(nextProcedureSql, nextProcedureBinds);
      await connection.tpcCommit();
    } else if (transType === 2) {
      const returnProcedureSql = `ONLINE_PKG.POST_UNPOSTT(:id, :param); END;`;
      const returnProcedureBinds = {
        id: {
          dir: oracledb.BIND_IN,
          type: oracledb.NUMBER,
          val: invoiceHeaderId,
        },
        param: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: "U" },
      };
      await connection.execute(returnProcedureSql, returnProcedureBinds);
      await connection.tpcCommit();
      const nextReturnProcedureSql = `ONLINE_PKG.POST_SALES_RETURN (:id, :param); END;`;
      const nextReturnProcedureBinds = {
        id: {
          dir: oracledb.BIND_IN,
          type: oracledb.NUMBER,
          val: invoiceHeaderId,
        },
        param: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: "P" },
      };
      await connection.execute(
        nextReturnProcedureSql,
        nextReturnProcedureBinds
      );
    }
    res
      .status(201)
      .json({ success: true, message: "invoice registered successfully" });
  } catch (err) {
    next(err);
  }
};
