// frontend/src/app/services/voucher.service.ts
import axios from "axios";
import { API_BASE_URL } from "./api";

const getToken = () => localStorage.getItem("token");

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

export default {
  // =====================
  // USER VOUCHERS
  // =====================

  async getMyVouchers() {
    const res = await axios.get(
      `${API_BASE_URL}/vouchers/my-vouchers`,
      authConfig()
    );
    return res.data.data;
  },

  /** Lấy danh sách voucher sàn public (dành cho tất cả, để customer xem & lưu) */
  async getPublicPlatformVouchers() {
    const res = await axios.get(
      `${API_BASE_URL}/vouchers/public`,
      authConfig()
    );
    return res.data.data;
  },

  

  // =====================
  // PLATFORM VOUCHERS (Admin)
  // =====================

  async getPlatformVouchers() {
    const res = await axios.get(
      `${API_BASE_URL}/vouchers/admin/platform`,
      authConfig()
    );
    return res.data.data;
  },

  async createPlatformVoucher(data: any) {
    const res = await axios.post(
      `${API_BASE_URL}/vouchers/admin/platform`,
      data,
      authConfig()
    );
    return res.data;
  },

  async updatePlatformVoucher(voucherId: string, data: any) {
    const res = await axios.put(
      `${API_BASE_URL}/vouchers/admin/platform/${voucherId}`,
      data,
      authConfig()
    );
    return res.data;
  },

  async disablePlatformVoucher(voucherId: string) {
    const res = await axios.patch(
      `${API_BASE_URL}/vouchers/admin/platform/${voucherId}/disable`,
      {},
      authConfig()
    );
    return res.data;
  },

  async enablePlatformVoucher(voucherId: string) {
    const res = await axios.patch(
      `${API_BASE_URL}/vouchers/admin/platform/${voucherId}/enable`,
      {},
      authConfig()
    );
    return res.data;
  },

  // =====================
  // SHOP VOUCHERS
  // =====================

  /** Lấy voucher của shop đang đăng nhập (dùng trong VoucherManagementPage) */
  async getMyShopVouchers() {
    const res = await axios.get(
      `${API_BASE_URL}/vouchers/shop/my`,
      authConfig()
    );
    return res.data.data;
  },

  /** Lấy voucher của shop bất kỳ theo storeId (dùng khi customer xem shop) */
  async getShopVouchersByStore(storeId: string) {
    const res = await axios.get(
      `${API_BASE_URL}/vouchers/shop/${storeId}`,
      authConfig()
    );
    return res.data.data;
  },

  async createShopVoucher(data: any) {
    const res = await axios.post(
      `${API_BASE_URL}/vouchers/shop`,
      data,
      authConfig()
    );
    return res.data;
  },

  async updateShopVoucher(voucherId: string, data: any) {
    const res = await axios.put(
      `${API_BASE_URL}/vouchers/shop/${voucherId}`,
      data,
      authConfig()
    );
    return res.data;
  },

  async disableShopVoucher(voucherId: string) {
    const res = await axios.patch(
      `${API_BASE_URL}/vouchers/shop/${voucherId}/disable`,
      {},
      authConfig()
    );
    return res.data;
  },

  async enableShopVoucher(voucherId: string) {
    const res = await axios.patch(
      `${API_BASE_URL}/vouchers/shop/${voucherId}/enable`,
      {},
      authConfig()
    );
    return res.data;
  },

  // =====================
  // CHECKOUT
  // =====================
// ====================== CLAIM VOUCHER ======================
async claimVoucher(code: string) {
  const response = await axios.post('/api/vouchers/claim', { code });
  return response.data;
},

// Nếu bạn có hàm saveVoucher thì giữ lại, còn không thì dùng claimVoucher
async saveVoucher(
  voucherId: string
) {

  const response =
    await axios.post(
      `${API_BASE_URL}/vouchers/save`,
      {
        voucher_id: voucherId
      },
      authConfig()
    );

  return response.data;
},
  async validateVoucher(data: {
    shop_voucher_id?: string | null;
    platform_voucher_id?: string | null;
    subtotal: number;
    shipping_fee?: number;
  }) {
    const res = await axios.post(
      `${API_BASE_URL}/vouchers/validate`,
      data,
      authConfig()
    );
    return res.data.data;
  },
  
};