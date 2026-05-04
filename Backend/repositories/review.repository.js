const { Review } = require("../models");

const createReview = async (data) => {
  return await Review.create(data);
};

module.exports = {
  createReview,
};