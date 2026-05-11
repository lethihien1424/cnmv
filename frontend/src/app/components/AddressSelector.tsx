import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { addressService, UserAddress } from '../services/addressService';
import { ghnService, GHNProvince, GHNDistrict, GHNWard } from '../services/ghnService';
import { MapPin, Plus, CheckCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface AddressSelectorProps {
  selectedId: string | null;
  onSelect: (addressId: string, addressObj?: UserAddress) => void;
}

const AddressSelector: React.FC<AddressSelectorProps> = ({ selectedId, onSelect }) => {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);

  // Form state
  const [provinces, setProvinces] = useState<GHNProvince[]>([]);
  const [districts, setDistricts] = useState<GHNDistrict[]>([]);
  const [wards, setWards] = useState<GHNWard[]>([]);
  
  const [formData, setFormData] = useState({
    recipient_name: '',
    phone: '',
    province_id: 0,
    province_name: '',
    district_id: 0,
    district_name: '',
    ward_code: '',
    ward_name: '',
    detail: '',
    is_default: false
  });

  useEffect(() => {
    loadAddresses();
    loadProvinces();
  }, []);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await addressService.getAddresses();
      console.log("📍 Loaded addresses:", data);
      setAddresses(data || []);
      
      // Tự động chọn địa chỉ nếu chưa có cái nào được chọn
      if (!selectedId && data && data.length > 0) {
        const defaultAddr = data.find(a => a.is_default) || data[0];
        onSelect(defaultAddr.id, defaultAddr);
      }
    } catch (err) {
      console.error('Failed to load addresses', err);
      toast.error("Không thể tải danh sách địa chỉ");
    } finally {
      setLoading(false);
    }
  };

  const loadProvinces = async () => {
    try {
      const data = await ghnService.getProvinces();
      setProvinces(data);
    } catch (err) {
      console.error('Failed to load provinces', err);
    }
  };

  const handleProvinceChange = async (id: string) => {
    const provinceId = parseInt(id);
    const province = provinces.find(p => p.ProvinceID === provinceId);
    setFormData(prev => ({ 
      ...prev, 
      province_id: provinceId, 
      province_name: province?.ProvinceName || '',
      district_id: 0,
      ward_code: ''
    }));
    setWards([]);
    try {
      const data = await ghnService.getDistricts(provinceId);
      setDistricts(data);
    } catch (err) {
      console.error('Failed to load districts', err);
    }
  };

  const handleDistrictChange = async (id: string) => {
    const districtId = parseInt(id);
    const district = districts.find(d => d.DistrictID === districtId);
    setFormData(prev => ({ 
      ...prev, 
      district_id: districtId, 
      district_name: district?.DistrictName || '',
      ward_code: ''
    }));
    try {
      const data = await ghnService.getWards(districtId);
      setWards(data);
    } catch (err) {
      console.error('Failed to load wards', err);
    }
  };

  const handleWardChange = (code: string) => {
    const ward = wards.find(w => w.WardCode === code);
    setFormData(prev => ({ 
      ...prev, 
      ward_code: code, 
      ward_name: ward?.WardName || '' 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addressService.createAddress({
        recipient_name: formData.recipient_name,
        phone: formData.phone,
        province: formData.province_name,
        district: formData.district_name,
        ward: formData.ward_name,
        detail: formData.detail,
        is_default: formData.is_default,
        province_id: formData.province_id,
        district_id: formData.district_id,
        ward_code: formData.ward_code
      });
      toast.success('Thêm địa chỉ thành công');
      setIsModalOpen(false);
      loadAddresses();
      // Reset form
      setFormData({
        recipient_name: '',
        phone: '',
        province_id: 0,
        province_name: '',
        district_id: 0,
        district_name: '',
        ward_code: '',
        ward_name: '',
        detail: '',
        is_default: false
      });
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thêm địa chỉ');
    } finally {
      setSubmitting(false);
    }
  };

  const currentAddress = addresses.find(a => a.id === selectedId);

  if (loading && addresses.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <Loader2 className="size-6 text-cyan-600 animate-spin mr-2" />
        <span className="text-gray-500 font-medium">Đang tải địa chỉ...</span>
      </div>
    );
  }

  // Chế độ xem rút gọn (chỉ hiện địa chỉ đang chọn)
  if (!isChoosing && currentAddress) {
    return (
      <div className="p-4 border rounded-xl bg-cyan-50/30 border-cyan-100 flex items-start justify-between group">
        <div className="flex items-start gap-3">
          <MapPin className="mt-1 size-5 text-cyan-600" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{currentAddress.recipient_name}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">{currentAddress.phone}</span>
              {currentAddress.is_default && (
                <Badge variant="outline" className="text-[10px] uppercase border-cyan-600 text-cyan-600 bg-cyan-50">Mặc định</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              {currentAddress.detail}, {currentAddress.ward}, {currentAddress.district}, {currentAddress.province}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsChoosing(true)}
          className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-100/50 font-semibold h-8"
        >
          Thay đổi
        </Button>
      </div>
    );
  }

  // Chế độ chọn địa chỉ (hiện danh sách)
  return (
    <div className="space-y-4">
      {addresses.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {addresses.map((addr) => (
            <div 
              key={addr.id}
              onClick={() => {
                onSelect(addr.id, addr);
                setIsChoosing(false);
              }}
              className={`relative p-4 border rounded-xl cursor-pointer transition-all ${
                selectedId === addr.id 
                  ? 'border-cyan-500 bg-cyan-50/50 ring-1 ring-cyan-500' 
                  : 'hover:border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <MapPin className={`mt-1 size-5 ${selectedId === addr.id ? 'text-cyan-600' : 'text-gray-400'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{addr.recipient_name}</span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-600">{addr.phone}</span>
                      {addr.is_default && (
                        <Badge variant="outline" className="text-[10px] uppercase border-cyan-600 text-cyan-600 bg-cyan-50">Mặc định</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {addr.detail}, {addr.ward}, {addr.district}, {addr.province}
                    </p>
                  </div>
                </div>
                {selectedId === addr.id && (
                  <CheckCircle className="size-5 text-cyan-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500 text-sm">Bạn chưa có địa chỉ nào.</p>
        </div>
      )}

      <div className="flex gap-2">
        {currentAddress && (
          <Button 
            variant="outline" 
            className="flex-1 h-12 border-gray-200 text-gray-600 hover:bg-gray-50"
            onClick={() => setIsChoosing(false)}
          >
            Hủy bỏ
          </Button>
        )}
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className={`h-12 border-dashed gap-2 text-gray-600 hover:text-cyan-600 hover:border-cyan-600 hover:bg-cyan-50 ${!currentAddress ? 'w-full' : 'flex-1'}`}
            >
              <Plus className="size-4" />
              Thêm địa chỉ mới
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Địa chỉ nhận hàng mới</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Họ và tên người nhận</Label>
                  <Input 
                    required 
                    value={formData.recipient_name}
                    onChange={e => setFormData({...formData, recipient_name: e.target.value})}
                    placeholder="Nhập họ tên" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input 
                    required 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="Nhập số điện thoại" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tỉnh/Thành phố</Label>
                <Select onValueChange={handleProvinceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn Tỉnh/Thành phố" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map(p => (
                      <SelectItem key={p.ProvinceID} value={p.ProvinceID.toString()}>
                        {p.ProvinceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quận/Huyện</Label>
                  <Select disabled={!formData.province_id} onValueChange={handleDistrictChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn Quận/Huyện" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map(d => (
                        <SelectItem key={d.DistrictID} value={d.DistrictID.toString()}>
                          {d.DistrictName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phường/Xã</Label>
                  <Select disabled={!formData.district_id} onValueChange={handleWardChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn Phường/Xã" />
                    </SelectTrigger>
                    <SelectContent>
                      {wards.map(w => (
                        <SelectItem key={w.WardCode} value={w.WardCode}>
                          {w.WardName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Địa chỉ cụ thể</Label>
                <Input 
                  required 
                  value={formData.detail}
                  onChange={e => setFormData({...formData, detail: e.target.value})}
                  placeholder="Số nhà, tên đường..." 
                />
              </div>

              <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
                <input 
                  type="checkbox" 
                  id="is_default" 
                  checked={formData.is_default}
                  onChange={e => setFormData({...formData, is_default: e.target.checked})}
                  className="size-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <label htmlFor="is_default" className="text-sm font-medium leading-none text-gray-700 cursor-pointer">
                  Đặt làm địa chỉ mặc định
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : 'Hoàn thành'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AddressSelector;
