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
const userRepository = require("../repositories/user.repository");
const storeRepository = require("../repositories/store.repository");

const ROLE = {
  ADMIN: "Admin",
  CUSTOMER: "Customer",
  BUSINESS: "Business",
};

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

const register = async (payload) => {
  const {
    username,
    email,
    password,
    role,
    store_name, // Chú ý: dùng snake_case để khớp với payload từ frontend
    description,
    business_license,
    tax_code,
    representative_name,
    identity_card,
  } = payload;

  // 1. Kiểm tra thông tin bắt buộc
  if (!email || !password || !role) {
    const error = new Error("email, password, role are required");
    error.statusCode = 400;
    throw error;
  }

  // 2. Kiểm tra định dạng Business
  if (role === ROLE.BUSINESS && (!business_license || !tax_code)) {
    const error = new Error(
      "Business license and Tax code are required for Business role",
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
    store = await storeRepository.createStore({
      owner_id: user.id,
      store_type: "B2C",
      store_name: store_name || `${username || email}'s Business Store`,
      description,
      business_license,
      tax_code,
      representative_name,
      identity_card,
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

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  };
};

module.exports = {
  register,
  login,
};
