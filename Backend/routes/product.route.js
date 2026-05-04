const express = require("express");
const productController = require("../controllers/product.controller");
const { verifyToken, checkRole } = require("../middlewares/auth.middleware");
const { uploadProductImages } = require("../middlewares/upload.middleware");

const router = express.Router();

router.get("/", productController.searchProducts);
router.get("/:id", productController.getProductDetail);

router.post(
  "/",
  verifyToken,
  checkRole(["Customer", "Business"]),
  uploadProductImages,
  productController.createProduct,
);

router.put(
  "/:id",
  verifyToken,
  checkRole(["Customer", "Business"]),
  uploadProductImages,
  productController.updateProduct,
);

router.delete(
  "/:id",
  verifyToken,
  checkRole(["Customer", "Business"]),
  productController.deleteProduct,
);

module.exports = router;
