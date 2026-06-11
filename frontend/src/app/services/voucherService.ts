// frontend/src/app/services/voucher.service.ts
import { apiRequest } from "./api";

export default {
  // =====================
  // USER VOUCHERS
  // =====================

  async getMyVouchers() {
    return apiRequest<any>('/vouchers/my-vouchers', { method: 'GET' });
  },

  /** Lấy danh sách voucher sàn public (dành cho tất cả, bao gồm guest) */
  async getPublicPlatformVouchers() {
    const token = localStorage.getItem("token");
    return apiRequest<any>('/vouchers/public', { method: 'GET' }, token);
  },

  // =====================
  // PLATFORM VOUCHERS (Admin)
  // =====================

  async getPlatformVouchers() {
    return apiRequest<any>('/vouchers/admin/platform', { method: 'GET' });
  },

  async createPlatformVoucher(data: any) {
    return apiRequest<any>('/vouchers/admin/platform', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePlatformVoucher(voucherId: string, data: any) {
    return apiRequest<any>(`/vouchers/admin/platform/${voucherId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async disablePlatformVoucher(voucherId: string) {
    return apiRequest<any>(`/vouchers/admin/platform/${voucherId}/disable`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  async enablePlatformVoucher(voucherId: string) {
    return apiRequest<any>(`/vouchers/admin/platform/${voucherId}/enable`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  // =====================
  // SHOP VOUCHERS
  // =====================

  /** Lấy voucher của shop đang đăng nhập (dùng trong VoucherManagementPage) */
  async getMyShopVouchers() {
    return apiRequest<any>('/vouchers/shop/my', { method: 'GET' });
  },

  /** Lấy voucher của shop bất kỳ theo storeId (dùng khi customer xem shop) */
  async getShopVouchersByStore(storeId: string) {
    return apiRequest<any>(`/vouchers/shop/${storeId}`, { method: 'GET' });
  },

  async createShopVoucher(data: any) {
    return apiRequest<any>('/vouchers/shop', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateShopVoucher(voucherId: string, data: any) {
    return apiRequest<any>(`/vouchers/shop/${voucherId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async disableShopVoucher(voucherId: string) {
    return apiRequest<any>(`/vouchers/shop/${voucherId}/disable`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  async enableShopVoucher(voucherId: string) {
    return apiRequest<any>(`/vouchers/shop/${voucherId}/enable`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  // =====================
  // CHECKOUT
  // =====================

  // ====================== CLAIM VOUCHER ======================
  async claimVoucher(code: string) {
    return apiRequest<any>('/vouchers/claim', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  // Nếu bạn có hàm saveVoucher thì giữ lại, còn không thì dùng claimVoucher
  async saveVoucher(voucherId: string) {
    return apiRequest<any>('/vouchers/save', {
      method: 'POST',
      body: JSON.stringify({ voucher_id: voucherId }),
    });
  },

  async validateVoucher(data: {
    shop_voucher_id?: string | null;
    platform_voucher_id?: string | null;
    subtotal: number;
    shipping_fee?: number;
  }) {
    return apiRequest<any>('/vouchers/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
