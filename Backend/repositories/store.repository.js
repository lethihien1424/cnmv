const { Store } = require("../models");

const createStore = async (payload) => {
  return Store.create(payload);
};

const findPendingB2CStores = async () => {
  return Store.findAll({
    where: {
      store_type: "B2C",
      status: "PENDING",
    },
    order: [["created_at", "ASC"]],
  });
};

const findStoreById = async (id) => {
  return Store.findByPk(id);
};

module.exports = {
  createStore,
  findPendingB2CStores,
  findStoreById,
};
