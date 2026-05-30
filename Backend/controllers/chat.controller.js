// Backend/controllers/chat.controller.js
//
// API controller for the Customer Support AI Agent.
// Requires authentication (verifyToken middleware).

const chatService = require("../services/chat.service");

// POST /api/chat
const CHAT_TIMEOUT_MS = 30000; // 15 seconds max wait

const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id; // From JWT token (verifyToken middleware)
    const { message } = req.body;

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập nội dung tin nhắn.",
      });
    }

    // Limit message length to prevent abuse
    const trimmedMessage = message.trim().substring(0, 2000);

    // Race between AI response and 15s timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), CHAT_TIMEOUT_MS),
    );

    const aiPromise = chatService.chat(userId, trimmedMessage);
    const result = await Promise.race([aiPromise, timeoutPromise]);

    const responseData = {
      success: true,
      data: {
        reply: result.reply,
        conversationId: result.conversationId,
      },
    };

    // Pass through action data if AI triggered addToCartAndCheckout
    if (result.action) {
      responseData.data.action = result.action;
      responseData.data.actionData = result.data;
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("[ChatController] Error:", error.message);

    // Timeout — frontend gets immediate 504
    if (error.message === "REQUEST_TIMEOUT") {
      return res.status(504).json({
        success: false,
        reply:
          "Hệ thống AI đang phản hồi hơi chậm, bạn vui lòng gửi lại câu hỏi nhé.",
        error: "TIMEOUT",
      });
    }

    // Rate limit (429) — frontend gets immediate 429
    const isRateLimit =
      error.message?.includes("429") ||
      error.message?.includes("Too Many Requests") ||
      error.message?.includes("quota");

    if (isRateLimit) {
      return res.status(429).json({
        success: false,
        reply:
          "Xin lỗi, hiện tại hệ thống đang hỗ trợ quá nhiều khách hàng. Bạn vui lòng thử lại sau 1-2 phút nhé!",
        error: "RATE_LIMIT",
      });
    }

    // Other errors — frontend gets 500
    return res.status(500).json({
      success: false,
      reply: "Đã xảy ra lỗi kết nối, vui lòng thử lại sau.",
      error: "SERVER_ERROR",
    });
  }
};

// POST /api/chat/reset
const resetConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = chatService.resetConversation(userId);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("[ChatController] Reset error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa lịch sử trò chuyện.",
    });
  }
};

module.exports = {
  sendMessage,
  resetConversation,
};
