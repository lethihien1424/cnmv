// frontend/src/app/pages/MyWalletPage.tsx
// frontend/src/app/pages/MyWalletPage.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import { API_BASE_URL } from '../services/api';
import { Card, CardContent } from '../components/ui/card';

type TxType = 'REFUND' | 'TOPUP' | 'PAYMENT' | 'WITHDRAW';

type WalletTransaction = {
  id: string;
  amount: number;
  type: TxType;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED';
  description?: string;
  order_id?: string;
  transfer_content?: string;
  qr_url?: string;
  expires_at?: string;
  paid_at?: string;
  created_at?: string;
  createdAt?: string;
};

type Wallet = {
  id: string;
  user_id: string;
  balance: number;
  bank_code?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_holder?: string | null;
  created_at?: string;
  updated_at?: string;
};

type TopupQr = {
  transaction_id: string;
  amount: number;
  status: string;
  transfer_content: string;
  qr_url: string;
  expires_at?: string;
  receiver_name?: string | null;
  receiver_bank_name?: string | null;
  receiver_account_number?: string | null;
};

const BANKS = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'CTG', name: 'VietinBank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'MB', name: 'MB Bank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'EIB', name: 'Eximbank' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'OCB', name: 'OCB' },
  { code: 'SHB', name: 'SHB' },
  { code: 'MSB', name: 'MSB' },
  { code: 'LPB', name: 'LPBank' },
  { code: 'NAB', name: 'Nam A Bank' },
  { code: 'BAB', name: 'Bac A Bank' },
  { code: 'ABB', name: 'ABBank' },
  { code: 'SEAB', name: 'SeABank' },
  { code: 'PGB', name: 'PGBank' },
  { code: 'KLB', name: 'KienlongBank' },
  { code: 'VAB', name: 'VietABank' },
  { code: 'BVB', name: 'BaoVietBank' },
  { code: 'VCCB', name: 'VietCapitalBank' },
  { code: 'SCB', name: 'SCB' },
  { code: 'PVCB', name: 'PVcomBank' },
  { code: 'GPB', name: 'GPBank' },
  { code: 'OCEANBANK', name: 'OceanBank' },
  { code: 'VRB', name: 'VRB' },
  { code: 'CBB', name: 'CBBank' },
  { code: 'IVB', name: 'Indovina Bank' },
  { code: 'UOB', name: 'UOB Việt Nam' },
  { code: 'HSBC', name: 'HSBC Việt Nam' },
  { code: 'CIMB', name: 'CIMB Việt Nam' },
  { code: 'WOORI', name: 'Woori Bank Việt Nam' },
  { code: 'SHBVN', name: 'Shinhan Bank Việt Nam' },
  { code: 'PUBLICBANK', name: 'Public Bank Việt Nam' },
];
const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TX_CONFIG: Record<TxType, { label: string; icon: string; color: string; bg: string; sign: string }> = {
  REFUND: { label: 'Hoàn tiền', icon: '↩', color: 'text-purple-600', bg: 'bg-purple-50', sign: '+' },
  TOPUP: { label: 'Nạp tiền', icon: '⬆', color: 'text-green-600', bg: 'bg-green-50', sign: '+' },
  PAYMENT: { label: 'Thanh toán', icon: '💳', color: 'text-blue-600', bg: 'bg-blue-50', sign: '-' },
  WITHDRAW: { label: 'Rút tiền', icon: '🏦', color: 'text-orange-600', bg: 'bg-orange-50', sign: '-' },
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
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [topupQr, setTopupQr] = useState<TopupQr | null>(null);

  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');

  const [message, setMessage] = useState('');
const [showBankForm, setShowBankForm] = useState(false);
  const fetchWallet = useCallback(async () => {
    if (!token) return;

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/orders/my-wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Không tải được ví');
      }

      const currentWallet: Wallet | null = json.data?.wallet ?? null;

      setWallet(currentWallet);
      setTransactions(json.data?.transactions ?? []);

      if (currentWallet) {
        setBankCode(currentWallet.bank_code || '');
        setBankName(currentWallet.bank_name || '');
        setBankAccountNumber(currentWallet.bank_account_number || '');
        setBankAccountHolder(currentWallet.bank_account_holder || '');
      }
    } catch {
      setWallet(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    if (!topupQr || !token) return;

    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/orders/wallet/topup/${topupQr.transaction_id}/status`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const json = await res.json();

        if (!res.ok || !json.success) return;

        if (json.data?.status === 'SUCCESS') {
  setMessage('🎉 Nạp tiền vào ví thành công!');
  setTopupQr(null);
  setTopupAmount('');
  setFilterType('ALL');
  await fetchWallet();
}

        if (json.data?.status === 'FAILED') {
          setMessage('❌ Nạp tiền thất bại hoặc đã hết hạn.');
          setTopupQr(null);
          await fetchWallet();
        }
      } catch {
        // bỏ qua lỗi poll tạm thời
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [topupQr, token, fetchWallet]);

  const handleBankChange = (code: string) => {
    const bank = BANKS.find((b) => b.code === code);
    setBankCode(code);
    setBankName(bank?.name || '');
  };

  const handleLinkBank = async () => {
    try {
      if (!bankCode || !bankName || !bankAccountNumber || !bankAccountHolder) {
        alert('Vui lòng nhập đầy đủ thông tin ngân hàng');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/orders/wallet/bank-account`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bank_code: bankCode,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_holder: bankAccountHolder,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Liên kết tài khoản thất bại');
      }

      setMessage('✅ Liên kết tài khoản ngân hàng thành công');
      setShowBankForm(false);
      await fetchWallet();
    } catch (err: any) {
      alert(err.message || 'Có lỗi khi liên kết ngân hàng');
    }
  };

  const handleTopup = async () => {
    try {
      const amount = Number(topupAmount);

      if (!amount || amount < 10000) {
        alert('Số tiền nạp tối thiểu là 10.000đ');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/orders/wallet/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Tạo mã QR nạp ví thất bại');
      }

      setTopupQr(json.data);
      setMessage('');
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra khi nạp tiền');
    }
  };

  const handleWithdraw = async () => {
    try {
      const amount = Number(withdrawAmount);

      if (!amount || amount < 10000) {
        alert('Số tiền rút tối thiểu là 10.000đ');
        return;
      }

      if (!wallet?.bank_account_number) {
        alert('Vui lòng liên kết tài khoản ngân hàng trước khi rút tiền');
        setFilterType('BANK');
        return;
      }

      if (amount > Number(wallet?.balance || 0)) {
        alert('Số dư ví không đủ');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/orders/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Rút tiền thất bại');
      }

      setWithdrawAmount('');
      setMessage('✅ Đã tạo yêu cầu rút tiền. Vui lòng chờ admin xử lý.');
      await fetchWallet();
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra khi rút tiền');
    }
  };

  const filtered =
    filterType === 'ALL' || filterType === 'BANK'
      ? transactions
      : transactions.filter((t) => t.type === filterType);

  const totalIn = transactions
    .filter((t) => t.type === 'REFUND' || t.type === 'TOPUP')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalOut = transactions
    .filter((t) => t.type === 'PAYMENT' || t.type === 'WITHDRAW')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_42%,#f4fbff_100%)]">
      <StoreHeader
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearchSubmit={() =>
          navigate(searchValue.trim() ? `/search?q=${encodeURIComponent(searchValue)}` : '/search')
        }
        showBackButton
      />

      <main className="mx-auto w-full max-w-screen-2xl px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customer/profile')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shadow-sm"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900">Ví của tôi</h1>
        </div>

        {message && (
          <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            {message}
          </div>
        )}

        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
              <div
                className="w-10 h-10 rounded-full border-[3px] border-gray-100 animate-spin"
                style={{ borderTopColor: '#8b5cf6' }}
              />
              <p className="text-sm text-gray-400">Đang tải ví…</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden">
              <div
                className="relative p-6 text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)' }}
              >
                <p className="text-purple-200 text-xs font-medium mb-1">Số dư khả dụng</p>
                <p className="text-4xl font-extrabold tracking-tight mb-5">
                  {fmt(Number(wallet?.balance ?? 0))}
                </p>

                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div>
                    <p className="text-purple-200 text-xs">Tổng nhận</p>
                    <p className="font-bold">+{fmt(totalIn)}</p>
                  </div>

                  <div>
                    <p className="text-purple-200 text-xs">Tổng chi</p>
                    <p className="font-bold">-{fmt(totalOut)}</p>
                  </div>

                  <div>
                    <p className="text-purple-200 text-xs">Giao dịch</p>
                    <p className="font-bold">{transactions.length}</p>
                  </div>

                  <div>
                    <p className="text-purple-200 text-xs">Ngân hàng</p>
                    <p className="font-bold">{wallet?.bank_name || 'Chưa liên kết'}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="flex border-b border-gray-100 overflow-x-auto">
                  {[
                    { key: 'ALL', label: 'Tất cả' },
                    { key: 'TOPUP', label: 'Nạp tiền' },
                    { key: 'WITHDRAW', label: 'Rút tiền' },
                    { key: 'BANK', label: 'Tài khoản' },
                    { key: 'REFUND', label: 'Hoàn tiền' },
                    { key: 'PAYMENT', label: 'Thanh toán' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilterType(f.key)}
                      className={`min-w-[120px] flex-1 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                        filterType === f.key
                          ? 'text-purple-600 border-purple-500 bg-purple-50/50'
                          : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {filterType === 'BANK' && (
  <div className="p-8 bg-white">
    <div className="max-w-lg mx-auto space-y-5">
      <h2 className="text-2xl font-bold text-gray-900 text-center">
        Tài khoản nhận tiền
      </h2>

      {wallet?.bank_account_number && !showBankForm ? (
        <div className="rounded-3xl border border-purple-100 bg-purple-50 p-6 space-y-4">
          <div>
            <p className="text-sm text-purple-500 font-semibold">Ngân hàng liên kết</p>
            <p className="text-xl font-bold text-gray-900">{wallet.bank_name}</p>
          </div>

          <div>
            <p className="text-sm text-purple-500 font-semibold">Số tài khoản</p>
            <p className="text-lg font-bold text-gray-900">{wallet.bank_account_number}</p>
          </div>

          <div>
            <p className="text-sm text-purple-500 font-semibold">Chủ tài khoản</p>
            <p className="text-lg font-bold text-gray-900">{wallet.bank_account_holder}</p>
          </div>

          <button
            onClick={() => setShowBankForm(true)}
            className="w-full h-12 rounded-2xl bg-purple-600 text-white font-bold"
          >
            Thay đổi tài khoản ngân hàng
          </button>
        </div>
      ) : (
        <>
          {wallet?.bank_account_number && (
            <button
              onClick={() => setShowBankForm(false)}
              className="w-full h-11 rounded-2xl border border-gray-200 text-gray-600 font-semibold"
            >
              Quay lại tài khoản đã liên kết
            </button>
          )}

          <select
            value={bankCode}
            onChange={(e) => handleBankChange(e.target.value)}
            className="w-full h-12 rounded-2xl border border-gray-200 px-4"
          >
            <option value="">Chọn ngân hàng</option>
            {BANKS.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>

          {bankName && (
            <div className="rounded-2xl bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700">
              Ngân hàng đã chọn: {bankName}
            </div>
          )}

          <input
            value={bankAccountNumber}
            onChange={(e) => setBankAccountNumber(e.target.value)}
            placeholder="Nhập số tài khoản"
            className="w-full h-12 rounded-2xl border border-gray-200 px-4"
          />

          <input
            value={bankAccountHolder}
            onChange={(e) => setBankAccountHolder(e.target.value.toUpperCase())}
            placeholder="Tên chủ tài khoản"
            className="w-full h-12 rounded-2xl border border-gray-200 px-4"
          />

          <button
            onClick={handleLinkBank}
            className="w-full h-14 rounded-2xl bg-purple-600 text-white font-bold"
          >
            Lưu tài khoản liên kết
          </button>
        </>
      )}
    </div>
  </div>
)}
                {filterType === 'TOPUP' && (
                  <div className="p-8 bg-white">
                    <div className="max-w-md mx-auto">
                      <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-3xl flex items-center justify-center text-5xl mb-4">
                          💰
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Nạp tiền vào ví</h2>
                        <p className="text-gray-500 mt-1">Số tiền tối thiểu 10.000đ</p>
                      </div>

                      {!topupQr ? (
                        <>
                          <div className="mb-8">
                            <label className="block text-sm font-medium text-gray-600 mb-3 text-center">
                              Nhập số tiền
                            </label>
                            <input
                              type="number"
                              value={topupAmount}
                              onChange={(e) => setTopupAmount(e.target.value)}
                              placeholder="0"
                              className="w-full h-20 px-8 text-4xl font-semibold rounded-3xl border-2 border-gray-100 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 text-center"
                            />
                          </div>

                          <div className="mb-8">
                            <p className="text-sm font-medium text-gray-600 mb-4 text-center">Chọn nhanh</p>
                            <div className="grid grid-cols-3 gap-3">
                              {[50000, 100000, 200000, 500000, 1000000, 2000000].map((amt) => (
                                <button
                                  key={amt}
                                  onClick={() => setTopupAmount(String(amt))}
                                  className={`py-4 rounded-2xl font-semibold border transition-all ${
                                    Number(topupAmount) === amt
                                      ? 'bg-purple-600 text-white border-purple-600'
                                      : 'bg-white hover:bg-purple-50 border-gray-200'
                                  }`}
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
                            Tạo mã QR nạp tiền
                          </button>
                        </>
                      ) : (
                        <div className="text-center space-y-4">
                          <img
                            src={topupQr.qr_url}
                            alt="QR nạp ví"
                            className="mx-auto w-72 h-72 rounded-3xl border border-gray-100 shadow-sm"
                          />

                          <div className="rounded-2xl bg-gray-50 p-4 text-left text-sm space-y-2">
                            <p><b>Số tiền:</b> {fmt(topupQr.amount)}</p>
                            <p><b>Nội dung CK:</b> {topupQr.transfer_content}</p>
                            <p><b>Ngân hàng nhận:</b> {topupQr.receiver_bank_name || '—'}</p>
                            <p><b>Số tài khoản:</b> {topupQr.receiver_account_number || '—'}</p>
                            <p><b>Chủ tài khoản:</b> {topupQr.receiver_name || '—'}</p>
                          </div>

                          <p className="text-sm text-gray-500">
                            Sau khi chuyển khoản thành công, hệ thống sẽ tự cập nhật số dư.
                          </p>

                          <button
                            onClick={() => setTopupQr(null)}
                            className="w-full h-12 rounded-2xl border border-gray-200 font-semibold"
                          >
                            Hủy mã QR này
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {filterType === 'WITHDRAW' && (
                  <div className="p-8 bg-white">
                    <div className="max-w-md mx-auto space-y-5">
                      <div className="text-center">
                        <div className="text-5xl mb-3">🏦</div>
                        <h2 className="text-2xl font-bold text-gray-900">Rút tiền về ngân hàng</h2>
                        <p className="text-gray-500 mt-1">Số tiền tối thiểu 10.000đ</p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                        <p className="text-gray-500">Tài khoản nhận</p>
                        {wallet?.bank_account_number ? (
                          <p className="font-bold text-gray-900">
                            {wallet.bank_name} - {wallet.bank_account_number}
                          </p>
                        ) : (
                          <p className="font-bold text-red-500">
                            Chưa liên kết tài khoản ngân hàng
                          </p>
                        )}
                      </div>

                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Nhập số tiền muốn rút"
                        className="w-full h-16 rounded-3xl border-2 border-gray-100 px-5 text-xl font-semibold text-center"
                      />

                      <button
                        onClick={handleWithdraw}
                        disabled={!withdrawAmount || Number(withdrawAmount) < 10000}
                        className="w-full h-14 rounded-2xl bg-orange-500 text-white font-bold disabled:bg-gray-300"
                      >
                        Gửi yêu cầu rút tiền
                      </button>
                    </div>
                  </div>
                )}

                {filterType !== 'TOPUP' && filterType !== 'WITHDRAW' && filterType !== 'BANK' && (
                  filtered.length === 0 ? (
                    <div className="py-16 text-center">
                      <p className="text-4xl mb-3">💸</p>
                      <p className="text-gray-400">Chưa có giao dịch nào</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filtered.map((tx) => {
                        const cfg = TX_CONFIG[tx.type] || {
                          label: tx.type,
                          icon: '?',
                          bg: 'bg-gray-50',
                          color: 'text-gray-600',
                          sign: '',
                        };

                        const isPositive = tx.type === 'REFUND' || tx.type === 'TOPUP';

                        return (
                          <div
                            key={tx.id}
                            onClick={() => navigate(`/my-wallet/transaction/${tx.id}`)}
                            className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer"
                          >
                            <div className={`w-11 h-11 rounded-2xl ${cfg.bg} flex items-center justify-center text-2xl`}>
                              {cfg.icon}
                            </div>

                            <div className="flex-1">
                              <p className="font-semibold">{cfg.label}</p>
                              <p className="text-xs text-gray-400">
                                {fmtDate(tx.createdAt || tx.created_at)}
                              </p>
                              {tx.status === 'PENDING' && (
                                <p className="text-xs text-orange-500 font-semibold">Đang xử lý</p>
                              )}
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
    </div>
  );
}