//D:\CongNgheMoi-hien\CongNgheMoi\Backend\models\index.js
const { Sequelize } = require("sequelize");
const createUserModel = require("./user.model");
const createStoreModel = require("./store.model");
const createCategoryModel = require("./category.model");
const createNotificationModel = require("./notification.model");
const createProductModel = require("./product.model");
const createOrderModel = require("./order.model");
const createOrderItemModel = require("./order_item.model");
const createCartModel = require("./cart.model");
const createCartItemModel = require("./cartItem.model");
const createAddressModel = require("./address.model");
const createReviewModel = require("./review.model");
const dbName = (process.env.DB_NAME || "cnmoi").trim().replace(/\.sql$/i, "");

const sequelize = new Sequelize(
  dbName,
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "postgres",
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    dialect: "postgres",
    logging: false,
  },
);

const User = createUserModel(sequelize);
const Store = createStoreModel(sequelize);
const Category = createCategoryModel(sequelize);
const Notification = createNotificationModel(sequelize);
const Product = createProductModel(sequelize);
const Order = createOrderModel(sequelize);
const OrderItem = createOrderItemModel(sequelize);
const Cart = createCartModel(sequelize);
const CartItem = createCartItemModel(sequelize);
const Address = createAddressModel(sequelize);
const Review = createReviewModel(sequelize);

User.hasMany(Store, { foreignKey: "owner_id", as: "stores" });
Store.belongsTo(User, { foreignKey: "owner_id", as: "owner" });

Category.hasMany(Product, { foreignKey: "category_id", as: "products" });
Product.belongsTo(Category, { foreignKey: "category_id", as: "category" });

Store.hasMany(Product, { foreignKey: "store_id", as: "products" });
Product.belongsTo(Store, { foreignKey: "store_id", as: "store" });

User.hasMany(Notification, { foreignKey: "recipient_id", as: "notifications" });
Notification.belongsTo(User, { foreignKey: "recipient_id", as: "recipient" });

User.hasMany(Order, { foreignKey: "buyer_id", as: "orders" });
Order.belongsTo(User, { foreignKey: "buyer_id", as: "buyer" });
Store.hasMany(Order, { foreignKey: "store_id", as: "orders" });
Order.belongsTo(Store, { foreignKey: "store_id", as: "store" });

Order.hasMany(OrderItem, { foreignKey: "order_id", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "order_id", as: "order" });
Product.hasMany(OrderItem, { foreignKey: "product_id", as: "order_items" });
OrderItem.belongsTo(Product, { foreignKey: "product_id", as: "product" });

User.hasOne(Cart, { foreignKey: "user_id", as: "cart" });
Cart.belongsTo(User, { foreignKey: "user_id", as: "user" });
Cart.hasMany(CartItem, { foreignKey: "cart_id", as: "items" });
CartItem.belongsTo(Cart, { foreignKey: "cart_id", as: "cart" });
Product.hasMany(CartItem, { foreignKey: "product_id", as: "cart_items" });
CartItem.belongsTo(Product, { foreignKey: "product_id", as: "product" });

User.hasMany(Address, { foreignKey: "user_id", as: "addresses" });
Address.belongsTo(User, { foreignKey: "user_id", as: "user" });

User.hasMany(Review, { foreignKey: "buyer_id", as: "reviews" });
Review.belongsTo(User, { foreignKey: "buyer_id", as: "buyer" });
Product.hasMany(Review, { foreignKey: "product_id", as: "reviews" });
Review.belongsTo(Product, { foreignKey: "product_id", as: "product" });
Order.hasMany(Review, { foreignKey: "order_id", as: "reviews" });
Review.belongsTo(Order, { foreignKey: "order_id", as: "order" });

module.exports = {
  sequelize,
  User,
  Address,
  Store,
  Category,
  Product,
  Notification,
  Order,
  OrderItem,
  Cart,
  CartItem,
  Review,
};
