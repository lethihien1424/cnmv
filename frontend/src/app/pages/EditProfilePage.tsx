import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, User, Camera, ChevronRight, HelpCircle, MapPin } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function EditProfilePage() {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading]                 = useState(false);
  const [addresses, setAddresses]             = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any | null>(null);
  const [showAddresses, setShowAddresses]     = useState(false);

  const [formData, setFormData] = useState({
    username:   '',             // từ users.username
    email:      '',             // từ users.email (readonly)
    gender:     '',             // từ users.gender
    dob:        '',             // từ users.date_of_birth
    phone:      '',             // từ addresses.phone
    address_id: null as string | null,
  });

  // ── Load profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const u = res.data.data;

        const allAddresses: any[] = u.addresses || [];
        const defaultAddress = allAddresses.find((a: any) => a.is_default) || allAddresses[0] || null;

        setAddresses(allAddresses);
        setSelectedAddress(defaultAddress);

        setFormData({
          username:   u.username || '',
          email:      u.email    || '',
          gender:     u.gender   || '',
          dob:        u.date_of_birth ? u.date_of_birth.split('T')[0] : '',
          phone:      defaultAddress?.phone || '',
          address_id: defaultAddress?.id    ?? null,
        });
      } catch (err) {
        console.error(err);
        toast.error('Không thể tải thông tin hồ sơ');
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Chọn địa chỉ — chỉ cập nhật phone & address_id, KHÔNG động vào username
  const handleSelectAddress = (addr: any) => {
    setSelectedAddress(addr);
    setFormData((prev) => ({
      ...prev,
      phone:      addr.phone || '',
      address_id: addr.id,
    }));
    setShowAddresses(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    try {
      await axios.put(
        `${API_URL}/users/profile`,
        {
          username:      formData.username,
          gender:        formData.gender        || null,
          date_of_birth: formData.dob           || null,
          phone:         formData.phone,
          address_id:    formData.address_id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      updateUser({ username: formData.username });
      toast.success('Cập nhật hồ sơ thành công!');
      navigate(-1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  if (!user) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)}><ArrowLeft className="size-6" /></button>
            <h1 className="text-lg font-medium">Sửa hồ sơ</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Avatar */}
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-center flex-col gap-4">
              <div className="relative">
                <div className="size-24 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="size-16 text-white" />
                </div>
                <button className="absolute bottom-0 right-0 size-8 bg-white rounded-full flex items-center justify-center border-2 border-gray-200 shadow-md">
                  <Camera className="size-4 text-gray-600" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardContent className="p-0">

            {/* Tên */}
            <div className="flex items-center justify-between p-4 border-b">
              <label className="w-1/3 text-sm text-gray-600">Tên</label>
              <div className="flex-1 flex items-center justify-end gap-2">
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

            {/* Địa chỉ giao hàng */}
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-indigo-500" />
                  <label className="text-sm font-medium">Địa chỉ giao hàng</label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddresses(!showAddresses)}
                  className="text-indigo-600 text-sm"
                >
                  Thay đổi
                </button>
              </div>

              {/* Địa chỉ đang chọn */}
              {selectedAddress ? (
                <div className="rounded-xl border p-3 bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{selectedAddress.recipient_name}</span>
                    <span className="text-sm text-gray-500">{selectedAddress.phone}</span>
                    {selectedAddress.is_default && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-600">Mặc định</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {selectedAddress.detail}, {selectedAddress.ward},{' '}
                    {selectedAddress.district}, {selectedAddress.province}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Chưa có địa chỉ</p>
              )}

              {/* Danh sách để chọn */}
              {showAddresses && (
                <div className="space-y-2 pt-1">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => handleSelectAddress(addr)}
                      className={`border rounded-xl p-3 cursor-pointer hover:border-indigo-400 transition-colors ${
                        selectedAddress?.id === addr.id ? 'border-indigo-500 bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{addr.recipient_name}</span>
                        <span className="text-sm text-gray-500">{addr.phone}</span>
                        {addr.is_default && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-600">Mặc định</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {addr.detail}, {addr.ward}, {addr.district}, {addr.province}
                      </p>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => navigate('/address/add')}
                    className="w-full border-2 border-dashed border-indigo-300 rounded-xl py-3 text-indigo-600 text-sm hover:bg-indigo-50 transition-colors"
                  >
                    + Thêm địa chỉ mới
                  </button>
                </div>
              )}
            </div>

            {/* Giới tính */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="w-1/3 flex items-center gap-2">
                <label className="text-sm text-gray-600">Giới tính</label>
                <HelpCircle className="size-4 text-gray-400" />
              </div>
              <div className="flex-1 flex items-center justify-end gap-2">
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="text-right bg-transparent outline-none focus:text-indigo-600 cursor-pointer text-sm appearance-none"
                  style={{ direction: 'rtl' }}
                >
                  <option value="">-- Chọn --</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
                <ChevronRight className="size-4 text-gray-400 flex-shrink-0" />
              </div>
            </div>

            {/* Ngày sinh */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="w-1/3 flex items-center gap-2">
                <label className="text-sm text-gray-600">Ngày sinh</label>
                <HelpCircle className="size-4 text-gray-400" />
              </div>
              <div className="flex-1 flex items-center justify-end gap-2">
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

            {/* Số điện thoại */}
            <div className="flex items-center justify-between p-4 border-b">
              <label className="w-1/3 text-sm text-gray-600">Số điện thoại</label>
              <div className="flex-1 flex items-center justify-end gap-2">
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

            {/* Email (readonly) */}
            <div className="flex items-center justify-between p-4">
              <label className="w-1/3 text-sm text-gray-600">Email</label>
              <div className="flex-1 flex items-center justify-end gap-2 text-gray-400">
                <span className="text-sm">{formData.email}</span>
                <ChevronRight className="size-4 text-gray-300 flex-shrink-0" />
              </div>
            </div>

          </CardContent>
        </Card>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            ℹ️ Thông tin của bạn sẽ được bảo mật và tự động điền khi đặt hàng.
          </p>
        </div>

        <Button className="w-full mt-6 h-12 text-base font-medium" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </main>
    </div>
  );
}