//D:\CongNgheMoi-hien\CongNgheMoi\Backend\models\address.model.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Address = sequelize.define(
    "Address",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
      },
      recipient_name: DataTypes.STRING,
      phone: DataTypes.STRING,
      detail: DataTypes.STRING,

      // 👇 giữ lại (hiển thị)
      ward: DataTypes.STRING,
      district: DataTypes.STRING,
      province: DataTypes.STRING,

      // 🔥 thêm mới (GHN dùng)
      district_id: {
        type: DataTypes.INTEGER,
      },
      ward_code: {
        type: DataTypes.STRING,
      },

      is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "addresses",
      timestamps: true,
      underscored: true,
    }
  );

  return Address;
};