const express = require("express");
const isAuth = require("../middleWares/isAuth");
const userController = require("../controllers/userController");
const router = express.Router();

router.get("/item/details", isAuth.userIsAuth, userController.getItemDetails);

router.get("/customers", isAuth.userIsAuth, userController.getCustomers);

router.get("/get/customer", isAuth.userIsAuth, userController.getCustomer);

router.get(
  "/customer/branches",
  isAuth.userIsAuth,
  userController.getCustomerBranch
);

router.get(
  "/customers/types",
  isAuth.userIsAuth,
  userController.getCustomersTypes
);

router.get("/area", isAuth.userIsAuth, userController.getAreas);

router.post(
  "/sells/invoice",
  isAuth.userIsAuth,
  userController.postSellsInvoice
);

module.exports = router;
