import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import voucherService from '../services/voucherService';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import { Ticket, ChevronLeft, Clock, Gift, CheckCircle } from 'lucide-react';

type UserVoucher = {
  id: string;
  voucher_id?: string;
  is_used: boolean;
  expires_at: string | null;
  voucher: {
    id: string;
    code: string;
    name: string;
    voucher_type: 'FIXED' | 'PERCENT' | 'FREESHIP';
    discount_value: number;
    max_discount_amount?: number;
    min_order_value: number;
    target_audience?: string;
    freeship_discount_percent?: number;
  };
};

export default function MyVoucherPage() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await voucherService.getMyVouchers();
      setVouchers(data || []);
    } catch (err: any) {
      setError(err.message || 'Không tải được kho voucher');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'Vô thời hạn';
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'Đã hết hạn';
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 24) return `Còn ${diffH} giờ`;
    return `Còn ${Math.floor(diffH / 24)} ngày`;
  };

  const discountLabel = (v: UserVoucher['voucher']) => {
    if (v.voucher_type === 'FREESHIP') return `🚚 Freeship ${v.freeship_discount_percent || 100}%`;
    if (v.voucher_type === 'PERCENT') {
      return `Giảm ${v.discount_value}%${v.max_discount_amount ? ` (tối đa ${formatMoney(v.max_discount_amount)})` : ''}`;
    }
    return `Giảm ${formatMoney(v.discount_value)}`;
  };

  const activeVouchers = vouchers.filter((v) => !v.is_used && !isExpired(v.expires_at));
  const usedOrExpired = vouchers.filter((v) => v.is_used || isExpired(v.expires_at));

  return (
    <div className="min-h-screen bg-zinc-50">
      <StoreHeader showBackButton />

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button 
            onClick={() => navigate(-1)} 
            className="p-3 rounded-2xl hover:bg-white active:bg-gray-100 transition-all"
          >
            <ChevronLeft className="size-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Kho Voucher</h1>
            <p className="text-gray-500 mt-1">{activeVouchers.length} voucher có thể sử dụng</p>
          </div>
        </div>

        {/* Tip cho khách mới */}
        <div className="mb-10 bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-100 rounded-3xl p-6 flex gap-4">
          <Gift className="size-7 text-emerald-500 mt-0.5 shrink-0" />
          <div className="text-sm leading-relaxed text-gray-600">
            Khách hàng mới sẽ được tặng voucher tự động.<br />
            Khách cũ hãy quay về <span className="text-emerald-600 font-medium cursor-pointer hover:underline" onClick={() => navigate('/')}>Trang chủ</span> để lưu thêm mã giảm giá.
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <Ticket className="size-14 animate-pulse mb-4" />
            <p>Đang tải kho voucher...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-6 text-center">
            {error}
          </div>
        )}

        {!loading && vouchers.length === 0 && (
          <div className="text-center py-20">
            <Ticket className="size-20 mx-auto mb-6 opacity-30" />
            <p className="text-2xl font-medium text-gray-700">Kho voucher trống</p>
            <p className="text-gray-500 mt-2">Mua sắm ngay để nhận thêm nhiều ưu đãi</p>
            <Button onClick={() => navigate('/')} className="mt-8 px-8">Về Trang Chủ</Button>
          </div>
        )}

        {/* Active Vouchers */}
        {activeVouchers.length > 0 && (
          <section className="mb-12">
            <h2 className="uppercase tracking-[1px] text-xs font-semibold text-emerald-600 mb-5 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              CÓ THỂ SỬ DỤNG ({activeVouchers.length})
            </h2>
            <div className="space-y-5">
              {activeVouchers.map((item) => (
                <VoucherCard
                  key={item.id}
                  item={item}
                  discountLabel={discountLabel(item.voucher)}
                  formatExpiry={formatExpiry}
                  formatMoney={formatMoney}
                  expired={false}
                />
              ))}
            </div>
          </section>
        )}

        {/* Used / Expired */}
        {usedOrExpired.length > 0 && (
          <section>
            <h2 className="uppercase tracking-[1px] text-xs font-semibold text-gray-400 mb-5">
              ĐÃ DÙNG / HẾT HẠN ({usedOrExpired.length})
            </h2>
            <div className="space-y-5 opacity-75">
              {usedOrExpired.map((item) => (
                <VoucherCard
                  key={item.id}
                  item={item}
                  discountLabel={discountLabel(item.voucher)}
                  formatExpiry={formatExpiry}
                  formatMoney={formatMoney}
                  expired
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <StoreFooter />
    </div>
  );
}

function VoucherCard({ item, discountLabel, formatExpiry, formatMoney, expired }: any) {
  const isFreeship = item.voucher.voucher_type === 'FREESHIP';
  const isPercent = item.voucher.voucher_type === 'PERCENT';

  return (
    <div className={`rounded-3xl overflow-hidden border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${expired ? 'border-gray-200 bg-gray-50' : 'border-gray-100 bg-white shadow-sm hover:border-violet-200'}`}>
      <div className="flex">
        {/* Accent Bar */}
        <div className={`w-3 ${expired ? 'bg-gray-300' : isFreeship ? 'bg-emerald-500' : isPercent ? 'bg-violet-500' : 'bg-cyan-500'}`} />

        <div className="flex-1 p-6">
          <div className="flex justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-semibold text-gray-900 tracking-tight">{discountLabel}</p>
              <p className="text-gray-600 mt-2 line-clamp-2 leading-snug">{item.voucher.name}</p>

              <div className="flex flex-wrap gap-2 mt-5">
                <div className="bg-gray-100 text-gray-700 font-mono text-sm px-4 py-2 rounded-2xl font-medium">
                  {item.voucher.code}
                </div>
                {item.voucher.min_order_value > 0 && (
                  <div className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-2xl">
                    Từ {formatMoney(item.voucher.min_order_value)}
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="text-right shrink-0">
              {item.is_used ? (
                <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-sm font-medium px-5 py-2.5 rounded-2xl">
                  <CheckCircle className="size-4" />
                  ĐÃ DÙNG
                </div>
              ) : (
                <div className={`inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-2xl ${expired ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                  <Clock className="size-4" />
                  {formatExpiry(item.expires_at)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}