const { createPaymentUrl } = require("../services/vnpay.service");
const { handleVnpayReturn } = require("../services/payment.service");

// ✅ IMPORT ĐÚNG MODEL
const { Order } = require("../models");


const vnpayReturn = async (req, res) => {
  try {
    console.log("📥 VNPay Return Query:", req.query);

    const result = handleVnpayReturn(req.query);

    if (!result.orderId) {
      console.error("❌ VNPay không trả về vnp_TxnRef (OrderId)");
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}/checkout?payment_status=error&message=Missing_OrderId`);
    }

    const order = await Order.findByPk(result.orderId);

    if (!order) {
      console.error("❌ Không tìm thấy order trong DB");
      return res.send(`<h1>❌ Không tìm thấy đơn hàng</h1>`);
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    if (result.success) {
      await order.update({ payment_status: "PAID", order_status: "PICKUP" });
      console.log("✅ Updated PAID and order_status to PICKUP");
      return res.redirect(`${frontendUrl}/checkout?payment_status=success&order_id=${result.orderId}`);
    } else {
      await order.update({ payment_status: "FAILED" });
      console.log("❌ Updated FAILED");
      return res.redirect(`${frontendUrl}/checkout?payment_status=failed&error_code=${result.responseCode}`);
    }
  } catch (error) {
    console.error("VNPay Return Error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(`${frontendUrl}/checkout?payment_status=error&message=${encodeURIComponent(error.message)}`);
  }
};

module.exports = { vnpayReturn };