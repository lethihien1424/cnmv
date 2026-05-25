// frontend/src/app/services/orderService.ts
import { API_BASE_URL } from "./api";

export type OrderDetail = {
  id: string;
  product_id: string;
  quantity: number;
  price_at_buy: number;
  size?: string | null;
  color?: string | null;
  product?: {
    id: string;
    name: string;
    images?: string[];
    is_bulky?: boolean; // ← thêm
  };
  
};

export type Order = {
  id: string;
  buyer_id: string;
  store_id: string;
  total_amount: number;
  shipping_fee: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  shipping_address: string;
  distance_km?: number;
estimated_delivery_time?: string;
  // Sequelize underscored:true → toJSON() trả camelCase
  createdAt?: string;
  updatedAt?: string;
  // Fallback snake_case
  created_at?: string;
  updated_at?: string;
  is_reviewed?: boolean;
  items: OrderDetail[];
};

const getToken = () => localStorage.getItem("token");

export const orderAPI = {
  // STORE OWNER
  getStoreOrders: async (storeId: string): Promise<Order[]> => {
    const res = await fetch(`${API_BASE_URL}/orders/store/${storeId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("Không tải được đơn hàng");
    const json = await res.json();
    return json.data || [];
  },

  updateStatus: async (orderId: string, status: string): Promise<Order> => {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Cập nhật thất bại");
    }
    const json = await res.json();
    return json.data;
  },

  cancelOrder: async (orderId: string): Promise<Order> => {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Hủy đơn thất bại");
    }
    const json = await res.json();
    return json.data;
  },

  // CUSTOMER
  getMyOrders: async (): Promise<Order[]> => {
    const res = await fetch(`${API_BASE_URL}/orders/my-orders`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("Không tải được đơn hàng");
    const json = await res.json();
    return json.data || [];
  },
};