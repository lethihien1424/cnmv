import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import { API_BASE_URL } from '../services/api';

type WalletTransaction = {
  id: string;
  amount: number;
  type: 'REFUND' | 'TOPUP' | 'PAYMENT';
  description?: string;
  order_id?: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const TX_CONFIG: Record<string, { label: string; icon: string; gradient: string }> = {
  REFUND:  { label: 'Hoàn tiền',  icon: '↩', gradient: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)' },
  TOPUP:   { label: 'Nạp tiền',   icon: '⬆', gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' },
  PAYMENT: { label: 'Thanh toán', icon: '💳', gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' },
};

export default function WalletTransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [tx, setTx] = useState<WalletTransaction | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTx = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/my-wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const transactions: WalletTransaction[] = json.data?.transactions ?? [];
      const found = transactions.find(t => t.id === id);
      setTx(found ?? null);
    } catch {
      setTx(null);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => { void fetchTx(); }, [fetchTx]);

  const cfg = tx ? (TX_CONFIG[tx.type] ?? { label: tx.type, icon: '?', gradient: '#6b7280' }) : null;
  const isPositive = tx?.type !== 'PAYMENT';

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader showBackButton />

      <main className="mx-auto w-full max-w-lg px-4 py-6 space-y-6">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/my-wallet')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Chi tiết giao dịch</h1>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-10 h-10 rounded-full border-[3px] border-gray-100 animate-spin" style={{ borderTopColor: '#7c3aed' }} />
            <p className="text-sm text-gray-400">Đang tải…</p>
          </div>
        ) : !tx || !cfg ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500 font-medium">Không tìm thấy giao dịch</p>
            <button onClick={() => navigate('/my-wallet')}
              className="px-5 py-2 rounded-full bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors">
              Quay lại ví
            </button>
          </div>
        ) : (
          <>
            {/* Header card */}
            <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: cfg.gradient }}>
              <div className="relative p-6 text-white">
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
                <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/5" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
                      {cfg.icon}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{cfg.label}</p>
                      <p className="text-xs opacity-75">{fmtDate(tx.createdAt || tx.created_at)}</p>
                    </div>
                  </div>
                  <p className={`text-4xl font-extrabold tracking-tight ${isPositive ? 'text-green-300' : 'text-red-300'}`}>
                    {isPositive ? '+' : '-'}{fmt(Number(tx.amount))}
                  </p>
                </div>
              </div>
            </div>

            {/* Detail rows */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">Thông tin giao dịch</p>
              </div>
              <div className="divide-y divide-gray-50">

                <div className="flex justify-between items-center px-5 py-3.5">
                  <span className="text-sm text-gray-500">Loại giao dịch</span>
                  <span className="text-sm font-semibold text-gray-800">{cfg.label}</span>
                </div>

                <div className="flex justify-between items-center px-5 py-3.5">
                  <span className="text-sm text-gray-500">Trạng thái</span>
                  <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Thành công
                  </span>
                </div>

                <div className="flex justify-between items-center px-5 py-3.5">
                  <span className="text-sm text-gray-500">Số tiền</span>
                  <span className={`text-sm font-extrabold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                    {isPositive ? '+' : '-'}{fmt(Number(tx.amount))}
                  </span>
                </div>

                {tx.description && (
                  <div className="flex justify-between items-start px-5 py-3.5">
                    <span className="text-sm text-gray-500 flex-shrink-0">Mô tả</span>
                    <span className="text-sm font-medium text-gray-800 text-right max-w-[60%]">{tx.description}</span>
                  </div>
                )}

                {tx.order_id && (
                  <div className="flex justify-between items-center px-5 py-3.5">
                    <span className="text-sm text-gray-500">Mã đơn hàng</span>
                    <span className="text-xs font-mono text-purple-600 text-right max-w-[60%] break-all">
                      #{tx.order_id}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center px-5 py-3.5">
                  <span className="text-sm text-gray-500">Thời gian</span>
                  <span className="text-sm font-medium text-gray-800">{fmtDate(tx.createdAt || tx.created_at)}</span>
                </div>

                <div className="flex justify-between items-center px-5 py-3.5">
                  <span className="text-sm text-gray-500">Mã giao dịch</span>
                  <span className="text-xs font-mono text-gray-400 text-right max-w-[60%] break-all">{tx.id}</span>
                </div>

              </div>
            </div>

            {/* Action buttons - Cùng 1 dòng */}
            <div className="flex flex-col sm:flex-row gap-3">
              {tx.order_id && (
                <button
                  onClick={() => navigate(`/orders/${tx.order_id}`)}
                  className="flex-1 h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  Xem đơn hàng
                </button>
              )}
              
              <button
                onClick={() => navigate('/my-wallet')}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Quay lại ví
              </button>
            </div>
          </>
        )}
      </main>

      <StoreFooter />
    </div>
  );
}