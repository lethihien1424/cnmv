// D:\CongNgheMoi-hien\CongNgheMoi\frontend\src\app\services\cartService.ts
import { apiRequest } from "./api";

export type CartDetail = {
  id: string;
  product_id: string;
  quantity: number;
  size?: string | null;
  color?: string | null;
  product?: {
    id: string;
    name: string;
    price: number;
    images?: string[];
    image_url?: string;
    is_flash_sale?: boolean;
    flash_sale_price?: number;
    flash_sale_stock?: number;
    flash_sale_sold?: number;
    flash_sale_start_time?: string;
    flash_sale_end_time?: string;
  };
};

export const cartAPI = {
  // GET /api/cart/
  getCart: async (): Promise<CartDetail[]> => {
    const data = await apiRequest<CartDetail[]>('/cart', { method: 'GET' });
    return Array.isArray(data) ? data : [];
  },

  // POST /api/cart/add
  addToCart: async (
    productId: string,
    quantity = 1,
    size?: string | null,
    color?: string | null
  ) => {
    return apiRequest('/cart/add', {
      method: "POST",
      body: JSON.stringify({
        product_id: productId,
        quantity,
        size: size ?? null,
        color: color ?? null,
      }),
    });
  },

  // PUT /api/cart/update
  updateQuantity: async (
    productId: string,
    quantity: number,
    size?: string | null,
    color?: string | null
  ) => {
    return apiRequest('/cart/update', {
      method: "PUT",
      body: JSON.stringify({
        product_id: productId,
        quantity,
        size: size ?? null,
        color: color ?? null,
      }),
    });
  },

  // Xóa item: dùng update quantity = 0, truyền đủ size + color để backend xác định đúng dòng
  removeItem: async (
    productId: string,
    size?: string | null,
    color?: string | null
  ) => {
    return cartAPI.updateQuantity(productId, 0, size ?? null, color ?? null);
  },
};

/** Broadcast cho toàn app biết giỏ hàng đã thay đổi */
export const emitCartUpdated = () =>
  window.dispatchEvent(new Event("cartUpdated"));
