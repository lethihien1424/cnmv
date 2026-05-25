// Backend/controllers/payment.controller.js
const { createPaymentUrl } = require("../services/vnpay.service");
const { handleVnpayReturn } = require("../services/payment.service");

// ✅ IMPORT ĐÚNG MODEL
const {
  Order,
  Wallet,
  WalletTransaction,
} = require("../models");


const vnpayReturn = async (req, res) => {
  try {
    console.log("📥 VNPay Return Query:", req.query);

    const result = handleVnpayReturn(req.query);

    if (!result.orderId) {
      console.error("❌ VNPay không trả về vnp_TxnRef (OrderId)");
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}/checkout?payment_status=error&message=Missing_OrderId`);
    }
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    if (
  result.orderId.startsWith("TOPUP_")
) {

  const userId =
    req.query.vnp_OrderInfo
      ?.split("_USER_")[1];

  const amount =
    Number(req.query.vnp_Amount) / 100;

  let wallet = await Wallet.findOne({
    where: { user_id: userId },
  });

  if (!wallet) {
    wallet = await Wallet.create({
      user_id: userId,
      balance: 0,
    });
  }

  if (result.success) {

    wallet.balance =
      Number(wallet.balance) + amount;

    await wallet.save();

    await WalletTransaction.create({
      wallet_id: wallet.id,
      type: "TOPUP",
      amount,
      status: "SUCCESS",
      description: "Nạp tiền VNPay",
    });

    return res.redirect(
      `${frontendUrl}/my-wallet?payment_status=success`
    );
  }

  return res.redirect(
    `${frontendUrl}/my-wallet?payment_status=failed`
  );
}
    const order = await Order.findByPk(result.orderId);

    if (!order) {
      console.error("❌ Không tìm thấy order trong DB");
      return res.send(`<h1>❌ Không tìm thấy đơn hàng</h1>`);
    }


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