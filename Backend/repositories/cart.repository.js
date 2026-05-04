const { Cart, CartItem, Product } = require("../models");

// ================= CART =================

// tìm cart theo user
const findCartByUserId = async (userId) => {
  return await Cart.findOne({
    where: { user_id: userId },
  });
};

// tạo cart
const createCart = async (userId) => {
  return await Cart.create({
    user_id: userId,
  });
};

// ================= CART ITEM =================

// tìm item theo cart + product
const findItem = async (cartId, productId) => {
  return await CartItem.findOne({
    where: {
      cart_id: cartId,
      product_id: productId,
    },
  });
};

// tạo item
const createItem = async (payload) => {
  return await CartItem.create(payload);
};

// ✅ UPDATE ITEM (FIX CHUẨN)
const updateItem = async (item, quantity) => {
  return await item.update({
    quantity,
  });
};

// xoá item
const deleteItem = async (item) => {
  return await item.destroy();
};

// ================= GET CART =================

// lấy cart full (có product)
const getCartItems = async (cartId) => {
  return await CartItem.findAll({
    where: { cart_id: cartId },
    include: [
      {
        model: Product,
        as: "product",
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

module.exports = {
  findCartByUserId,
  createCart,
  findItem,
  createItem,
  updateItem,
  deleteItem,
  getCartItems,
};