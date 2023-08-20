const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/user/login", authController.postUserLogin);

module.exports = router;
