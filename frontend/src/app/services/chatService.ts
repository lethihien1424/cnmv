// Frontend/src/app/services/chatService.ts

const API_BASE_URL = '/api';
const CHAT_URL = `${API_BASE_URL}/chat`;

export interface ChatActionData {
  action: string;
  data?: {
    productId?: string;
    quantity?: number;
    size?: string | null;
    color?: string | null;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  success: boolean;
  reply: string;
  action?: string;
  actionData?: ChatActionData['data'];
}

// 1. Send message to AI agent (always returns, never throws)
export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  try {
    const token = localStorage.getItem('token');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, reply: "Bạn cần đăng nhập để sử dụng tính năng Chat nhé!" };
      }
      // Controller always provides `reply` field for error responses
      return { success: false, reply: data?.reply || "Hệ thống đang bận, vui lòng thử lại." };
    }

    // Controller returns { success: true, data: { reply, conversationId, action?, actionData? } }
    const reply = data?.data?.reply || data?.reply || "Không có phản hồi từ hệ thống.";
    const result: ChatResponse = { success: true, reply };

    // Pass through action data if AI triggered addToCartAndCheckout
    // Handle BOTH formats:
    //   1. Nested (standard): data.data.actionData = { productId, quantity, size, color }
    //   2. Flat (legacy):     data.data.productId, data.data.quantity, etc. directly
    if (data?.data?.action) {
      result.action = data.data.action;

      if (data.data.actionData && typeof data.data.actionData === 'object') {
        // Standard nested format
        result.actionData = {
          productId: data.data.actionData.productId,
          quantity: data.data.actionData.quantity,
          size: data.data.actionData.size ?? null,
          color: data.data.actionData.color ?? null,
        };
      } else if (data.data.productId) {
        // Legacy flat format — fields at top level of data
        result.actionData = {
          productId: data.data.productId,
          quantity: data.data.quantity,
          size: data.data.size ?? null,
          color: data.data.color ?? null,
        };
      }

      console.log('[ChatService] Action detected:', result.action, '| actionData:', result.actionData);
    }

    return result;

  } catch (error) {
    console.error("Lỗi khi gọi API Chat từ Frontend:", error);
    return { success: false, reply: "Mất kết nối đến máy chủ. Vui lòng kiểm tra lại mạng!" };
  }
};

// 2. Clear conversation history
export const resetChat = async (): Promise<ChatResponse> => {
  try {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${CHAT_URL}/reset`, {
      method: 'POST',
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return { success: false, reply: data?.message || "Không thể xóa lịch sử trò chuyện." };
    }

    return { success: true, reply: data?.message || "Đã xóa lịch sử trò chuyện." };
  } catch (error) {
    return { success: false, reply: "Không thể xóa lịch sử lúc này." };
  }
};
