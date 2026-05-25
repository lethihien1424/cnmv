const dashboardService = require("../services/dashboard.service");

const getStoreOverview = async (req, res) => {
  try {
    const data = await dashboardService.getStoreOverview(
      req.params.storeId
    );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getStoreOverview,
};