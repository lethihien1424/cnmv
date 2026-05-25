const { Sequelize } = require("sequelize");
const {
  Order,
  Product,
  OrderDetail,
} = require("../models");

const { Op } = require("sequelize");

const getStoreOverview = async (storeId) => {

  // Tổng sản phẩm
  const totalProducts = await Product.count({
    where: {
      store_id: storeId,
    },
  });
const totalCustomers = await Order.count({
  where: {
    store_id: storeId,
  },

  distinct: true,

  col: "buyer_id",
});
  // Tổng đơn
  const totalOrders = await Order.count({
    where: {
      store_id: storeId,
    },
  });

  // Đơn huỷ
  const cancelledOrders = await Order.count({
    where: {
      store_id: storeId,
      order_status: {
        [Op.in]: ["CANCELLED", "REFUNDED"],
      },
    },
  });

  // Doanh thu
  const deliveredOrders = await Order.findAll({
    where: {
      store_id: storeId,
      payment_status: "PAID",
    },
  });

  const revenue = deliveredOrders.reduce(
    (sum, order) => sum + Number(order.total_amount),
    0
  );

  // Đơn gần đây
  const recentOrders = await Order.findAll({
  where: {
    store_id: storeId,
  },

  attributes: [
    "id",
    "buyer_id",
    "total_amount",
    "order_status",
    "created_at",
  ],

  order: [["created_at", "DESC"]],

  limit: 5,
});

  // Biểu đồ trạng thái
  const statusStats = {
    pending: 0,
    pickup: 0,
    shipping: 0,
    delivered: 0,
    cancelled: 0,
  };

  const allOrders = await Order.findAll({
    where: {
      store_id: storeId,
    },
  });

  allOrders.forEach((o) => {
    switch (o.order_status) {
      case "PENDING":
        statusStats.pending++;
        break;

      case "PICKUP":
        statusStats.pickup++;
        break;

      case "SHIPPING":
        statusStats.shipping++;
        break;

      case "DELIVERED":
        statusStats.delivered++;
        break;

      case "CANCELLED":
      case "REFUNDED":
        statusStats.cancelled++;
        break;
    }
  });

  return {
    totalProducts,
    totalOrders,
    cancelledOrders,
    revenue,
    recentOrders,
    statusStats,
    totalCustomers,
  };
};

module.exports = {
  getStoreOverview,
};