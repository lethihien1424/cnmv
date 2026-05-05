const bcrypt = require("bcryptjs");
const userRepo = require("../repositories/user.repository");

// VALIDATE
const validateUser = (data, isUpdate = false) => {
  const { username, email, password } = data;

  if (username && !/^[A-Za-zÀ-ỹ\s]+$/.test(username)) {
    throw new Error("Tên chỉ được chứa chữ");
  }

  if (email && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
    throw new Error("Email phải có dạng @gmail.com");
  }

  if (!isUpdate && (!password || !/^\d{6,}$/.test(password))) {
    throw new Error("Mật khẩu phải ít nhất 6 chữ số");
  }
};

const createUser = async (data) => {
  validateUser(data);

  const existing = await userRepo.findByEmail(data.email);
  if (existing) {
    throw new Error("Email đã tồn tại");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  return await userRepo.createUser({
    ...data,
    password: hashedPassword,
    role: data.role || "Customer",
    status: "ACTIVE",
  });
};

const getAllUsers = async () => {
  return await userRepo.findAllUsers();
};

const getUserById = async (id) => {
  const user = await userRepo.findUserById(id);
  if (!user) throw new Error("Không tìm thấy user");
  return user;
};

const updateUser = async (id, data) => {
  validateUser(data, true);

  if (data.email) {
    const existing = await userRepo.findByEmail(data.email);
    if (existing && existing.id !== id) {
      throw new Error("Email đã tồn tại");
    }
  }

  if (data.password) {
    if (!/^\d{6,}$/.test(data.password)) {
      throw new Error("Mật khẩu phải ít nhất 6 chữ số");
    }
    data.password = await bcrypt.hash(data.password, 10);
  }

  return await userRepo.updateUser(id, data);
};

const deleteUser = async (id) => {
  return await userRepo.deleteUser(id);
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
