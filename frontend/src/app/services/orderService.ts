import { API_BASE_URL } from "./api";

export type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price_at_buy: number;
  product?: {
    id: string;
    name: string;
    images?: string[];
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
  created_at: string;
  updated_at: string;
  items: OrderItem[];
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
