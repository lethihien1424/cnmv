// controllers/shipping.controller.js
const shippingService = require("../services/shipping.service");

const calculateFee = async (req, res) => {
  try {
    const { address_id, service_type = 2, shipping_provider = 'GHN' } = req.body;

    if (!address_id) {
      return res.status(400).json({ success: false, message: "Thiếu address_id" });
    }

    const result = await shippingService.calculateShippingFee(
      req.user.userId,
      address_id,
      Number(service_type),
      shipping_provider
    );

    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { calculateFee };