const authService = require("../services/auth.service");
const { User } = require("../models"); // BẮT BUỘC THÊM DÒNG NÀY để dùng được User

const register = async (req, res) => {
  try {
    // Gộp dữ liệu từ body chữ và link ảnh (từ middleware) vào chung một payload
    const payload = {
      ...req.body,
      // Kiểm tra nếu có up ảnh thì gán link vào, nếu không thì giữ giá trị cũ hoặc bỏ qua
      ...(req.documentUrls?.business_license && {
        business_license: req.documentUrls.business_license,
      }),
      ...(req.documentUrls?.front_id_image && {
        front_id_image: req.documentUrls.front_id_image,
      }),
      ...(req.documentUrls?.back_id_image && {
        back_id_image: req.documentUrls.back_id_image,
      }),
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

const forgotPassword = async (req, res) => {
  try {
    const result = await authService.forgotPassword(req.body);
    return res.status(200).json({
      message: "If the email exists, OTP has been sent",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const result = await authService.resetPassword(req.body);
    return res.status(200).json({
      message: "Password reset success",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

const getDailyXuStatus = async (req, res) => {
  try {
    const result = await authService.getDailyXuStatus(req.user.userId);
    return res.status(200).json({
      message: "Lấy trạng thái Xu thành công",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

const claimDailyXu = async (req, res) => {
  try {
    const result = await authService.claimDailyXu(req.user.userId);
    return res.status(200).json({
      message: "Nhận 100 Xu thành công",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

// HÀM CẬP NHẬT HỒ SƠ ĐÃ ĐƯỢC CHỈNH LẠI
const updateProfile = async (req, res) => {
  try {
    // req.user.id lấy từ middleware xác thực token (bạn đang dùng JWT)
    const userId = req.user.id;
    const { username, address } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    // Cập nhật thông tin (nếu người dùng có gửi lên)
    if (username) user.username = username;
    if (address) user.address = address;

    await user.save();

    // Trả về dữ liệu user mới (không trả về password)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      address: user.address,
    };

    res
      .status(200)
      .json({ message: "Cập nhật hồ sơ thành công", data: userData });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// GỘP CHUNG XUẤT RA MỘT LẦN DUY NHẤT Ở ĐÂY
module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  updateProfile,
  getDailyXuStatus,
  claimDailyXu,
};
