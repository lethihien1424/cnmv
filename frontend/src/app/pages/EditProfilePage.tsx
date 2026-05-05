import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, 
  User, 
  Camera,
  ChevronRight,
  HelpCircle,
  MapPin
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function EditProfilePage() {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Khai báo đầy đủ các trường dữ liệu để có thể thay đổi
  const [formData, setFormData] = useState({
    username: user?.username || '',
    address: user?.address || '',
    bio: '', // Sẽ lấy từ user?.bio nếu có
    gender: 'Nữ', // Sẽ lấy từ user?.gender nếu có
    dob: '', // Định dạng chuẩn cho type="date" là YYYY-MM-DD
    phone: '', // Sẽ lấy từ user?.phone nếu có
    email: user?.email || ''
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        username: user.username || '',
        address: user.address || '',
        // Nếu Backend của bạn có trả về bio, gender, dob, phone thì mở comment các dòng dưới
        // bio: user.bio || '',
        // gender: user.gender || 'Nữ',
        // dob: user.dob || '',
        // phone: user.phone || '',
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Gửi TOÀN BỘ formData lên Backend
      await axios.put(
        `${API_URL}/users/profile`, 
        { 
          username: formData.username, 
          address: formData.address,
          bio: formData.bio,
          gender: formData.gender,
          dob: formData.dob,
          phone: formData.phone
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Cập nhật lại Context sau khi lưu thành công
      updateUser({ 
        username: formData.username, 
        address: formData.address,
        // bio: formData.bio,
        // gender: formData.gender,
        // dob: formData.dob,
        // phone: formData.phone
      });

      toast.success("Cập nhật hồ sơ thành công!");
      navigate(-1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)}>
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="text-lg font-medium">Sửa hồ sơ</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Avatar Section */}
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-center flex-col gap-4">
              <div className="relative">
                <div className="size-24 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center overflow-hidden">
                  <User className="size-16 text-white" />
                </div>
                <button className="absolute bottom-0 right-0 size-8 bg-white rounded-full flex items-center justify-center border-2 border-gray-200 shadow-md">
                  <Camera className="size-4 text-gray-600" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Fields */}
        <Card>
          <CardContent className="p-0">
            {/* Name */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="w-1/3">
                <label className="text-sm text-gray-600">Tên</label>
              </div>
              <div className="flex-1 flex items-center justify-end gap-2 text-gray-900">
                <input 
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Nhập tên của bạn"
                  className="text-right w-full bg-transparent outline-none focus:text-indigo-600 text-sm"
                />
                <ChevronRight className="size-4 text-gray-400 flex-shrink-0" />
              </div>
            </div>

            {/* Address */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="w-1/3 flex items-center gap-2">
                <label className="text-sm text-gray-600">Địa chỉ</label>
                <MapPin className="size-4 text-gray-400" />
              </div>
              <div className="flex-1 flex items-center justify-end gap-2 text-gray-900">
                <input 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Nhập địa chỉ giao hàng"
                  className="text-right w-full bg-transparent outline-none focus:text-indigo-600 truncate text-sm"
                />
                <ChevronRight className="size-4 text-gray-400 flex-shrink-0" />
              </div>
            </div>

            {/* Bio (Cho phép sửa) */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="w-1/3">
                <label className="text-sm text-gray-600">Tiểu sử</label>
              </div>
              <div className="flex-1 flex items-center justify-end gap-2 text-gray-900">
                <input 
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Thêm tiểu sử của bạn"
                  className="text-right w-full bg-transparent outline-none focus:text-indigo-600 truncate text-sm"
                />
                <ChevronRight className="size-4 text-gray-400 flex-shrink-0" />
              </div>
            </div>

            {/* Gender (Chọn danh sách) */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="w-1/3 flex items-center gap-2">
                <label className="text-sm text-gray-600">Giới tính</label>
                <HelpCircle className="size-4 text-gray-400" />
              </div>
              <div className="flex-1 flex items-center justify-end gap-2 text-gray-900">
                <select 
                  name="gender" 
                  value={formData.gender} 
                  onChange={handleChange}
                  className="text-right bg-transparent outline-none focus:text-indigo-600 cursor-pointer text-sm appearance-none"
                  style={{ direction: 'rtl' }}
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
                <ChevronRight className="size-4 text-gray-400 flex-shrink-0" />
              </div>
            </div>

            {/* Date of Birth (Nhập ngày) */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="w-1/3 flex items-center gap-2">
                <label className="text-sm text-gray-600">Ngày sinh</label>
                <HelpCircle className="size-4 text-gray-400" />
              </div>
              <div className="flex-1 flex items-center justify-end gap-2 text-gray-900">
                <input 
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="text-right bg-transparent outline-none focus:text-indigo-600 text-sm"
                />
                <ChevronRight className="size-4 text-gray-400 flex-shrink-0" />
              </div>
            </div>

            {/* Phone (Nhập số ĐT) */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="w-1/3">
                <label className="text-sm text-gray-600">Số điện thoại</label>
              </div>
              <div className="flex-1 flex items-center justify-end gap-2 text-gray-900">
                <input 
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Nhập số điện thoại"
                  className="text-right w-full bg-transparent outline-none focus:text-indigo-600 text-sm"
                />
                <ChevronRight className="size-4 text-gray-400 flex-shrink-0" />
              </div>
            </div>

            {/* Email (Disabled - Không cho sửa email để bảo mật) */}
            <div className="flex items-center justify-between p-4">
              <div className="w-1/3">
                <label className="text-sm text-gray-600">Email</label>
              </div>
              <div className="flex-1 flex items-center justify-end gap-2 text-gray-400">
                <span className="text-sm">{formData.email}</span>
                <ChevronRight className="size-4 text-gray-300 flex-shrink-0" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Notice */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            ℹ️ Thông tin và địa chỉ của bạn sẽ được bảo mật và tự động điền khi bạn đặt mua sản phẩm.
          </p>
        </div>

        {/* Nút Lưu */}
        <Button 
          className="w-full mt-6 h-12 text-base font-medium" 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </main>
    </div>
  );
}