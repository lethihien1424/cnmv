// // Backend/controllers/order.controller.js
// const orderService = require("../services/order.service");
// const { createPaymentUrl } = require("../services/vnpay.service");

// // ── Helper: validate VNPAY config sớm, trước khi tạo order ──────────────────
// const validateVnpayConfig = () => {
//   const required = ["VNP_TMNCODE", "VNP_HASH_SECRET", "VNP_URL", "VNP_RETURN_URL"];
//   const missing = required.filter((k) => !process.env[k]);
//   if (missing.length > 0) {
//     throw new Error(`Thiếu cấu hình VNPAY: ${missing.join(", ")}`);
//   }
// };

// // ── Helper: build response sau khi tạo order ────────────────────────────────
// const buildOrderResponse = (res, orders, paymentMethod) => {
//   if (paymentMethod === "VNPAY") {
//     try {
//       const payUrl = createPaymentUrl(orders[0]);
//       return res.status(201).json({
//         success: true,
//         payUrl,
//         data: orders,
//       });
//     } catch (payErr) {
//       console.error("createPaymentUrl error:", payErr.message);
//       // Order đã tạo — trả về order_id để FE có thể retry hoặc hủy
//       return res.status(201).json({
//         success: false,
//         message: `Đặt hàng thành công nhưng không tạo được link thanh toán: ${payErr.message}`,
//         data: orders,
//         payUrl: null,
//       });
//     }
//   }

//   return res.status(201).json({
//     success: true,
//     message: "Đặt hàng thành công",
//     data: orders,
//     shipping_summary: orders.map((o) => ({
//       order_id: o.id,
//       shipping_fee: o.shipping_fee,
//       distance_km: o.distance_km,
//       estimated_delivery_time: o.estimated_delivery_time,
//     })),
//   });
// };

// // ───────────────────────────────────────────────────────
// // CREATE ORDER FROM CART
// // ───────────────────────────────────────────────────────
// const createFromCart = async (req, res) => {
//   try {
//     const userId = req.user.userId || req.user.id;
//     const {
//       selected_items,
//       payment_method,
//       address_id,
//       shipping_provider = "STANDARD",
//     } = req.body;

//     // Validate VNPAY config TRƯỚC khi tạo order
//     if (payment_method === "VNPAY") {
//       validateVnpayConfig();
//     }

//     const orders = await orderService.createOrderFromCart(
//       userId,
//       selected_items,
//       payment_method,
//       address_id,
//       shipping_provider
//     );

//     return buildOrderResponse(res, orders, payment_method);
//   } catch (error) {
//     console.error("createFromCart error:", error);
//     return res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // ───────────────────────────────────────────────────────
// // BUY NOW
// // ───────────────────────────────────────────────────────
// const buyNow = async (req, res) => {
//   try {
//     const userId = req.user.userId || req.user.id;
//     const {
//       product_id,
//       quantity,
//       payment_method,
//       address_id,
//       shipping_provider = "STANDARD",
//       size = null,
//       color = null,
//     } = req.body;

//     // Validate VNPAY config TRƯỚC khi tạo order
//     if (payment_method === "VNPAY") {
//       validateVnpayConfig();
//     }

//     const orders = await orderService.buyNow(
//       userId,
//       product_id,
//       quantity,
//       payment_method,
//       address_id,
//       shipping_provider,
//       size,
//       color
//     );

//     return buildOrderResponse(res, orders, payment_method);
//   } catch (error) {
//     console.error("buyNow error:", error);
//     return res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // ───────────────────────────────────────────────────────
// // GET MY ORDERS
// // ───────────────────────────────────────────────────────
// const getMyOrders = async (req, res) => {
//   try {
//     const userId = req.user.userId || req.user.id;
//     const orders = await orderService.getOrdersByUser(userId);
//     return res.json({ success: true, data: orders });
//   } catch (error) {
//     console.error("getMyOrders error:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // ───────────────────────────────────────────────────────
// // GET STORE ORDERS
// // ───────────────────────────────────────────────────────
// const getStoreOrders = async (req, res) => {
//   try {
//     const storeId = req.params.storeId;
//     const orders = await orderService.getOrdersByStore(storeId);
//     return res.json({ success: true, data: orders });
//   } catch (error) {
//     console.error("getStoreOrders error:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // ───────────────────────────────────────────────────────
// // GET ORDER DETAIL
// // ───────────────────────────────────────────────────────
// const getOrderDetail = async (req, res) => {
//   try {
//     const order = await orderService.getOrderById(req.params.id);
//     if (!order) {
//       return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
//     }
//     return res.json({ success: true, data: order });
//   } catch (error) {
//     console.error("getOrderDetail error:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // ───────────────────────────────────────────────────────
// // UPDATE ORDER STATUS
// // ───────────────────────────────────────────────────────
// const updateOrderStatus = async (req, res) => {
//   try {
//     const { status } = req.body;
//     const order = await orderService.updateOrderStatus(req.params.id, status);
//     return res.json({
//       success: true,
//       message: "Cập nhật trạng thái thành công",
//       data: order,
//     });
//   } catch (error) {
//     console.error("updateOrderStatus error:", error);
//     return res.status(400).json({ success: false, message: error.message });
//   }
// };
// const deleteOrder = async (req, res) => {
//   try {
//     await orderService.deleteOrder(
//       req.params.id
//     );

//     return res.json({
//       success: true,
//       message: "Đã xóa đơn hàng",
//     });
//   } catch (error) {
//     return res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// module.exports = {
//   createFromCart,
//   buyNow,
//   getMyOrders,
//   getStoreOrders,
//   getOrderDetail,
//   updateOrderStatus,
//   deleteOrder,
// };
// Backend/controllers/order.controller.js
const orderService = require("../services/order.service");
const { createPaymentUrl } = require("../services/vnpay.service");

// ── Helper: validate VNPAY config sớm ───────────────────────────────────────
const validateVnpayConfig = () => {
  const required = [
    "VNP_TMNCODE",
    "VNP_HASH_SECRET",
    "VNP_URL",
    "VNP_RETURN_URL",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0)
    throw new Error(`Thiếu cấu hình VNPAY: ${missing.join(", ")}`);
};

// ── Helper: build response sau khi tạo order ────────────────────────────────
const buildOrderResponse = (res, orders, paymentMethod) => {
  if (paymentMethod === "VNPAY") {
    try {
      const payUrl = createPaymentUrl(orders[0]);
      return res.status(201).json({ success: true, payUrl, data: orders });
    } catch (payErr) {
      console.error("createPaymentUrl error:", payErr.message);
      return res.status(201).json({
        success: false,
        message: `Đặt hàng thành công nhưng không tạo được link thanh toán: ${payErr.message}`,
        data: orders,
        payUrl: null,
      });
    }
  }

  return res.status(201).json({
    success: true,
    message: "Đặt hàng thành công",
    data: orders,
    shipping_summary: orders.map((o) => ({
      order_id: o.id,
      shipping_fee: o.shipping_fee,
      distance_km: o.distance_km,
      estimated_delivery_time: o.estimated_delivery_time,
    })),
  });
};

// ── CREATE ORDER FROM CART ───────────────────────────────────────────────────
const createFromCart = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const {
      selected_items,
      payment_method,
      address_id,
      shipping_service_type = "STANDARD",
    } = req.body;
    if (payment_method === "VNPAY") validateVnpayConfig();
    const orders = await orderService.createOrderFromCart(
      userId,
      selected_items,
      payment_method,
      address_id,
      shipping_service_type,
    );
    return buildOrderResponse(res, orders, payment_method);
  } catch (error) {
    console.error("createFromCart error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// ── BUY NOW ──────────────────────────────────────────────────────────────────
const buyNow = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const {
      quantity,
      payment_method,
      address_id,
      shipping_service_type = "STANDARD",
      size = null,
      color = null,
    } = req.body;

    // Đọc product_id linh hoạt (đề phòng FE gửi 'id' hoặc 'productId')
    const product_id = req.body.product_id || req.body.productId || req.body.id;

    // Validate chi tiết
    if (!address_id) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu address_id" });
    }
    if (!product_id || !quantity) {
      console.log("Dữ liệu FE gửi lên bị sai format:", req.body);
      return res.status(400).json({
        success: false,
        message: "product_id hoặc quantity không hợp lệ",
        received: { product_id, quantity },
      });
    }

    if (payment_method === "VNPAY") validateVnpayConfig();

    const orders = await orderService.buyNow(
      userId,
      product_id,
      quantity,
      payment_method,
      address_id,
      shipping_service_type,
      size,
      color,
    );
    return buildOrderResponse(res, orders, payment_method);
  } catch (error) {
    console.error("buyNow error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};
const createWalletTopup = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      throw new Error("Số tiền không hợp lệ");
    }

    validateVnpayConfig();

    const fakeOrder = {
      id: `TOPUP_${Date.now()}`,

      total_amount: amount,
      totalAmount: amount,

      buyer_id: userId,
      buyerId: userId,
    };

    const payUrl = createPaymentUrl(fakeOrder);

    return res.json({
      success: true,
      payUrl,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
// ── GET MY ORDERS ────────────────────────────────────────────────────────────
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const orders = await orderService.getOrdersByUser(userId);
    return res.json({ success: true, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET STORE ORDERS ─────────────────────────────────────────────────────────
const getStoreOrders = async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const orders = await orderService.getOrdersByStore(storeId);
    return res.json({ success: true, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET ORDER DETAIL ─────────────────────────────────────────────────────────
const getOrderDetail = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });
    return res.json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── UPDATE ORDER STATUS ──────────────────────────────────────────────────────
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, status);

    // Hoàn kho khi đơn hàng bị hủy
    if (status === "CANCELLED" || status === "REFUNDED") {
      await orderService.refundOrderStock(req.params.id);
    }

    return res.json({
      success: true,
      message: "Cập nhật trạng thái thành công",
      data: order,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// ── CANCEL ORDER (CUSTOMER hoặc STORE) ───────────────────────────────────────
// Body: { cancel_reason: string, cancelled_by: 'CUSTOMER' | 'STORE' }
const cancelOrder = async (req, res) => {
  try {
    console.log("CANCEL BODY:", req.body);
    console.log("CANCEL PARAMS:", req.params);
    console.log("CANCEL USER:", req.user);
    const { cancel_reason, cancelled_by } = req.body;
    const order = await orderService.cancelOrder(
      req.params.id,
      cancelled_by,
      cancel_reason,
    );

    // Hoàn kho khi đơn hàng bị hủy (CANCELLED hoặc REFUNDED)
    if (
      order.order_status === "CANCELLED" ||
      order.order_status === "REFUNDED"
    ) {
      await orderService.refundOrderStock(req.params.id);
    }

    return res.json({
      success: true,
      message:
        order.order_status === "REFUNDED"
          ? "Đã hủy đơn và hoàn tiền vào ví"
          : "Đã hủy đơn hàng",
      data: order,
    });
  } catch (error) {
    console.error("CANCEL ERROR:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// ── DELETE ORDER (legacy) ────────────────────────────────────────────────────
const deleteOrder = async (req, res) => {
  try {
    await orderService.deleteOrder(req.params.id);
    return res.json({ success: true, message: "Đã xóa đơn hàng" });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// ── GET MY WALLET ────────────────────────────────────────────────────────────
const getMyWallet = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { wallet, transactions } = await orderService.getWallet(userId);
    return res.json({ success: true, data: { wallet, transactions } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createFromCart,
  buyNow,
  getMyOrders,
  getStoreOrders,
  getOrderDetail,
  updateOrderStatus,
  cancelOrder,
  deleteOrder,
  getMyWallet,
  createWalletTopup,
};
