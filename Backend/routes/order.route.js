// routes/order.route.js

const express = require("express");

const router = express.Router();

const ctrl = require("../controllers/order.controller");

const {verifyToken,checkRole,} = require("../middlewares/auth.middleware");

const {checkStoreOwner,} = require("../middlewares/checkStoreOwner");

// ─── CUSTOMER ──────────────────────────────────────────

router.post("/",verifyToken,checkRole(["Customer"]),ctrl.createFromCart);

router.post("/from-cart",verifyToken,checkRole(["Customer"]),ctrl.createFromCart);

router.post("/buy-now",verifyToken,checkRole(["Customer"]),ctrl.buyNow);

router.get("/my-orders",verifyToken,checkRole(["Customer"]),ctrl.getMyOrders);
// ── PHẢI ĐẶT TRƯỚC /:id ──
router.get("/my-wallet", verifyToken, ctrl.getMyWallet);

router.patch("/:id/cancel",verifyToken,ctrl.cancelOrder);

router.get("/:id",verifyToken,checkRole(["Customer"]),ctrl.getOrderDetail);
router.post(
  "/wallet/topup",
  verifyToken,
  ctrl.createWalletTopup
);
// ─── STORE OWNER ───────────────────────────────────────

router.get("/store/:storeId",verifyToken,checkStoreOwner,ctrl.getStoreOrders);
router.put("/:id/status",verifyToken,checkStoreOwner,ctrl.updateOrderStatus);
router.delete("/:id",verifyToken,checkStoreOwner,ctrl.deleteOrder);
module.exports = router;