const { Product, CartItem, Cart } = require("../models");
const orderRepo = require("../repositories/order.repository");

const SHIPPING_FEE = 20000;

const mapOrder = (order) => {
  const o = order.toJSON();
  o.items = o.items.map((item) => {
    if (item.product?.images?.length > 0) {
      item.product.image = item.product.images[0];
    }
    return item;
  });
  return o;
};

// 🛒 ĐẶT HÀNG TỪ GIỎ HÀNG
const createOrderFromCart = async (userId, selectedItems, paymentMethod, shippingAddress) => {
  if (!selectedItems || selectedItems.length === 0) {
    throw new Error("Chưa chọn sản phẩm");
  }

  const items = [];
  for (let item of selectedItems) {
    const product = await Product.findOne({
      where: { id: item.product_id, deleted_at: null, status: "AVAILABLE" },
    });
    if (!product) throw new Error(`Sản phẩm ${item.product_id} không tồn tại hoặc đã bị xóa`);
    items.push({ product_id: product.id, quantity: item.quantity, product });
  }

  const orders = await processOrder(userId, items, paymentMethod, shippingAddress);

  // ✅ Cập nhật cart sau khi đặt hàng
  const cart = await Cart.findOne({ where: { user_id: userId } });
  if (cart) {
    for (let item of selectedItems) {
      const cartItem = await CartItem.findOne({
        where: { cart_id: cart.id, product_id: item.product_id },
      });

      if (!cartItem) continue;

      if (cartItem.quantity <= item.quantity) {
        await cartItem.destroy(); // mua hết → xóa
      } else {
        cartItem.quantity -= item.quantity; // mua 1 phần → giảm
        await cartItem.save();
      }
    }
  }

  return orders;
};

// ⚡ MUA NGAY
const buyNow = async (userId, productId, quantity, paymentMethod, shippingAddress) => {
  const product = await Product.findOne({
    where: { id: productId, deleted_at: null, status: "AVAILABLE" },
  });
  if (!product) throw new Error("Sản phẩm không tồn tại hoặc đã bị xóa");

  const items = [{ product_id: product.id, quantity, product }];
  return await processOrder(userId, items, paymentMethod, shippingAddress);
  // buyNow không động vào cart
};

// ================= CORE =================
const processOrder = async (userId, items, paymentMethod, shippingAddress) => {
  const grouped = {};
  for (let item of items) {
    const storeId = item.product.store_id;
    if (!grouped[storeId]) grouped[storeId] = [];
    grouped[storeId].push(item);
  }

  const orders = [];

  for (let storeId in grouped) {
    const storeItems = grouped[storeId];

    let subtotal = 0;
    storeItems.forEach((i) => (subtotal += i.product.price * i.quantity));
    const totalAmount = subtotal + SHIPPING_FEE;

    const order = await orderRepo.createOrder({
      buyer_id: userId,
      store_id: storeId,
      total_amount: totalAmount,
      shipping_fee: SHIPPING_FEE,
      shipping_address: shippingAddress,
      payment_method: paymentMethod,
      payment_status: "UNPAID",
      order_status: "PENDING",
    });

    for (let item of storeItems) {
      await orderRepo.createOrderItem({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_buy: item.product.price,
      });
    }

    orders.push(order);
  }

  return orders;
};

// ================= EXPORT =================

const getOrdersByUser = async (userId) => {
  const orders = await orderRepo.getOrdersByUser(userId);
  return orders.map(mapOrder);
};

const getOrdersByStore = async (storeId) => {
  const orders = await orderRepo.getOrdersByStore(storeId);
  return orders.map(mapOrder);
};

const getOrderById = async (id) => {
  const order = await orderRepo.getOrderById(id);
  if (!order) return null;
  return mapOrder(order);
};

const updateOrderStatus = async (orderId, status) => {
  return await orderRepo.updateOrderStatus(orderId, status);
};

module.exports = {
  createOrderFromCart,
  buyNow,
  getOrdersByUser,
  getOrdersByStore,
  getOrderById,
  updateOrderStatus,
};