// frontend/src/app/pages/MyWalletPage.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import { API_BASE_URL } from '../services/api';

import { Card, CardContent } from '../components/ui/card';

// ─── Types ──────────────────────────────────────────────────────────────────
type WalletTransaction = {
  id: string;
  amount: number;
  type: 'REFUND' | 'TOPUP' | 'PAYMENT';
  description?: string;
  order_id?: string;
  reference_id?: string;
  created_at?: string;
  createdAt?: string;
};

type Wallet = {
  id: string;
  user_id: string;
  balance: number;
  created_at?: string;
  updated_at?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

const TX_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; sign: string }> = {
  REFUND:  { label: 'Hoàn tiền',  icon: '↩', color: 'text-purple-600', bg: 'bg-purple-50', sign: '+' },
  TOPUP:   { label: 'Nạp tiền',   icon: '⬆', color: 'text-green-600',  bg: 'bg-green-50',  sign: '+' },
  PAYMENT: { label: 'Thanh toán', icon: '💳', color: 'text-blue-600',   bg: 'bg-blue-50',   sign: '-' },
};

export default function MyWalletPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [topupAmount, setTopupAmount] = useState('');

  // Trạng thái thông báo sau khi nạp VNPay
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | null>(null);
  const [message, setMessage] = useState('');

  const fetchWallet = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/my-wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setWallet(json.data?.wallet ?? null);
      setTransactions(json.data?.transactions ?? []);
    } catch {
      setWallet(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Xử lý return từ VNPay sau khi nạp
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('payment_status');

    if (status) {
      if (status === 'success') {
        setPaymentStatus('success');
        setMessage('🎉 Nạp tiền vào ví thành công!');
        fetchWallet(); // Cập nhật số dư
      } else {
        setPaymentStatus('failed');
        setMessage('❌ Nạp tiền thất bại hoặc giao dịch bị hủy.');
      }
      // Xóa param trên URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchWallet]);

  const handleTopup = async () => {
    try {
      const amount = Number(topupAmount);
      
      if (!amount || amount < 10000) {
        alert('Số tiền tối thiểu là 10.000đ');
        return;
      }

      const authToken = localStorage.getItem('token');
      if (!authToken) {
        alert('Vui lòng đăng nhập lại');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/orders/wallet/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ amount }),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || 'Nạp tiền thất bại');
      }

      if (json.payUrl) {
        window.location.href = json.payUrl;
      } else {
        alert('Không nhận được link thanh toán từ VNPay');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Có lỗi xảy ra khi nạp tiền');
    }
  };

  useEffect(() => { void fetchWallet(); }, [fetchWallet]);

  const filtered = filterType === 'ALL'
    ? transactions
    : transactions.filter(t => t.type === filterType);

  const totalIn = transactions
    .filter(t => t.type === 'REFUND' || t.type === 'TOPUP')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalOut = transactions
    .filter(t => t.type === 'PAYMENT')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_42%,#f4fbff_100%)]">
      <StoreHeader
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearchSubmit={() => navigate(searchValue.trim() ? `/search?q=${encodeURIComponent(searchValue)}` : '/search')}
        showBackButton
      />

      <main className="mx-auto w-full max-w-screen-2xl px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/customer/profile')} className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Ví của tôi</h1>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-10 h-10 rounded-full border-[3px] border-gray-100 animate-spin" style={{ borderTopColor: '#8b5cf6' }} />
              <p className="text-sm text-gray-400">Đang tải ví…</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden">
              <div className="relative p-6 text-white" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)' }}>
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
                <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/5" />
                <div className="relative">
                  <p className="text-purple-200 text-xs font-medium mb-1">Số dư khả dụng</p>
                  <p className="text-4xl font-extrabold tracking-tight mb-5">
                    {fmt(Number(wallet?.balance ?? 0))}
                  </p>
                  <div className="flex items-center gap-6 text-sm">
                    <div><p className="text-purple-200 text-xs">Tổng nhận</p><p className="font-bold">+{fmt(totalIn)}</p></div>
                    <div className="w-px h-8 bg-white/20" />
                    <div><p className="text-purple-200 text-xs">Tổng chi</p><p className="font-bold">-{fmt(totalOut)}</p></div>
                    <div className="w-px h-8 bg-white/20" />
                    <div><p className="text-purple-200 text-xs">Giao dịch</p><p className="font-bold">{transactions.length}</p></div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="flex border-b border-gray-100">
                  {[
                    { key: 'ALL', label: 'Tất cả' },
                    { key: 'REFUND', label: 'Hoàn tiền' },
                    { key: 'TOPUP', label: 'Nạp tiền' },
                    { key: 'PAYMENT', label: 'Thanh toán' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setFilterType(f.key)}
                      className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${filterType === f.key ? 'text-purple-600 border-purple-500 bg-purple-50/50' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* NẠP TIỀN */}
                {filterType === 'TOPUP' && (
                  <div className="p-8 bg-white">
                    <div className="max-w-md mx-auto">
                      <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-3xl flex items-center justify-center text-5xl mb-4">💰</div>
                        <h2 className="text-2xl font-bold text-gray-900">Nạp tiền vào ví</h2>
                        <p className="text-gray-500 mt-1">Số tiền tối thiểu 10.000đ</p>
                      </div>

                      <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-600 mb-3 text-center">Nhập số tiền</label>
                        <div className="relative">
                          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-4xl text-purple-400">₫</div>
                          <input
                            type="number"
                            value={topupAmount}
                            onChange={(e) => setTopupAmount(e.target.value)}
                            placeholder="0"
                            className="w-full h-20 pl-16 pr-8 text-4xl font-semibold rounded-3xl border-2 border-gray-100 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 text-center"
                          />
                        </div>
                      </div>

                      <div className="mb-8">
                        <p className="text-sm font-medium text-gray-600 mb-4 text-center">Chọn nhanh</p>
                        <div className="grid grid-cols-3 gap-3">
                          {[50000, 100000, 200000, 500000, 1000000, 2000000].map((amt) => (
                            <button
                              key={amt}
                              onClick={() => setTopupAmount(String(amt))}
                              className={`py-4 rounded-2xl font-semibold border transition-all ${Number(topupAmount) === amt ? 'bg-purple-600 text-white border-purple-600' : 'bg-white hover:bg-purple-50 border-gray-200'}`}
                            >
                              {fmt(amt)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handleTopup}
                        disabled={!topupAmount || Number(topupAmount) < 10000}
                        className="w-full h-16 rounded-3xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xl disabled:bg-gray-300"
                      >
                        Tiếp tục nạp tiền từ VNPAY
                      </button>
                    </div>
                  </div>
                )}

                {/* Danh sách giao dịch */}
                {filterType !== 'TOPUP' && (
                  filtered.length === 0 ? (
                    <div className="py-16 text-center">
                      <p className="text-4xl mb-3">💸</p>
                      <p className="text-gray-400">Chưa có giao dịch nào</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filtered.map(tx => {
                        const cfg = TX_CONFIG[tx.type] || { label: tx.type, icon: '?', bg: 'bg-gray-50', sign: '' };
                        const isPositive = tx.type === 'REFUND' || tx.type === 'TOPUP';
                        return (
                          <div key={tx.id} onClick={() => navigate(`/my-wallet/transaction/${tx.id}`)} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer">
                            <div className={`w-11 h-11 rounded-2xl ${cfg.bg} flex items-center justify-center text-2xl`}>{cfg.icon}</div>
                            <div className="flex-1">
                              <p className="font-semibold">{cfg.label}</p>
                              <p className="text-xs text-gray-400">{fmtDate(tx.createdAt || tx.created_at)}</p>
                            </div>
                            <p className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                              {cfg.sign}{fmt(Number(tx.amount))}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <StoreFooter />

      {/* Popup thông báo sau nạp */}
      {paymentStatus && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="text-6xl mb-4">{paymentStatus === 'success' ? '🎉' : '❌'}</div>
            <h2 className="text-2xl font-bold mb-2">{paymentStatus === 'success' ? 'Thành công!' : 'Thất bại'}</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button onClick={() => setPaymentStatus(null)} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-semibold">
              Quay về Ví
            </button>
          </div>
        </div>
      )}
    </div>
  );
}