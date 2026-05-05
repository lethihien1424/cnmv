//D:\CongNgheMoi-hien\CongNgheMoi\Backend\repositories\order.repository.js
const { Order, OrderItem, Product } = require("../models");

const createOrder = async (data) => Order.create(data);
const createOrderItem = async (data) => OrderItem.create(data);

const getOrdersByUser = async (userId) =>
  Order.findAll({
    where: { buyer_id: userId },
    include: [
      {
        model: OrderItem,
        as: "items",
        include: [{ model: Product, as: "product" }],
      },
    ],
    order: [["created_at", "DESC"]],
  });

const getOrdersByStore = async (storeId) =>
  Order.findAll({
    where: { store_id: storeId },
    include: [
      {
        model: OrderItem,
        as: "items",
        include: [{ model: Product, as: "product" }],
      },
    ],
  });

const getOrderById = async (id) =>
  Order.findByPk(id, {
    include: [
      {
        model: OrderItem,
        as: "items",
        include: [{ model: Product, as: "product" }],
      },
    ],
  });

// 🔥 FLOW STATUS
const updateOrderStatus = async (orderId, status) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw new Error("Order not found");

  order.order_status = status;

  if (
    status === "DELIVERED" &&
    order.payment_method === "COD" &&
    order.payment_status === "UNPAID"
  ) {
    order.payment_status = "PAID";
  }

  return order.save();
};

module.exports = {
  createOrder,
  createOrderItem,
  getOrdersByUser,
  getOrdersByStore,
  getOrderById,
  updateOrderStatus,
};