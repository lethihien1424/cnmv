const express = require("express");
const productController = require("../controllers/product.controller");
const { verifyToken, checkRole } = require("../middlewares/auth.middleware");
const { uploadProductImages } = require("../middlewares/upload.middleware");
const { checkToxicContent } = require("../middlewares/aiModeration"); // 🤖 AI Kiểm duyệt nội dung

const router = express.Router();

router.get("/", productController.searchProducts);
router.get("/:id", productController.getProductDetail);

router.post(
  "/",
  verifyToken,
  checkRole(["Customer", "Business"]),
  uploadProductImages,       // Xử lý multipart/form-data trước
  checkToxicContent,         // 🤖 AI quét nội dung - chặn nếu vi phạm
  productController.createProduct,
);

router.put(
  "/:id",
  verifyToken,
  checkRole(["Customer", "Business"]),
  uploadProductImages,       // Xử lý multipart/form-data trước
  checkToxicContent,         // 🤖 AI quét nội dung - chặn nếu vi phạm
  productController.updateProduct,
);

router.delete(
  "/:id",
  verifyToken,
  checkRole(["Customer", "Business"]),
  productController.deleteProduct,
);

router.put(
  "/:id/flash-sale",
  verifyToken,
  checkRole(["Customer", "Business"]),
  productController.setFlashSale,
);

router.put(
  "/:id/flash-sale/schedule",
  verifyToken,
  checkRole(["Customer", "Business"]),
  productController.scheduleFlashSale,
);

router.get(
  "/:id/flash-sale/suggest",
  verifyToken,
  checkRole(["Customer", "Business"]),
  productController.suggestFlashSale,
);

module.exports = router;
