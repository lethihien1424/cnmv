const { createPaymentUrl } = require("../services/vnpay.service");
const { handleVnpayReturn } = require("../services/payment.service");

// ✅ IMPORT ĐÚNG MODEL
const { Order } = require("../models");

const createPayment = async (req, res) => {
  try {
    const { order } = req.body;

    if (!order || !order.id || !order.total_amount) {
      return res.status(400).json({ message: "Thiếu thông tin đơn hàng" });
    }

    const paymentUrl = createPaymentUrl(order);

    res.json({ success: true, paymentUrl });
  } catch (error) {
    console.error("Create Payment Error:", error);
    res.status(500).json({ message: error.message });
  }
};

const vnpayReturn = async (req, res) => {
  try {
    console.log("📥 VNPay Return Query:", req.query);

    const result = handleVnpayReturn(req.query);

    console.log("👉 OrderId từ VNPay:", result.orderId);

    // ✅ tìm order trước
    const order = await Order.findByPk(result.orderId);

    if (!order) {
      console.error("❌ Không tìm thấy order trong DB");
      return res.send(`<h1>❌ Không tìm thấy đơn hàng</h1>`);
    }

    if (result.success) {
      await order.update({ payment_status: "PAID" });

      console.log("✅ Updated PAID");

      return res.send(`
        <h1 style="color:green;text-align:center;margin-top:100px;">
          ✅ Thanh toán thành công!
        </h1>
      `);
    } else {
      await order.update({ payment_status: "FAILED" });

      console.log("❌ Updated FAILED");

      return res.send(`
        <h1 style="color:red;text-align:center;margin-top:100px;">
          ❌ Thanh toán thất bại<br>
          Mã lỗi: ${result.responseCode}
        </h1>
      `);
    }
  } catch (error) {
    console.error("VNPay Return Error:", error);
    return res.send(`<h1>❌ ${error.message}</h1>`);
  }
};

module.exports = { createPayment, vnpayReturn };