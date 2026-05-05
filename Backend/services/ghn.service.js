const axios = require("axios");

const GHN_URL = "https://online-gateway.ghn.vn/shiip/public-api";

const headers = {
  Token: process.env.GHN_TOKEN,
  ShopId: process.env.GHN_SHOP_ID,
  "Content-Type": "application/json",
};

//
// ===== 1. PROVINCES =====
//
const getProvinces = async () => {
  try {
    const res = await axios.get(
      `${GHN_URL}/master-data/province`,
      { headers }
    );
    return res.data.data;
  } catch (err) {
    console.log("GHN PROVINCE ERROR:", err.response?.data);
    throw new Error("Không lấy được tỉnh");
  }
};

//
// ===== 2. DISTRICTS (⚠️ phải POST) =====
//
const getDistricts = async (province_id) => {
  try {
    const res = await axios.post(
      `${GHN_URL}/master-data/district`,
      {
        province_id: Number(province_id),
      },
      { headers }
    );

    return res.data.data;
  } catch (err) {
    console.log("GHN DISTRICT ERROR:", err.response?.data);
    throw new Error("Không lấy được quận/huyện");
  }
};

//
// ===== 3. WARDS =====
//
const getWards = async (district_id) => {
  try {
    const res = await axios.get(
      `${GHN_URL}/master-data/ward`,
      {
        headers,
        params: {
          district_id,
        },
      }
    );

    return res.data.data;
  } catch (err) {
    console.log("GHN WARD ERROR:", err.response?.data);
    throw new Error("Không lấy được phường/xã");
  }
};

//
// ===== 4. SERVICE ID =====
//
const getServiceId = async (from_district, to_district) => {
  try {
    const res = await axios.post(
      `${GHN_URL}/v2/shipping-order/available-services`,
      {
        from_district,
        to_district,
      },
      { headers }
    );

    const service = res.data.data[0];
    if (!service) throw new Error("Không có service");

    return service.service_id;
  } catch (err) {
    console.log("GET SERVICE ERROR:", err.response?.data);
    throw new Error("Không lấy được service_id");
  }
};

//
// ===== 5. CALCULATE SHIPPING =====
//
const calculateShipping = async (
  from_district_id,
  to_district_id,
  to_ward_code
) => {
  try {
    const service_id = await getServiceId(
      from_district_id,
      to_district_id
    );

    const res = await axios.post(
      `${GHN_URL}/v2/shipping-order/fee`,
      {
        from_district_id,
        to_district_id,
        to_ward_code,
        service_id,

        weight: 200,
        length: 20,
        width: 20,
        height: 10,
      },
      { headers }
    );

    return res.data.data.total;
  } catch (err) {
    console.log("GHN ERROR:", err.response?.data);
    throw new Error("Không tính được phí ship GHN");
  }
};

//
// ===== EXPORT =====
//
module.exports = {
  getProvinces,
  getDistricts,
  getWards,
  calculateShipping,
};