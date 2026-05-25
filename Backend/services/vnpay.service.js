const crypto = require("crypto");
const qs = require("qs");
const moment = require("moment");

const createPaymentUrl = (order) => {
  const tmnCode = process.env.VNP_TMNCODE;
  const secretKey = process.env.VNP_HASH_SECRET;
  const vnpUrl = process.env.VNP_URL;
  const returnUrl = process.env.VNP_RETURN_URL;

  const createDate = moment().format("YYYYMMDDHHmmss");

  let vnp_Params = {
  vnp_Version: "2.1.0",
  vnp_Command: "pay",
  vnp_TmnCode: tmnCode,

  vnp_Amount: order.total_amount * 100,
  vnp_CurrCode: "VND",

  vnp_TxnRef: order.id,

  vnp_OrderInfo:
    `Don_hang_${order.id}_USER_${order.buyer_id}`,

  vnp_OrderType: "other",

  vnp_Locale: "vn",
  vnp_ReturnUrl: returnUrl,
  vnp_IpAddr: "127.0.0.1",

  vnp_CreateDate: createDate,
};

  // SORT
  const sortedParams = {};
  Object.keys(vnp_Params)
    .sort()
    .forEach((key) => {
      sortedParams[key] = vnp_Params[key];
    });

  // 🔥 ENCODE TRUE
  const signData = qs.stringify(sortedParams, { encode: true });

  const secureHash = crypto
    .createHmac("sha512", secretKey)
    .update(signData)
    .digest("hex");

  sortedParams.vnp_SecureHash = secureHash;

  return vnpUrl + "?" + qs.stringify(sortedParams, { encode: true });
};

module.exports = { createPaymentUrl };