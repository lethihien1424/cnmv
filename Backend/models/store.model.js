// const { DataTypes } = require("sequelize");

// module.exports = (sequelize) => {
//   const Store = sequelize.define(
//     "Store",
//     {
//       id: {
//         type: DataTypes.UUID,
//         defaultValue: DataTypes.UUIDV4,
//         primaryKey: true,
//       },
//       owner_id: {
//         type: DataTypes.UUID,
//         allowNull: false,
//       },
//       store_type: {
//         type: DataTypes.STRING(10),
//         allowNull: true,
//       },
//       store_name: {
//         type: DataTypes.STRING(255),
//         allowNull: false,
//       },
//       description: {
//         type: DataTypes.TEXT,
//         allowNull: true,
//       },
//       business_license: {
//         type: DataTypes.TEXT,
//         allowNull: true,
//       },
//       status: {
//         type: DataTypes.STRING(20),
//         defaultValue: "PENDING",
//       },
//       deleted_at: {
//         type: DataTypes.DATE,
//         allowNull: true,
//       },
//     },
//     {
//       tableName: "stores",
//       timestamps: true,
//       underscored: true,
//       paranoid: true,
//       deletedAt: "deleted_at",
//     },
//   );

//   return Store;
// };
// // Backend/models/store.model.js
// const { DataTypes } = require("sequelize");

// module.exports = (sequelize) => {
//   const Store = sequelize.define(
//     "Store",
//     {
//       id: {
//         type: DataTypes.UUID,
//         defaultValue: DataTypes.UUIDV4,
//         primaryKey: true,
//       },
//       owner_id: { type: DataTypes.UUID, allowNull: false },
//       store_type: { type: DataTypes.STRING(10), allowNull: true },
//       store_name: { type: DataTypes.STRING(255), allowNull: false },
//       description: { type: DataTypes.TEXT, allowNull: true },
//       business_license: { type: DataTypes.TEXT, allowNull: true },
//       status: { type: DataTypes.STRING(20), defaultValue: "PENDING" },
//       // --- BỔ SUNG CÁC CỘT MỚI DƯỚI ĐÂY ---
//       tax_code: { type: DataTypes.STRING(50), allowNull: true },
//       representative_name: { type: DataTypes.STRING(255), allowNull: true },
//       identity_card: { type: DataTypes.STRING(20), allowNull: true },
//       // ----------------------------------
//       deleted_at: { type: DataTypes.DATE, allowNull: true },
//     },
//     {
//       tableName: "stores",
//       timestamps: true,
//       underscored: true,
//       paranoid: true,
//       deletedAt: "deleted_at",
//     },
//   );
//   return Store;
// };
// Backend/models/store.model.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Store = sequelize.define(
    "Store",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      owner_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      store_type: {
        type: DataTypes.STRING(10),
        allowNull: true, // 'C2C' hoặc 'B2C'
      },
      store_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      business_license: {
        type: DataTypes.TEXT,
        allowNull: true, // Chỉ bắt buộc đối với B2C
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: "PENDING", // Mặc định là 'PENDING', 'APPROVED', hoặc 'REJECTED'
      },
      // --- CÁC CỘT BỔ SUNG ĐỂ KHỚP VỚI DATABASE ---
      tax_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      representative_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      identity_card: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      // ------------------------------------------
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "stores",
      timestamps: true,
      underscored: true, // Để khớp với created_at, updated_at trong SQL
      paranoid: true, // Hỗ trợ Soft Delete với cột deleted_at
      deletedAt: "deleted_at",
    },
  );

  return Store;
};
