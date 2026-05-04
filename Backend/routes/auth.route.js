const express = require("express");
const authController = require("../controllers/auth.controller");

const router = express.Router();
const { uploadProductImages } = require("../middlewares/upload.middleware"); // Tận dụng middleware có sẵn

// Sửa dòng này để cho phép upload 1 file ảnh với key là 'business_license'
router.post("/register", uploadProductImages, authController.register);
router.post("/login", authController.login);

module.exports = router;
