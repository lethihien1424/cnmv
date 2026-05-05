const orderService = require("../services/order.service");
const vnpayService = require("../services/vnpay.service");

// ================= CUSTOMER =================

const createFromCart = async (req, res) => {
  try {
    const { selected_items, payment_method, address_id } = req.body;

    if (!address_id) {
      return res.status(400).json({ message: "Thiếu address_id" });
    }

    const orders = await orderService.createOrderFromCart(
      req.user.userId,
      selected_items,
      payment_method,
      address_id
    );

    if (payment_method === "COD") {
      return res.json({ message: "OK", data: orders });
    }

    const payUrl = vnpayService.createPaymentUrl(orders[0]);
    return res.json({ payUrl });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const buyNow = async (req, res) => {
  try {
    const { product_id, quantity, payment_method, address_id } = req.body;

    if (!address_id) {
      return res.status(400).json({ message: "Thiếu address_id" });
    }

    const orders = await orderService.buyNow(
      req.user.userId,
      product_id,
      quantity,
      payment_method,
      address_id
    );

    if (payment_method === "COD") {
      return res.json({ message: "OK", data: orders });
    }

    const payUrl = vnpayService.createPaymentUrl(orders[0]);
    return res.json({ payUrl });

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

    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn" });
    if (order.buyer_id !== req.user.userId)
      return res.status(403).json({ message: "Không có quyền" });

    res.json({ data: order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getStoreOrders = async (req, res) => {
  try {
    const orders = await orderService.getOrdersByStore(req.params.storeId);
    res.json({ data: orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= UPDATE =================

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn" });

    const current = order.order_status;
    const method = order.payment_method;

    let allow = [];

    if (method === "COD") {
      if (current === "PENDING") allow = ["PICKUP", "CANCELLED"];
      else if (current === "PICKUP") allow = ["SHIPPING", "CANCELLED"];
      else if (current === "SHIPPING") allow = ["DELIVERED"];
    } else {
      if (current === "PENDING") allow = ["CANCELLED"];
      else if (current === "PICKUP") allow = ["SHIPPING", "CANCELLED"];
      else if (current === "SHIPPING") allow = ["DELIVERED"];
    }

    if (!allow.includes(status)) {
      return res.status(400).json({ message: "Sai flow trạng thái" });
    }

    const updated = await orderService.updateOrderStatus(order.id, status);
    res.json({ data: updated });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);

    if (!["PENDING", "PICKUP"].includes(order.order_status)) {
      return res.status(400).json({ message: "Không được hủy" });
    }

    const updated = await orderService.updateOrderStatus(order.id, "CANCELLED");
    res.json({ data: updated });

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