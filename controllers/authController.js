const dbConnect = require("../dbConnect/dbConnect");
const jwt = require("jsonwebtoken");

exports.postUserLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const connection = await dbConnect.getConnection();
    const user = await connection.execute(
      `SELECT AU.*, S.ID AS STORE_ID, S.NAME AS STORE_NAME
      FROM APP_USERS AU
      JOIN STORES S ON AU.STR_ID = S.ID
      WHERE AU.USERNAME = '${username}' AND AU.PASS = '${password}'`
    );
    if (!user) {
      const error = new Error("Invalid Credentials!");
      error.statusCode = 422;
      throw error;
    }
    const token = jwt.sign(
      { userId: user.rows[0][0], storeId: user.rows[0][8], role: "مندوب" },
      process.env.SECRET,
      { expiresIn: "24h" }
    );
    // check if the user is active or not
    res.status(201).json({ success: true, user, token });
  } catch (err) {
    next(err);
  }
};
