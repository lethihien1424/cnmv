const { Sequelize, Op } = require("sequelize");

const { Order, Product } = require("../models");

const buildOrderWhere = (
  storeId,
  filters = {},
) => {

  const {
    period,
    date,
    month,
    year,
    status,
  } = filters;

  let createdAtFilter = {};

  if (
    period === "day" &&
    date
  ) {

    const start =
      new Date(date);

    const end =
      new Date(date);

    end.setDate(
      end.getDate() + 1
    );

    createdAtFilter = {
      [Op.gte]: start,
      [Op.lt]: end,
    };
  }

  if (
    period === "month" &&
    month
  ) {

    const parts =
      month.split("-");

    const start =
      new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        1
      );

    const end =
      new Date(
        Number(parts[0]),
        Number(parts[1]),
        1
      );

    createdAtFilter = {
      [Op.gte]: start,
      [Op.lt]: end,
    };
  }

  if (
    period === "year" &&
    year
  ) {

    const start =
      new Date(
        Number(year),
        0,
        1
      );

    const end =
      new Date(
        Number(year) + 1,
        0,
        1
      );

    createdAtFilter = {
      [Op.gte]: start,
      [Op.lt]: end,
    };
  }

  return {
    store_id: storeId,

    ...(Object.keys(
      createdAtFilter
    ).length > 0 && {
      created_at:
        createdAtFilter,
    }),

    ...(status && {
      order_status: status,
    }),
  };
};

const getStoreOverview =
async (
  storeId,
  filters = {},
) => {

  const orderWhere =
    buildOrderWhere(
      storeId,
      filters,
    );

  // Tổng sản phẩm
  const totalProducts =
    await Product.count({
      where: {
        store_id: storeId,
      },

      paranoid: false,
    });

  // Tổng khách
  const totalCustomers =
    await Order.count({
      where: orderWhere,

      distinct: true,

      col: "buyer_id",
    });

  // Tổng đơn
  const totalOrders =
    await Order.count({
      where: orderWhere,
    });

  // Đơn huỷ
  const cancelledOrders =
    await Order.count({
      where: {
        ...orderWhere,

        order_status: {
          [Op.in]: [
            "CANCELLED",
            "REFUNDED",
          ],
        },
      },
    });

  // Doanh thu
  const revenueResult =
    await Order.findOne({
      where: {
        ...orderWhere,

        payment_status:
          "PAID",

        order_status:
          "DELIVERED",
      },

      attributes: [
        [
          Sequelize.fn(
            "SUM",
            Sequelize.col(
              "total_amount",
            ),
          ),
          "revenue",
        ],
      ],

      raw: true,
    });

  const revenue =
    Number(
      revenueResult?.revenue ||
        0,
    );

  // Đơn gần đây
  const recentOrders =
    await Order.findAll({
      where: orderWhere,

      attributes: [
        "id",
        "buyer_id",
        "total_amount",
        "order_status",
        "created_at",
      ],

      order: [
        ["created_at", "DESC"],
      ],

      limit: 5,
    });

  // Biểu đồ trạng thái
  const statusRaw =
    await Order.findAll({
      where: orderWhere,

      attributes: [
        "order_status",

        [
          Sequelize.fn(
            "COUNT",
            Sequelize.col("id"),
          ),
          "count",
        ],
      ],

      group: [
        "order_status",
      ],

      raw: true,
    });

  const statusStats = {
    pending: 0,
    pickup: 0,
    shipping: 0,
    delivered: 0,
    cancelled: 0,
  };

  statusRaw.forEach(
    (item) => {

      switch (
        item.order_status
      ) {

        case "PENDING":
          statusStats.pending =
            Number(
              item.count,
            );
          break;

        case "PICKUP":
          statusStats.pickup =
            Number(
              item.count,
            );
          break;

        case "SHIPPING":
          statusStats.shipping =
            Number(
              item.count,
            );
          break;

        case "DELIVERED":
          statusStats.delivered =
            Number(
              item.count,
            );
          break;

        case "CANCELLED":
        case "REFUNDED":
          statusStats.cancelled +=
            Number(
              item.count,
            );
          break;
      }
    },
  );

  return {
    totalProducts,
    totalCustomers,
    totalOrders,
    cancelledOrders,
    revenue,
    recentOrders,
    statusStats,
  };
};

module.exports = {
  getStoreOverview,
};