const authService = require("../services/auth.service");

const register = async (req, res) => {
  try {
    // Lấy URL ảnh đầu tiên từ mảng imageUrls (do middleware upload tạo ra)
    const licenseImageUrl =
      req.imageUrls && req.imageUrls.length > 0 ? req.imageUrls[0] : null;

    // Gộp dữ liệu từ body và link ảnh vào payload
    const payload = {
      ...req.body,
      // Chỉ ghi đè khi có ảnh upload, nếu không thì giữ giá trị business_license từ body
      business_license: licenseImageUrl || req.body.business_license,
    };

    const result = await authService.register(payload);

    return res.status(201).json({
      message: "Register success",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    return res.status(200).json({
      message: "Login success",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  register,
  login,
};
