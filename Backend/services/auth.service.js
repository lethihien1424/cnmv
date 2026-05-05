// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const userRepository = require("../repositories/user.repository");
// const storeRepository = require("../repositories/store.repository");

// const ROLE = {
//   ADMIN: "Admin",
//   CUSTOMER: "Customer",
//   BUSINESS: "Business",
// };

// const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
// const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

// const register = async (payload) => {
//   const {
//     username,
//     email,
//     password,
//     role,
//     business_license: businessLicense,
//     store_name: storeName,
//     store_type: storeType,
//     description,
//   } = payload;

//   if (!email || !password || !role) {
//     const error = new Error("email, password, role are required");
//     error.statusCode = 400;
//     throw error;
//   }

//   if (![ROLE.CUSTOMER, ROLE.BUSINESS].includes(role)) {
//     const error = new Error("role must be Customer or Business");
//     error.statusCode = 400;
//     throw error;
//   }

//   if (role === ROLE.BUSINESS && !businessLicense) {
//     const error = new Error("business_license is required for Business role");
//     error.statusCode = 400;
//     throw error;
//   }

//   const existingUser = await userRepository.findByEmail(email);
//   if (existingUser) {
//     const error = new Error("Email already in use");
//     error.statusCode = 409;
//     throw error;
//   }

//   const hashedPassword = await bcrypt.hash(password, 10);

//   const user = await userRepository.createUser({
//     username: username || null,
//     email,
//     password: hashedPassword,
//     role,
//     status: "ACTIVE",
//   });

//   let store = null;
//   if (role === ROLE.BUSINESS) {
//     store = await storeRepository.createStore({
//       owner_id: user.id,
//       store_type: storeType || "B2C",
//       store_name: storeName || `${username || email}'s Store`,
//       description: description || null,
//       business_license: businessLicense,
//       status: "PENDING",
//     });
//   }

//   return {
//     user: {
//       id: user.id,
//       username: user.username,
//       email: user.email,
//       role: user.role,
//       status: user.status,
//     },
//     store,
//   };
// };

// const login = async ({ email, password }) => {
//   if (!email || !password) {
//     const error = new Error("email and password are required");
//     error.statusCode = 400;
//     throw error;
//   }

//   const user = await userRepository.findByEmail(email);
//   if (!user) {
//     const error = new Error("Invalid email or password");
//     error.statusCode = 401;
//     throw error;
//   }

//   const isMatched = await bcrypt.compare(password, user.password);
//   if (!isMatched) {
//     const error = new Error("Invalid email or password");
//     error.statusCode = 401;
//     throw error;
//   }

//   const token = jwt.sign(
//     {
//       userId: user.id,
//       role: user.role,
//     },
//     JWT_SECRET,
//     { expiresIn: JWT_EXPIRES_IN },
//   );

//   return {
//     token,
//     user: {
//       id: user.id,
//       username: user.username,
//       email: user.email,
//       role: user.role,
//       status: user.status,
//     },
//   };
// };
// // Backend/services/auth.service.js
// const register = async (payload) => {
//   const {
//     username,
//     email,
//     password,
//     role,
//     store_name,
//     description,
//     store_type,
//     // Lấy thêm các trường mới từ request body
//     business_license,
//     tax_code,
//     representative_name,
//     identity_card,
//   } = payload;

//   // ... (giữ nguyên phần check email và hash password) ...

//   const user = await userRepository.createUser({
//     username: username || null,
//     email,
//     password: hashedPassword,
//     role,
//     status: "ACTIVE",
//   });

//   let store = null;
//   // Xử lý tạo Store khi đăng ký nếu role là Business (B2C)
//   if (role === ROLE.BUSINESS) {
//     store = await storeRepository.createStore({
//       owner_id: user.id,
//       store_type: "B2C", // Ép kiểu B2C
//       store_name: storeName,
//       description,
//       business_license, // Bắt buộc cho B2C
//       tax_code, // Bắt buộc cho B2C
//       representative_name,
//       identity_card,
//       status: "PENDING", // Chờ Admin duyệt
//     });
//   }
//   // Nếu là Customer muốn mở shop C2C ngay lúc đăng ký (tùy chọn)
//   else if (storeName) {
//     store = await storeRepository.createStore({
//       owner_id: user.id,
//       store_type: "C2C",
//       store_name: storeName,
//       identity_card, // C2C chỉ cần cái này
//       status: "APPROVED", // C2C có thể duyệt luôn
//     });
//   }

//   return { user, store };
// };
// module.exports = {
//   register,
//   login,
// };
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const userRepository = require("../repositories/user.repository");
const storeRepository = require("../repositories/store.repository");
const { User } = require("../models");
const {
  STORE_FEE_POLICY,
  STORE_POLICY_VERSION,
  buildDossierKey,
} = require("../utils/store.policy");

const ROLE = {
  ADMIN: "Admin",
  CUSTOMER: "Customer",
  BUSINESS: "Business",
};

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

const MAIL_HOST = process.env.MAIL_HOST || "smtp.gmail.com";
const MAIL_PORT = Number(process.env.MAIL_PORT || 587);
const MAIL_SECURE = String(process.env.MAIL_SECURE || "false") === "true";
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const MAIL_FROM = process.env.MAIL_FROM || MAIL_USER;
const otpCache = new Map();
const DAILY_XU_AMOUNT = 100;
const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

const toDayKey = (dateValue) => {
  if (!dateValue) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateValue));
};

const isMissingOtpColumnError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("reset_otp") ||
    message.includes("resetotpexpires") ||
    message.includes("reset_otp_expires")
  );
};

const register = async (payload) => {
  const {
    username,
    email,
    password,
    role,
    store_name, // Chú ý: dùng snake_case để khớp với payload từ frontend
    description,
    // business_license có thể là:
    //   - URL ảnh (khi controller ghi đè từ req.documentUrls)
    //   - Số GPKD text (khi gửi JSON không kèm file)
    business_license,
    // business_license_number: field text riêng khi gửi FormData kèm file
    // (để tránh trùng tên với field file của multer)
    business_license_number,
    tax_code,
    representative_name,
    identity_card,
    bank_account,
    policy_accepted,
    service_fee_rate,
  } = payload;

  // Nếu gửi FormData có file, business_license sẽ là URL ảnh (từ controller).
  // business_license_number là số GPKD text. Lưu cả hai vào store riêng.
  const licensePath = business_license || null;   // URL ảnh hoặc text tùy flow
  const licenseNumber = business_license_number || null; // Số GPKD (FormData flow)

  // 1. Kiểm tra thông tin bắt buộc
  if (!email || !password || !role) {
    const error = new Error("email, password, role are required");
    error.statusCode = 400;
    throw error;
  }

  // 2. Kiểm tra định dạng Business
  // - JSON flow: business_license có giá trị text
  // - FormData flow: business_license_number có giá trị text, business_license sẽ bị ghi đè bởi URL ảnh
  const hasLicense = !!(business_license || business_license_number);
  if (role === ROLE.BUSINESS && (!hasLicense || !tax_code)) {
    const error = new Error(
      "Business license and Tax code are required for Business role",
    );
    error.statusCode = 400;
    throw error;
  }

  if (role === ROLE.BUSINESS && !policy_accepted) {
    const error = new Error(
      "Bạn cần chấp nhận điều khoản phí và vận hành trước khi đăng ký bán hàng",
    );
    error.statusCode = 400;
    throw error;
  }

  const normalizedServiceFeeRate = Number(
    service_fee_rate ?? STORE_FEE_POLICY.defaultServiceFeeRate,
  );

  if (
    !Number.isFinite(normalizedServiceFeeRate) ||
    normalizedServiceFeeRate < 0 ||
    normalizedServiceFeeRate > STORE_FEE_POLICY.maxServiceFeeRate
  ) {
    const error = new Error(
      `service_fee_rate phải nằm trong khoảng 0 - ${STORE_FEE_POLICY.maxServiceFeeRate}`,
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    normalizedServiceFeeRate > 0 &&
    normalizedServiceFeeRate < STORE_FEE_POLICY.minServiceFeeRate
  ) {
    const error = new Error(
      `service_fee_rate tối thiểu là ${STORE_FEE_POLICY.minServiceFeeRate} khi tham gia gói dịch vụ`,
    );
    error.statusCode = 400;
    throw error;
  }

  // 3. Kiểm tra email tồn tại
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    const error = new Error("Email already in use");
    error.statusCode = 409;
    throw error;
  }

  // 4. Mã hóa mật khẩu
  const hashedPassword = await bcrypt.hash(password, 10);

  // 5. Tạo User
  const user = await userRepository.createUser({
    username: username || null,
    email,
    password: hashedPassword,
    role,
    status: "ACTIVE",
  });

  // 6. Xử lý tạo Store (Phân luồng C2C và B2C)
  let store = null;
  if (role === ROLE.BUSINESS) {
    const dossierKey = buildDossierKey({
      identityCard: identity_card,
      taxCode: tax_code,
      bankAccount: bank_account,
    });

    const registeredStoreCount =
      await storeRepository.countStoresByDossierKey(dossierKey);
    if (registeredStoreCount >= 3) {
      const error = new Error(
        "Một bộ hồ sơ (CCCD/MST/Ngân hàng) chỉ được đăng ký tối đa 3 tài khoản bán hàng",
      );
      error.statusCode = 400;
      throw error;
    }

    store = await storeRepository.createStore({
      owner_id: user.id,
      store_type: "B2C",
      store_name: store_name || `${username || email}'s Business Store`,
      description,
      // licensePath: URL ảnh GPKD (khi có file upload) hoặc text số GPKD (khi gửi JSON)
      business_license: licensePath,
      tax_code,
      representative_name,
      identity_card,
      bank_account,
      dossier_key: dossierKey,
      policy_accepted: true,
      policy_accepted_at: new Date(),
      fee_policy_version: STORE_POLICY_VERSION,
      fixed_fee_rate: STORE_FEE_POLICY.fixedFeeRate,
      payment_fee_rate: STORE_FEE_POLICY.paymentFeeRate,
      service_fee_rate: normalizedServiceFeeRate,
      return_fee_cap_standard: STORE_FEE_POLICY.returnFeeCapStandard,
      return_fee_cap_express: STORE_FEE_POLICY.returnFeeCapExpress,
      tax_threshold_per_year: STORE_FEE_POLICY.taxThresholdPerYear,
      vat_tax_rate: STORE_FEE_POLICY.vatTaxRate,
      pit_tax_rate: STORE_FEE_POLICY.pitTaxRate,
      status: "PENDING", // B2C cần Admin duyệt
    });
  } else if (store_name) {
    // Nếu là Customer nhưng điền tên shop thì tạo shop C2C luôn
    store = await storeRepository.createStore({
      owner_id: user.id,
      store_type: "C2C",
      store_name: store_name,
      description,
      identity_card,
      status: "APPROVED", // C2C duyệt luôn
    });
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    store,
  };
};

const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error("email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const isMatched = await bcrypt.compare(password, user.password);
  if (!isMatched) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const approvedStore = await storeRepository.findApprovedStoreByOwner(user.id);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      hasC2CStore: !!approvedStore && approvedStore.store_type === "C2C",
      c2cStoreId:
        approvedStore && approvedStore.store_type === "C2C"
          ? approvedStore.id
          : null,
      storeName: approvedStore ? approvedStore.store_name : null,
    },
  };
};

const sendResetOtpEmail = async (email, otp) => {
  if (!MAIL_USER || !MAIL_PASS || !MAIL_FROM) {
    const error = new Error(
      "Email service is not configured. Please set MAIL_USER, MAIL_PASS, MAIL_FROM in backend .env",
    );
    error.statusCode = 500;
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: MAIL_PORT,
    secure: MAIL_SECURE,
    auth: {
      user: MAIL_USER,
      pass: MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: MAIL_FROM,
    to: email,
    subject: "Ma OTP dat lai mat khau",
    text: `Ma OTP cua ban la: ${otp}. Ma co hieu luc trong 10 phut.`,
    html: `<p>Ma OTP cua ban la: <strong>${otp}</strong></p><p>Ma co hieu luc trong 10 phut.</p>`,
  });
};

const forgotPassword = async ({ email }) => {
  if (!email) {
    const error = new Error("email is required");
    error.statusCode = 400;
    throw error;
  }

  const user = await userRepository.findByEmail(email);

  // Do not reveal whether email exists.
  if (!user) {
    return { success: true };
  }

  const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    await userRepository.setResetOtp(user.id, otp, expiresAt);
  } catch (error) {
    if (!isMissingOtpColumnError(error)) {
      throw error;
    }

    otpCache.set(email, {
      otp,
      expiresAt: expiresAt.getTime(),
    });
  }

  await sendResetOtpEmail(email, otp);

  return { success: true };
};

const resetPassword = async ({ email, otp, newPassword }) => {
  if (!email || !otp || !newPassword) {
    const error = new Error("email, otp, newPassword are required");
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error("Password must be at least 8 characters");
    error.statusCode = 400;
    throw error;
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    const error = new Error("OTP is invalid or expired");
    error.statusCode = 400;
    throw error;
  }

  const cacheOtpData = otpCache.get(email);
  const dbOtp = user.resetOtp ? String(user.resetOtp) : null;
  const dbOtpExpiresAt = user.resetOtpExpires
    ? new Date(user.resetOtpExpires).getTime()
    : null;

  const validFromDb =
    !!dbOtp &&
    !!dbOtpExpiresAt &&
    dbOtpExpiresAt >= Date.now() &&
    dbOtp === String(otp);

  const validFromCache =
    !!cacheOtpData &&
    cacheOtpData.expiresAt >= Date.now() &&
    String(cacheOtpData.otp) === String(otp);

  if (!validFromDb && !validFromCache) {
    const error = new Error("OTP is invalid or expired");
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  try {
    await userRepository.updatePasswordAndClearOtp(user.id, hashedPassword);
  } catch (error) {
    if (!isMissingOtpColumnError(error)) {
      throw error;
    }

    await userRepository.updatePasswordOnly(user.id, hashedPassword);
  }

  otpCache.delete(email);

  return { success: true };
};

const getDailyXuStatus = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ["id", "role", "xu_balance", "last_xu_claim_at"],
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== ROLE.CUSTOMER) {
    const error = new Error(
      "Chỉ tài khoản khách hàng mới được nhận Xu mỗi ngày",
    );
    error.statusCode = 403;
    throw error;
  }

  const todayKey = toDayKey(new Date());
  const lastClaimDayKey = toDayKey(user.last_xu_claim_at);
  const canClaim = todayKey !== lastClaimDayKey;

  return {
    xuBalance: Number(user.xu_balance || 0),
    dailyAmount: DAILY_XU_AMOUNT,
    canClaim,
    lastClaimAt: user.last_xu_claim_at,
  };
};

const claimDailyXu = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ["id", "role", "xu_balance", "last_xu_claim_at"],
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== ROLE.CUSTOMER) {
    const error = new Error(
      "Chỉ tài khoản khách hàng mới được nhận Xu mỗi ngày",
    );
    error.statusCode = 403;
    throw error;
  }

  const todayKey = toDayKey(new Date());
  const lastClaimDayKey = toDayKey(user.last_xu_claim_at);
  if (todayKey === lastClaimDayKey) {
    const error = new Error(
      "Bạn đã nhận Xu hôm nay rồi. Vui lòng quay lại vào ngày mai.",
    );
    error.statusCode = 409;
    throw error;
  }

  user.xu_balance = Number(user.xu_balance || 0) + DAILY_XU_AMOUNT;
  user.last_xu_claim_at = new Date();
  await user.save();

  return {
    xuBalance: Number(user.xu_balance || 0),
    dailyAmount: DAILY_XU_AMOUNT,
    lastClaimAt: user.last_xu_claim_at,
  };
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getDailyXuStatus,
  claimDailyXu,
};
