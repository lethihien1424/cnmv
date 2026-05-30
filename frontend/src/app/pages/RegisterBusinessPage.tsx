import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Store, Mail, Lock, User, Building2, FileText, ReceiptText, Upload, CheckCircle2, ImageIcon, Phone, CreditCard } from 'lucide-react';

export default function RegisterBusinessPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [identityCard, setIdentityCard] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // State mới: lưu file ảnh GPKD thật
  const [licenseImageFile, setLicenseImageFile] = useState<File | null>(null);
  const [licenseImagePreview, setLicenseImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { registerBusiness, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Redirect if already logged in
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra định dạng file
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh (JPG, PNG, WEBP...)');
      return;
    }
    // Kiểm tra kích thước (tối đa 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.');
      return;
    }

    setLicenseImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLicenseImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    if (password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (!licenseImageFile) {
      toast.error('Bạn cần tải lên ảnh Giấy Phép Kinh Doanh để đăng ký B2C');
      return;
    }

    if (!policyAccepted) {
      toast.error('Bạn cần đồng ý điều khoản phí và vận hành trước khi đăng ký bán hàng');
      return;
    }

    setIsLoading(true);

    try {
      await registerBusiness(username, email, password, storeName, businessLicense, taxCode, {
        bankAccount,
        policyAccepted,
        representativeName,
        identityCard,
        contactPhone,
        businessLicenseImage: licenseImageFile,
      });
      toast.success('Đăng ký doanh nghiệp thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Đăng ký thất bại');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-violet-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="size-12 bg-violet-600 rounded-full flex items-center justify-center">
              <Store className="size-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Đăng ký Business</CardTitle>
          <CardDescription className="text-center">
            Tạo tài khoản kinh doanh mới
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên người dùng</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-3 size-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Nguyễn Văn B"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3 size-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="business@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeName">Tên cửa hàng</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-3 size-4 text-gray-400" />
                <Input
                  id="storeName"
                  type="text"
                  placeholder="Cửa hàng của tôi"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessLicense">Mã số GPKD (Business License)</Label>
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3 top-3 size-4 text-gray-400" />
                <Input
                  id="businessLicense"
                  type="text"
                  placeholder="Số GPKD, VD: 0123456789"
                  value={businessLicense}
                  onChange={(e) => setBusinessLicense(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {/* ── TRƯỜNG UPLOAD ẢNH GPKD (MỚI) ───────────────────── */}
            <div className="space-y-2">
              <Label>Ảnh Giấy Phép Kinh Doanh <span className="text-red-500">*</span></Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {licenseImagePreview ? (
                /* Đã chọn ảnh — hiển thị preview */
                <div className="relative rounded-xl overflow-hidden border-2 border-violet-400 bg-violet-50">
                  <img
                    src={licenseImagePreview}
                    alt="Preview GPKD"
                    className="w-full max-h-48 object-contain"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      <CheckCircle2 className="size-3" /> Đã chọn
                    </span>
                    <button
                      type="button"
                      onClick={() => { setLicenseImageFile(null); setLicenseImagePreview(null); }}
                      className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium hover:bg-red-600"
                    >
                      Đổi ảnh
                    </button>
                  </div>
                  <p className="text-xs text-center text-violet-700 py-2 font-medium">{licenseImageFile?.name}</p>
                </div>
              ) : (
                /* Chưa chọn ảnh — vùng kéo thả / click */
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 hover:bg-violet-100 hover:border-violet-500 transition-all p-6 flex flex-col items-center gap-2 cursor-pointer"
                >
                  <div className="size-12 rounded-full bg-violet-100 flex items-center justify-center">
                    <Upload className="size-6 text-violet-500" />
                  </div>
                  <p className="font-medium text-violet-700 text-sm">Nhấn để tải lên ảnh GPKD</p>
                  <p className="text-xs text-gray-500">JPG, PNG, WEBP — Tối đa 5MB</p>
                  {/* <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
                    <ImageIcon className="size-3 shrink-0" />
                    AI Vision sẽ tự động kiểm tra dấu mộc đỏ trong ảnh GPKD
                  </div> */}
                </button>
              )}
            </div>
            {/* ── KẾT THÚC TRƯỜNG UPLOAD ─────────────────────────── */}
            {/* Thêm trường Tax Code ở đây */}
            <div className="space-y-2">
              <Label htmlFor="taxCode">Mã số thuế (Tax Code)</Label>
              <div className="relative">
                <ReceiptText className="pointer-events-none absolute left-3 top-3 size-4 text-gray-400" />
                <Input
                  id="taxCode"
                  type="text"
                  placeholder="0987654321"
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccount">Số tài khoản ngân hàng</Label>
              <div className="relative">
                <ReceiptText className="pointer-events-none absolute left-3 top-3 size-4 text-gray-400" />
                <Input
                  id="bankAccount"
                  type="text"
                  placeholder="VD: 0123456789"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">Tối đa 3 tài khoản bán hàng trên cùng CCCD/MST/Ngân hàng.</p>
            </div>

            {/* 3 trường mới: đại diện pháp luật, CCCD, điện thoại */}
            <div className="space-y-2">
              <Label htmlFor="representativeName">Họ tên người đại diện pháp luật <span className="text-red-500">*</span></Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-3 size-4 text-gray-400" />
                <Input
                  id="representativeName"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="identityCard">Số CCCD/CMND <span className="text-red-500">*</span></Label>
              <div className="relative">
                <CreditCard className="pointer-events-none absolute left-3 top-3 size-4 text-gray-400" />
                <Input
                  id="identityCard"
                  type="text"
                  placeholder="VD: 012345678901"
                  value={identityCard}
                  onChange={(e) => setIdentityCard(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Số điện thoại liên hệ <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-3 size-4 text-gray-400" />
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="VD: 0912345678"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs text-violet-900 space-y-1">
              <p className="font-semibold">Điều khoản phí bán hàng</p>
              <p>- Miễn phí mở tài khoản, tối đa 3 tài khoản/hồ sơ (CCCD/MST/Ngân hàng).</p>
              <p>- Phí cố định 4% và phí thanh toán 5% chỉ thu trên đơn giao thành công.</p>
              <p>- Phí trả hàng: tối đa 40.000đ/đơn (20.000đ với đơn hỏa tốc).</p>
              <p>- Thuế: doanh thu &gt; 100 triệu/năm chịu 1% GTGT + 0.5% TNCN.</p>
              <p>- Không đăng bán hàng cấm, hàng giả, hàng nhái; không buff đơn, gian lận hoặc lôi kéo khách ra ngoài sàn.</p>
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={policyAccepted}
                onChange={(e) => setPolicyAccepted(e.target.checked)}
              />
              <span>Tôi cam kết thông tin chính xác, tuân thủ chính sách sàn và đồng ý các loại phí/điều khoản hoạt động.</span>
            </label>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3 size-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3 size-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
            </Button>
            <div className="text-sm text-center space-y-2">
              <p className="text-gray-600">
                Đã có tài khoản?{' '}
                <Link to="/login" className="text-violet-600 hover:underline font-medium">
                  Đăng nhập
                </Link>
              </p>
              <p className="text-gray-600">
                Chỉ là khách hàng?{' '}
                <Link to="/register/customer" className="text-violet-600 hover:underline font-medium">
                  Đăng ký Customer
                </Link>
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}