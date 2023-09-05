const express = require("express");
const isAuth = require("../middleWares/isAuth");
const userController = require("../controllers/userController");
const router = express.Router();

router.get("/data/scout", userController.getDataScout);

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

router.get("/stores", isAuth.userIsAuth, userController.getStores);

router.post(
  "/transfere/items",
  isAuth.userIsAuth,
  userController.postTransfereItems
);

module.exports = router;
