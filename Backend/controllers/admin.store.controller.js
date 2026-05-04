const adminStoreService = require("../services/admin.store.service");

const getPendingStores = async (req, res) => {
  try {
    const stores = await adminStoreService.getPendingB2CStores();
    return res.status(200).json({
      message: "Get pending stores success",
      data: stores,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

const updateStoreStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const store = await adminStoreService.updateStoreStatus(id, status);

    return res.status(200).json({
      message: "Update store status success",
      data: store,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  getPendingStores,
  updateStoreStatus,
};
