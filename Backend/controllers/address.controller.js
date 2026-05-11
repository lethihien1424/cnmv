//D:\CNM_cu\CongNgheMoi\Backend\controllers\address.controller.js
const addressService = require("../services/address.service");

const createAddress = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const data = await addressService.createAddress(userId, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAddresses = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const data = await addressService.getAddresses(userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createAddress,
  getAddresses,
};