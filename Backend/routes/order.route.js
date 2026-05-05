
// order.route.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/order.controller");
const { verifyToken, checkRole } = require("../middlewares/auth.middleware");
const { checkStoreOwner } = require("../middlewares/checkStoreOwner");

console.log("createFromCart:", ctrl.createFromCart);
console.log("buyNow:", ctrl.buyNow);
console.log("getMyOrders:", ctrl.getMyOrders);
console.log("getOrderDetail:", ctrl.getOrderDetail);
console.log("getStoreOrders:", ctrl.getStoreOrders);
console.log("updateStatus:", ctrl.updateStatus);
console.log("cancelOrder:", ctrl.cancelOrder);
// ─── CUSTOMER ────────────────────────────────────────────────────────

router.post("/", verifyToken, checkRole(["Customer"]), ctrl.createFromCart);
router.post(
  "/from-cart",
  verifyToken,
  checkRole(["Customer"]),
  ctrl.createFromCart,
);
router.post("/buy-now", verifyToken, checkRole(["Customer"]), ctrl.buyNow);
router.get(
  "/my-orders",
  verifyToken,
  checkRole(["Customer"]),
  ctrl.getMyOrders,
);
router.get("/:id", verifyToken, checkRole(["Customer"]), ctrl.getOrderDetail);

// ─── STORE OWNER ─────────────────────────────────────────────────────

router.get(
  "/store/:storeId",
  verifyToken,
  checkStoreOwner,
  ctrl.getStoreOrders,
);
router.put("/:id/status", verifyToken, checkStoreOwner, ctrl.updateStatus); // ✅ PUT
router.delete("/:id", verifyToken, checkStoreOwner, ctrl.cancelOrder); // ✅ xóa/hủy đơn

module.exports = router;
