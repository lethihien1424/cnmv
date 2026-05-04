const storeRepository = require("../repositories/store.repository");
const notificationRepository = require("../repositories/notification.repository");

const STATUS = {
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  INACTIVE: "INACTIVE",
};

const getPendingB2CStores = async () => {
  return storeRepository.findPendingB2CStores();
};
// Lấy danh sách thông báo của người dùng hiện tại
const getUserNotifications = async (userId) => {
  return await notificationRepository.findAllByRecipientId(userId);
};
const updateStoreStatus = async (storeId, status) => {
  if (!Object.values(STATUS).includes(status)) {
    const error = new Error(
      `status must be one of: ${Object.values(STATUS).join(", ")}`,
    );
    error.statusCode = 400;
    throw error;
  }

  const store = await storeRepository.findStoreById(storeId);
  if (!store) {
    const error = new Error("Store not found");
    error.statusCode = 404;
    throw error;
  }

  if (
    status === STATUS.APPROVED &&
    store.store_type === "B2C" &&
    (!store.business_license || !store.tax_code)
  ) {
    const error = new Error(
      "Cannot approve B2C store without business_license and tax_code",
    );
    error.statusCode = 400;
    throw error;
  }

  store.status = status;
  await store.save();

  let title = "";
  let message = "";

  switch (status) {
    case STATUS.APPROVED:
      title = "Store application approved";
      message = `Cửa hàng ${store.store_name} của bạn đã được duyệt thành công.`;
      break;
    case STATUS.REJECTED:
      title = "Store application rejected";
      message = `Đơn đăng ký cửa hàng ${store.store_name} của bạn đã bị từ chối.`;
      break;
    case STATUS.INACTIVE:
      title = "Store deactivated";
      message = `Cửa hàng ${store.store_name} của bạn đã bị Admin chuyển sang trạng thái Ngưng hoạt động.`;
      break;
  }

  await notificationRepository.createNotification({
    recipient_id: store.owner_id,
    title,
    message,
    type: "SHOP_UPDATE",
    is_read: false,
    related_id: store.id,
  });

  return store;
};

module.exports = {
  getPendingB2CStores,
  updateStoreStatus,
};
