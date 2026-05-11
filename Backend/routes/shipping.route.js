// routes/shipping.route.js
const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/auth.middleware");
const shippingController = require("../controllers/shipping.controller");

router.post("/calculate", verifyToken, checkRole(["Customer"]), shippingController.calculateFee);

module.exports = router;