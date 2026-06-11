import React, { useState, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { BACKEND_URL } from '../services/api';

type ChatSender = 'USER' | 'STORE';

interface ChatMessage {
  userId: string;
  storeId: string;
  message: string;
  sender: ChatSender;
  timestamp: string;
}

interface ChatBoxProps {
  userId: string;
  storeId: string;
  currentUserRole: ChatSender;
  onClose?: () => void;
  layout?: 'floating' | 'embedded';
}

export default function ChatBox({ userId, storeId, currentUserRole, onClose, layout = 'floating' }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(BACKEND_URL || window.location.origin, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    const handleHistory = (history: ChatMessage[]) => {
      setMessages(Array.isArray(history) ? history : []);
    };

    const handleReceive = (data: ChatMessage) => {
      setMessages((prev) => [...prev, data]);
      setChatError(null);
    };

    const handleChatError = (payload: { message?: string }) => {
      setChatError(payload?.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    };

    // 1. Tham gia phòng chat khi mở form
    socket.on('connect', () => {
      socket.emit('join_chat', { userId, storeId });
    });
    socket.on('chat_history', handleHistory);

    // 2. Lắng nghe tin nhắn mới từ người kia gửi tới
    socket.on('receive_message', handleReceive);
    socket.on('chat_error', handleChatError);

    // Cleanup khi đóng form chat
    return () => {
      socket.off('chat_history', handleHistory);
      socket.off('receive_message', handleReceive);
      socket.off('chat_error', handleChatError);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, storeId]);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const messageData = {
      userId,
      storeId,
      message: inputValue,
      sender: currentUserRole, 
      timestamp: new Date().toISOString(),
    };

    // Gửi tin nhắn qua Socket lên Server
    socketRef.current?.emit('send_message', messageData);

    setInputValue('');
    setChatError(null);
  };

  const containerClassName =
    layout === 'embedded'
      ? 'w-full h-[560px] bg-white border rounded-xl shadow-sm flex flex-col overflow-hidden'
      : 'fixed bottom-4 right-4 w-80 h-[450px] bg-white border rounded-t-xl rounded-bl-xl shadow-2xl flex flex-col z-50 overflow-hidden';

  return (
    <div className={containerClassName}>
      
      {/* Header Chat */}
      <div className="bg-red-600 text-white p-3 flex justify-between items-center shadow-md">
        <div className="font-bold">Chat với {currentUserRole === 'USER' ? 'Shop' : 'Khách hàng'}</div>
        {onClose && (
          <button onClick={onClose} className="hover:text-gray-200 font-bold">
            ✕
          </button>
        )}
      </div>

      {/* Khu vực hiển thị tin nhắn */}
      <div className="flex-1 p-3 overflow-y-auto bg-gray-50 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-10">
            Hãy gửi lời chào để bắt đầu cuộc trò chuyện!
          </div>
        )}
        
        {messages.map((msg, index) => {
          const isMe = msg.sender === currentUserRole;
          return (
            <div 
              key={index} 
              className={`max-w-[75%] p-2.5 text-sm rounded-lg ${
                isMe 
                  ? 'bg-red-500 text-white self-end rounded-br-none' 
                  : 'bg-gray-200 text-black self-start rounded-bl-none'
              }`}
            >
              {msg.message}
            </div>
          );
        })}
        {/* Điểm neo để cuộn xuống cuối */}
        <div ref={messagesEndRef} />
      </div>

      {/* Form nhập tin nhắn */}
      <form onSubmit={handleSendMessage} className="p-2 bg-white border-t flex gap-2">
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="flex-1 border rounded-full px-3 py-1.5 text-sm focus:outline-none focus:border-red-500"
        />
        <button 
          type="submit"
          disabled={!inputValue.trim()}
          className="bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          Gửi
        </button>
      </form>

      {chatError && (
        <div className="px-3 pb-2 text-xs text-red-600">{chatError}</div>
      )}
    </div>
  );
}