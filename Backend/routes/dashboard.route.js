const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboard.controller");

const {
  verifyToken,
  checkRole,
} = require("../middlewares/auth.middleware");

router.get(
  "/store-overview/:storeId",
  verifyToken,
  checkRole(["Business", "Customer"]),
  dashboardController.getStoreOverview
);

module.exports = router;