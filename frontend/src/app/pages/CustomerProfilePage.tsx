//frontend/src/app/pages/CustomerProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { ScrollArea } from '../components/ui/scroll-area';
import axios from 'axios';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import { API_BASE_URL } from '../services/api';

import {
  Bell, User, Ticket, Wallet, CreditCard, Coins,
  ChevronRight, Settings,
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

type DailyXuStatus = {
  xuBalance: number;
  dailyAmount: number;
  canClaim: boolean;
  lastClaimAt: string | null;
};

type OrderCounts = {
  pending: number;
  pickup: number;
  shipping: number;
  delivered: number;
  cancelled: number;
  review: number;
};

// ─── Order status icon components (inline SVG, no lucide dependency) ──────────
const IconPending = ({ className }: { className?: string }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
const IconPickup = ({ className }: { className?: string }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
  </svg>
);
const IconShipping = ({ className }: { className?: string }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const IconDelivered = ({ className }: { className?: string }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const IconCancelled = ({ className }: { className?: string }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);
const IconReview = ({ className }: { className?: string }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

export default function CustomerProfilePage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dailyXu, setDailyXu] = useState<DailyXuStatus>({
    xuBalance: 0, dailyAmount: 100, canClaim: false, lastClaimAt: null,
  });
  const [dailyXuLoading, setDailyXuLoading] = useState(false);
  const [orderCounts, setOrderCounts] = useState<OrderCounts>({
    pending: 0, pickup: 0, shipping: 0, delivered: 0, cancelled: 0, review: 0,
  });

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = response.data.data || response.data || [];
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.is_read && !n.read).length);
      } catch { /* silently fail */ }
    };
    if (token) void fetchNotifications();
  }, [token]);

  // ─── Fetch real order counts ───────────────────────────────────────────────
  // is_reviewed được backend gắn vào (order.repository.js → attachReviewStatus)
  // - delivered: DELIVERED + PAID + chưa review (!is_reviewed)
  // - review:    DELIVERED + PAID + chưa review (!is_reviewed) → cần đánh giá
  useEffect(() => {
    const fetchOrders = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/orders/my-orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const orders: any[] = json.data ?? json ?? [];

        setOrderCounts({
          pending:   orders.filter(o => o.order_status === 'PENDING').length,
          pickup:    orders.filter(o => o.order_status === 'PICKUP').length,
          shipping:  orders.filter(o => o.order_status === 'SHIPPING').length,
          // Đã giao: DELIVERED + PAID + CHƯA có trong bảng reviews
          delivered: orders.filter(o =>
            o.order_status === 'DELIVERED' &&
            o.payment_status === 'PAID' &&
            !o.is_reviewed
          ).length,
         cancelled: orders.filter(o => o.order_status === 'CANCELLED' || o.order_status === 'REFUNDED').length,
          // Đánh giá: DELIVERED + PAID + ĐÃ CÓ trong bảng reviews
          review: orders.filter(o =>
            o.order_status === 'DELIVERED' &&
            o.payment_status === 'PAID' &&
            o.is_reviewed === true
          ).length,
        });
      } catch { /* silently fail */ }
    };
    void fetchOrders();
  }, [token]);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [navigate, user]);

  useEffect(() => {
    const fetchDailyXuStatus = async () => {
      if (!token || !user || user.role !== 'customer') return;
      try {
        setDailyXuLoading(true);
        const response = await axios.get(`${API_URL}/auth/daily-xu/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = response.data?.data;
        if (data) {
          setDailyXu({
            xuBalance: Number(data.xuBalance || 0),
            dailyAmount: Number(data.dailyAmount || 100),
            canClaim: Boolean(data.canClaim),
            lastClaimAt: data.lastClaimAt || null,
          });
        }
      } catch { /* silently fail */ } finally {
        setDailyXuLoading(false);
      }
    };
    void fetchDailyXuStatus();
  }, [token, user]);

  const handleClaimDailyXu = async () => {
    if (!token || dailyXuLoading || !dailyXu.canClaim) return;
    try {
      setDailyXuLoading(true);
      const response = await axios.post(
        `${API_URL}/auth/daily-xu/claim`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = response.data?.data;
      setDailyXu(prev => ({
        ...prev,
        xuBalance: Number(data?.xuBalance ?? prev.xuBalance),
        dailyAmount: Number(data?.dailyAmount ?? prev.dailyAmount),
        canClaim: false,
        lastClaimAt: data?.lastClaimAt || new Date().toISOString(),
      }));
      window.alert(`Bạn đã nhận thành công ${Number(data?.dailyAmount || 100)} Xu hôm nay!`);
    } catch (error) {
      window.alert(
        axios.isAxiosError(error)
          ? error.response?.data?.message || 'Không thể nhận Xu lúc này.'
          : 'Không thể nhận Xu lúc này.'
      );
    } finally {
      setDailyXuLoading(false);
    }
  };

  if (!user) return null;

  // ─── Order stats: 6 items ──────────────────────────────────────────────────
  const orderStats = [
    {
      label: 'Chờ xác nhận',
      Icon: IconPending,
      count: orderCounts.pending,
      color: 'text-amber-500',
      tab: 'pending',
    },
    {
      label: 'Chờ lấy hàng',
      Icon: IconPickup,
      count: orderCounts.pickup,
      color: 'text-blue-500',
      tab: 'pickup',
    },
    {
      label: 'Chờ giao hàng',
      Icon: IconShipping,
      count: orderCounts.shipping,
      color: 'text-cyan-500',
      tab: 'shipping',
    },
    {
      label: 'Đã giao',
      Icon: IconDelivered,
      count: orderCounts.delivered,
      color: 'text-green-500',
      tab: 'delivered',
    },
    {
      label: 'Đã hủy',
      Icon: IconCancelled,
      count: orderCounts.cancelled,
      color: 'text-red-400',
      tab: 'cancelled',
    },
    {
      label: 'Đánh giá',
      Icon: IconReview,
      count: orderCounts.review,
      color: 'text-yellow-500',
      tab: 'reviewed',
    },
  ];

  const vouchers = [
    { title: 'Trang Chính',       icon: '🏆', subtitle: 'Nhận ngay 4.4 Voucher' },
    { title: 'VIP',         icon: '👑', subtitle: 'Ưu đãi độc quyền' },
    { title: 'Hàng Mới Về Sẵn',  icon: '🎁', subtitle: 'Giảm giá đến 50%' },
    { title: 'Mặc Trend Sống...',  icon: '🔥', subtitle: 'Khám phá xu hướng' },
  ];

  const utilities = [
    {
    title: 'Ví Của Tôi',
    Icon: Wallet,
    subtitle: 'Xem số dư và lịch sử giao dịch',
    badge: 'Ví thanh toán',
    color: 'text-cyan-700 bg-cyan-50',
    onClick: () => navigate('/my-wallet'),
    disabled: false,
  },
    { title: 'SHublater',     Icon: CreditCard, subtitle: 'Kích hoạt nhận ngay 150.000₫',        badge: 'Kích hoạt nhận ngay 150k',  color: 'text-blue-700 bg-blue-50',   onClick: undefined, disabled: false },
    {
      title: 'Shop Hub Xu',
      Icon: Coins,
      subtitle: `Số dư: ${dailyXu.xuBalance.toLocaleString('vi-VN')} Xu`,
      badge: dailyXu.canClaim ? `Nhận ngay ${dailyXu.dailyAmount} Xu` : 'Đã nhận Xu hôm nay',
      color: dailyXu.canClaim ? 'text-sky-700 bg-sky-50' : 'text-slate-600 bg-slate-100',
      onClick: handleClaimDailyXu,
      disabled: !dailyXu.canClaim || dailyXuLoading,
    },
    { title: 'Kho Voucher', Icon: Ticket, subtitle: '50+ Voucher', badge: '50+ Voucher', color: 'text-cyan-700 bg-cyan-50', onClick: undefined, disabled: false },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_42%,#f4fbff_100%)]">
      <StoreHeader showBackButton />

      <main className="mx-auto w-full max-w-screen-2xl px-4 py-4 space-y-4">

        {/* Notification banner */}
        <Card onClick={() => setIsNotificationOpen(true)} className="border-l-4 border-l-cyan-500 cursor-pointer hover:bg-cyan-50 transition-colors shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="size-5 text-cyan-500" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex size-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
              </div>
              <p className="text-sm text-slate-700 flex-1">
                {unreadCount > 0
                  ? <>Bạn có <span className="text-cyan-600 font-bold">{unreadCount}</span> thông báo mới chưa đọc. </>
                  : <>Bạn đã xem hết tất cả thông báo. </>}
                <span className="text-cyan-600 font-medium hidden sm:inline">Nhấn để xem</span>
              </p>
              <ChevronRight className="size-4 text-cyan-600" />
            </div>
          </CardContent>
        </Card>

        {/* Notification sheet */}
        <Sheet open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md px-0 flex flex-col bg-slate-50 z-[100]">
            <SheetHeader className="px-5 py-4 border-b bg-white shrink-0">
              <SheetTitle className="text-left text-lg font-bold text-slate-800 flex items-center gap-2">
                <Bell className="size-5 text-cyan-500" /> Thông báo của bạn
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1 px-5 py-4">
              <div className="space-y-3 pb-8">
                {notifications.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">Bạn chưa có thông báo nào.</div>
                ) : notifications.map((note) => {
                  const isRead = note.is_read || note.read;
                  return (
                    <div key={note.id || note._id}
                      className={`p-4 rounded-xl border shadow-sm transition-all hover:border-cyan-200 cursor-pointer ${isRead ? 'bg-white border-slate-100' : 'bg-cyan-50/60 border-cyan-100'}`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${note.type === 'order' ? 'bg-orange-100 text-orange-600' : note.type === 'promo' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                          <Bell className="size-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h4 className={`text-[13px] font-bold ${isRead ? 'text-slate-700' : 'text-slate-900'}`}>{note.title}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">{note.message || note.content}</p>
                          <p className="text-[10px] text-slate-400 font-medium pt-1">
                            {new Date(note.createdAt || note.created_at).toLocaleString('vi-VN')}
                          </p>
                        </div>
                        {!isRead && <div className="size-2 rounded-full bg-cyan-500 mt-1.5 shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* ── Orders Section ── */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Đơn mua</h2>
              <Link to="/orders/history" className="text-sm text-cyan-600 flex items-center gap-1 hover:underline">
                Xem lịch sử mua hàng
                <ChevronRight className="size-4" />
              </Link>
            </div>

            {/* 6 status tiles */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {orderStats.map((stat) => (
                <button
                  key={stat.tab}
                  onClick={() => navigate(`/orders?tab=${stat.tab}`)}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className="relative">
                    <stat.Icon className={`${stat.color} transition-transform group-hover:scale-110`} />
                    {stat.count > 0 && (
                      <Badge className="absolute -top-2 -right-2 min-w-[18px] h-[18px] p-0 flex items-center justify-center bg-red-500 text-[10px] font-extrabold rounded-full">
                        {stat.count}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-center text-gray-600 leading-tight font-medium">
                    {stat.label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Vouchers */}
        <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="size-5 text-cyan-600" />
              <span className="font-medium">4.4 Siêu Hội Voucher</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {vouchers.map((voucher, index) => (
                <button key={index} className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity">
                  <div className="size-10 sm:size-12 bg-white rounded-full flex items-center justify-center text-xl sm:text-2xl shadow-sm">
                    {voucher.icon}
                  </div>
                  <span className="text-[10px] sm:text-xs text-center leading-tight">{voucher.title}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Utilities */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-medium mb-4">Tiện ích của tôi</h2>
            <div className="grid grid-cols-2 gap-3">
              {utilities.map((util, index) => (
                <button
                  key={index}
                  onClick={util.onClick}
                  disabled={util.disabled}
                  className={`p-3 rounded-lg border transition-shadow ${util.color} ${util.disabled ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-md'}`}
                >
                  <div className="flex items-center gap-3">
                    <util.Icon className="size-5 sm:size-6" />
                    <div className="text-left flex-1">
                      <div className="font-medium text-[13px] sm:text-sm">{util.title}</div>
                      {util.subtitle && <div className="text-[10px] sm:text-xs mt-0.5 opacity-80">{util.subtitle}</div>}
                      {util.badge && <div className="text-[10px] sm:text-xs mt-0.5 font-medium opacity-80">{util.badge}</div>}
                    </div>
                    <ChevronRight className="size-4 opacity-50" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardContent className="p-3">
            <h2 className="font-medium mb-2 px-1">Cài đặt</h2>
            <div className="space-y-1">
              <Link to="/profile/edit" className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <User className="size-5 text-gray-600" />
                  <span className="text-sm text-gray-700">Sửa hồ sơ</span>
                </div>
                <ChevronRight className="size-4 text-gray-400" />
              </Link>
              <button
                onClick={logout}
                className="w-full flex items-center justify-between p-2 hover:bg-red-50 rounded-lg transition-colors mt-2 text-red-600"
              >
                <div className="flex items-center gap-3">
                  <Settings className="size-5" />
                  <span className="text-sm font-medium">Đăng xuất</span>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </main>

      <StoreFooter />
    </div>
  );
}