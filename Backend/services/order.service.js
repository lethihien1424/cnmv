//D:\CongNgheMoi-hien\CongNgheMoi\Backend\services\order.service.js
const { Product, CartItem, Cart, Address } = require("../models");
const orderRepo = require("../repositories/order.repository");
const ghnService = require("./ghn.service");

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
const processOrder = async (userId, items, paymentMethod, addressId) => {
  const address = await Address.findByPk(addressId);
  if (!address) throw new Error("Address not found");

  // 🔥 CHECK GHN DATA
  if (!address.district_id || !address.ward_code) {
    throw new Error("Address thiếu district_id hoặc ward_code (GHN)");
  }

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

    // 🔥 GHN SHIPPING (FIX CHUẨN)
    const shippingFee = await ghnService.calculateShipping(
      Number(process.env.GHN_FROM_DISTRICT_ID), // 👉 Củ Chi = 1450
      address.district_id,
      address.ward_code
    );

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

// ===== FROM CART =====
const createOrderFromCart = async (
  userId,
  selectedItems,
  paymentMethod,
  addressId
) => {
  if (!selectedItems || selectedItems.length === 0) {
    throw new Error("Không có sản phẩm nào được chọn");
  }

  const cart = await Cart.findOne({ where: { user_id: userId } });
  if (!cart) throw new Error("Giỏ hàng không tồn tại");

  const items = [];

  for (let i of selectedItems) {
    const cartItem = await CartItem.findOne({
      where: {
        cart_id: cart.id,
        product_id: i.product_id,
      },
    });

    if (!cartItem) {
      throw new Error(`Sản phẩm ${i.product_id} không còn trong giỏ hàng`);
    }

    if (cartItem.quantity < i.quantity) {
      throw new Error(`Sản phẩm ${i.product_id} không đủ số lượng`);
    }

    const product = await Product.findOne({
      where: { id: i.product_id, deleted_at: null, status: "AVAILABLE" },
    });

    if (!product) throw new Error("Product not found");

    items.push({
      product_id: product.id,
      quantity: i.quantity,
      product,
      cartItem,
    });
  }

  const orders = await processOrder(
    userId,
    items,
    paymentMethod,
    addressId
  );

  // 🔥 update cart
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

// ===== BUY NOW =====
const buyNow = async (
  userId,
  productId,
  quantity,
  paymentMethod,
  addressId
) => {
  const product = await Product.findOne({
    where: { id: productId, deleted_at: null, status: "AVAILABLE" },
  });

  if (!product) throw new Error("Product not found");

  return await processOrder(
    userId,
    [{ product_id: product.id, quantity, product }],
    paymentMethod,
    addressId
  );
};

// ===== EXPORT =====
module.exports = {
  createOrderFromCart,
  buyNow,
  getOrdersByUser: (userId) => orderRepo.getOrdersByUser(userId),
  getOrdersByStore: (storeId) => orderRepo.getOrdersByStore(storeId),
  getOrderById: (id) => orderRepo.getOrderById(id),
  updateOrderStatus: orderRepo.updateOrderStatus,
};