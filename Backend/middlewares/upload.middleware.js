// const path = require("path");
// const multer = require("multer");

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/");
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
//     const ext = path.extname(file.originalname);
//     cb(null, `product-${uniqueSuffix}${ext}`);
//   },
// });

// const upload = multer({ storage });

// const uploadProductImages = [
//   upload.array("images", 10),
//   (req, res, next) => {
//     const baseUrl = `${req.protocol}://${req.get("host")}`;
//     req.imageUrls = (req.files || []).map(
//       (file) => `${baseUrl}/${file.path.replace(/\\/g, "/")}`,
//     );
//     next();
//   },
// ];

// module.exports = {
//   uploadProductImages,
// };
//
//D:\CNM_cu\CongNgheMoi\Backend\middlewares\upload.middleware.js

const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    // Đổi tiền tố thành 'document-' cho dễ quản lý
    cb(null, `document-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

// Middleware cũ của bạn (Giữ nguyên)
const uploadProductImages = [
  upload.array("images", 10),
  (req, res, next) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    req.imageUrls = (req.files || []).map(
      (file) => `${baseUrl}/${file.path.replace(/\\/g, "/")}`,
    );
    next();
  },
];

// --- MIDDLEWARE MỚI CHUYÊN CHO UPLOAD HỒ SƠ CỬA HÀNG ---
const uploadStoreDocuments = [
  // Cấu hình các field name (key) mà Frontend sẽ gửi lên
  upload.fields([
    { name: "business_license", maxCount: 1 },
    { name: "front_id_image", maxCount: 1 },
    { name: "back_id_image", maxCount: 1 },
  ]),
  (req, res, next) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    req.documentUrls = {}; // Tạo object chứa link ảnh

    // Hàm tạo link ảnh chuẩn
    const getUrl = (fileArray) => {
      if (fileArray && fileArray.length > 0) {
        return `${baseUrl}/${fileArray[0].path.replace(/\\/g, "/")}`;
      }
      return null;
    };

    if (req.files) {
      req.documentUrls.business_license = getUrl(req.files["business_license"]);
      req.documentUrls.front_id_image = getUrl(req.files["front_id_image"]);
      req.documentUrls.back_id_image = getUrl(req.files["back_id_image"]);
    }

    next();
  },
];

module.exports = {
  uploadProductImages,
  uploadStoreDocuments, // Export middleware mới ra ngoài
};
