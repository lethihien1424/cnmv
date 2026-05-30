// D:\CongNgheMoi-hien\CongNgheMoi\frontend\src\app\pages\OrderHistoryPage.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import { API_BASE_URL } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
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
  recipient_name?: string;
  recipient_phone?: string;
  created_at: string;
  items: OrderDetail[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const getImg = (item: OrderDetail, base: string) => {
  const src = item.product?.image_url || item.product?.images?.[0];
  if (!src) return null;
  if (src.startsWith('http')) return src;
  return `${base.replace('/api', '')}${src}`;
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; textCls: string; bgCls: string; dot: string }> = {
  PENDING:   { label: 'Chờ xác nhận', textCls: 'text-amber-700',  bgCls: 'bg-amber-50',  dot: 'bg-amber-400' },
  PICKUP:    { label: 'Chờ lấy hàng', textCls: 'text-blue-700',   bgCls: 'bg-blue-50',   dot: 'bg-blue-500'  },
  SHIPPING:  { label: 'Đang giao',    textCls: 'text-cyan-700',   bgCls: 'bg-cyan-50',   dot: 'bg-cyan-500'  },
  DELIVERED: { label: 'Đã giao',      textCls: 'text-green-700',  bgCls: 'bg-green-50',  dot: 'bg-green-500' },
  CANCELLED: { label: 'Đã hủy',       textCls: 'text-red-600',    bgCls: 'bg-red-50',    dot: 'bg-red-400'   },
};

const PAYMENT_CONFIG: Record<string, { label: string; cls: string }> = {
  PAID:   { label: '✓ Đã thanh toán',   cls: 'bg-green-100 text-green-700' },
  UNPAID: { label: '⏳ Chưa thanh toán', cls: 'bg-yellow-100 text-yellow-700' },
  FAILED: { label: '✗ Thất bại',        cls: 'bg-red-100 text-red-600' },
};

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order }: { order: Order }) {
  const navigate = useNavigate();
  const statusCfg  = STATUS_CONFIG[order.order_status]  ?? { label: order.order_status, textCls: 'text-gray-600', bgCls: 'bg-gray-50', dot: 'bg-gray-400' };
  const paymentCfg = PAYMENT_CONFIG[order.payment_status] ?? { label: order.payment_status, cls: 'bg-gray-100 text-gray-600' };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          {/* Status dot */}
          <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.bgCls} ${statusCfg.textCls}`}>
            {statusCfg.label}
          </span>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${paymentCfg.cls}`}>
            {paymentCfg.label}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-400 font-mono">#{order.id.slice(-8).toUpperCase()}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(order.created_at)}</p>
        </div>
      </div>

      {/* ── Items list ── */}
      <div className="divide-y divide-gray-50">
        {order.items.map(item => {
          const img = getImg(item, API_BASE_URL);
          return (
            <div 
              key={item.id} 
              className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-gray-50/60 transition-colors"
              onClick={() => item.product?.id && navigate(`/product/${item.product.id}`)}
              title="Xem sản phẩm"
            >
              <div className="w-[60px] h-[60px] rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                {img
                  ? <img src={img} alt={item.product?.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate hover:text-cyan-600 transition-colors">
                  {item.product?.name ?? 'Sản phẩm'}
                </p>
                {(item.size || item.color) && (
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
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
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  x{item.quantity} · {fmt(Number(item.price_at_buy))} / cái
                </p>
              </div>
              <p className="text-sm font-bold text-gray-800 flex-shrink-0" onClick={e => e.stopPropagation()}>
                {fmt(Number(item.price_at_buy) * item.quantity)}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-gray-50 bg-gray-50/40">
        {/* Address */}
        {order.shipping_address && (
          <p className="text-xs text-gray-400 flex items-center gap-1.5 min-w-0 flex-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-gray-300">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="truncate">{order.shipping_address}</span>
          </p>
        )}

        {/* Total */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
          <div className="text-right">
            <p className="text-xs text-gray-400">
              Ship: <span className="text-gray-600">{fmt(Number(order.shipping_fee))}</span>
            </p>
            <p className="text-sm font-extrabold text-red-500">
              {fmt(Number(order.total_amount))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrderHistoryPage() {
  const { token }  = useAuth();
  const navigate   = useNavigate();
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [loading,   setLoading]   = useState(true);

  // ── Fetch all orders, sorted newest first ──
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

      // Sort: newest first (by created_at desc)
      list.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setOrders(list);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  const filtered = orders;

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader />

      <main className="mx-auto w-full max-w-screen-2xl px-4 py-6">

        {/* ── Page header ── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/customer/profile')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shadow-sm"
            title="Quay lại trang cá nhân"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Lịch sử mua hàng</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {loading ? 'Đang tải…' : `${orders.length} đơn hàng · mới nhất lên đầu`}
            </p>
          </div>
        </div>


        {/* ── Content ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-56 gap-4">
            <div
              className="w-10 h-10 rounded-full border-[3px] border-gray-100 animate-spin"
              style={{ borderTopColor: '#06b6d4' }}
            />
            <p className="text-sm text-gray-400">Đang tải lịch sử mua hàng…</p>
          </div>

        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 gap-4 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 rounded-2xl bg-cyan-50 text-cyan-400 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-700">Chưa có đơn hàng nào</p>
              <p className="text-sm text-gray-400 mt-1">Hãy mua sắm để tạo đơn hàng đầu tiên!</p>
            </div>
          </div>

        ) : (
          <>
            {/* Cards */}
            <div className="space-y-3">
              {filtered.map((order, idx) => (
                <div
                  key={order.id}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <OrderCard order={order} />
                </div>
              ))}
            </div>
          </>
        )}

      </main>

      <StoreFooter />
    </div>
  );
}