//D:\CNM_cu\CongNgheMoi\Backend\controllers\product.controller.js
const productService = require("../services/product.service");

// Trong controller.js
const createProduct = async (req, res) => {
  try {
    const payload = { ...req.body };

    console.log("Payload nhận được từ FE (createProduct):", { color: payload.color, size: payload.size });

    // BẮT BUỘC: Nếu variants là chuỗi, phải biến nó thành Object trước khi đưa vào repository
    if (typeof payload.variants === "string") {
      payload.variants = JSON.parse(payload.variants);
    }

    // Tương tự với is_bulky nếu nó là chuỗi 'true'/'false'
    if (typeof payload.is_bulky === "string") {
      payload.is_bulky = payload.is_bulky === "true";
    }

    const result = await productService.createProduct(
      payload,
      req.user,
      req.imageUrls,
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
// Backend/controllers/product.controller.js

const updateProduct = async (req, res) => {
  try {
    const payload = { ...req.body };

    console.log("Payload nhận được từ FE (updateProduct):", { color: payload.color, size: payload.size });

    // Sửa lỗi boolean: nếu là chuỗi rỗng hoặc undefined, ép về false
    if (
      payload.is_bulky === "" ||
      payload.is_bulky === undefined ||
      payload.is_bulky === null
    ) {
      payload.is_bulky = false;
    } else {
      payload.is_bulky =
        payload.is_bulky === "true" || payload.is_bulky === true;
    }

    // Parse variants
    if (typeof payload.variants === "string") {
      payload.variants = JSON.parse(payload.variants);
    }

    const result = await productService.updateProduct(
      req.params.id,
      payload,
      req.user,
      req.imageUrls || [],
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("LỖI:", error);
    res.status(400).json({ message: error.message });
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
// Kiểm tra ở cuối file của bạn, phải chắc chắn có 'updateProduct' ở đây:
module.exports = {
  createProduct,
  updateProduct, // Dòng này PHẢI CÓ
  deleteProduct,
  searchProducts,
  getProductDetail,
  setFlashSale,
  scheduleFlashSale,
  suggestFlashSale,
};
