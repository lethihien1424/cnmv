const { Op } = require("sequelize");
const { Product, Store, User, Category } = require("../models");

const createProduct = async (payload) => {
  return Product.create(payload);
};

const findProductById = async (id) => {
  return Product.findByPk(id);
};

const findProductsByIdsForUpdate = async (ids, transaction) => {
  return Product.findAll({
    where: {
      id: {
        [Op.in]: ids,
      },
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
};

const deleteProduct = async (product) => {
  return product.destroy();
};

const searchProducts = async ({
  keyword,
  minPrice,
  maxPrice,
  categoryId,
  storeType,
  limit,
  offset,
}) => {
  const where = {};

  if (keyword) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${keyword}%` } },
      { "$store.store_name$": { [Op.iLike]: `%${keyword}%` } },
      { "$category.name$": { [Op.iLike]: `%${keyword}%` } },
    ];
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) {
      where.price[Op.gte] = minPrice;
    }
    if (maxPrice !== undefined) {
      where.price[Op.lte] = maxPrice;
    }
  }

  if (categoryId) {
    where.category_id = categoryId;
  }

  const includeStore = {
    model: Store,
    as: "store",
    attributes: ["id", "store_name", "store_type", "status"],
    include: [
      {
        model: User,
        as: "owner",
        attributes: ["id", "username", "email", "role", "status"],
      },
    ],
  };

  if (storeType) {
    includeStore.where = { store_type: storeType };
    includeStore.required = true;
  }

  const includeCategory = {
    model: Category,
    as: "category",
    attributes: ["id", "name"],
  };

  return Product.findAndCountAll({
    where,
    include: [includeStore, includeCategory],
    limit,
    offset,
    order: [["created_at", "DESC"]],
    distinct: true,
  });
};

const findProductDetailById = async (id) => {
  return Product.findByPk(id, {
    include: [
      {
        model: Store,
        as: "store",
        attributes: [
          "id",
          "store_name",
          "store_type",
          "description",
          "status",
          "owner_id",
        ],
        include: [
          {
            model: User,
            as: "owner",
            attributes: ["id", "username", "email", "role", "status"],
          },
        ],
      },
    ],
  });
};

module.exports = {
  createProduct,
  findProductById,
  findProductsByIdsForUpdate,
  deleteProduct,
  searchProducts,
  findProductDetailById,
};
