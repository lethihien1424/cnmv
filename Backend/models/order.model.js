// order.model.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Order = sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      buyer_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      store_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      total_amount: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      shipping_fee: {
        type: DataTypes.BIGINT,
        defaultValue: 20000,
      },
      shipping_address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      payment_method: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      payment_status: {
        type: DataTypes.STRING(50),
        defaultValue: "UNPAID",
      },
     order_status: {
        // PENDING → SHIPPING → DELIVERED hoặc → CANCELLED
        type: DataTypes.STRING(50),
        defaultValue: "PENDING",
      },
    },
    {
      tableName: "orders",
      timestamps: true,
      underscored: true,
    }
  );

  return Order;
};