const addressRepo = require("../repositories/address.repository");

const createAddress = async (userId, data) => {
  if (data.is_default) {
    await addressRepo.resetDefault(userId);
  }

  return await addressRepo.createAddress({
    ...data,
    user_id: userId,
  });
};

const getAddresses = async (userId) => {
  return await addressRepo.getByUser(userId);
};

module.exports = {
  createAddress,
  getAddresses,
};