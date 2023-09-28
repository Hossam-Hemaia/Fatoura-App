const oracleDB = require("oracledb");

let dbConnection;

module.exports = {
  init: async () => {
    if (dbConnection) {
      // If a connection already exists, return it
      return dbConnection;
    }
    try {
      oracleDB.initOracleClient();
      dbConnection = await oracleDB.getConnection({
        user: process.env.db_username,
        password: process.env.db_password,
        connectString: `${process.env.db_url}:${process.env.db_port}/${process.env.db_name}`,
      });
      console.log("Connected to the database");
      return dbConnection;
    } catch (err) {
      console.error("Error connecting to the database:", err);
      throw err; // Rethrow the error to indicate the failure to the caller
    }
  },

  getConnection: () => {
    if (!dbConnection) {
      throw new Error("Connection to the database failed!");
    }
    return dbConnection;
  },
};

// module.exports = {
//   init: () => {
//     return new Promise((resolve, reject) => {
//       oracleDB.initOracleClient();
//       dbConnection = oracleDB.getConnection({
//         user: process.env.db_username,
//         password: process.env.db_password,
//         connectionString: `${process.env.db_url}:${process.env.db_port}/${process.env.db_name}`,
//       });
//       console.log("connected to database");
//       return resolve(dbConnection);
//     });
//   },
//   getConnection: () => {
//     if (!dbConnection) {
//       throw new Error("Connection to database faild!");
//     }
//     return dbConnection;
//   },
// };
