const oracledb = require("oracledb");
const dbConnect = require("../dbConnect/dbConnect");
const utilities = require("../utilities/utils");

exports.getDataScout = async (req, res, next) => {
  try {
    const connection = await dbConnect.getConnection();
    const result = await connection.execute(`SELECT * FROM STOCK_MOVE_DT`);
    res.status(200).json({ result });
  } catch (err) {
    next(err);
  }
};

exports.getItemDetails = async (req, res, next) => {
  try {
    const { barcode } = req.query;
    const connection = await dbConnect.getConnection();
    const item = await connection.execute(
      `SELECT ITEMS_V.*, UNITS.name AS UNIT_NAME
       FROM ITEMS_V
       JOIN UNITS ON ITEMS_V.UNIT_ID = UNITS.ID
       WHERE ITEMS_V.BARCODE = ${barcode}`
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

exports.getAllItems = async (req, res, next) => {
  try {
    const searchTerm = req.query.searchTerm;
    const connection = await dbConnect.getConnection();
    const items = await connection.execute(
      `SELECT ITEMS_V.*, UNITS.name AS UNIT_NAME
       FROM ITEMS_V
       JOIN UNITS ON ITEMS_V.UNIT_ID = UNITS.ID
       WHERE (LOWER(ITEMS_V.NAME) LIKE LOWER('%${searchTerm}%')
       OR LOWER(ITEMS_V.NAME_EN) LIKE LOWER('%${searchTerm}%'))
       `
    );
    res.status(200).json({ success: true, items });
  } catch (err) {
    next(err);
  }
};

exports.getCustomers = async (req, res, next) => {
  try {
    const searchTerm = req.query.searchTerm;
    const connection = await dbConnect.getConnection();
    const customers = await connection.execute(
      `SELECT * FROM CUSTOMERS WHERE LOWER(NAME) LIKE LOWER('%${searchTerm}%')`
    );
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
      `SELECT * FROM CUST_BRANCHES WHERE CUST_ID = '${customerId}'`
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
    const searchTerm = req.query.searchTerm;
    const connection = await dbConnect.getConnection();
    const areas = await connection.execute(
      `SELECT * FROM LOOKUP_VALUES WHERE LOOKUP_TYPE = 'AREA'
      AND (LOWER(DESCR_AR) LIKE LOWER('%${searchTerm}%')
      OR LOWER(DESCR_EN) LIKE LOWER('%${searchTerm}%'))
      ORDER BY DESCR_AR`
    );
    if (areas.rows.length <= 0) {
      const error = new Error("No Areas Found!");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ success: true, areas });
  } catch (err) {
    next(err);
  }
};

exports.postSellsInvoice = async (req, res, next) => {
  const connection = await dbConnect.getConnection();
  try {
    const {
      transType,
      discount,
      customerName,
      customerId,
      storeId,
      netAmount,
      username,
      branchName,
      customerBranchId,
      areaName,
      areaId,
      invoiceDetails,
    } = req.body;
    let custId = customerId;
    let custBranchId = customerBranchId;
    if (customerId === "") {
      // REGISTER NEW CUSTOMER
      const id = await utilities.getLastId("CUSTOMERS");
      custId = id;
      await connection.execute(
        `INSERT INTO CUSTOMERS (ID, NAME) VALUES(${id}, '${customerName}')`
      );
      await connection.tpcCommit();
    }
    if (customerBranchId === "") {
      // REGISTER NEW CUSTOMER BRANCH
      const id = await utilities.getLastId("CUST_BRANCHES");
      custBranchId = id;
      await connection.execute(
        `INSERT INTO CUST_BRANCHES (ID, CUST_ID, DESCR)
         VALUES(${id}, '${custId}', '${branchName}')`
      );
      await connection.tpcCommit();
    }
    // GET INVOICE HEADER ID AND TRANS NUMBER
    const invoiceHeaderId = await utilities.getLastId("STOCK_MOVE_HD");
    const transNumber = await utilities.getLastId(
      "STOCK_MOVE_HD",
      "TRANS_NO",
      "TRANS_TYPE",
      transType
    );
    // REGISTER INVOICE HEADER
    const currentDate = new Date();
    const localDate = utilities.getLocalDate(currentDate);
    const sql = `
      INSERT INTO STOCK_MOVE_HD
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
    await connection.execute(sql, binds);
    await connection.tpcCommit();
    // REGISTER INVOICE DETAILS
    for (let detail of invoiceDetails) {
      let id = await utilities.getLastId("STOCK_MOVE_DT");
      let sql = `
        INSERT INTO STOCK_MOVE_DT (ID, HD_ID, ITEM_ID, QTY, COST, PRICE, UNIT_ID, SHAD,
        EXPIRY_DT, CREATED_BY, CREATION_DT, CREATE_PC)
        VALUES (:id, :headerId, :itemId, :qty, :cost, :price, :unitId, :shad,
        :expiryDate, :createdBy, :creationDate, :createPC)
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
        expiryDate: localDate,
        createdBy: req.userId,
        creationDate: localDate,
        createPc: "Mobile Device",
      };
      await connection.execute(sql, binds);
      await connection.tpcCommit();
    }
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
      const returnProcedureSql = `BEGIN ONLINE_PKG.POST_UNPOSTT(:id, :param); END;`;
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
      const nextReturnProcedureSql = `BEGIN ONLINE_PKG.POST_SALES_RETURN (:id, :param); END;`;
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
      await connection.tpcCommit();
    }
    res.status(201).json({
      success: true,
      invoiceNumber: invoiceHeaderId,
      message: "invoice registered successfully",
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  }
};

exports.getStores = async (req, res, next) => {
  try {
    const connection = await dbConnect.getConnection();
    const stores = await connection.execute(`SELECT * FROM STORES`);
    res.status(200).json({ success: true, stores });
  } catch (err) {
    next(err);
  }
};

exports.postTransfereItems = async (req, res, next) => {
  try {
    const { transType, storeId, toStoreId, totalCost, username, items } =
      req.body;
    const connection = await dbConnect.getConnection();
    // GET INVOICE HEADER ID AND TRANS NUMBER
    const invoiceHeaderId = await utilities.getLastId("STOCK_MOVE_HD");
    const transNumber = await utilities.getLastId(
      "STOCK_MOVE_HD",
      "TRANS_NO",
      "TRANS_TYPE",
      transType
    );
    // REGISTER Voucher HEADER
    const currentDate = new Date();
    const localDate = utilities.getLocalDate(currentDate);
    const sql = `
      INSERT INTO STOCK_MOVE_HD
      (ID, TRANS_NO, TRANS_TYPE, TRANS_DATE, STORE_ID, TO_STORE_ID, STATUS,
        SUPP_NET_AMT, CREATED_BY)
      VALUES (:id, :transNo, :transType, :transDate, :storeId, :toStoreId, 
      2, :totalCost, :username)
    `;
    const binds = {
      id: invoiceHeaderId,
      transNo: transNumber,
      transType: transType,
      transDate: localDate,
      storeId: storeId,
      toStoreId: toStoreId,
      totalCost: totalCost,
      username: username,
    };
    await connection.execute(sql, binds);
    // Register Voucher Details
    for (let item of items) {
      let id = await utilities.getLastId("STOCK_MOVE_DT");
      let sql = `
        INSERT INTO STOCK_MOVE_DT (ID, HD_ID, ITEM_ID, QTY, COST, UNIT_ID, SHAD,
        CREATED_BY, CREATION_DT)
        VALUES (:id, :headerId, :itemId, :qty, :cost, :unitId, :shad, :createdBy,
        :creationDate)
      `;
      let binds = {
        id: id,
        headerId: invoiceHeaderId,
        itemId: item.itemId,
        qty: item.qty,
        cost: item.cost,
        unitId: item.unitId,
        shad: item.shad,
        createdBy: req.userId,
        creationDate: localDate,
      };
      await connection.execute(sql, binds);
    }
    await connection.tpcCommit();
    const transfereProcedureSql = `BEGIN ONLINE_PKG.POST_UNPOSTT(:id, :param); END;`;
    const transfereProcedureBinds = {
      id: {
        dir: oracledb.BIND_IN,
        type: oracledb.NUMBER,
        val: invoiceHeaderId,
      },
      param: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: "P" },
    };
    await connection.execute(transfereProcedureSql, transfereProcedureBinds);
    const nextTransProcedureSql = `BEGIN ONLINE_PKG.POST_TRANSFER (:id, :param); END;`;
    const nextTransProcedureBinds = {
      id: {
        dir: oracledb.BIND_IN,
        type: oracledb.NUMBER,
        val: invoiceHeaderId,
      },
      param: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: "P" },
    };
    await connection.execute(nextTransProcedureSql, nextTransProcedureBinds);
    await connection.tpcCommit();
    res.status(201).json({
      success: true,
      invoiceNumber: invoiceHeaderId,
      message: "Transfered successfully",
    });
  } catch (err) {
    next(err);
  }
};
