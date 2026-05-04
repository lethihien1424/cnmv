const orderService = require("../services/order.service");
const vnpayService = require("../services/vnpay.service");

// ─── CUSTOMER ────────────────────────────────────────────────────────

const createFromCart = async (req, res) => {
  try {
    const { selected_items, payment_method, shipping_address } = req.body;

    if (!shipping_address) {
      return res.status(400).json({ message: "Vui lòng nhập địa chỉ giao hàng" });
    }

    const orders = await orderService.createOrderFromCart(
      req.user.userId,
      selected_items,
      payment_method,
      shipping_address
    );

    if (payment_method === "COD") {
      return res.json({ message: "Đặt hàng thành công", data: orders });
    }

    const payUrl = vnpayService.createPaymentUrl(orders[0]);
    return res.json({ message: "Redirect to VNPAY", payUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const buyNow = async (req, res) => {
  try {
    const { product_id, quantity, payment_method, shipping_address } = req.body;

    if (!shipping_address) {
      return res.status(400).json({ message: "Vui lòng nhập địa chỉ giao hàng" });
    }

    const orders = await orderService.buyNow(
      req.user.userId,
      product_id,
      quantity,
      payment_method,
      shipping_address
    );

    if (payment_method === "COD") {
      return res.json({ message: "Đặt hàng thành công", data: orders });
    }

    const payUrl = vnpayService.createPaymentUrl(orders[0]);
    return res.json({ message: "Redirect to VNPAY", payUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await orderService.getOrdersByUser(req.user.userId);
    res.json({ data: orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getOrderDetail = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (order.buyer_id !== req.user.userId) {
      return res.status(403).json({ message: "Không có quyền xem đơn hàng này" });
    }

    res.json({ data: order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── STORE OWNER ─────────────────────────────────────────────────────

const getStoreOrders = async (req, res) => {
  try {
    const orders = await orderService.getOrdersByStore(req.params.storeId);
    res.json({ data: orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /:id/status
// Flow: PENDING → SHIPPING → DELIVERED hoặc → CANCELLED
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // ✅ Bỏ PREPARING, chỉ còn 3 trạng thái người bán được cập nhật
    const allowedStatuses = ["SHIPPING", "DELIVERED", "CANCELLED"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Trạng thái không hợp lệ. Cho phép: ${allowedStatuses.join(", ")}`,
      });
    }

    const order = req.order || await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    const updated = await orderService.updateOrderStatus(order.id, status);
    res.json({ message: "Cập nhật thành công", data: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /:id — chỉ hủy được khi PENDING
const cancelOrder = async (req, res) => {
  try {
    const order = req.order || await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (order.order_status !== "PENDING") {
      return res.status(400).json({
        message: `Chỉ có thể hủy đơn hàng đang ở trạng thái PENDING. Trạng thái hiện tại: ${order.order_status}`,
      });
    }

    const updated = await orderService.updateOrderStatus(order.id, "CANCELLED");
    res.json({ message: "Hủy đơn hàng thành công", data: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createFromCart,
  buyNow,
  getMyOrders,
  getOrderDetail,
  getStoreOrders,
  updateStatus,
  cancelOrder,
};