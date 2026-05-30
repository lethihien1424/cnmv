import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { sendChatMessage, resetChat, type ChatMessage } from '../services/chatService';
import { cartAPI, emitCartUpdated } from '../services/cartService';
import { toast } from 'sonner';
import { MessageCircle, X, Send, RotateCcw, Bot, User } from 'lucide-react';
import { router } from '../routes';

export default function ChatWidget() {
  const { isChatOpen, closeChat } = useChat();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isChatOpen]);

  // Show welcome message when chat first opens
  useEffect(() => {
    if (isChatOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content:
            'Xin chào! 👋 Tôi là trợ lý hỗ trợ khách hàng của ShopHub. Tôi có thể giúp bạn:\n\n• 📦 Tra cứu trạng thái đơn hàng\n• 💰 Thông tin hỗ trợ và điều khoản \n• 🔍 Tìm kiếm sản phẩm\n• \n\nBạn cần hỗ trợ gì?',
          timestamp: new Date(),
        },
      ]);
    }
  }, [isChatOpen, messages.length]);

  // 🌟 Listen for 'clear-chat' event (dispatched on logout) to reset chat state
  useEffect(() => {
    const handleClearChat = () => {
      setMessages([]);
      closeChat();
    };

    window.addEventListener('clear-chat', handleClearChat);
    return () => window.removeEventListener('clear-chat', handleClearChat);
  }, [closeChat]);

  // 🌟 Also reset when user changes (e.g. logout sets user to null)
  useEffect(() => {
    if (!user) {
      setMessages([]);
    }
  }, [user]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(trimmed);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Handle AI Agent auto-add-to-cart and checkout
      if (response.action === 'REDIRECT_CHECKOUT' && response.actionData) {
        const { productId, quantity, size, color } = response.actionData;
        console.log('[ChatWidget] REDIRECT_CHECKOUT actionData:', { productId, quantity, size, color });

        if (!productId) {
          console.error('[ChatWidget] Missing productId in actionData:', response.actionData);
          toast.error('Không tìm thấy thông tin sản phẩm để thêm vào giỏ hàng');
        } else {
          // UUID validation — block hallucinated IDs from AI
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(productId)) {
            console.error('[ChatWidget] BLOCKED hallucinated productId:', productId);
            // Show helpful message in chat instead of crashing
            setMessages(prev => [...prev, {
              id: `system-${Date.now()}`,
              role: 'assistant',
              content: 'Xin lỗi, tôi chưa xác định được chính xác sản phẩm này. Bạn có thể nói rõ hơn tên sản phẩm muốn mua để tôi tìm lại nhé! 🔍',
              timestamp: new Date(),
            }]);
            return; // Stop here — do NOT call cartAPI
          }

          try {
            // Call cart API to add product to cart
            await cartAPI.addToCart(
              productId,
              quantity || 1,
              size ?? null,
              color ?? null,
            );
            // Emit event so cart badge/header updates
            emitCartUpdated();
            toast.success('Đã thêm sản phẩm vào giỏ hàng! 🛒');
          } catch (cartErr: any) {
            console.error('[ChatWidget] Cart add error:', cartErr);
            toast.error(cartErr.message || 'Không thể thêm vào giỏ hàng');
          }

          closeChat();
          // Small delay so user sees the AI reply + toast before redirect
          setTimeout(() => {
            router.navigate('/cart');
          }, 1500);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetChat();
      setMessages([]);
      // Re-show welcome
      setMessages([
        {
          id: 'welcome-reset',
          role: 'assistant',
          content:
            'Đã xóa lịch sử trò chuyện. Bạn cần hỗ trợ gì? 😊',
          timestamp: new Date(),
        },
      ]);
    } catch {
      // Silent fail
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 🌟 Safety net: Strip any leaked <function> tags from AI responses
  // Backend already catches these, but this is defense-in-depth
  const cleanMessage = (text: string): string => {
    return text.replace(/<function\b[^>]*>[\s\S]*?<\/function>/gi, '').trim();
  };

  if (!isChatOpen) return null;

  // Not logged in
  if (!user) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        <ChatHeader onClose={closeChat} onReset={() => {}} />
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <MessageCircle className="size-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              Vui lòng đăng nhập để sử dụng tính năng hỗ trợ trực tuyến.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <ChatHeader onClose={closeChat} onReset={handleReset} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="size-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="size-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-md whitespace-pre-line'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm chat-markdown'
              }`}
            >
              {msg.role === 'assistant' ? (
                <ReactMarkdown
                  components={{
                    img: ({ node, ...props }) => (
                      <img
                        {...props}
                        className="rounded-lg max-w-full max-h-[200px] h-auto my-2 border border-gray-100 object-cover"
                        loading="lazy"
                        alt={props.alt || 'Sản phẩm'}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ),
                    a: ({ node, ...props }) => {
                      const href = props.href || '';
                      const isInternal = href.startsWith('/');
                      return (
                        <a
                          {...props}
                          className="text-cyan-600 hover:text-cyan-700 underline font-medium cursor-pointer"
                          onClick={(e) => {
                            if (isInternal) {
                              e.preventDefault();
                              closeChat();
                              router.navigate(href);
                            }
                          }}
                          target={isInternal ? undefined : '_blank'}
                          rel={isInternal ? undefined : 'noopener noreferrer'}
                        />
                      );
                    },
                    p: ({ node, ...props }) => (
                      <p {...props} className="mb-1 last:mb-0" />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong {...props} className="font-semibold text-gray-900" />
                    ),
                  }}
                >
                  {cleanMessage(msg.content)}
                </ReactMarkdown>
              ) : (
                <span className="whitespace-pre-line">{msg.content}</span>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="size-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mt-1">
                <User className="size-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="size-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="size-4 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="size-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="size-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="size-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn..."
            disabled={isLoading}
            className="flex-1 h-10 px-4 rounded-full border border-gray-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-sm disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="size-10 rounded-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Header Sub-component ───────────────────────────────────────────────────

function ChatHeader({
  onClose,
  onReset,
}: {
  onClose: () => void;
  onReset: () => void;
}) {
  return (
    <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="size-5" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Hỗ trợ khách hàng</h3>
          <p className="text-xs text-white/80">Trực tuyến • Phản hồi ngay</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onReset}
          title="Xóa lịch sử"
          className="size-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <RotateCcw className="size-4" />
        </button>
        <button
          onClick={onClose}
          title="Đóng"
          className="size-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
