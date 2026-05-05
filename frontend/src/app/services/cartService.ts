// D:\CongNgheMoi-hien\CongNgheMoi\frontend\src\app\services\cartService.ts
import { API_BASE_URL } from "./api";

export type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
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
  getCart: async (): Promise<CartItem[]> => {
    const res = await fetch(`${API_BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("Không tải được giỏ hàng");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // POST /api/cart/add
  addToCart: async (productId: string, quantity = 1, variant?: object) => {
    const res = await fetch(`${API_BASE_URL}/cart/add`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ product_id: productId, quantity, variant }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || "Không thêm được vào giỏ hàng");
    }
    return res.json();
  },

  // PUT /api/cart/update
  updateQuantity: async (productId: string, quantity: number) => {
    const res = await fetch(`${API_BASE_URL}/cart/update`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ product_id: productId, quantity }),
    });
    if (!res.ok) throw new Error("Không cập nhật được số lượng");
    return res.json();
  },

  // DELETE /api/cart/remove  (nếu backend chưa có thì dùng update quantity=0)
  removeItem: async (productId: string) => {
    const res = await fetch(`${API_BASE_URL}/cart/remove`, {
      method: "DELETE",
      headers: authHeaders(),
      body: JSON.stringify({ product_id: productId }),
    });
    // Nếu chưa có route remove, fallback về update quantity = 0
    if (res.status === 404) {
      return cartAPI.updateQuantity(productId, 0);
    }
    if (!res.ok) throw new Error("Không xóa được sản phẩm");
    return res.json();
  },
};

/** Broadcast cho toàn app biết giỏ hàng đã thay đổi */
export const emitCartUpdated = () =>
  window.dispatchEvent(new Event("cartUpdated"));