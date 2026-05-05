//D:\CongNgheMoi-hien\CongNgheMoi\Backend\services\cart.service.js
// services/cart.service.js
const cartRepo = require("../repositories/cart.repository");
const { Product } = require("../models");

// ADD
const addToCart = async (userId, productId, quantity) => {
  if (!quantity || quantity <= 0) {
    throw new Error("Số lượng không hợp lệ");
  }

  // 🔥 check product tồn tại
  const product = await Product.findByPk(productId);
  if (!product) {
    throw new Error("Sản phẩm không tồn tại");
  }

  // 🔥 check tồn kho
  if (quantity > product.stock_quantity) {
    throw new Error("Số lượng vượt quá tồn kho");
  }

  let cart = await cartRepo.findCartByUserId(userId);

  if (!cart) {
    cart = await cartRepo.createCart(userId);
  }

  const existingItem = await cartRepo.findItem(cart.id, productId);

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;

    // 🔥 check lại tồn kho khi cộng dồn
    if (newQuantity > product.stock_quantity) {
      throw new Error("Tổng số lượng vượt quá tồn kho");
    }

    return await cartRepo.updateItem(existingItem, newQuantity);
  }

  return await cartRepo.createItem({
    cart_id: cart.id,
    product_id: productId,
    quantity,
  });
};

// UPDATE
const updateQuantity = async (userId, productId, quantity) => {
  const cart = await cartRepo.findCartByUserId(userId);
  if (!cart) throw new Error("Cart not found");

  const item = await cartRepo.findItem(cart.id, productId);
  if (!item) throw new Error("Item not found");

  const product = await Product.findByPk(productId);
  if (!product) throw new Error("Product not found");

  // 🔥 nếu = 0 → xóa
  if (quantity <= 0) {
    await cartRepo.deleteItem(item);
    return;
  }

  // 🔥 check tồn kho
  if (quantity > product.stock_quantity) {
    throw new Error("Số lượng vượt quá tồn kho");
  }

  return await cartRepo.updateItem(item, quantity);
};

// GET
const getCart = async (userId) => {
  const cart = await cartRepo.findCartByUserId(userId);
  if (!cart) return [];

  return await cartRepo.getCartItems(cart.id);
};

module.exports = {
  addToCart,
  updateQuantity,
  getCart,
};