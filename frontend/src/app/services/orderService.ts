// frontend/src/app/services/orderService.ts
import { apiRequest } from "./api";

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

export const orderAPI = {
    getMyWallet: async (): Promise<{
    wallet: Wallet;
    transactions: WalletTransaction[];
  }> => {
    return apiRequest<{ wallet: Wallet; transactions: WalletTransaction[] }>(
      '/orders/my-wallet',
      { method: 'GET' }
    );
  },

  linkWalletBankAccount: async (payload: {
    bank_code: string;
    bank_name: string;
    bank_account_number: string;
    bank_account_holder: string;
  }): Promise<Wallet> => {
    return apiRequest<Wallet>('/orders/wallet/bank-account', {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  createWalletTopup: async (amount: number): Promise<WalletTopupResponse> => {
    return apiRequest<WalletTopupResponse>('/orders/wallet/topup', {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  },

  getWalletTopupStatus: async (
    transactionId: string
  ): Promise<WalletTransaction> => {
    return apiRequest<WalletTransaction>(
      `/orders/wallet/topup/${transactionId}/status`,
      { method: 'GET' }
    );
  },

  createWalletWithdraw: async (amount: number): Promise<WalletTransaction> => {
    return apiRequest<WalletTransaction>('/orders/wallet/withdraw', {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  },
  // STORE OWNER
  getStoreOrders: async (storeId: string): Promise<Order[]> => {
    const data = await apiRequest<Order[]>(`/orders/store/${storeId}`, { method: 'GET' });
    return Array.isArray(data) ? data : [];
  },

  updateStatus: async (orderId: string, status: string): Promise<Order> => {
    return apiRequest<Order>(`/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  cancelOrder: async (orderId: string): Promise<Order> => {
    return apiRequest<Order>(`/orders/${orderId}`, {
      method: "DELETE",
    });
  },

  cancelCustomerOrder: async (
    orderId: string,
    cancelReason = "CUSTOMER_CANCELLED",
  ): Promise<Order> => {
    return apiRequest<Order>(`/orders/${orderId}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({
        cancel_reason: cancelReason,
        cancelled_by: "CUSTOMER",
      }),
    });
  },

  getSepayPaymentStatus: async (
    paymentId: string,
  ): Promise<SepayPaymentStatus> => {
    return apiRequest<SepayPaymentStatus>(`/payment/sepay/${paymentId}/status`, {
      method: 'GET',
    });
  },

  // CUSTOMER
  getMyOrders: async (): Promise<Order[]> => {
    const data = await apiRequest<Order[]>('/orders/my-orders', { method: 'GET' });
    return Array.isArray(data) ? data : [];
  },
};
