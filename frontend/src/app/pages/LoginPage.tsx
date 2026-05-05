import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../components/ui/input-otp";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner"; // Hoặc thư viện thông báo bạn đang dùng
import { forgotPassword, resetPassword } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Lock, LogIn, Mail } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  React.useEffect(() => {
    if (user?.role === "admin") {
      navigate("/admin");
      return;
    }

    if (user?.role === "business" || user?.role === "customer") {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    try {
      await login(email, password);
      toast.success("Đăng nhập thành công");
      navigate("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Đăng nhập thất bại");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mb-4 flex items-center justify-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-cyan-600">
              <LogIn className="size-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Đăng nhập</CardTitle>
          <CardDescription className="text-center">Chào mừng bạn quay trở lại ShopHub</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3 size-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3 size-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-sm font-medium text-cyan-700 hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Chưa có tài khoản?{" "}
              <Link to="/register/customer" className="font-medium text-cyan-700 hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      <ForgotPasswordModal isOpen={isForgotPasswordOpen} onClose={() => setIsForgotPasswordOpen(false)} />
    </div>
  );
}

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Bước 1: Gửi email lấy OTP
  const handleSendOtp = async () => {
    if (!email) return toast.error("Vui lòng nhập email");
    setLoading(true);
    try {
      await forgotPassword(email);
      toast.success("Mã OTP đã được gửi!");
      setStep(2);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi gửi email");
    } finally {
      setLoading(false);
    }
  };

  // Bước 2 & 3: Xác nhận đổi mật khẩu
  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      return toast.error("Mật khẩu xác nhận không khớp!");
    }
    setLoading(true);
    try {
      await resetPassword({ email, otp, newPassword });
      toast.success("Đổi mật khẩu thành công! Hãy đăng nhập lại.");
      setStep(1);
      setOtp("");
      setNewPassword("");
      onClose(); // Đóng modal và cho phép user đăng nhập ở form chính
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Mã OTP sai hoặc mật khẩu không đủ mạnh");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quên mật khẩu</DialogTitle>
          <DialogDescription>
            Nhập email để nhận OTP và đặt lại mật khẩu tài khoản của bạn.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Nhập Email của bạn</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="example@gmail.com" 
                value={email} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} 
              />
            </div>
            <Button className="w-full" onClick={handleSendOtp} disabled={loading}>
              {loading ? "Đang gửi..." : "Gửi mã OTP"}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 flex flex-col items-center">
            <Label>Nhập mã 6 số gửi tới {email}</Label>
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <Button className="w-full mt-4" onClick={() => setStep(3)} disabled={otp.length !== 6}>
              Xác nhận mã
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input 
                id="new-password" 
                type="password" 
                value={newPassword} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)} 
              />
              {/* ĐÃ SỬA LỖI Ở DÒNG BÊN DƯỚI */}
              <p className="text-xs text-gray-500">{"Mật khẩu phải có chữ hoa, thường, số, ký tự đặc biệt & >= 8 ký tự."}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
              <Input 
                id="confirm-password" 
                type="password" 
                value={confirmPassword} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)} 
              />
            </div>
            <Button className="w-full" onClick={handleResetPassword} disabled={loading}>
              {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};