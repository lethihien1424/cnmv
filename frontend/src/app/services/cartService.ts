// D:\CongNgheMoi-hien\CongNgheMoi\frontend\src\app\services\cartService.ts
import { API_BASE_URL } from "./api";

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
  };
};

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export const cartAPI = {
  // GET /api/cart/
  getCart: async (): Promise<CartDetail[]> => {
    const res = await fetch(`${API_BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("Không tải được giỏ hàng");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // POST /api/cart/add
  addToCart: async (
    productId: string,
    quantity = 1,
    size?: string | null,
    color?: string | null
  ) => {
    const res = await fetch(`${API_BASE_URL}/cart/add`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        product_id: productId,
        quantity,
        size: size ?? null,
        color: color ?? null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { message?: string }).message || "Không thêm được vào giỏ hàng"
      );
    }
    return res.json();
  },

  // PUT /api/cart/update
  updateQuantity: async (
    productId: string,
    quantity: number,
    size?: string | null,
    color?: string | null
  ) => {
    const res = await fetch(`${API_BASE_URL}/cart/update`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        product_id: productId,
        quantity,
        size: size ?? null,
        color: color ?? null,
      }),
    });
    if (!res.ok) throw new Error("Không cập nhật được số lượng");
    return res.json();
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