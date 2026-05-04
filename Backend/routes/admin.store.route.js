const express = require("express");
const adminStoreController = require("../controllers/admin.store.controller");
const { verifyToken, checkRole } = require("../middlewares/auth.middleware");
const { Store, User } = require("../models");

const router = express.Router();

router.get(
  "/stores/pending",
  verifyToken,
  checkRole(["Admin"]),
  adminStoreController.getPendingStores,
);

router.put(
  "/stores/:id/status",
  verifyToken,
  checkRole(["Admin"]),
  adminStoreController.updateStoreStatus,
);

// Alias để tương thích với client đang gọi POST thay vì PUT
router.post(
  "/stores/:id/status",
  verifyToken,
  checkRole(["Admin"]),
  adminStoreController.updateStoreStatus,
);

// Alias ngắn: POST /api/admin/stores/:id với body { status }
router.post(
  "/stores/:id",
  verifyToken,
  checkRole(["Admin"]),
  adminStoreController.updateStoreStatus,
);
// Route lấy danh sách cửa hàng đã đăng ký thành công
router.get(
  "/approved-stores",
  verifyToken,
  checkRole(["Admin"]),
  async (req, res) => {
    try {
      const stores = await Store.findAll({
        where: { status: "APPROVED" },
        include: [
          {
            model: User,
            as: "owner",
            attributes: ["id", "username", "email"],
          },
        ],
      });
      res.json({ success: true, data: stores });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);
// Route kích hoạt bán hàng C2C (Ai đã đăng nhập cũng làm được)
router.post("/activate-c2c", verifyToken, async (req, res) => {
  try {
    // 1. Tạo Store mới với type là C2C và status APPROVED luôn
    const newStore = await Store.create({
      owner_id: req.user.userId, // Lấy ID người dùng từ Token
      store_name: req.body.store_name,
      description: req.body.description,
      store_type: "C2C",
      status: "APPROVED",
    });

    res.status(201).json({
      success: true,
      message: "Kích hoạt shop C2C thành công!",
      data: newStore,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Backend/routes/admin.store.route.js
router.post("/activate-c2c", verifyToken, async (req, res) => {
  try {
    const { store_name, description, identity_card } = req.body;

    const newStore = await Store.create({
      owner_id: req.user.userId,
      store_name,
      description,
      identity_card, // Sửa: Bổ sung lưu CCCD cho C2C
      store_type: "C2C",
      status: "APPROVED", // C2C không cần chờ duyệt
    });

    res.status(201).json({
      success: true,
      message: "Kích hoạt shop C2C thành công!",
      data: newStore,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;
