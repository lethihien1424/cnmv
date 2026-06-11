import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { apiRequest } from '../services/api';
import { ArrowLeft, User, Camera, ChevronRight, HelpCircle, MapPin } from 'lucide-react';
// 🌟 IMPORT ĐÚNG COMPONENT AddressSelector CÓ SẴN BẢN ĐỒ CỦA BẠN
import AddressSelector from '../components/AddressSelector';

export default function EditProfilePage() {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading]                 = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username:   '',             
    email:      '',             
    gender:     '',             
    dob:        '',             
    phone:      '',             
  });

  // Load hồ sơ
  useEffect(() => {
    if (!token) return;

    const fetchProfile = async () => {
      try {
        const u = await apiRequest<any>('/users/profile', { method: 'GET' }, token);

        const allAddresses: any[] = u.addresses || [];
        const defaultAddress = allAddresses.find((a: any) => a.is_default) || allAddresses[0] || null;

        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        }

        setFormData({
          username:   u.username || '',
          email:      u.email    || '',
          gender:     u.gender   || '',
          dob:        u.date_of_birth ? u.date_of_birth.split('T')[0] : '',
          phone:      u.phone || defaultAddress?.phone || '', 
        });
      } catch (err: any) {
        toast.error('Không thể tải thông tin hồ sơ');
      }
    };
    fetchProfile();
  }, [token]); 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Cập nhật thông tin lên Database
  const handleSubmit = async () => {
    setLoading(true);
    try {
      await apiRequest('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          username:      formData.username,
          email:         formData.email,
          gender:        formData.gender        || null,
          date_of_birth: formData.dob           || null,
          phone:         formData.phone,
          address_id:    selectedAddressId,
        }),
      }, token);

      updateUser({ username: formData.username });
      toast.success('Cập nhật hồ sơ và địa chỉ thành công!');
      navigate(-1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Lỗi khi cập nhật hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  if (!user) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="size-6" /></button>
          <h1 className="text-lg font-bold text-gray-900">Sửa hồ sơ</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="mb-4 border-gray-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-center flex-col gap-4">
              <div className="relative">
                <div className="size-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                  <User className="size-16 text-white" />
                </div>
                <button className="absolute bottom-0 right-0 size-8 bg-white rounded-full flex items-center justify-center border-2 border-gray-200 shadow-md">
                  <Camera className="size-4 text-gray-600" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🌟 GỌI COMPONENT CHỌN ĐỊA CHỈ & BẢN ĐỒ VÀO ĐÂY 🌟 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2 text-cyan-600 font-semibold mb-4 border-b border-gray-100 pb-3">
            <MapPin className="size-5" />
            <p className="text-sm">Địa chỉ mặc định</p>
          </div>
          
          {/* Nhúng UI Address Selector giống hệt lúc Checkout */}
          <AddressSelector 
            selectedId={selectedAddressId} 
            onSelect={(id) => setSelectedAddressId(id)} 
          />
        </div>

        {/* Biểu mẫu thông tin */}
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <label className="w-1/3 text-sm text-gray-600 font-medium">Tên</label>
              <div className="flex-1 flex items-center justify-end gap-2">
                <input name="username" value={formData.username} onChange={handleChange} className="text-right w-full bg-transparent outline-none focus:text-cyan-600 text-sm font-medium" />
                <ChevronRight className="size-4 text-gray-300" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="w-1/3 flex items-center gap-2"><label className="text-sm text-gray-600 font-medium">Giới tính</label></div>
              <div className="flex-1 flex items-center justify-end gap-2">
                <select name="gender" value={formData.gender} onChange={handleChange} className="text-right bg-transparent outline-none focus:text-cyan-600 cursor-pointer text-sm font-medium appearance-none" style={{ direction: 'rtl' }}>
                  <option value="">-- Chọn --</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option><option value="Khác">Khác</option>
                </select>
                <ChevronRight className="size-4 text-gray-300" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="w-1/3 flex items-center gap-2"><label className="text-sm text-gray-600 font-medium">Ngày sinh</label></div>
              <div className="flex-1 flex items-center justify-end gap-2">
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="text-right bg-transparent outline-none focus:text-cyan-600 text-sm font-medium" />
                <ChevronRight className="size-4 text-gray-300" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border-b">
              <label className="w-1/3 text-sm text-gray-600 font-medium">Số điện thoại</label>
              <div className="flex-1 flex items-center justify-end gap-2">
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="text-right w-full bg-transparent outline-none focus:text-cyan-600 text-sm font-medium" />
                <ChevronRight className="size-4 text-gray-300" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <label className="w-1/3 text-sm text-gray-600 font-medium">Email</label>
              <div className="flex-1 flex items-center justify-end gap-2">
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="text-right w-full bg-transparent outline-none focus:text-cyan-600 text-sm font-medium" />
                <ChevronRight className="size-4 text-gray-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full mt-6 h-12 text-base font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-md" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </main>
    </div>
  );
}