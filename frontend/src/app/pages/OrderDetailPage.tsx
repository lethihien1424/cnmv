// frontend/src/app/pages/OrderDetailPage.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import { API_BASE_URL } from '../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────
type OrderDetail = {
  id: string;
  product_id: string;
  quantity: number;
  price_at_buy: number;
  size?: string | null;
  color?: string | null;
  product?: {
    id: string;
    name: string;
    images?: string[];
    image_url?: string;
    is_bulky?: boolean;
  };
};

type Order = {
  id: string;
  order_status: 'PENDING' | 'PICKUP' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  payment_status: 'UNPAID' | 'PAID' | 'FAILED' | 'REFUNDED';
  payment_method: string;
  total_amount: number;
  shipping_fee: number;
  distance_km?: number;
  estimated_delivery_time?: string;
  shipping_address?: string;
  createdAt?: string;
  created_at?: string;
  cancel_reason?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  items: OrderDetail[];
  is_reviewed?: boolean;
};

// ─── Lý do hủy đơn (khách hàng) ───────────────────────────────────────────
const CUSTOMER_CANCEL_REASONS: { code: string; label: string }[] = [
  { code: 'CHANGED_MIND',          label: 'Không còn nhu cầu' },
  { code: 'ORDERED_BY_MISTAKE',    label: 'Đặt nhầm sản phẩm' },
  { code: 'FOUND_BETTER_PRICE',    label: 'Tìm được giá tốt hơn' },
  { code: 'WANT_TO_CHANGE_PRODUCT',label: 'Muốn đổi sản phẩm khác' },
  { code: 'WANT_TO_CHANGE_ADDRESS',label: 'Muốn đổi địa chỉ nhận hàng' },
  { code: 'SHIPPING_FEE_TOO_HIGH', label: 'Phí vận chuyển quá cao' },
  { code: 'DUPLICATE_ORDER',       label: 'Đặt trùng đơn' },
  { code: 'STORE_UNRESPONSIVE',    label: 'Shop phản hồi chậm' },
  { code: 'OTHER',                 label: 'Lý do khác' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getImg = (item: OrderDetail, base: string) => {
  const src = item.product?.image_url || item.product?.images?.[0];
  if (!src) return null;
  if (src.startsWith('http')) return src;
  return `${base.replace('/api', '')}${src}`;
};

const STATUS_MAP: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING:   { label: 'Chờ xác nhận', cls: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-400' },
  PICKUP:    { label: 'Chờ lấy hàng', cls: 'bg-blue-100 text-blue-700 border-blue-200',      dot: 'bg-blue-400' },
  SHIPPING:  { label: 'Đang giao',    cls: 'bg-cyan-100 text-cyan-700 border-cyan-200',      dot: 'bg-cyan-400' },
  DELIVERED: { label: 'Đã giao',      cls: 'bg-green-100 text-green-700 border-green-200',   dot: 'bg-green-400' },
  CANCELLED: { label: 'Đã hủy',       cls: 'bg-red-100 text-red-600 border-red-200',         dot: 'bg-red-400' },
  REFUNDED:  { label: 'Hoàn tiền',    cls: 'bg-purple-100 text-purple-700 border-purple-200',dot: 'bg-purple-400' },
};

const CANCEL_REASON_MAP: Record<string, string> = {
  CHANGED_MIND: 'Không còn nhu cầu',
  ORDERED_BY_MISTAKE: 'Đặt nhầm sản phẩm',
  FOUND_BETTER_PRICE: 'Tìm được giá tốt hơn',
  WANT_TO_CHANGE_PRODUCT: 'Muốn đổi sản phẩm khác',
  WANT_TO_CHANGE_ADDRESS: 'Muốn đổi địa chỉ nhận hàng',
  SHIPPING_FEE_TOO_HIGH: 'Phí vận chuyển quá cao',
  DUPLICATE_ORDER: 'Đặt trùng đơn',
  STORE_UNRESPONSIVE: 'Shop phản hồi chậm',
  OUT_OF_STOCK: 'Hết hàng',
  WRONG_PRICE: 'Sai giá sản phẩm',
  UNAVAILABLE_VARIANT: 'Hết size/màu đã chọn',
  DELIVERY_UNSUPPORTED: 'Không hỗ trợ giao tới khu vực này',
  PRODUCT_DAMAGED: 'Sản phẩm bị lỗi/hư hỏng',
  STORE_TEMP_CLOSED: 'Shop tạm ngưng hoạt động',
  UNABLE_TO_CONTACT: 'Không liên lạc được khách',
  SUSPECTED_FRAUD: 'Đơn hàng bất thường',
  SHIPPING_DELAY: 'Không thể giao đúng thời gian',
  OTHER: 'Lý do khác',
};

// ─── Timeline steps ─────────────────────────────────────────────────────────
const STEPS = ['PENDING', 'PICKUP', 'SHIPPING', 'DELIVERED'];
const STEP_LABELS: Record<string, string> = {
  PENDING: 'Đặt hàng', PICKUP: 'Xác nhận', SHIPPING: 'Giao hàng', DELIVERED: 'Hoàn thành',
};

function OrderTimeline({ status }: { status: string }) {
  const isCancelled = status === 'CANCELLED' || status === 'REFUNDED';
  const activeIdx = STEPS.indexOf(status);

  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((step, i) => {
        const done = !isCancelled && activeIdx >= i;
        const active = !isCancelled && activeIdx === i;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all
                ${done ? 'bg-cyan-500 border-cyan-500 text-white' : 'bg-white border-gray-200 text-gray-300'}
                ${active ? 'ring-4 ring-cyan-100' : ''}`}>
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (i + 1)}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${done ? 'text-cyan-600' : 'text-gray-300'}`}>
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-4 ${done && activeIdx > i ? 'bg-cyan-500' : 'bg-gray-100'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Cancel Modal ────────────────────────────────────────────────────────────
function CancelModal({
  onClose,
  onConfirm,
  isVnpay,
}: {
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isVnpay: boolean;
}) {
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await onConfirm(selected);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900">Hủy đơn hàng</h3>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-100 transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          </div>
          {isVnpay && (
            <div className="mt-2 flex items-start gap-2 bg-purple-50 rounded-lg p-2.5 text-xs text-purple-700">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Đơn thanh toán VNPAY — tiền sẽ được hoàn vào Ví của bạn sau khi hủy.
            </div>
          )}
        </div>

        {/* Reasons */}
        <div className="px-5 py-4 max-h-72 overflow-y-auto">
          <p className="text-xs text-gray-500 mb-3 font-medium">Vui lòng chọn lý do hủy đơn</p>
          <div className="space-y-2">
            {CUSTOMER_CANCEL_REASONS.map(r => (
              <button
                key={r.code}
                onClick={() => setSelected(r.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all
                  ${selected === r.code
                    ? 'border-red-400 bg-red-50 text-red-700 font-semibold'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                  ${selected === r.code ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                  {selected === r.code && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Giữ đơn
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || loading}
            className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-50 transition-colors"
          >
            {loading ? 'Đang xử lý…' : 'Xác nhận hủy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const fetchOrder = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setOrder(json.data ?? null);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => { void fetchOrder(); }, [fetchOrder]);

  const handleCancel = async (reason: string) => {
    if (!token || !id) return;
    const res = await fetch(`${API_BASE_URL}/orders/${id}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cancel_reason: reason, cancelled_by: 'CUSTOMER' }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Hủy đơn thất bại');
    setShowCancelModal(false);
    await fetchOrder();
  };

  const canCancel = order?.order_status === 'PENDING' || order?.order_status === 'PICKUP';
  const isVnpay = order?.payment_method === 'VNPAY' && order?.payment_status === 'PAID';

  const statusInfo = order ? (STATUS_MAP[order.order_status] ?? { label: order.order_status, cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearchSubmit={() => navigate(searchValue.trim() ? `/search?q=${encodeURIComponent(searchValue)}` : '/search')}
      />

      <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-4">
        {/* Back button + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Chi tiết đơn hàng</h1>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-10 h-10 rounded-full border-[3px] border-gray-100 animate-spin" style={{ borderTopColor: '#06b6d4' }} />
            <p className="text-sm text-gray-400">Đang tải đơn hàng…</p>
          </div>
        ) : !order ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500 font-medium">Không tìm thấy đơn hàng</p>
            <button onClick={() => navigate('/orders')} className="px-5 py-2 rounded-full bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-600 transition-colors">
              Quay lại
            </button>
          </div>
        ) : (
          <>
            {/* Status card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 font-mono">Đơn #{order.id}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDate(order.createdAt || order.created_at)}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${statusInfo!.cls}`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${statusInfo!.dot}`} />
                  {statusInfo!.label}
                </span>
              </div>

              {/* Timeline */}
              {order.order_status !== 'CANCELLED' && order.order_status !== 'REFUNDED' && (
                <OrderTimeline status={order.order_status} />
              )}

              {/* Cancel info */}
             {(order.order_status === 'CANCELLED' ||
  order.order_status === 'REFUNDED') && (
  <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
    <h3 className="font-semibold text-red-700 mb-2">
      Thông tin hủy đơn
    </h3>

    <div className="space-y-1 text-sm">
      <p>
        <span className="font-medium">
          Trạng thái:
        </span>{" "}
        {order.order_status === 'REFUNDED'
          ? 'Đã hoàn tiền'
          : 'Đã hủy'}
      </p>

      <p>
        <span className="font-medium">
                    Người hủy:
                    </span>{" "}
                    {order.cancelled_by === 'STORE'
                    ? 'Shop'
                    : 'Khách hàng'}
                </p>

                <p>
                    <span className="font-medium">
                    Lý do:
                    </span>{" "}
                    {CANCEL_REASON_MAP[
                    order.cancel_reason || ''
                    ] || order.cancel_reason}
                </p>

                {order.cancelled_at && (
                    <p>
                    <span className="font-medium">
                        Thời gian:
                    </span>{" "}
                    {fmtDate(order.cancelled_at)}
                    </p>
                )}
                </div>
            </div>
            )}
            </div>

            {/* Products */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">Sản phẩm đã đặt</p>
              </div>
              <div className="divide-y divide-gray-50">
                {order.items.map(item => {
                  const img = getImg(item, API_BASE_URL);
                  return (
                    <div key={item.id} className="flex gap-4 px-5 py-4">
                      <div className="w-[72px] h-[72px] rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                        {img
                          ? <img src={img} alt={item.product?.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2">{item.product?.name ?? 'Sản phẩm'}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {item.size && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                              Size: {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-pink-50 text-pink-600 border border-pink-100">
                              Màu: {item.color}
                            </span>
                          )}
                          {item.product?.is_bulky && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100">
                              ⚠ Cồng kềnh
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">x{item.quantity}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-bold text-gray-800">
                          {fmt(Number(item.price_at_buy) * item.quantity)}
                        </p>
                        <p className="text-[11px] text-gray-400">{fmt(Number(item.price_at_buy))} / cái</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shipping + Payment info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                  Địa chỉ nhận hàng
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">{order.shipping_address ?? '—'}</p>
                {order.distance_km && (
                  <p className="text-xs text-gray-400 mt-2">Khoảng cách: {order.distance_km} km</p>
                )}
                {order.estimated_delivery_time && (
                  <p className="text-xs text-gray-400">Dự kiến giao: {order.estimated_delivery_time}</p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  Thanh toán
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phương thức</span>
                    <span className="font-semibold text-gray-800">{order.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Trạng thái</span>
                    <span className={`font-semibold ${order.payment_status === 'PAID' ? 'text-green-600' : order.payment_status === 'REFUNDED' ? 'text-purple-600' : 'text-amber-600'}`}>
                      {order.payment_status === 'PAID' ? '✓ Đã thanh toán' : order.payment_status === 'REFUNDED' ? '↩ Đã hoàn tiền' : '⏳ Chưa thanh toán'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phí vận chuyển</span>
                    <span className="font-medium text-gray-700">{fmt(Number(order.shipping_fee))}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-800">Tổng cộng</span>
                    <span className="font-extrabold text-red-500 text-base">{fmt(Number(order.total_amount))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row gap-3">
              {/* Xem sản phẩm — navigate đến sản phẩm đầu tiên */}
              <button
                onClick={() => {
                  const pid = order.items[0]?.product?.id;
                  if (pid) navigate(`/product/${pid}`);
                }}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border border-cyan-200 text-cyan-600 text-sm font-bold hover:bg-cyan-50 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
                Xem sản phẩm
              </button>

              {/* Hủy đơn — chỉ hiện khi PENDING hoặc PICKUP */}
              {canCancel && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  Hủy đơn hàng
                </button>
              )}
            </div>
          </>
        )}
      </main>

      {showCancelModal && (
        <CancelModal
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancel}
          isVnpay={!!isVnpay}
        />
      )}

      <StoreFooter />
    </div>
  );
}