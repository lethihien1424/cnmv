// services/shipping.service.js
const { Address } = require("../models");

const normalizeProvince = (name) => {
  if (!name) return "";
  return name.toLowerCase()
    .replace(/tp\.?\s*/g, "")
    .replace(/thành phố/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const REGIONS = {
  NORTH: ["hà nội", "hà giang", "cao bằng", "bắc kạn", "tuyên quang", "lào cai", "điện biên", "lai châu", "sơn la", "yên bái", "hoà bình", "thái nguyên", "lạng sơn", "quảng ninh", "bắc giang", "phú thọ", "vĩnh phúc", "bắc ninh", "hải dương", "hải phòng", "hưng yên", "thái bình", "hà nam", "nam định", "ninh bình"],
  CENTRAL: ["thanh hóa", "nghệ an", "hà tĩnh", "quảng bình", "quảng trị", "thừa thiên huế", "đà nẵng", "quảng nam", "quảng ngãi", "bình định", "phú yên", "khánh hòa", "ninh thuận", "bình thuận", "kon tum", "gia lai", "đắk lắk", "đắk nông", "lâm đồng"],
  SOUTH: ["bình phước", "tây ninh", "bình dương", "đồng nai", "bà rịa - vũng tàu", "hồ chí minh", "long an", "tiền giang", "bến tre", "trà vinh", "vĩnh long", "đồng tháp", "an giang", "kiên giang", "cần thơ", "hậu giang", "sóc trăng", "bạc liêu", "cà mau", "hcm"]
};

const getRegion = (province) => {
  const p = normalizeProvince(province);
  if (REGIONS.NORTH.some(x => p.includes(x))) return "NORTH";
  if (REGIONS.CENTRAL.some(x => p.includes(x))) return "CENTRAL";
  if (REGIONS.SOUTH.some(x => p.includes(x))) return "SOUTH";
  return null;
};

const calculateShippingFee = async (userId, addressId, serviceType = 2, shippingProvider = 'GHN') => {
  try {
    if (!addressId) {
      throw new Error("Vui lòng chọn địa chỉ để tính phí vận chuyển");
    }
    const address = await Address.findByPk(addressId);
    if (!address || String(address.user_id) !== String(userId)) {
      throw new Error("Địa chỉ không hợp lệ hoặc không thuộc về người dùng");
    }

    const shopProvinceRaw = process.env.GHN_FROM_PROVINCE_NAME || "TP. HCM";
    const shopProvince = normalizeProvince(shopProvinceRaw);
    const userProvince = normalizeProvince(address.province);

    const isSameProvince = shopProvince === userProvince ||
      (shopProvince.includes("hcm") && userProvince.includes("hcm")) ||
      (shopProvince.includes("hà nội") && userProvince.includes("hà nội"));

    // Hỏa tốc (Express) chỉ áp dụng nội tỉnh
    if (serviceType === 1) {
      if (isSameProvince) {
        return {
          success: true,
          shippingFee: 20000,
          serviceType: 1,
          serviceName: "Hỏa tốc",
          estimatedDelivery: "Trong ngày",
          address
        };
      } else {
        throw new Error("Dịch vụ hỏa tốc chỉ áp dụng cho đơn hàng cùng tỉnh/thành phố");
      }
    }

    // Giao hàng tiêu chuẩn
    if (isSameProvince) {
      return {
        success: true,
        shippingFee: 0, // Miễn phí nội tỉnh
        serviceType: 2,
        serviceName: "Tiêu chuẩn",
        estimatedDelivery: "2-3 ngày",
        address
      };
    }

    const shopRegion = getRegion(shopProvince);
    const userRegion = getRegion(userProvince);

    let shippingFee = 30000; // Mặc định khác tỉnh cùng miền
    if (shopRegion && userRegion && shopRegion !== userRegion) {
      // Khác miền
      shippingFee = shippingProvider === 'J&T' ? 60000 : 50000;
    }

    return {
      success: true,
      shippingFee,
      serviceType: 2,
      serviceName: shippingProvider === 'J&T' ? "J&T Express" : "Giao Hàng Nhanh",
      estimatedDelivery: "3-5 ngày",
      address
    };
  } catch (error) {
    console.error("Calculate Shipping Fee Error:", error);
    return { success: false, message: error.message };
  }
};

module.exports = { calculateShippingFee };