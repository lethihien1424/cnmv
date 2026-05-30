// Backend/services/order.service.js
const {
  Product,
  CartDetail,
  Cart,
  Address,
  Wallet,
  WalletTransaction,
} = require("../models");
const orderRepo = require("../repositories/order.repository");
const voucherService = require(
  "./voucher.service"
);

const voucherRepo = require(
  "../repositories/voucher.repository"
);
const shippingService = require("./shipping.service");

const buildShippingAddress = (a) =>
  `${a.recipient_name} - ${a.phone} - ${a.detail}, ${a.ward}, ${a.district}, ${a.province}`;

const processOrder = async (
  userId,
  items,
  paymentMethod,
  addressId,
  serviceType = "STANDARD",
  platformVoucherId = null,
  shopVoucherId = null,
) => {
  if (!addressId) throw new Error("Vui lòng chọn địa chỉ nhận hàng");

  const address = await Address.findByPk(addressId);
  if (!address) throw new Error("Address not found");

  const shippingAddress = buildShippingAddress(address);

  // =========================================================================
  // 1. TÍNH TOÁN GIÁ BẬC THANG & CẬP NHẬT KHO (FLASH SALE + KHO GỐC)
  // =========================================================================
  for (let item of items) {
    const product = item.product;
    const now = new Date();

    // 🚫 Chặn mua sản phẩm ngừng bán
    if (product.status === "DISCONTINUED" || product.deleted_at) {
      const error = new Error(
        `Sản phẩm "${product.name}" đã ngừng bán, không thể đặt hàng`,
      );
      error.statusCode = 400;
      throw error;
    }

    // Kiểm tra thời gian và trạng thái Flash Sale
    const isFlashSaleActive =
      product.is_flash_sale &&
      product.flash_sale_price &&
      (!product.flash_sale_start_time ||
        new Date(product.flash_sale_start_time) <= now) &&
      (!product.flash_sale_end_time ||
        new Date(product.flash_sale_end_time) >= now);

    let flashQuantity = 0;
    let normalQuantity = item.quantity;
    let unitPrice = product.price;

    if (isFlashSaleActive) {
      const stockFlashSale = product.flash_sale_stock || 0; // Tổng số lượng shop cho phép Sale
      const soldFlashSale = product.flash_sale_sold || 0; // Số lượng người khác đã mua

      // Tính số suất Flash Sale còn lại có thể mua
      const availableFlashSale = Math.max(0, stockFlashSale - soldFlashSale);

      if (availableFlashSale > 0) {
        // Nếu số lượng khách mua nhỏ hơn hoặc bằng số suất còn lại -> hưởng trọn Flash Sale
        // Nếu mua nhiều hơn số suất còn lại -> Chỉ được tính Flash Sale cho số suất còn lại
        flashQuantity = Math.min(item.quantity, availableFlashSale);

        // Phần vượt quá sẽ bị tính giá gốc
        normalQuantity = item.quantity - flashQuantity;
      }
    }

    // Tính tổng tiền cho sản phẩm này (Bao gồm phần giá Sale + phần giá Gốc nếu mua vượt số lượng)
    const totalItemPrice =
      flashQuantity * (product.flash_sale_price || 0) +
      normalQuantity * product.price;

    // Lưu lại giá trị để dùng tạo Order ở bước sau
    item.totalItemPrice = totalItemPrice;
    item.calculatedAveragePrice = totalItemPrice / item.quantity; // Tính giá trị trung bình/1 sp

    // Cập nhật số lượng đã bán vào kho Flash Sale chung của Shop
    if (flashQuantity > 0) {
      product.flash_sale_sold = (product.flash_sale_sold || 0) + flashQuantity;
    }

    // Kiểm tra và Trừ kho gốc chung của sản phẩm
    if (product.stock_quantity < item.quantity) {
      throw new Error(
        `Sản phẩm "${product.name}" không đủ số lượng tồn kho! (Chỉ còn ${product.stock_quantity})`,
      );
    }
    product.stock_quantity -= item.quantity;

    // Lưu ngay vào Database để người mua sau thấy được kho Flash Sale đã bị trừ
    await product.save();
  }

  // =========================================================================
  // 2. GOM NHÓM THEO SHOP VÀ TẠO ĐƠN HÀNG
  // =========================================================================
  const grouped = {};
  for (let item of items) {
    const storeId = item.product.store_id;
    if (!grouped[storeId]) grouped[storeId] = [];
    grouped[storeId].push(item);
  }

  const orders = [];

  for (let storeId in grouped) {
    const storeItems = grouped[storeId];

    // Tính tổng tiền hàng (Đã được tính toán bậc thang Flash Sale ở trên)
    let subtotal = 0;
    storeItems.forEach((i) => {
      subtotal += i.totalItemPrice;
    });

    const hasBulky = storeItems.some((i) => i.product?.is_bulky === true);

    const shippingResult = await shippingService.calculateShippingFee(
      userId,
      addressId,
      serviceType,
      storeId,
      hasBulky,
    );

       if (!shippingResult.success)
      throw new Error(
        shippingResult.message || "Không tính được phí vận chuyển",
      );

    // ==================== XỬ LÝ VOUCHER + FREESHIP ====================
    let discountAmount = 0;
    let shippingDiscountPercent = 0;

    if (platformVoucherId || shopVoucherId) {
      const voucherResult = await voucherService.validateVoucher(
        userId,
        {
          platform_voucher_id: platformVoucherId,
          shop_voucher_id: shopVoucherId,
          subtotal,
        }
      );

      discountAmount = voucherResult.total_discount || 0;
      shippingDiscountPercent = voucherResult.freeship_discount || 0;

      console.log(`🔍 Voucher Result: freeship=${shippingDiscountPercent}%, discount=${discountAmount}`);
    }

    let shippingFee = shippingResult.shippingFee ?? 0;

    // Áp dụng giảm phí ship từ voucher FREESHIP
    if (shippingDiscountPercent > 0) {
      const shippingDiscountAmount = Math.round(shippingFee * (shippingDiscountPercent / 100));
      shippingFee = Math.max(0, shippingFee - shippingDiscountAmount);
      console.log(`✅ ĐÃ GIẢM PHÍ SHIP ${shippingDiscountPercent}%: -${shippingDiscountAmount}đ → Còn ${shippingFee}đ`);
    }

    const totalAmount = subtotal + shippingFee - discountAmount;
    // ==================== KẾT THÚC XỬ LÝ VOUCHER ====================

    // Xử lý thanh toán ví
    if (paymentMethod === "WALLET") {
      let wallet = await Wallet.findOne({
        where: { user_id: userId },
      });

      if (!wallet) throw new Error("Ví không tồn tại");
      if (Number(wallet.balance) < totalAmount)
        throw new Error("Số dư ví không đủ");

      wallet.balance = Number(wallet.balance) - totalAmount;
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
      estimated_delivery_time: shippingResult.estimatedDeliveryTime,
      shipping_address: shippingAddress,
      payment_method: paymentMethod,
      platform_voucher_id: platformVoucherId,
      shop_voucher_id: shopVoucherId,
      discount_amount: discountAmount,
      payment_status: paymentMethod === "COD" ? "UNPAID" : "PAID",
      order_status: paymentMethod === "COD" ? "PENDING" : "PICKUP",

    });

    if (paymentMethod === "WALLET") {
      const wallet = await Wallet.findOne({ where: { user_id: userId } });
      await WalletTransaction.create({
        wallet_id: wallet.id,
        type: "PAYMENT",
        amount: totalAmount,
        status: "SUCCESS",
        order_id: order.id,
        description: `Thanh toán đơn hàng #${order.id}`,
      });
    }

    // LƯU ORDER ITEM VỚI GIÁ TRUNG BÌNH (Đã tính bao nhiêu cái sale, bao nhiêu cái gốc)
    for (let item of storeItems) {
      await orderRepo.createOrderItem({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_buy: item.calculatedAveragePrice,
        size: item.size ?? null,
        color: item.color ?? null,
      });
    }

    orders.push(order);
    if (platformVoucherId) {

    await voucherRepo.markUserVoucherUsed(
      userId,
      platformVoucherId,
      order.id
    );

    await voucherRepo.incrementPlatformVoucherUsedCount(
      platformVoucherId
    );
  }

  if (shopVoucherId) {

  await voucherRepo.incrementShopVoucherUsedCount(
    shopVoucherId
  );
}
}

return orders;
};

const createOrderFromCart =
async (
  
  userId,
  selectedItems,
  paymentMethod,
  addressId,
  serviceType,
  platformVoucherId = null,
  shopVoucherId = null,
) => {
  if (!selectedItems || selectedItems.length === 0)
    throw new Error("Không có sản phẩm nào được chọn");

  const cart = await Cart.findOne({ where: { user_id: userId } });
  if (!cart) throw new Error("Giỏ hàng không tồn tại");

  const items = [];
  for (let i of selectedItems) {
    const cartItem = await CartDetail.findOne({
      where: {
        cart_id: cart.id,
        product_id: i.product_id,
        size: i.size ?? null,
        color: i.color ?? null,
      },
    });
    if (!cartItem)
      throw new Error(`Sản phẩm ${i.product_id} không còn trong giỏ hàng`);
    if (cartItem.quantity < i.quantity)
      throw new Error(`Sản phẩm ${i.product_id} không đủ số lượng`);

    const product = await Product.findOne({
      where: { id: i.product_id, deleted_at: null, status: "AVAILABLE" },
    });
    if (!product) throw new Error("Sản phẩm không tìm thấy hoặc đã bị xóa");

    items.push({
      product_id: product.id,
      quantity: i.quantity,
      product,
      size: i.size ?? null,
      color: i.color ?? null,
    });
  }

  const orders =
 await processOrder(
  userId,
  items,
  paymentMethod,
  addressId,
  serviceType,
  platformVoucherId,
  shopVoucherId,
);
  for (let item of items) {
    const cartItem = await CartDetail.findOne({
      where: {
        cart_id: cart.id,
        product_id: item.product_id,
        size: item.size,
        color: item.color,
      },
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

const buyNow = async (
  userId,
  productId,
  quantity,
  paymentMethod,
  addressId,
  serviceType = "STANDARD",
  size = null,
  color = null,
  platformVoucherId = null,
  shopVoucherId = null,
) => {
  const product = await Product.findOne({
    where: { id: productId, deleted_at: null, status: "AVAILABLE" },
  });
  if (!product) throw new Error("Sản phẩm không tìm thấy");

  return await processOrder(
    userId,
    [{ product_id: product.id, quantity, product, size, color }],
    paymentMethod,
    addressId,
    serviceType,
    platformVoucherId,
    shopVoucherId,
  );
};

// Hàm hoàn lại kho khi Hủy Đơn (Giúp trả lại kho Flash Sale và kho gốc)
const refundOrderStock = async (orderId) => {
  const order = await orderRepo.getOrderById(orderId);
  if (!order || !order.items) return;

  for (let item of order.items) {
    const product = await Product.findByPk(item.product_id);
    if (!product) continue;

    // Trả lại kho gốc
    product.stock_quantity += item.quantity;

    // Trả lại kho Flash Sale (Nếu lúc mua khách được áp giá Flash Sale)
    if (product.is_flash_sale && product.flash_sale_price) {
      // Vì lúc mua giá bị trộn, ta ước tính xem khách đã được hưởng bao nhiêu suất Sale
      // Nếu giá lúc mua < giá gốc, nghĩa là có áp dụng Sale
      if (item.price_at_buy < product.price) {
        const diffGia = product.price - item.price_at_buy;
        const loiTien = diffGia * item.quantity;
        const tienSaleGiam = product.price - product.flash_sale_price;
        const soLuongSale = Math.round(loiTien / tienSaleGiam);

        product.flash_sale_sold = Math.max(
          0,
          (product.flash_sale_sold || 0) - soLuongSale,
        );
      }
    }

    await product.save();
  }
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
  refundOrderStock, // Đã export hàm hoàn kho để gọi ở Controller
};
