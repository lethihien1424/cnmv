const { Order } = require("../models");
const reviewRepo = require("../repositories/review.repository");

const createReview = async (userId, data) => {
  const order = await Order.findOne({
    where: {
      id: data.order_id,
      buyer_id: userId,
      order_status: "DELIVERED", // 🔥 sửa DONE → DELIVERED
    },
  });

  if (!order) {
    throw new Error("Chỉ được đánh giá khi đơn đã giao");
  }

  return await reviewRepo.createReview({
    ...data,
    buyer_id: userId,
  });
};

module.exports = { createReview };