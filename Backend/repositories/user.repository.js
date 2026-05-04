const { User } = require("../models");

// CREATE
const createUser = async (payload) => {
  return User.create(payload);
};

// FIND BY EMAIL
const findByEmail = async (email) => {
  return User.findOne({ where: { email } });
};

// 🔥 THÊM
const findAllUsers = async () => {
  return User.findAll({
    attributes: { exclude: ["password"] },
    order: [["created_at", "DESC"]],
  });
};

const findUserById = async (id) => {
  return User.findByPk(id, {
    attributes: { exclude: ["password"] },
  });
};

const updateUser = async (id, data) => {
  const user = await User.findByPk(id);
  if (!user) throw new Error("User không tồn tại");

  await user.update(data);
  return user;
};

const deleteUser = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw new Error("User không tồn tại");

  await user.destroy({ force: true }); // 🔥 XÓA THẬT
  return true;
};

module.exports = {
  createUser,
  findByEmail,
  findAllUsers,
  findUserById,
  updateUser,
  deleteUser,
};