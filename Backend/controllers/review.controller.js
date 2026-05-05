const reviewService = require("../services/review.service");

const createReview = async (req, res) => {
  try {
    const userId = req.user.userId; // 🔥 sửa id → userId

    const review = await reviewService.createReview(userId, req.body);

    res.json(review);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { createReview };