// Backend/services/order.service.js
const {Product, CartDetail, Cart, Address, Wallet, WalletTransaction,} = require("../models");
const orderRepo = require("../repositories/order.repository");
const shippingService = require("./shipping.service");

// Flash sale price
const getFinalPrice = (product) => {
  const now = new Date();
  const valid = product.is_flash_sale &&
    product.flash_sale_price &&
    (!product.flash_sale_start_time || product.flash_sale_start_time <= now) &&
    (!product.flash_sale_end_time || product.flash_sale_end_time >= now);
  return valid ? product.flash_sale_price : product.price;
};

const buildShippingAddress = (a) =>
  `${a.recipient_name} - ${a.phone} - ${a.detail}, ${a.ward}, ${a.district}, ${a.province}`;

const processOrder = async (userId, items, paymentMethod, addressId, serviceType = "STANDARD") => {
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
    storeItems.forEach((i) => { subtotal += getFinalPrice(i.product) * i.quantity; });

    const hasBulky = storeItems.some((i) => i.product?.is_bulky === true);

    const shippingResult = await shippingService.calculateShippingFee(
      userId, addressId, serviceType, storeId, hasBulky
    );

    if (!shippingResult.success) throw new Error(shippingResult.message || "Không tính được phí vận chuyển");

    const shippingFee = shippingResult.shippingFee ?? 0;
    const totalAmount = subtotal + shippingFee;
    if (paymentMethod === "WALLET") {
      let wallet = await Wallet.findOne({
        where: { user_id: userId },
      });

      if (!wallet) {
        throw new Error("Ví không tồn tại");
      }

      if (Number(wallet.balance) < totalAmount) {
        throw new Error("Số dư ví không đủ");
      }

      wallet.balance =
        Number(wallet.balance) - totalAmount;

      await wallet.save();
    }
    const order = await orderRepo.createOrder({
  buyer_id: userId,
  store_id: storeId,
  total_amount: totalAmount,
  shipping_fee: shippingFee,

  shipping_provider: "GHN",
  shipping_service_type: serviceType,

  distance_km: shippingResult.distanceKm,
  estimated_delivery_time:
    shippingResult.estimatedDeliveryTime,

  shipping_address: shippingAddress,

  payment_method: paymentMethod,

  payment_status:
    paymentMethod === "COD"
      ? "UNPAID"
      : "PAID",

  order_status:
    paymentMethod === "COD"
      ? "PENDING"
      : "PICKUP",
});
    if (paymentMethod === "WALLET") {
    const wallet = await Wallet.findOne({
      where: { user_id: userId },
    });

    await WalletTransaction.create({
      wallet_id: wallet.id,
      type: "PAYMENT",
      amount: totalAmount,
      status: "SUCCESS",
      order_id: order.id,
      description: `Thanh toán đơn hàng #${order.id}`,
    });
    }

    for (let item of storeItems) {
      await orderRepo.createOrderItem({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_buy: getFinalPrice(item.product),
        size: item.size ?? null,
        color: item.color ?? null,
      });
    }

    orders.push(order);
  }

  return orders;
};

const createOrderFromCart = async (userId, selectedItems, paymentMethod, addressId, serviceType = "STANDARD") => {
  if (!selectedItems || selectedItems.length === 0) throw new Error("Không có sản phẩm nào được chọn");

  const cart = await Cart.findOne({ where: { user_id: userId } });
  if (!cart) throw new Error("Giỏ hàng không tồn tại");

  const items = [];
  for (let i of selectedItems) {
    const cartItem = await CartDetail.findOne({
      where: { cart_id: cart.id, product_id: i.product_id, size: i.size ?? null, color: i.color ?? null },
    });
    if (!cartItem) throw new Error(`Sản phẩm ${i.product_id} không còn trong giỏ hàng`);
    if (cartItem.quantity < i.quantity) throw new Error(`Sản phẩm ${i.product_id} không đủ số lượng`);

    const product = await Product.findOne({ where: { id: i.product_id, deleted_at: null, status: "AVAILABLE" } });
    if (!product) throw new Error("Sản phẩm không tìm thấy hoặc đã bị xóa");

    items.push({ product_id: product.id, quantity: i.quantity, product, size: i.size ?? null, color: i.color ?? null });
  }

  const orders = await processOrder(userId, items, paymentMethod, addressId, serviceType);

  // Xóa / cập nhật cart
  for (let item of items) {
    const cartItem = await CartDetail.findOne({
      where: { cart_id: cart.id, product_id: item.product_id, size: item.size, color: item.color }
    });
    if (cartItem.quantity === item.quantity) {
      await cartItem.destroy();
    } else {
      cartItem.quantity -= item.quantity;
      await cartItem.save();
    }
  }

  return orders;
};

const buyNow = async (userId, productId, quantity, paymentMethod, addressId, serviceType = "STANDARD", size = null, color = null) => {
  const product = await Product.findOne({ where: { id: productId, deleted_at: null, status: "AVAILABLE" } });
  if (!product) throw new Error("Sản phẩm không tìm thấy");

  return await processOrder(userId, [{ product_id: product.id, quantity, product, size, color }], paymentMethod, addressId, serviceType);
};

module.exports = {
  createOrderFromCart,
  buyNow,
  cancelOrder: orderRepo.cancelOrder,
  getWallet: orderRepo.getWalletByUser,
  getOrdersByUser: orderRepo.getOrdersByUser,
  getOrdersByStore: orderRepo.getOrdersByStore,
  getOrderById: orderRepo.getOrderById,
  updateOrderStatus: orderRepo.updateOrderStatus,
  deleteOrder: orderRepo.deleteOrder,
};