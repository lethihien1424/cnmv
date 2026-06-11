// Frontend/src/app/services/chatService.ts
import { apiRequest } from './api';

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
// Optional `context` carries page-level info (e.g. current productId) so the AI
// knows what product the user is looking at.
export interface ChatContext {
  productId?: string | null;
}

export const sendChatMessage = async (message: string, context?: ChatContext): Promise<ChatResponse> => {
  try {
    const payload: Record<string, unknown> = { message };
    if (context && context.productId) {
      payload.context = { productId: context.productId };
    }

    // apiRequest auto-unwraps the `data` field from the response
    const result = await apiRequest<any>('/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const reply = result?.reply || "Không có phản hồi từ hệ thống.";
    const chatResult: ChatResponse = { success: true, reply };

    // Pass through action data if AI triggered addToCartAndCheckout
    // Handle BOTH formats:
    //   1. Nested (standard): result.actionData = { productId, quantity, size, color }
    //   2. Flat (legacy):     result.productId, result.quantity, etc. directly
    if (result?.action) {
      chatResult.action = result.action;

      if (result.actionData && typeof result.actionData === 'object') {
        // Standard nested format
        chatResult.actionData = {
          productId: result.actionData.productId,
          quantity: result.actionData.quantity,
          size: result.actionData.size ?? null,
          color: result.actionData.color ?? null,
        };
      } else if (result.productId) {
        // Legacy flat format — fields at top level of result
        chatResult.actionData = {
          productId: result.productId,
          quantity: result.quantity,
          size: result.size ?? null,
          color: result.color ?? null,
        };
      }

      console.log('[ChatService] Action detected:', chatResult.action, '| actionData:', chatResult.actionData);
    }

    return chatResult;

  } catch (error: any) {
    // apiRequest throws on non-ok responses with error.response attached
    if (error?.response?.status === 401) {
      return { success: false, reply: "Bạn cần đăng nhập để sử dụng tính năng Chat nhé!" };
    }
    // Controller always provides `reply` field for error responses
    const errorReply = error?.response?.data?.reply || error?.response?.data?.message;
    if (errorReply) {
      return { success: false, reply: errorReply };
    }
    console.error("Lỗi khi gọi API Chat từ Frontend:", error);
    return { success: false, reply: "Mất kết nối đến máy chủ. Vui lòng kiểm tra lại mạng!" };
  }
};

// 2. Clear conversation history
export const resetChat = async (): Promise<ChatResponse> => {
  try {
    const result = await apiRequest<any>('/chat/reset', {
      method: 'POST',
    });

    return { success: true, reply: result?.message || "Đã xóa lịch sử trò chuyện." };
  } catch (error: any) {
    const errorMsg = error?.response?.data?.message || error?.message;
    return { success: false, reply: errorMsg || "Không thể xóa lịch sử lúc này." };
  }
};
