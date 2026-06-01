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

export type SepayPaymentStatus = {
  payment_id: string;
  order_id: string;
  payment_status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  paid_at?: string | null;
  transaction_id?: string | null;
  sender_name?: string | null;
  sender_bank_name?: string | null;
  sender_account_number?: string | null;
  receiver_name?: string | null;
  receiver_bank_name?: string | null;
  receiver_account_number?: string | null;
  order?: {
    id: string;
    payment_status: string;
    order_status: string;
    total_amount: number;
  } | null;
};
export type WalletTransaction = {
  id: string;
  wallet_id: string;
  type: "REFUND" | "TOPUP" | "PAYMENT" | "WITHDRAW";
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  order_id?: string | null;
  description?: string | null;
  transfer_content?: string | null;
  qr_url?: string | null;
  expires_at?: string | null;
  paid_at?: string | null;
  createdAt?: string;
  created_at?: string;
};

export type Wallet = {
  id: string;
  user_id: string;
  balance: number;
  bank_code?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_holder?: string | null;
};

export type WalletTopupResponse = {
  transaction_id: string;
  amount: number;
  status: string;
  transfer_content: string;
  qr_url: string;
  expires_at?: string;
  receiver_name?: string | null;
  receiver_bank_name?: string | null;
  receiver_account_number?: string | null;
};
const getToken = () => localStorage.getItem("token");

export const orderAPI = {
    getMyWallet: async (): Promise<{
    wallet: Wallet;
    transactions: WalletTransaction[];
  }> => {
    const res = await fetch(`${API_BASE_URL}/orders/my-wallet`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || "Không tải được ví");
    }

    return json.data;
  },

  linkWalletBankAccount: async (payload: {
    bank_code: string;
    bank_name: string;
    bank_account_number: string;
    bank_account_holder: string;
  }): Promise<Wallet> => {
    const res = await fetch(`${API_BASE_URL}/orders/wallet/bank-account`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || "Liên kết tài khoản ngân hàng thất bại");
    }

    return json.data;
  },

  createWalletTopup: async (amount: number): Promise<WalletTopupResponse> => {
    const res = await fetch(`${API_BASE_URL}/orders/wallet/topup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ amount }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || "Tạo mã QR nạp ví thất bại");
    }

    return json.data;
  },

  getWalletTopupStatus: async (
    transactionId: string
  ): Promise<WalletTransaction> => {
    const res = await fetch(
      `${API_BASE_URL}/orders/wallet/topup/${transactionId}/status`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
      }
    );

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || "Không tải được trạng thái nạp ví");
    }

    return json.data;
  },

  createWalletWithdraw: async (amount: number): Promise<WalletTransaction> => {
    const res = await fetch(`${API_BASE_URL}/orders/wallet/withdraw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ amount }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || "Rút tiền thất bại");
    }

    return json.data;
  },
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

  cancelCustomerOrder: async (
    orderId: string,
    cancelReason = "CUSTOMER_CANCELLED",
  ): Promise<Order> => {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        cancel_reason: cancelReason,
        cancelled_by: "CUSTOMER",
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Huy don that bai");
    }
    const json = await res.json();
    return json.data;
  },

  getSepayPaymentStatus: async (
    paymentId: string,
  ): Promise<SepayPaymentStatus> => {
    const res = await fetch(`${API_BASE_URL}/payment/sepay/${paymentId}/status`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Khong tai duoc trang thai thanh toan");
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
