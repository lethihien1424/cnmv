const { Order, OrderItem, Product } = require("../models");

const createOrder = async (data) => {
  return await Order.create(data);
};

const createOrderItem = async (data) => {
  return await OrderItem.create(data);
};

const getOrdersByUser = async (userId) => {
  return await Order.findAll({
    where: { buyer_id: userId },
    include: [
      {
        model: OrderItem,
        as: "items",
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "price", "images"],
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

const getOrdersByStore = async (storeId) => {
  return await Order.findAll({
    where: { store_id: storeId },
    include: [
      {
        model: OrderItem,
        as: "items",
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "price", "images"],
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

const getOrderById = async (orderId) => {
  return await Order.findByPk(orderId, {
    include: [
      {
        model: OrderItem,
        as: "items",
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "price", "images"],
          },
        ],
      },
    ],
  });
};

const updateOrderStatus = async (orderId, status) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw new Error("Order not found");

  order.order_status = status;

  // ✅ COD → tự động PAID khi DELIVERED
  if (
    status === "DELIVERED" &&
    order.payment_method === "COD" &&
    order.payment_status === "UNPAID"
  ) {
    order.payment_status = "PAID";
  }

  return await order.save();
};

const updatePaymentStatus = async (orderId, paymentStatus, orderStatus) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw new Error("Order not found");

  order.payment_status = paymentStatus;
  if (orderStatus) order.order_status = orderStatus;

  return await order.save();
};

module.exports = {
  createOrder,
  createOrderItem,
  getOrdersByUser,
  getOrdersByStore,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
};