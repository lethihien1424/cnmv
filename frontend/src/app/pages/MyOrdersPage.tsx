//D:\CongNgheMoi-hien\CongNgheMoi\frontend\src\app\pages\MyOrdersPage.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import { API_BASE_URL } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price_at_buy: number;
  product?: {
    id: string;
    name: string;
    images?: string[];
    image_url?: string;
  };
};

type Order = {
  id: string;
  order_status: 'PENDING' | 'PICKUP' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
  payment_status: 'UNPAID' | 'PAID' | 'FAILED';
  payment_method: string;
  total_amount: number;
  shipping_fee: number;
  shipping_address?: string;
  created_at: string;
  items: OrderItem[];
  reviewed?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

const getImg = (item: OrderItem, base: string) => {
  const src = item.product?.image_url || item.product?.images?.[0];
  if (!src) return null;
  if (src.startsWith('http')) return src;
  return `${base.replace('/api', '')}${src}`;
};

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  {
    key: 'pending',
    label: 'Chờ xác nhận',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    ),
    color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200',
    match: (o: Order) => o.order_status === 'PENDING',
  },
  {
    key: 'pickup',
    label: 'Chờ lấy hàng',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
    ),
    color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200',
    match: (o: Order) => o.order_status === 'PICKUP',
  },
  {
    key: 'shipping',
    label: 'Chờ giao hàng',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
    color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-200',
    match: (o: Order) => o.order_status === 'SHIPPING',
  },
  {
    key: 'delivered',
    label: 'Đã giao',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200',
    match: (o: Order) => o.order_status === 'DELIVERED',
  },
  {
    key: 'cancelled',
    label: 'Đã hủy',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
    color: 'text-red-400', bg: 'bg-red-50', border: 'border-red-200',
    match: (o: Order) => o.order_status === 'CANCELLED',
  },
  
  {
    // Đã đánh giá: DELIVERED + PAID + reviewed = true
    key: 'reviewed',
    label: 'Đánh giá',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#FBBF24"/>
      </svg>
    ),
    color: 'text-amber-400', bg: 'bg-amber-50', border: 'border-amber-200',
    match: (o: Order) =>
      o.order_status === 'DELIVERED' &&
      o.payment_status === 'PAID' &&
      o.reviewed === true,
  },
];

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <svg width="32" height="32" viewBox="0 0 24 24"
            fill={(hover || value) >= star ? '#FBBF24' : 'none'}
            stroke={(hover || value) >= star ? '#FBBF24' : '#D1D5DB'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({
  order,
  onClose,
  onSubmit,
}: {
  order: Order;
  onClose: () => void;
  onSubmit: (
    orderId: string,
    items: { product_id: string; rating: number; comment: string }[]
  ) => Promise<void>;
}) {
  const [ratings, setRatings]   = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    for (const item of order.items) {
      if (!ratings[item.product_id]) {
        alert('Vui lòng chấm sao cho tất cả sản phẩm!');
        return;
      }
    }
    setSubmitting(true);
    try {
      await onSubmit(
        order.id,
        order.items.map(item => ({
          product_id: item.product_id,
          rating:  ratings[item.product_id] ?? 5,
          comment: comments[item.product_id] ?? '',
        }))
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-cyan-500 to-blue-600 rounded-t-2xl text-white">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <h3 className="text-lg font-bold">Đánh giá sản phẩm</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M1 1l10 10M11 1L1 11"/>
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {order.items.map(item => (
            <div key={item.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
              {/* Product info */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                  {getImg(item, API_BASE_URL)
                    ? <img
                        src={getImg(item, API_BASE_URL)!}
                        alt={item.product?.name}
                        className="w-full h-full object-cover"
                      />
                    : <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>
                  }
                </div>
                <p className="text-sm font-semibold text-gray-800 flex-1 leading-snug">
                  {item.product?.name ?? 'Sản phẩm'}
                </p>
              </div>

              {/* Stars */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">Chất lượng sản phẩm</p>
                <StarRating
                  value={ratings[item.product_id] ?? 0}
                  onChange={v => setRatings(prev => ({ ...prev, [item.product_id]: v }))}
                />
              </div>

              {/* Comment */}
              <textarea
                rows={2}
                value={comments[item.product_id] ?? ''}
                onChange={e => setComments(prev => ({ ...prev, [item.product_id]: e.target.value }))}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-11 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#06b6d4,#2563eb)' }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10"/>
                </svg>
                Đang gửi…
              </span>
            ) : 'Gửi đánh giá'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ order }: { order: Order }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:   { label: 'Chờ xác nhận', cls: 'bg-amber-100 text-amber-700' },
    PICKUP:    { label: 'Chờ lấy hàng', cls: 'bg-blue-100 text-blue-700' },
    SHIPPING:  { label: 'Đang giao',    cls: 'bg-cyan-100 text-cyan-700' },
    DELIVERED: { label: 'Đã giao',      cls: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Đã hủy',       cls: 'bg-red-100 text-red-500' },
  };
  const s = map[order.order_status] ?? { label: order.order_status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({
  order,
  activeTab,
  onReview,
}: {
  order: Order;
  activeTab: string;
  onReview: (order: Order) => void;
}) {
  const navigate = useNavigate();

  // Đơn DELIVERED + PAID + chưa đánh giá → hiện nút Đánh giá
  const canReview =
    order.order_status === 'DELIVERED' &&
    order.payment_status === 'PAID' &&
    !order.reviewed;

  // Đơn đã đánh giá → hiện nút Mua lại
  const isReviewed = order.reviewed === true;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
        <span className="text-xs text-gray-400 font-mono">
          #{order.id.slice(-8).toUpperCase()} · {fmtDate(order.created_at)}
        </span>
        <StatusBadge order={order} />
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-50">
        {order.items.map(item => {
          const img = getImg(item, API_BASE_URL);
          return (
            <div
              key={item.id}
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/60 transition-colors"
              onClick={() =>
                item.product?.id && navigate(`/product/${item.product.id}`)
              }
              title="Xem sản phẩm"
            >
              {/* Image */}
              <div className="w-[68px] h-[68px] rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                {img
                  ? <img src={img} alt={item.product?.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate hover:text-cyan-600 transition-colors">
                  {item.product?.name ?? 'Sản phẩm'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">x{item.quantity}</p>
              </div>

              {/* Price */}
              <p className="text-sm font-bold text-gray-800 flex-shrink-0" onClick={e => e.stopPropagation()}>
                {fmt(Number(item.price_at_buy) * item.quantity)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-4 border-t border-gray-50">
        {/* Total */}
        <div className="text-sm">
          <span className="text-gray-400">Tổng thanh toán: </span>
          <span className="font-extrabold text-red-500 text-base">
            {fmt(Number(order.total_amount))}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Payment status badge */}
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            order.payment_status === 'PAID'
              ? 'bg-green-100 text-green-600'
              : order.payment_status === 'FAILED'
              ? 'bg-red-100 text-red-500'
              : 'bg-yellow-100 text-yellow-600'
          }`}>
            {order.payment_status === 'PAID'   ? '✓ Đã thanh toán'
            : order.payment_status === 'FAILED' ? '✗ Thất bại'
            : '⏳ Chưa thanh toán'}
          </span>

          {/* ── Nút Đánh giá (chỉ khi chưa reviewed) ── */}
          {canReview && (
            <button
              onClick={() => onReview(order)}
              className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-yellow-400 to-amber-500 hover:opacity-90 transition-opacity shadow-sm active:scale-95"
            >
              ⭐ Đánh giá
            </button>
          )}

          {/* ── Nút Mua lại (chỉ khi đã reviewed) ── */}
          {isReviewed && (
            <button
              onClick={() => {
                // Lấy product_id của item đầu tiên → navigate về trang chi tiết sản phẩm
                const firstProductId = order.items[0]?.product?.id;
                if (firstProductId) navigate(`/product/${firstProductId}`);
              }}
              className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition-opacity shadow-sm active:scale-95"
            >
              🔄 Mua lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyOrdersPage() {
  const { token }  = useAuth();
  const navigate   = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab  = searchParams.get('tab') ?? 'pending';

  const [orders,      setOrders]      = useState<Order[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [searchValue, setSearchValue] = useState('');

  // ── Fetch orders ──
  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const list: Order[] = json.data ?? json ?? [];
      setOrders(list);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  // ── Tab filter ──
  const tab      = TABS.find(t => t.key === activeTab) ?? TABS[0];
  const filtered = orders.filter(tab.match);
  const counts   = Object.fromEntries(TABS.map(t => [t.key, orders.filter(t.match).length]));

  // ── Submit review ──
  const handleReviewSubmit = async (
    orderId: string,
    items: { product_id: string; rating: number; comment: string }[]
  ) => {
    // Gửi từng review lên backend
    for (const item of items) {
      await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id:   orderId,
          product_id: item.product_id,
          rating:     item.rating,
          comment:    item.comment,
        }),
      });
    }

    // Mark reviewed = true trong state
    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, reviewed: true } : o)
    );

    // Chuyển sang tab "Đã đánh giá"
    setSearchParams({ tab: 'reviewed' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearchSubmit={() =>
          navigate(searchValue.trim()
            ? `/search?q=${encodeURIComponent(searchValue)}`
            : '/search')
        }
      />

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate('/customer/profile')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
            title="Quay lại trang cá nhân"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Đơn mua của tôi</h1>
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-none">
            {TABS.map(t => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setSearchParams({ tab: t.key })}
                  className={`flex flex-col items-center gap-1.5 px-4 py-3.5 flex-1 min-w-[80px] transition-all relative ${
                    isActive ? `${t.color} ${t.bg}` : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {/* Active underline */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-current rounded-t-full" />
                  )}

                  {/* Icon + badge */}
                  <div className="relative">
                    {t.icon}
                    {counts[t.key] > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                        {counts[t.key]}
                      </span>
                    )}
                  </div>

                  <span className={`text-[10px] font-semibold leading-tight text-center ${isActive ? '' : 'text-gray-400'}`}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-52 gap-4">
            <div
              className="w-10 h-10 rounded-full border-[3px] border-gray-100 animate-spin"
              style={{ borderTopColor: '#06b6d4' }}
            />
            <p className="text-sm text-gray-400">Đang tải đơn hàng…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 gap-4 bg-white rounded-2xl border border-gray-100">
            <div className={`w-16 h-16 rounded-2xl ${tab.bg} ${tab.color} flex items-center justify-center`}>
              {tab.icon}
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-700">Chưa có đơn hàng</p>
              <p className="text-sm text-gray-400 mt-1">
                Không có đơn nào ở trạng thái "{tab.label}"
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-full text-white text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition-opacity shadow-md shadow-cyan-200"
            >
              Tiếp tục mua sắm
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                activeTab={activeTab}
                onReview={setReviewOrder}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Review Modal ── */}
      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSubmit={handleReviewSubmit}
        />
      )}

      <StoreFooter />
    </div>
  );
}