const productRepository = require("../repositories/product.repository");
const storeRepository = require("../repositories/store.repository");

const ROLE = {
  CUSTOMER: "Customer",
  BUSINESS: "Business",
};

const CONDITION = {
  NEW: "NEW",
  USED: "USED",
};

const validateConditionByRole = (role, condition) => {
  if (!condition) {
    const error = new Error("condition is required");
    error.statusCode = 400;
    throw error;
  }

  if (![CONDITION.NEW, CONDITION.USED].includes(condition)) {
    const error = new Error("condition must be NEW or USED");
    error.statusCode = 400;
    throw error;
  }
};

const validateManagedStore = async (storeId, user) => {
  if (!storeId) {
    const error = new Error("store_id is required");
    error.statusCode = 400;
    throw error;
  }

  const store = await storeRepository.findStoreById(storeId);
  if (!store) {
    const error = new Error("Store not found");
    error.statusCode = 404;
    throw error;
  }

  if (store.owner_id !== user.userId) {
    const error = new Error("You do not have permission for this store");
    error.statusCode = 403;
    throw error;
  }

  if (store.status !== "APPROVED") {
    const error = new Error("Store must be APPROVED to manage products");
    error.statusCode = 403;
    throw error;
  }

  if (user.role === ROLE.CUSTOMER && store.store_type !== "C2C") {
    const error = new Error("Customer can only manage products in C2C store");
    error.statusCode = 403;
    throw error;
  }

  if (user.role === ROLE.BUSINESS && store.store_type !== "B2C") {
    const error = new Error("Business can only manage products in B2C store");
    error.statusCode = 403;
    throw error;
  }

  return store;
};

const createProduct = async (payload, user, imageUrls) => {
  const { name, price, condition, store_id: storeId } = payload;

  if (!name || price === undefined || price === null) {
    const error = new Error("name and price are required");
    error.statusCode = 400;
    throw error;
  }

  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    const error = new Error("price must be a valid non-negative number");
    error.statusCode = 400;
    throw error;
  }

  validateConditionByRole(user.role, condition);
  await validateManagedStore(storeId, user);

  return productRepository.createProduct({
    ...payload,
    price: parsedPrice,
    images: imageUrls,
  });
};

const updateProduct = async (id, payload, user, imageUrls) => {
  const product = await productRepository.findProductById(id);
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const targetStoreId = payload.store_id || product.store_id;
  await validateManagedStore(targetStoreId, user);

  const nextCondition = payload.condition || product.condition;
  validateConditionByRole(user.role, nextCondition);

  const updatedData = {
    ...payload,
  };

  if (payload.price !== undefined) {
    const parsedPrice = Number(payload.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      const error = new Error("price must be a valid non-negative number");
      error.statusCode = 400;
      throw error;
    }
    updatedData.price = parsedPrice;
  }

  if (imageUrls.length > 0) {
    updatedData.images = imageUrls;
  }

  await product.update(updatedData);
  return product;
};

const deleteProduct = async (id, user) => {
  const product = await productRepository.findProductById(id);
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  await validateManagedStore(product.store_id, user);

  await productRepository.deleteProduct(product);
};

const searchProducts = async (query) => {
  const {
    keyword,
    minPrice,
    maxPrice,
    category_id: categoryId,
    store_type: storeType,
    limit,
    offset,
  } = query;

  const parsedMinPrice =
    minPrice !== undefined && minPrice !== "" ? Number(minPrice) : undefined;
  const parsedMaxPrice =
    maxPrice !== undefined && maxPrice !== "" ? Number(maxPrice) : undefined;

  if (parsedMinPrice !== undefined && Number.isNaN(parsedMinPrice)) {
    const error = new Error("minPrice must be a number");
    error.statusCode = 400;
    throw error;
  }

  if (parsedMaxPrice !== undefined && Number.isNaN(parsedMaxPrice)) {
    const error = new Error("maxPrice must be a number");
    error.statusCode = 400;
    throw error;
  }

  if (
    parsedMinPrice !== undefined &&
    parsedMaxPrice !== undefined &&
    parsedMinPrice > parsedMaxPrice
  ) {
    const error = new Error("minPrice cannot be greater than maxPrice");
    error.statusCode = 400;
    throw error;
  }

  if (storeType && !["C2C", "B2C"].includes(storeType)) {
    const error = new Error("store_type must be C2C or B2C");
    error.statusCode = 400;
    throw error;
  }

  const parsedLimit = Number(limit);
  const parsedOffset = Number(offset);

  const safeLimit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 10;
  const safeOffset =
    Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  const { count, rows } = await productRepository.searchProducts({
    keyword,
    minPrice: parsedMinPrice,
    maxPrice: parsedMaxPrice,
    categoryId,
    storeType,
    limit: safeLimit,
    offset: safeOffset,
  });

  return {
    items: rows,
    pagination: {
      limit: safeLimit,
      offset: safeOffset,
      totalItems: count,
      totalPages: Math.ceil(count / safeLimit),
    },
  };
};

const getProductDetail = async (id) => {
  const product = await productRepository.findProductDetailById(id);

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return product;
};

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductDetail,
};
