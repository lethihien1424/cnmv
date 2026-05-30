const dashboardRepo = require("../repositories/dashboard.repository");

const getStoreOverview = async (storeId, filters) => {
  try {
    // Gọi tới hàm trong repository và chờ kết quả
    const result = await dashboardRepo.getStoreOverview(storeId, filters);
    return result;
  } catch (error) {
    console.error("Lỗi trong dashboardService:", error);
    throw error;
  }
};

module.exports = {
  getStoreOverview,
};
