const jwt = require("jsonwebtoken");

exports.userIsAuth = async (req, res, next) => {
  let decodedToken;
  try {
    const token = req.get("Authorization").split(" ")[1];
    decodedToken = jwt.verify(token, process.env.SECRET);
  } catch (err) {
    err.statusCode = 403;
    next(err);
  }
  if (!decodedToken) {
    const error = new Error("Authorization faild!");
    error.statusCode = 401;
    next(error);
  }
  if (decodedToken.role === "مندوب") {
    req.userId = decodedToken.userId;
    next();
  } else {
    const error = new Error("invalid credentials");
    error.statusCode = 403;
    throw error;
  }
};
