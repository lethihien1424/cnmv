//D:\CongNgheMoi-hien\CongNgheMoi\Backend\repositories\cart.repository.js
const { Cart, CartItem, Product } = require("../models");

// ================= CART =================
const findCartByUserId = async (userId) => {
  return await Cart.findOne({
    where: { user_id: userId },
  });
};

const createCart = async (userId) => {
  return await Cart.create({
    user_id: userId,
  });
};

// ================= CART ITEM =================
const findItem = async (cartId, productId) => {
  return await CartItem.findOne({
    where: {
      cart_id: cartId,
      product_id: productId,
    },
  });
};

const createItem = async (payload) => {
  return await CartItem.create(payload);
};

const updateItem = async (item, quantity) => {
  return await item.update({
    quantity,
  });
};

const deleteItem = async (item) => {
  return await item.destroy();
};

// ================= GET CART =================
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