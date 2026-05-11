// D:\CongNgheMoi-hien\CongNgheMoi\Backend\repositories\order.repository.js
const { Order, OrderItem, Product, Review } = require("../models");

const createOrder = async (data) => Order.create(data);

const createOrderItem = async (data) => OrderItem.create(data);

// ─── Helper: gắn is_reviewed vào mỗi order ───────────────────────────────────
// Với mỗi order, kiểm tra xem có ít nhất 1 review nào trong bảng reviews
// có order_id = order.id không
const attachReviewStatus = async (orders) => {
  const orderIds = orders.map((o) => o.id);
  if (orderIds.length === 0) return orders;

  // Lấy tất cả review của các order này 1 lần duy nhất
  const reviews = await Review.findAll({
    where: { order_id: orderIds },
    attributes: ["order_id"],
  });

  // Tạo Set chứa những order_id đã có review
  const reviewedOrderIds = new Set(reviews.map((r) => r.order_id));

  // Gắn is_reviewed vào từng order
  return orders.map((order) => {
    const o = order.toJSON ? order.toJSON() : { ...order };
    o.is_reviewed = reviewedOrderIds.has(o.id);
    return o;
  });
};

// ─── getOrdersByUser ──────────────────────────────────────────────────────────
const getOrdersByUser = async (userId) => {
  const orders = await Order.findAll({
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

  return await attachReviewStatus(orders);
};

// ─── getOrdersByStore ─────────────────────────────────────────────────────────
const getOrdersByStore = async (storeId) => {
  const orders = await Order.findAll({
    where: { store_id: storeId },
    include: [
      {
        model: OrderItem,
        as: "items",
        include: [{ model: Product, as: "product" }],
      },
    ],
    order: [["created_at", "DESC"]],
  });

  return await attachReviewStatus(orders);
};

// ─── getOrderById ─────────────────────────────────────────────────────────────
const getOrderById = async (id) => {
  const order = await Order.findByPk(id, {
    include: [
      {
        model: OrderItem,
        as: "items",
        include: [{ model: Product, as: "product" }],
      },
    ],
  });

  if (!order) return null;

  const [withStatus] = await attachReviewStatus([order]);
  return withStatus;
};

// ─── updateOrderStatus ────────────────────────────────────────────────────────
// Flow hợp lệ:
//   COD:   PENDING → PICKUP → SHIPPING → DELIVERED
//   VNPAY: PENDING(auto→PICKUP qua return URL) → SHIPPING → DELIVERED
//   Hủy chỉ được khi PENDING hoặc PICKUP
const updateOrderStatus = async (orderId, status) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw new Error("Order not found");

  order.order_status = status;

  // COD: tự động PAID khi DELIVERED
  if (
    status === "DELIVERED" &&
    order.payment_method === "COD" &&
    order.payment_status === "UNPAID"
  ) {
    order.payment_status = "PAID";
  }

  return order.save();
};

// ─── updatePaymentStatus (dùng cho VNPAY callback) ───────────────────────────
const updatePaymentStatus = async (orderId, paymentStatus, orderStatus) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw new Error("Order not found");
  order.payment_status = paymentStatus;
  if (orderStatus) order.order_status = orderStatus;
  return order.save();
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