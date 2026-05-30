import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { Store, Sparkles, MapPin } from 'lucide-react';

// Đảm bảo đường dẫn này chính xác với cấu trúc thư mục của bạn
import AddressDropdown from '../pages/AddressDropdown';

export default function C2CStoreActivation() {
  const navigate = useNavigate();
  const { user, activateC2CStore } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState(''); 
  const [policyAccepted, setPolicyAccepted] = useState(false);

  const hasC2CShop = Boolean(user?.hasC2CStore || user?.c2cStoreId || user?.storeName?.trim());

  if (!user || user.role !== 'customer' || hasC2CShop) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim()) {
      toast.error('Vui lòng nhập tên cửa hàng');
      return;
    }

    // Kiểm tra địa chỉ: Phải có giá trị từ AddressDropdown gửi về
    if (!address || address.trim() === "") {
      toast.error('Vui lòng chọn đầy đủ địa chỉ lấy hàng (Tỉnh/Huyện/Xã và Số nhà)');
      return;
    }

    if (!policyAccepted) {
      toast.error('Bạn cần đồng ý điều khoản phí và vận hành trước khi kích hoạt shop');
      return;
    }

    setIsLoading(true);
    try {
      // Gửi dữ liệu qua Context -> API Backend
      await activateC2CStore(storeName, description, {
        policyAccepted: true,
        address: address, // Truyền chuỗi địa chỉ đầy đủ
      });
      
      toast.success('Kích hoạt Shop thành công!');
      setIsOpen(false);
      navigate('/seller/onboarding');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kích hoạt thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md">
          <Sparkles className="size-4 mr-2" />
          Kích hoạt Shop C2C
        </Button>
      </DialogTrigger>
      
      {/* Thêm max-h và overflow để không bị tràn màn hình khi hiện Dropdown */}
      <DialogContent className="sm:max-w-xl max-h-[95vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="size-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <Store className="size-6 text-white" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Kích hoạt Shop C2C</DialogTitle>
            <DialogDescription className="text-center">
              Chỉ mất 1 phút để bắt đầu bán hàng trên hệ thống của chúng tôi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Tên cửa hàng */}
            <div className="space-y-2">
              <Label htmlFor="storeName" className="font-semibold">
                Tên cửa hàng <span className="text-red-500">*</span>
              </Label>
              <Input
                id="storeName"
                placeholder="VD: Shop Thời Trang GenZ"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
              />
            </div>

            {/* Địa chỉ lấy hàng - Tích hợp component chọn địa chỉ */}
            <div className="space-y-2">
              <Label className="font-semibold flex items-center gap-2">
                <MapPin className="size-4 text-purple-600" />
                Địa chỉ lấy hàng <span className="text-red-500">*</span>
              </Label>
              <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                <AddressDropdown onAddressChange={(fullAddress: string) => setAddress(fullAddress)} />
                <p className="text-[10px] text-purple-600 mt-2 italic">
                  * Địa chỉ này sẽ được dùng để đơn vị vận chuyển đến lấy hàng.
                </p>
              </div>
            </div>

            {/* Mô tả */}
            <div className="space-y-2">
              <Label htmlFor="description" className="font-semibold">Mô tả cửa hàng</Label>
              <Textarea
                id="description"
                placeholder="Mô tả ngắn về sản phẩm bạn định bán..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Điều khoản */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              <p><strong>Lưu ý:</strong> Shop C2C dành cho cá nhân kinh doanh nhỏ lẻ. Thông tin địa chỉ phải chính xác để đảm bảo quy trình lấy hàng không bị gián đoạn.</p>
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-purple-600"
                checked={policyAccepted}
                onChange={(e) => setPolicyAccepted(e.target.checked)}
              />
              <span>Tôi đồng ý với các điều khoản và phí dịch vụ của sàn.</span>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Đóng
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? 'Đang kích hoạt...' : 'Xác nhận kích hoạt'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}