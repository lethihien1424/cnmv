const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Wallet = sequelize.define(
    "Wallet",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      balance: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
      },
    },
    {
      tableName: "wallets",
      timestamps: true,
      underscored: true,
    }
  );
  return Wallet;
};