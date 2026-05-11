// services/order.service.js
const { Product, CartItem, Cart, Address } = require("../models");
const orderRepo = require("../repositories/order.repository");
const shippingService = require("./shipping.service");

// ===== FLASH SALE =====
const getFinalPrice = (product) => {
  const now = new Date();
  const valid =
    product.is_flash_sale &&
    product.flash_sale_price &&
    (!product.flash_sale_start_time || product.flash_sale_start_time <= now) &&
    (!product.flash_sale_end_time || product.flash_sale_end_time >= now);

  return valid ? product.flash_sale_price : product.price;
};

// ===== BUILD ADDRESS =====
const buildShippingAddress = (a) => {
  return `${a.recipient_name} - ${a.phone} - ${a.detail}, ${a.ward}, ${a.district}, ${a.province}`;
};

// ===== CORE =====
const processOrder = async (userId, items, paymentMethod, addressId, shippingProvider = 'GHN') => {
  if (!addressId) throw new Error("Vui lòng chọn địa chỉ nhận hàng");

  const address = await Address.findByPk(addressId);
  if (!address) throw new Error("Address not found");

  const shippingAddress = buildShippingAddress(address);
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

    storeItems.forEach((i) => {
      subtotal += getFinalPrice(i.product) * i.quantity;
    });

    // ✅ Kiểm tra success trước khi dùng shippingFee
    const shippingResult = await shippingService.calculateShippingFee(
      userId,
      addressId,
      shippingProvider === 'EXPRESS' ? 1 : 2,
      shippingProvider
    );

    if (!shippingResult.success) {
      throw new Error(shippingResult.message || "Không tính được phí vận chuyển");
    }

    const shippingFee = shippingResult.shippingFee ?? 0;
    const totalAmount = subtotal + shippingFee;

    const order = await orderRepo.createOrder({
      buyer_id: userId,
      store_id: storeId,
      total_amount: totalAmount,
      shipping_fee: shippingFee,
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
        price_at_buy: getFinalPrice(item.product),
      });
    }

    orders.push(order);
  }

  return orders;
};

// ===== EXPORTED FUNCTIONS =====
const createOrderFromCart = async (userId, selectedItems, paymentMethod, addressId, shippingProvider) => {
  if (!selectedItems || selectedItems.length === 0) {
    throw new Error("Không có sản phẩm nào được chọn");
  }

  const cart = await Cart.findOne({ where: { user_id: userId } });
  if (!cart) throw new Error("Giỏ hàng không tồn tại");

  const items = [];
  for (let i of selectedItems) {
    const cartItem = await CartItem.findOne({
      where: { cart_id: cart.id, product_id: i.product_id },
    });

    if (!cartItem) throw new Error(`Sản phẩm ${i.product_id} không còn trong giỏ hàng`);
    if (cartItem.quantity < i.quantity) throw new Error(`Sản phẩm ${i.product_id} không đủ số lượng`);

    const product = await Product.findOne({
      where: { id: i.product_id, deleted_at: null, status: "AVAILABLE" },
    });

    if (!product) throw new Error("Sản phẩm không tìm thấy hoặc đã bị xóa");

    items.push({
      product_id: product.id,
      quantity: i.quantity,
      product,
      cartItem,
    });
  }

  const orders = await processOrder(userId, items, paymentMethod, addressId, shippingProvider);

  // Cập nhật giỏ hàng sau khi đặt hàng thành công
  for (let item of items) {
    if (item.cartItem.quantity === item.quantity) {
      await item.cartItem.destroy();
    } else {
      item.cartItem.quantity -= item.quantity;
      await item.cartItem.save();
    }
  }

  return orders;
};

const buyNow = async (userId, productId, quantity, paymentMethod, addressId, shippingProvider) => {
  if (!productId) throw new Error("Thiếu product_id");
  if (!quantity || quantity < 1) throw new Error("Số lượng không hợp lệ");

  const product = await Product.findOne({
    where: { id: productId, deleted_at: null, status: "AVAILABLE" },
  });

  if (!product) throw new Error("Sản phẩm không tìm thấy hoặc đã bị xóa");

  return await processOrder(
    userId,
    [{ product_id: product.id, quantity, product }],
    paymentMethod,
    addressId,
    shippingProvider
  );
};

module.exports = {
  createOrderFromCart,
  buyNow,
  getOrdersByUser: (userId) => orderRepo.getOrdersByUser(userId),
  getOrdersByStore: (storeId) => orderRepo.getOrdersByStore(storeId),
  getOrderById: (id) => orderRepo.getOrderById(id),
  updateOrderStatus: orderRepo.updateOrderStatus,
};