const crypto = require("crypto");
const qs = require("qs");

const sortObject = (obj) => {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      if (obj[key] != null) {
        result[key] = obj[key];
      }
      return result;
    }, {});
};

const handleVnpayReturn = (query) => {
  let vnp_Params = { ...query };

  const secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);

  const signData = qs.stringify(vnp_Params, { encode: false });

  const signed = crypto
    .createHmac("sha512", process.env.VNP_HASH_SECRET)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  if (secureHash !== signed) {
    console.error("❌ Sai chữ ký!");
    console.error("SignData Return:", signData);
    throw new Error("Sai chữ ký - Signature không khớp");
  }

  const responseCode = vnp_Params["vnp_ResponseCode"];

  return {
    success: responseCode === "00",
    orderId: vnp_Params["vnp_TxnRef"],
    responseCode: responseCode,
    message: responseCode === "00" ? "Thanh toán thành công" : "Thanh toán thất bại",
  };
};

module.exports = { handleVnpayReturn };