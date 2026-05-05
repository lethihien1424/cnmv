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

const parseBooleanField = (value, fieldName) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  const error = new Error(`${fieldName} must be true or false`);
  error.statusCode = 400;
  throw error;
};

const parseIntegerField = (value, fieldName) => {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || !Number.isInteger(parsedValue)) {
    const error = new Error(`${fieldName} must be an integer`);
    error.statusCode = 400;
    throw error;
  }

  return parsedValue;
};

const parsePriceField = (value, fieldName) => {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    const error = new Error(`${fieldName} must be a valid non-negative number`);
    error.statusCode = 400;
    throw error;
  }

  return parsedValue;
};

const parseDateField = (value, fieldName) => {
  if (!value) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    const error = new Error(`${fieldName} must be a valid datetime`);
    error.statusCode = 400;
    throw error;
  }

  return parsedDate;
};

const roundPriceByStep = (value, step = 1000) => {
  return Math.max(step, Math.round(value / step) * step);
};

const getNextPreferredWindow = (stockQuantity) => {
  const start = new Date();
  start.setSeconds(0, 0);

  // Friday (5) is usually strong for checkout intent in local campaigns.
  const daysUntilFriday = (5 - start.getDay() + 7) % 7;
  start.setDate(start.getDate() + daysUntilFriday);

  if (stockQuantity >= 30) {
    start.setHours(20, 0, 0, 0);
  } else {
    start.setHours(12, 0, 0, 0);
  }

  if (start <= new Date()) {
    start.setDate(start.getDate() + 7);
  }

  const end = new Date(start);
  end.setHours(end.getHours() + (stockQuantity >= 30 ? 4 : 2));

  return { start, end };
};

const normalizeFlashSaleFields = (payload, currentState = {}) => {
  const hasIsFlashSale = payload.is_flash_sale !== undefined;
  const hasFlashSalePrice = payload.flash_sale_price !== undefined;
  const hasFlashSaleStock = payload.flash_sale_stock !== undefined;
  const hasFlashSaleSold = payload.flash_sale_sold !== undefined;

  const hasFlashSalePayload =
    hasIsFlashSale ||
    hasFlashSalePrice ||
    hasFlashSaleStock ||
    hasFlashSaleSold;

  if (!hasFlashSalePayload) {
    return {};
  }

  const nextPrice =
    payload.price !== undefined
      ? parsePriceField(payload.price, "price")
      : Number(currentState.price);

  const nextIsFlashSale = hasIsFlashSale
    ? parseBooleanField(payload.is_flash_sale, "is_flash_sale")
    : Boolean(currentState.is_flash_sale);

  if (!nextIsFlashSale) {
    return {
      is_flash_sale: false,
      flash_sale_price: null,
      flash_sale_stock: 0,
      flash_sale_sold: 0,
    };
  }

  const nextFlashSalePrice = hasFlashSalePrice
    ? parsePriceField(payload.flash_sale_price, "flash_sale_price")
    : currentState.flash_sale_price;

  if (nextFlashSalePrice === undefined || nextFlashSalePrice === null) {
    const error = new Error(
      "flash_sale_price is required when is_flash_sale is true",
    );
    error.statusCode = 400;
    throw error;
  }

  if (Number.isFinite(nextPrice) && Number(nextFlashSalePrice) > nextPrice) {
    const error = new Error(
      "flash_sale_price must be less than or equal to price",
    );
    error.statusCode = 400;
    throw error;
  }

  const nextFlashSaleStock = hasFlashSaleStock
    ? parseIntegerField(payload.flash_sale_stock, "flash_sale_stock")
    : currentState.flash_sale_stock;

  if (nextFlashSaleStock === undefined || nextFlashSaleStock === null) {
    const error = new Error(
      "flash_sale_stock is required when is_flash_sale is true",
    );
    error.statusCode = 400;
    throw error;
  }

  if (nextFlashSaleStock < 0) {
    const error = new Error(
      "flash_sale_stock must be greater than or equal to 0",
    );
    error.statusCode = 400;
    throw error;
  }

  const nextFlashSaleSold = hasFlashSaleSold
    ? parseIntegerField(payload.flash_sale_sold, "flash_sale_sold")
    : Number(currentState.flash_sale_sold || 0);

  if (nextFlashSaleSold < 0) {
    const error = new Error(
      "flash_sale_sold must be greater than or equal to 0",
    );
    error.statusCode = 400;
    throw error;
  }

  if (nextFlashSaleSold > nextFlashSaleStock) {
    const error = new Error(
      "flash_sale_sold cannot be greater than flash_sale_stock",
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    is_flash_sale: true,
    flash_sale_price: nextFlashSalePrice,
    flash_sale_stock: nextFlashSaleStock,
    flash_sale_sold: nextFlashSaleSold,
  };
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

  const flashSaleData = normalizeFlashSaleFields(payload, {
    price: parsedPrice,
    is_flash_sale: false,
    flash_sale_price: null,
    flash_sale_stock: 0,
    flash_sale_sold: 0,
  });

  return productRepository.createProduct({
    ...payload,
    price: parsedPrice,
    ...flashSaleData,
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

    if (
      product.is_flash_sale === true &&
      product.flash_sale_price !== null &&
      Number(product.flash_sale_price) > parsedPrice
    ) {
      const error = new Error(
        "price must be greater than or equal to flash_sale_price",
      );
      error.statusCode = 400;
      throw error;
    }

    updatedData.price = parsedPrice;
  }

  if (imageUrls.length > 0) {
    updatedData.images = imageUrls;
  }

  const flashSaleData = normalizeFlashSaleFields(updatedData, {
    price: updatedData.price !== undefined ? updatedData.price : product.price,
    is_flash_sale: product.is_flash_sale,
    flash_sale_price: product.flash_sale_price,
    flash_sale_stock: product.flash_sale_stock,
    flash_sale_sold: product.flash_sale_sold,
  });

  Object.assign(updatedData, flashSaleData);

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

const setFlashSale = async (id, payload, user) => {
  const product = await productRepository.findProductById(id);
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  await validateManagedStore(product.store_id, user);

  const normalizedFlashData = normalizeFlashSaleFields(payload, {
    price: product.price,
    is_flash_sale: product.is_flash_sale,
    flash_sale_price: product.flash_sale_price,
    flash_sale_stock: product.flash_sale_stock,
    flash_sale_sold: product.flash_sale_sold,
  });

  await product.update(normalizedFlashData);
  return product;
};

const scheduleFlashSale = async (id, payload, user) => {
  const product = await productRepository.findProductById(id);
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  await validateManagedStore(product.store_id, user);

  const flashSalePrice = parsePriceField(
    payload.flash_sale_price,
    "flash_sale_price",
  );
  const startTime = parseDateField(
    payload.flash_sale_start_time,
    "flash_sale_start_time",
  );
  const endTime = parseDateField(
    payload.flash_sale_end_time,
    "flash_sale_end_time",
  );

  if (endTime <= startTime) {
    const error = new Error(
      "flash_sale_end_time must be after flash_sale_start_time",
    );
    error.statusCode = 400;
    throw error;
  }

  if (flashSalePrice >= Number(product.price)) {
    const error = new Error("flash_sale_price must be less than price");
    error.statusCode = 400;
    throw error;
  }

  const requestedStock =
    payload.flash_sale_stock !== undefined
      ? parseIntegerField(payload.flash_sale_stock, "flash_sale_stock")
      : Math.min(Number(product.stock_quantity || 0), 20);

  if (requestedStock <= 0) {
    const error = new Error("flash_sale_stock must be greater than 0");
    error.statusCode = 400;
    throw error;
  }

  if (requestedStock > Number(product.stock_quantity || 0)) {
    const error = new Error("flash_sale_stock cannot exceed stock_quantity");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const isActiveNow = startTime <= now && endTime >= now;

  await product.update({
    is_flash_sale: isActiveNow,
    flash_sale_price: flashSalePrice,
    flash_sale_stock: requestedStock,
    flash_sale_sold: 0,
    flash_sale_start_time: startTime,
    flash_sale_end_time: endTime,
  });

  return product;
};

const suggestFlashSale = async (id, user) => {
  const product = await productRepository.findProductById(id);
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  await validateManagedStore(product.store_id, user);

  const basePrice = Number(product.price);
  const stockQuantity = Number(product.stock_quantity || 0);

  if (!Number.isFinite(basePrice) || basePrice <= 1) {
    const error = new Error(
      "Product price is too low to generate a valid flash sale suggestion",
    );
    error.statusCode = 400;
    throw error;
  }

  if (stockQuantity <= 0) {
    const error = new Error(
      "Product is out of stock, cannot generate flash sale suggestion",
    );
    error.statusCode = 400;
    throw error;
  }

  let discountRate = 0.12;
  if (stockQuantity >= 100) {
    discountRate = 0.35;
  } else if (stockQuantity >= 50) {
    discountRate = 0.3;
  } else if (stockQuantity >= 20) {
    discountRate = 0.22;
  } else if (stockQuantity >= 10) {
    discountRate = 0.18;
  }

  const suggestedPrice = roundPriceByStep(basePrice * (1 - discountRate));
  const { start, end } = getNextPreferredWindow(stockQuantity);
  const suggestedStock = Math.max(
    1,
    Math.min(stockQuantity, stockQuantity >= 30 ? 30 : 10),
  );
  const maxDiscountedPrice = Math.max(1, Math.floor(basePrice - 1));
  const safeSuggestedPrice = Math.max(
    1,
    Math.min(suggestedPrice, maxDiscountedPrice),
  );

  return {
    product_id: product.id,
    product_name: product.name,
    original_price: basePrice,
    stock_quantity: stockQuantity,
    suggested_flash_sale_price: safeSuggestedPrice,
    suggested_flash_sale_stock: suggestedStock,
    suggested_flash_sale_start_time: start.toISOString(),
    suggested_flash_sale_end_time: end.toISOString(),
    rationale:
      stockQuantity >= 30
        ? "Ton kho cao, de xuat giam sau hon va chay khung toi thu 6 de tang toc do chot don."
        : "Ton kho vua/it, de xuat muc giam vua phai va khung trua thu 6 de toi uu ti le chuyen doi.",
  };
};

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductDetail,
  setFlashSale,
  scheduleFlashSale,
  suggestFlashSale,
};
