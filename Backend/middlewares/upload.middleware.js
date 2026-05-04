const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

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

module.exports = {
  uploadProductImages,
};
