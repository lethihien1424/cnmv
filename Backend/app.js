require("dotenv").config();
const path = require("path");
const express = require("express");
const authRoutes = require("./routes/auth.route");
const adminStoreRoutes = require("./routes/admin.store.route");
const productRoutes = require("./routes/product.route");
const orderRoutes = require("./routes/order.route");
const categoryRoutes = require("./routes/category.route");
const cartRoutes = require("./routes/cart.route");
const paymentRoutes = require("./routes/payment.route");
const reviewRoutes = require("./routes/review.route");
const userRoutes = require("./routes/user.route"); // 🔥 THÊM


const app = express();
const notificationRoutes = require("./routes/notification.route"); // Dòng này ở trên cùng cùng các route khác

// ... (sau các dòng app.use khác)
app.use("/api/notifications", notificationRoutes); //
app.use(express.json());
app.use("/api/stores", adminStoreRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminStoreRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/categories", categoryRoutes); //
app.use("/api/cart", cartRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/users", userRoutes); // 🔥 THÊM

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Backend is running" });
});

module.exports = app;
