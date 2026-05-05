import React from 'react';
import { Button } from './ui/button';
import { X, Store } from 'lucide-react';

interface C2CActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: () => void;
}

export default function C2CActivationModal({ isOpen, onClose, onActivate }: C2CActivationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="size-6" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="size-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
            <Store className="size-8 text-white" />
          </div>

          <h2 className="text-2xl mb-3">Kích hoạt Shop C2C</h2>
          
          <p className="text-gray-600 mb-6">
            Trở thành người bán và bắt đầu kinh doanh ngay hôm nay!
          </p>

          <div className="w-full mb-4">
            <label className="block text-sm mb-2 text-left">
              Tên của hàng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Shop đồ handmade của tôi"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div className="w-full mb-6">
            <label className="block text-sm mb-2 text-left">Mô tả của hàng</label>
            <textarea
              placeholder="VD: Chuyên bán đồ handmade, đồ cũ chất lượng..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-600 focus:outline-none resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Mô tả ngắn gọn về cửa hàng và sản phẩm của bạn
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 w-full">
            <p className="text-sm text-blue-800">
              <strong>Lưu ý:</strong> Cửa hàng C2C sẽ được tự động kích hoạt ngay sau khi tạo. 
              Bạn có thể bắt đầu bán hàng ngay lập tức!
            </p>
          </div>

          <div className="flex gap-3 w-full">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 h-12"
            >
              Hủy
            </Button>
            <Button
              onClick={onActivate}
              className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              Kích hoạt ngay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
