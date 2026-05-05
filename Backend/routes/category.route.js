const express = require("express");
const router = express.Router();
const { Category } = require("../models");
const { verifyToken, checkRole } = require("../middlewares/auth.middleware");

// Xem danh sách danh mục (Ai cũng xem được)
router.get("/", async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// 1. Chỉnh sửa danh mục (Chỉ Admin)
router.put("/:id", verifyToken, checkRole(["Admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy danh mục" });
    }

    await category.update(req.body);
    res.json({ success: true, message: "Cập nhật thành công", data: category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Xóa danh mục (Chỉ Admin)
router.delete("/:id", verifyToken, checkRole(["Admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy danh mục" });
    }

    // Sequelize sẽ tự động thực hiện Soft Delete vì bạn đã cấu hình paranoid: true
    await category.destroy();
    res.json({ success: true, message: "Xóa danh mục thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin mới được tạo danh mục
router.post("/", verifyToken, checkRole(["Admin"]), async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
