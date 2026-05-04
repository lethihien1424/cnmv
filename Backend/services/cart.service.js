const cartRepo = require("../repositories/cart.repository");

// ADD
const addToCart = async (userId, productId, quantity) => {
  let cart = await cartRepo.findCartByUserId(userId);

  if (!cart) {
    cart = await cartRepo.createCart(userId);
  }

  const existingItem = await cartRepo.findItem(cart.id, productId);

  if (existingItem) {
    // ✅ FIX: tăng số lượng thay vì báo lỗi
    const newQuantity = existingItem.quantity + quantity;
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

  if (quantity <= 0) {
    await cartRepo.deleteItem(item);
    return;
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