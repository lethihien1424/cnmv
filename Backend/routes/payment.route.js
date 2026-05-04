const express = require("express");
const router = express.Router();
const { createPayment, vnpayReturn } = require("../controllers/payment.controller");

router.post("/create", createPayment);           // Tạo link thanh toán
router.get("/vnpay-return", vnpayReturn);        // Callback từ VNPay

module.exports = router;