import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { UserPlus, Mail, Lock, User, CheckCircle, XCircle } from 'lucide-react';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const passwordRules: PasswordRule[] = [
  { label: 'Ít nhất 8 ký tự', test: (pw) => pw.length >= 8 },
  { label: 'Có chữ hoa (A-Z)', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Có chữ thường (a-z)', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Có số (0-9)', test: (pw) => /\d/.test(pw) },
  { label: 'Có ký tự đặc biệt (@$!%*?&#)', test: (pw) => /[@$!%*?&#]/.test(pw) },
];

export default function RegisterCustomerPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const { registerCustomer, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Redirect if already logged in
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const isPasswordValid = useMemo(() => PASSWORD_REGEX.test(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      toast.error('Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
      return;
    }

    setIsLoading(true);

    try {
      await registerCustomer(username, email, password);
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.');

      // Chuyển hướng về trang login sau khi đăng ký thành công
      navigate('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Đăng ký thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="size-12 bg-emerald-600 rounded-full flex items-center justify-center">
              <UserPlus className="size-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Đăng ký Customer</CardTitle>
          <CardDescription className="text-center">
            Tạo tài khoản khách hàng mới
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
                  placeholder="Nguyễn Văn A"
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
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (!passwordTouched) setPasswordTouched(true);
                  }}
                  required
                  className="pl-10"
                />
              </div>
              {/* Real-time password strength indicators */}
              {passwordTouched && (
                <div className="mt-2 space-y-1">
                  {passwordRules.map((rule) => {
                    const passed = rule.test(password);
                    return (
                      <div key={rule.label} className="flex items-center gap-2 text-xs">
                        {passed ? (
                          <CheckCircle className="size-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="size-3.5 text-red-400 shrink-0" />
                        )}
                        <span className={passed ? 'text-emerald-600' : 'text-red-500'}>
                          {rule.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
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
                  className="pl-10"
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Mật khẩu xác nhận không khớp</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
            </Button>
            <div className="text-sm text-center space-y-2">
              <p className="text-gray-600">
                Đã có tài khoản?{' '}
                <Link to="/login" className="text-emerald-600 hover:underline font-medium">
                  Đăng nhập
                </Link>
              </p>
              <p className="text-gray-600">
                Muốn đăng ký kinh doanh?{' '}
                <Link to="/register/business" className="text-emerald-600 hover:underline font-medium">
                  Đăng ký Business
                </Link>
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}