const productService = require("../services/product.service");

const createProduct = async (req, res) => {
  try {
    const result = await productService.createProduct(
      req.body,
      req.user,
      req.imageUrls || [],
    );
    return res.status(201).json({
      message: "Create product success",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const result = await productService.updateProduct(
      req.params.id,
      req.body,
      req.user,
      req.imageUrls || [],
    );
    return res.status(200).json({
      message: "Update product success",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await productService.deleteProduct(req.params.id, req.user);
    return res.status(200).json({
      message: "Delete product success",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

const searchProducts = async (req, res) => {
  try {
    const result = await productService.searchProducts(req.query);
    return res.status(200).json({
      message: "Get products success",
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

const getProductDetail = async (req, res) => {
  try {
    const result = await productService.getProductDetail(req.params.id);
    return res.status(200).json({
      message: "Get product detail success",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};
const setFlashSale = async (req, res) => {
  try {
    const result = await productService.setFlashSale(
      req.params.id,
      req.body,
      req.user,
    );

    return res.status(200).json({
      message: "Update flash sale success",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

const scheduleFlashSale = async (req, res) => {
  try {
    const result = await productService.scheduleFlashSale(
      req.params.id,
      req.body,
      req.user,
    );

    return res.status(200).json({
      message: "Schedule flash sale success",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};

const suggestFlashSale = async (req, res) => {
  try {
    const result = await productService.suggestFlashSale(
      req.params.id,
      req.user,
    );

    return res.status(200).json({
      message: "Suggest flash sale success",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error",
    });
  }
};
module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductDetail,
  setFlashSale,
  scheduleFlashSale,
  suggestFlashSale,
};
