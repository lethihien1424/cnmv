import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import AddressSelector from '../components/AddressSelector';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import { apiRequest, API_BASE_URL } from '../services/api';
import { UserAddress } from '../services/addressService';
import voucherService from '../services/voucherService';
import {
  Package, MapPin, Truck, CreditCard, Receipt,
  AlertCircle, Clock, Zap, CheckCircle, Loader2,
  Tag, ArrowRight, X, ChevronRight, Ticket, Gift,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '../components/ui/dialog';

// ─── Types ─────────────────────────────────────────────────────────────────
interface CheckoutItem {
  product_id: string;
  quantity: number;
  size?: string | null;
  color?: string | null;
  product?: {
    id: string;
    name: string;
    price: number;
    images?: string[];
    image_url?: string;
    store_id?: string;
    is_bulky?: boolean;
    store?: { id: string; store_name: string };
    is_flash_sale?: boolean;
    flash_sale_price?: number | null;
    flash_sale_stock?: number;
    flash_sale_sold?: number;
    flash_sale_start_time?: string | null;
    flash_sale_end_time?: string | null;
  };
  price?: number;
}
interface ShippingOption { fee: number; available: boolean; name: string; eta: string; reason?: string; }
interface ShippingOptions { success: boolean; standard: ShippingOption; express: ShippingOption; }

if (!document.head.querySelector('[href*="Be+Vietnam+Pro"]')) {
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap';
  document.head.appendChild(l);
}

const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const getImageUrl = (item: CheckoutItem) => {
  const url = item.product?.image_url || item.product?.images?.[0];
  if (!url) return 'https://via.placeholder.com/150';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL.replace('/api', '')}${url}`;
};

// ─── VoucherSheet ──────────────────────────────────────────────────────────
interface VoucherSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  vouchers: any[];
  selected: any | null;
  onSelect: (v: any | null) => void;
  subtotal: number;
  accentColor: string;
}
const VoucherSheet: React.FC<VoucherSheetProps> = ({
  open, onClose, title, vouchers, selected, onSelect, subtotal, accentColor
}) => {
  const [removing, setRemoving] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)', zIndex: 900,
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff',
        borderRadius: '24px 24px 0 0',
        zIndex: 901,
        maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(.32,.72,0,1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: '#e5e7eb' }} />
        </div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 12px' }}>
          <span style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 700, fontSize: 18, color: '#111' }}>{title}</span>
          <button onClick={onClose} style={{ border: 'none', background: '#f3f4f6', borderRadius: 99, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} color="#6b7280" />
          </button>
        </div>
        {/* Remove selection */}
        {selected && (
          <div style={{ padding: '0 24px 8px' }}>
            <button
              onClick={() => { onSelect(null); onClose(); }}
              style={{ width: '100%', padding: '10px 16px', border: '1.5px dashed #fca5a5', borderRadius: 12, background: '#fff5f5', color: '#ef4444', fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <X size={14} /> Bỏ chọn voucher
            </button>
          </div>
        )}
        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 24px 32px' }}>
          {vouchers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
              <Ticket size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 14 }}>Không có voucher phù hợp</p>
            </div>
          ) : (
            vouchers.map((v) => {
              const meetsMin = subtotal >= Number(v.min_order_value || 0);
              const isSelected = selected?.id === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => { if (meetsMin) { onSelect(isSelected ? null : v); if (!isSelected) onClose(); } }}
                  style={{
                    display: 'flex', alignItems: 'stretch', marginBottom: 12,
                    borderRadius: 16, overflow: 'hidden',
                    border: isSelected ? `2px solid ${accentColor}` : '1.5px solid #f0f0f0',
                    background: isSelected ? `${accentColor}08` : '#fff',
                    cursor: meetsMin ? 'pointer' : 'not-allowed',
                    opacity: meetsMin ? 1 : 0.55,
                    transition: 'all 0.18s ease',
                    boxShadow: isSelected ? `0 4px 16px ${accentColor}22` : '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Left color strip */}
                  <div style={{ width: 6, background: isSelected ? accentColor : '#e5e7eb', flexShrink: 0, borderRadius: '0', transition: 'background 0.18s' }} />
                  {/* Content */}
                  <div style={{ flex: 1, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <p style={{ margin: 0, fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 700, fontSize: 14, color: '#111' }}>{v.name || v.code}</p>
                        <p style={{ margin: '3px 0 0', fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 12, color: '#6b7280' }}>
                          {v.voucher_type === 'PERCENT'
                            ? `Giảm ${v.discount_value}%${v.max_discount_amount ? ` tối đa ${fmt(v.max_discount_amount)}` : ''}`
                            : v.voucher_type === 'FIXED'
                            ? `Giảm ${fmt(v.discount_value)}`
                            : 'Miễn phí vận chuyển'}
                        </p>
                        {Number(v.min_order_value) > 0 && (
                          <p style={{ margin: '4px 0 0', fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 11, color: meetsMin ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                            {meetsMin ? '✓ Đủ điều kiện' : `Cần thêm ${fmt(Number(v.min_order_value) - subtotal)}`}
                          </p>
                        )}
                      </div>
                      <div style={{
                        width: 24, height: 24, borderRadius: 99, border: `2px solid ${isSelected ? accentColor : '#d1d5db'}`,
                        background: isSelected ? accentColor : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s',
                      }}>
                        {isSelected && <CheckCircle size={14} color="#fff" fill="#fff" />}
                      </div>
                    </div>
                    {v.code && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, background: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: 6, letterSpacing: 1 }}>{v.code}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

// ─── CheckoutPage ──────────────────────────────────────────────────────────
const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const paymentStatus = searchParams.get('payment_status');
  const resultOrderId = searchParams.get('order_id');
  const errorCode = searchParams.get('error_code');

  const { items = [], fromCart = false } =
    (location.state as { items: CheckoutItem[]; fromCart: boolean }) || {};

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [shippingMethod, setShippingMethod] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'VNPAY' | 'WALLET'>('COD');
  const [walletBalance, setWalletBalance] = useState(0);

  // Voucher states
  const [shopVoucher, setShopVoucher] = useState<any>(null);
  const [platformVoucher, setPlatformVoucher] = useState<any>(null);
  const [shopDiscount, setShopDiscount] = useState(0);
  const [platformDiscount, setPlatformDiscount] = useState(0);
  const [shopVouchers, setShopVouchers] = useState<any[]>([]);
  const [platformVouchers, setPlatformVouchers] = useState<any[]>([]);
  const [showShopSheet, setShowShopSheet] = useState(false);
  const [showPlatformSheet, setShowPlatformSheet] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [loadingFee, setLoadingFee] = useState(false);
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingOptions, setShippingOptions] = useState<ShippingOptions | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');

  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      const storeId = item.product?.store_id || 'unknown';
      const storeName = item.product?.store?.store_name || 'Cửa hàng';
      if (!acc[storeId]) acc[storeId] = { name: storeName, items: [] };
      acc[storeId].items.push(item);
      return acc;
    }, {} as Record<string, { name: string; items: CheckoutItem[] }>);
  }, [items]);

  const getItemPrice = (item: CheckoutItem) => {
    const p = item.product;
    if (!p) return item.price || 0;
    const now = new Date();
    const flashActive = p.is_flash_sale && p.flash_sale_price &&
      (!p.flash_sale_start_time || new Date(p.flash_sale_start_time) <= now) &&
      (!p.flash_sale_end_time || new Date(p.flash_sale_end_time) >= now);
    if (!flashActive) return Number(p.price || item.price || 0);
    const qty = item.quantity || 1;
    const flashPrice = Number(p.flash_sale_price);
    const originalPrice = Number(p.price || item.price || 0);
    const availableSlots = Math.max(0, (p.flash_sale_stock || 0) - (p.flash_sale_sold || 0));
    const flashQty = Math.min(qty, availableSlots);
    const normalQty = qty - flashQty;
    const total = flashQty * flashPrice + normalQty * originalPrice;
    return qty > 0 ? total / qty : originalPrice;
  };

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + getItemPrice(i) * (i.quantity || 1), 0),
    [items]
  );

  const flashSaleWarnings = useMemo(() => {
    return items.map((item) => {
      const p = item.product;
      if (!p?.is_flash_sale || !p.flash_sale_price) return null;
      const now = new Date();
      const flashActive = (!p.flash_sale_start_time || new Date(p.flash_sale_start_time) <= now) &&
        (!p.flash_sale_end_time || new Date(p.flash_sale_end_time) >= now);
      if (!flashActive) return null;
      const remaining = Math.max(0, (p.flash_sale_stock || 0) - (p.flash_sale_sold || 0));
      const qty = item.quantity || 1;
      if (remaining > 0 && qty > remaining) {
        return { name: p.name, flashQty: remaining, normalQty: qty - remaining, flashPrice: Number(p.flash_sale_price), originalPrice: Number(p.price || 0) };
      }
      return null;
    }).filter(Boolean);
  }, [items]);

  const storeCount = Object.keys(groupedItems).filter((k) => k !== 'unknown').length || 1;
  const totalDiscount = shopDiscount + platformDiscount;
  const totalAmount = Math.max(0, subtotal + shippingFee - totalDiscount);
  const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);

  // Load wallet
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/orders/my-wallet`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        setWalletBalance(Number(json?.data?.wallet?.balance || 0));
      } catch {}
    })();
  }, []);

  // Load vouchers
  useEffect(() => {
    (async () => {
      try {
        const firstStoreId = Object.keys(groupedItems).find((k) => k !== 'unknown');
        if (firstStoreId) {
          const sv = await voucherService.getShopVouchersByStore(firstStoreId);
          setShopVouchers(sv || []);
        }
        const pv = await voucherService.getMyVouchers();
        setPlatformVouchers(pv || []);
      } catch {}
    })();
  }, [groupedItems]);

  // Recalculate discount when voucher or subtotal changes
  useEffect(() => {
    (async () => {
      if (!shopVoucher && !platformVoucher) { setShopDiscount(0); setPlatformDiscount(0); return; }
      try {
        const result = await voucherService.validateVoucher({
          shop_voucher_id: shopVoucher?.id || null,
          platform_voucher_id: platformVoucher?.id || null,
          subtotal,
        });
        setShopDiscount(result.shop_discount || 0);
        setPlatformDiscount(result.platform_discount || 0);
      } catch { setShopDiscount(0); setPlatformDiscount(0); }
    })();
  }, [shopVoucher, platformVoucher, subtotal]);

  useEffect(() => {
    if (!paymentStatus && items.length === 0) { toast.error('Không có sản phẩm để thanh toán'); navigate('/cart'); }
  }, []);

  const fetchShippingFees = async (address: UserAddress) => {
    setShippingError(null);
    if (!address.latitude || !address.longitude) { setShippingOptions(null); setShippingFee(0); setShippingError('Địa chỉ chưa có tọa độ — phí ship sẽ được xác nhận sau khi ghim bản đồ.'); return; }
    setLoadingFee(true);
    try {
      const firstStoreId = Object.keys(groupedItems).find((k) => k !== 'unknown') ?? null;
      const hasBulky = items.some((i) => i.product?.is_bulky === true);
      const res = await apiRequest<ShippingOptions>('/shipping/calculate', { method: 'POST', body: JSON.stringify({ address_id: address.id, store_id: firstStoreId, is_bulky: hasBulky }) } );
      if (!res.success) { setShippingError(res.standard?.name || 'Không tính được phí vận chuyển'); setShippingOptions(null); setShippingFee(0); return; }
      setShippingOptions(res);
      const method = shippingMethod === 'EXPRESS' && res.express.available ? 'EXPRESS' : 'STANDARD';
      if (method !== shippingMethod) setShippingMethod('STANDARD');
      setShippingFee((method === 'EXPRESS' ? res.express.fee : res.standard.fee) * storeCount);
    } catch (err: any) { setShippingError(err.message || 'Lỗi kết nối'); setShippingOptions(null); setShippingFee(0); }
    finally { setLoadingFee(false); }
  };

  const handleSelectAddress = (addressId: string, addressObj?: UserAddress) => {
    setSelectedAddressId(addressId);
    if (addressObj) { setSelectedAddress(addressObj); fetchShippingFees(addressObj); }
    else { apiRequest<UserAddress[]>('/addresses').then((list) => { const a = list.find((x) => x.id === addressId); if (a) { setSelectedAddress(a); fetchShippingFees(a); } }); }
  };

  const handleMethodChange = (method: 'STANDARD' | 'EXPRESS') => {
    if (method === 'EXPRESS' && !shippingOptions?.express.available) return;
    setShippingMethod(method);
    if (shippingOptions) setShippingFee((method === 'EXPRESS' ? shippingOptions.express.fee : shippingOptions.standard.fee) * storeCount);
  };

 const handlePlaceOrder = async () => {
  if (!selectedAddressId) {
    toast.error('Vui lòng chọn địa chỉ nhận hàng');
    return;
  }

  setSubmitting(true);
  try {
    const token = localStorage.getItem('token');
    const platform_voucher_id = platformVoucher?.id || null;
    const shop_voucher_id = shopVoucher?.id || null;

    let endpoint = fromCart 
      ? `${API_BASE_URL}/orders/from-cart` 
      : `${API_BASE_URL}/orders/buy-now`;

    let body: any;

    if (fromCart) {
      body = {
        selected_items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          size: i.size ?? null,
          color: i.color ?? null,
        })),
        platform_voucher_id,
        shop_voucher_id,
        payment_method: paymentMethod,
        address_id: selectedAddressId,
        shipping_provider: 'GHN',
        shipping_service_type: shippingMethod,
      };
    } else {
      const item = items[0];
      if (!item) throw new Error('Không có sản phẩm');
      
      body = {
        product_id: item.product_id,
        quantity: item.quantity,
        size: item.size ?? null,
        color: item.color ?? null,
        platform_voucher_id,
        shop_voucher_id,
        payment_method: paymentMethod,
        address_id: selectedAddressId,
        shipping_provider: 'GHN',
        shipping_service_type: shippingMethod,
      };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok || payload?.success === false) {
      throw new Error(payload?.message || 'Đặt hàng thất bại');
    }

    if (paymentMethod === 'VNPAY' && payload?.payUrl) {
      window.location.href = payload.payUrl;
      return;
    }

    toast.success('🎉 Đặt hàng thành công!');
    navigate('/orders');
  } catch (err: any) {                    // ← Fix ở đây
    toast.error(err?.message || 'Đặt hàng thất bại');
  } finally {
    setSubmitting(false);
  }
};

  const handleReturnHome = () => navigate('/', { replace: true });

  // ─── STYLES ───────────────────────────────────────────────────────────────
  const css = `
    *, *::before, *::after { box-sizing: border-box; }
    .ck-root { font-family: 'Be Vietnam Pro', sans-serif; background: #f4f5f7; }

    /* Cards */
    .ck-card {
      background: #fff;
      border-radius: 20px;
      border: 1px solid #eaecf0;
      overflow: hidden;
      transition: box-shadow 0.2s ease;
    }
    .ck-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.07); }

    /* Card header */
    .ck-card-head {
      display: flex; align-items: center; gap: 12px;
      padding: 18px 22px; border-bottom: 1px solid #f3f4f6;
    }
    .ck-step { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
    .ck-card-title { font-size: 15px; font-weight: 700; color: #111827; letter-spacing: -0.2px; }

    /* Product rows */
    .prod-row { display: flex; align-items: flex-start; gap: 14px; padding: 16px 22px; }
    .prod-img { width: 72px; height: 72px; border-radius: 12px; object-fit: cover; border: 1px solid #f0f0f0; flex-shrink: 0; }

    /* Shipping buttons */
    .ship-btn {
      position: relative; padding: 14px 16px; border-radius: 14px;
      border: 1.5px solid #e5e7eb; background: #fff; cursor: pointer;
      transition: all 0.18s ease; text-align: left; width: 100%;
    }
    .ship-btn:hover:not(:disabled) { border-color: #d1d5db; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .ship-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .ship-btn.active-std { border-color: #6366f1; background: #f5f3ff; box-shadow: 0 4px 16px rgba(99,102,241,0.15); }
    .ship-btn.active-exp { border-color: #f97316; background: #fff7ed; box-shadow: 0 4px 16px rgba(249,115,22,0.15); }
    .ship-fee { font-size: 14px; font-weight: 700; color: #111827; margin-top: 6px; }
    .ship-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; margin-top: 8px; letter-spacing: 0.5px; }
    .ship-eta { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #9ca3af; margin-top: 4px; }
    .ship-unavail { font-size: 11px; color: #ef4444; margin-top: 4px; display: flex; align-items: center; gap: 4px; }

    /* Payment buttons */
    .pay-btn {
      display: flex; align-items: center; gap: 12px; padding: 14px 18px;
      border-radius: 14px; border: 1.5px solid #e5e7eb; background: #fff;
      cursor: pointer; transition: all 0.18s ease; flex: 1; min-width: 0;
    }
    .pay-btn:hover:not(:disabled) { border-color: #d1d5db; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .pay-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .pay-btn.active-cod   { border-color: #10b981; background: #f0fdf4; box-shadow: 0 4px 16px rgba(16,185,129,0.12); }
    .pay-btn.active-vnpay { border-color: #2563eb; background: #eff6ff; box-shadow: 0 4px 16px rgba(37,99,235,0.12); }
    .pay-btn.active-wallet { border-color: #7c3aed; background: #f5f3ff; box-shadow: 0 4px 16px rgba(124,58,237,0.12); }

    /* Voucher trigger buttons */
    .voucher-btn {
      display: flex; align-items: center; gap: 12px; padding: 14px 18px;
      border-radius: 14px; border: 1.5px dashed #e5e7eb; background: #fafafa;
      cursor: pointer; transition: all 0.18s ease; width: 100%; text-align: left;
    }
    .voucher-btn:hover { border-color: #d1d5db; background: #f3f4f6; transform: translateY(-1px); }
    .voucher-btn.has-voucher { border-style: solid; border-color: #10b981; background: #f0fdf4; }

    /* Summary card */
    .summary-card {
      background: #fff; border-radius: 20px; padding: 24px;
      position: sticky; top: 88px; border: 1px solid #eaecf0;
      box-shadow: 0 8px 32px rgba(0,0,0,0.06);
    }
    .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }

    /* Order button */
    .order-btn {
      width: 100%; padding: 16px; background: linear-gradient(135deg, #111827, #374151);
      color: #fff; border: none; border-radius: 14px;
      font-family: 'Be Vietnam Pro', sans-serif; font-size: 15px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      gap: 8px; transition: all 0.2s ease; margin-top: 20px; letter-spacing: -0.2px;
    }
    .order-btn:hover:not(:disabled) { background: linear-gradient(135deg, #1f2937, #4b5563); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(17,24,39,0.35); }
    .order-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }

    /* Store head */
    .store-head { display: flex; align-items: center; gap: 8px; padding: 10px 22px; background: #fafafa; border-bottom: 1px solid #f3f4f6; }
    .store-icon { width: 22px; height: 22px; border-radius: 6px; background: #111827; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #fff; flex-shrink: 0; }

    /* Notes */
    .info-note { display: flex; align-items: flex-start; gap: 10px; background: #f8faff; border: 1px solid #e0e7ff; border-radius: 12px; padding: 11px 14px; font-size: 12px; color: #64748b; line-height: 1.6; }
    .warn-note { display: flex; align-items: flex-start; gap: 10px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 11px 14px; font-size: 12px; color: '#92400e'; line-height: 1.6; }

    /* Result */
    .result-icon-wrap { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }

    /* Animations */
    @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    .ck-section { animation: fadeUp 0.4s ease both; }
    .ck-section:nth-child(1) { animation-delay: 0.04s; }
    .ck-section:nth-child(2) { animation-delay: 0.08s; }
    .ck-section:nth-child(3) { animation-delay: 0.12s; }
    .ck-section:nth-child(4) { animation-delay: 0.16s; }
    .ck-section:nth-child(5) { animation-delay: 0.20s; }
    .ck-section:nth-child(6) { animation-delay: 0.24s; }

    /* Checkout grid */
    .checkout-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
    @media (min-width: 1024px) { .checkout-grid { grid-template-columns: 1fr 360px; } }
  `;

  // ─── VNPAY Result Dialog ──────────────────────────────────────────────────
  const renderResultDialog = () => {
    if (!paymentStatus) return null;
    const ok = paymentStatus === 'success';
    return (
      <Dialog open onOpenChange={handleReturnHome}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-0 overflow-hidden">
          <div style={{ background: ok ? 'linear-gradient(145deg,#f0fdf4,#dcfce7)' : 'linear-gradient(145deg,#fff5f5,#fee2e2)', padding: '40px 32px 32px', textAlign: 'center' }}>
            <div className="result-icon-wrap" style={{ background: ok ? '#16a34a22' : '#ef444422' }}>
              {ok ? <CheckCircle size={36} color="#16a34a" /> : <AlertCircle size={36} color="#ef4444" />}
            </div>
            <h2 style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 22, fontWeight: 800, color: '#111', marginBottom: 8 }}>
              {ok ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
              {ok ? <>Đơn hàng <b style={{ fontFamily: 'monospace', color: '#111' }}>#{String(resultOrderId).slice(0, 8).toUpperCase()}</b> đã xác nhận.</> : <>Giao dịch thất bại. Mã lỗi: <b>{errorCode}</b></>}
            </p>
          </div>
          <div style={{ padding: '20px 32px 28px', background: '#fff' }}>
            <button
              onClick={ok ? () => navigate('/orders') : handleReturnHome}
              style={{ width: '100%', padding: 13, background: ok ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {ok ? <>Xem đơn hàng <ArrowRight size={16} /></> : <>Về trang chủ <ArrowRight size={16} /></>}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="ck-root" style={{ minHeight: '100vh', background: '#f4f5f7', paddingBottom: 80 }}>
      <style>{css}</style>

      {/* Voucher Sheets */}
      <VoucherSheet
        open={showShopSheet}
        onClose={() => setShowShopSheet(false)}
        title="Voucher của Shop"
        vouchers={shopVouchers}
        selected={shopVoucher}
        onSelect={(v) => { setShopVoucher(v); }}
        subtotal={subtotal}
        accentColor="#10b981"
      />
      <VoucherSheet
        open={showPlatformSheet}
        onClose={() => setShowPlatformSheet(false)}
        title="Voucher ShopHub"
        vouchers={platformVouchers.map((uv: any) => uv.voucher || uv)}
        selected={platformVoucher}
        onSelect={(v) => { setPlatformVoucher(v); }}
        subtotal={subtotal}
        accentColor="#6366f1"
      />

      {renderResultDialog()}

      <StoreHeader
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearchSubmit={() => { const k = searchValue.trim(); navigate(k ? `/search?q=${encodeURIComponent(k)}` : '/search'); }}
      />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 0' }}>
        {items.length === 0 && !paymentStatus ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <Loader2 size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
            <p style={{ color: '#9ca3af', fontFamily: "'Be Vietnam Pro',sans-serif" }}>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <div className="checkout-grid">
            {/* ══ LEFT ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* 1 — Địa chỉ */}
              <div className="ck-card ck-section">
                <div className="ck-card-head">
                  <div className="ck-step" style={{ background: '#f5f3ff', color: '#7c3aed' }}>1</div>
                  <MapPin size={16} color="#7c3aed" />
                  <span className="ck-card-title">Địa chỉ nhận hàng</span>
                </div>
                <div style={{ padding: '18px 22px' }}>
                  <AddressSelector selectedId={selectedAddressId} onSelect={handleSelectAddress} />
                </div>
              </div>

              {/* 2 — Sản phẩm */}
              <div className="ck-card ck-section">
                <div className="ck-card-head">
                  <div className="ck-step" style={{ background: '#fff7ed', color: '#ea580c' }}>2</div>
                  <Package size={16} color="#ea580c" />
                  <span className="ck-card-title">Sản phẩm đặt mua</span>
                  <span style={{ marginLeft: 'auto', background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>{totalQty} món</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {Object.entries(groupedItems).map(([sid, g]) => (
                    <div key={sid}>
                      <div className="store-head">
                        <div className="store-icon">S</div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>{g.name}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{g.items.length} sản phẩm</span>
                      </div>
                      {g.items.map((item, idx) => (
                        <div key={idx} className="prod-row" style={{ borderBottom: idx < g.items.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                          <img src={getImageUrl(item)} alt="" className="prod-img" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 600, fontSize: 14, color: '#111827', margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {item.product?.name}
                            </p>
                            {(item.color || item.size) && (
                              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                {item.color && <span style={{ background: '#f3f4f6', color: '#6b7280', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6 }}>{item.color}</span>}
                                {item.size && <span style={{ background: '#f3f4f6', color: '#6b7280', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6 }}>{item.size}</span>}
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                              <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>×{item.quantity}</span>
                              <span style={{ fontSize: 12, color: '#9ca3af' }}>{fmt(getItemPrice(item))}/cái</span>
                            </div>
                          </div>
                          <p style={{ fontWeight: 800, fontSize: 15, color: '#ef4444', margin: 0, flexShrink: 0 }}>
                            {fmt(getItemPrice(item) * (item.quantity || 1))}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                  {flashSaleWarnings.length > 0 && (
                    <div style={{ padding: '10px 22px', background: '#fff7ed', borderTop: '1px solid #fed7aa' }}>
                      {flashSaleWarnings.map((w: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#9a3412', lineHeight: 1.5 }}>
                          <span style={{ flexShrink: 0 }}>⚡</span>
                          <span><b>{w.name}</b>: {w.flashQty} suất giá {fmt(w.flashPrice)}, {w.normalQty} sp còn lại giá gốc {fmt(w.originalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3 — Vận chuyển */}
              <div className="ck-card ck-section">
                <div className="ck-card-head">
                  <div className="ck-step" style={{ background: '#eff6ff', color: '#2563eb' }}>3</div>
                  <Truck size={16} color="#2563eb" />
                  <span className="ck-card-title">Phương thức vận chuyển</span>
                  {loadingFee && <Loader2 size={13} color="#6366f1" style={{ marginLeft: 'auto', animation: 'spin 1s linear infinite' }} />}
                </div>
                <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {shippingError && (
                    <div className="warn-note">
                      <AlertCircle size={13} color="#f97316" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{shippingError}</span>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {/* Standard */}
                    <button className={`ship-btn ${shippingMethod === 'STANDARD' ? 'active-std' : ''}`} onClick={() => handleMethodChange('STANDARD')} disabled={!shippingOptions}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Giao Hàng Nhanh</span>
                        {shippingMethod === 'STANDARD' && <CheckCircle size={15} color="#6366f1" />}
                      </div>
                      <div className="ship-eta"><Clock size={10} /><span>{shippingOptions?.standard.eta ?? '2–3 ngày'}</span></div>
                      <div className="ship-fee">{loadingFee ? '...' : shippingOptions ? (shippingOptions.standard.fee === 0 ? 'Miễn phí' : fmt(shippingOptions.standard.fee)) : '—'}</div>
                      <span className="ship-badge" style={{ background: shippingMethod === 'STANDARD' ? '#ede9fe' : '#f1f5f9', color: shippingMethod === 'STANDARD' ? '#7c3aed' : '#9ca3af' }}>STANDARD</span>
                    </button>
                    {/* Express */}
                    <button className={`ship-btn ${shippingMethod === 'EXPRESS' ? 'active-exp' : ''}`} onClick={() => handleMethodChange('EXPRESS')} disabled={!shippingOptions || !shippingOptions.express.available}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={12} color="#f97316" fill="#f97316" /><span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Hỏa tốc</span></div>
                        {shippingMethod === 'EXPRESS' && <CheckCircle size={15} color="#f97316" />}
                      </div>
                      <div className="ship-eta"><Clock size={10} /><span>Trong ngày</span></div>
                      {shippingOptions && !shippingOptions.express.available
                        ? <div className="ship-unavail"><AlertCircle size={10} />{shippingOptions.express.reason}</div>
                        : <div className="ship-fee">{loadingFee ? '...' : shippingOptions ? fmt(shippingOptions.express.fee) : '—'}</div>}
                      <span className="ship-badge" style={{ background: shippingMethod === 'EXPRESS' ? '#fff7ed' : '#f1f5f9', color: shippingMethod === 'EXPRESS' ? '#ea580c' : '#9ca3af' }}><Zap size={9} fill="currentColor" />EXPRESS</span>
                    </button>
                  </div>
                  <div className="info-note">
                    <AlertCircle size={13} color="#94a3b8" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>Phí ship tính theo khoảng cách từ kho đến địa chỉ nhận. Hỏa tốc chỉ khả dụng trong 15km.</span>
                  </div>
                </div>
              </div>

              {/* 4 — Voucher */}
              <div className="ck-card ck-section">
                <div className="ck-card-head">
                  <div className="ck-step" style={{ background: '#fefce8', color: '#ca8a04' }}>4</div>
                  <Ticket size={16} color="#ca8a04" />
                  <span className="ck-card-title">Mã giảm giá</span>
                  {totalDiscount > 0 && (
                    <span style={{ marginLeft: 'auto', background: '#fef2f2', color: '#ef4444', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                      -{fmt(totalDiscount)}
                    </span>
                  )}
                </div>
                <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Shop voucher */}
                  <button className={`voucher-btn ${shopVoucher ? 'has-voucher' : ''}`} onClick={() => setShowShopSheet(true)}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: shopVoucher ? '#d1fae5' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Tag size={16} color={shopVoucher ? '#10b981' : '#9ca3af'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#111827' }}>Voucher của Shop</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: shopVoucher ? '#10b981' : '#9ca3af', fontWeight: shopVoucher ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {shopVoucher ? shopVoucher.name || shopVoucher.code : `${shopVouchers.length} voucher khả dụng`}
                      </p>
                    </div>
                    {shopVoucher && shopDiscount > 0 && (
                      <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>-{fmt(shopDiscount)}</span>
                    )}
                    <ChevronRight size={16} color="#d1d5db" style={{ flexShrink: 0 }} />
                  </button>

                  {/* Platform voucher */}
                  <button className={`voucher-btn ${platformVoucher ? 'has-voucher' : ''}`} onClick={() => setShowPlatformSheet(true)}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: platformVoucher ? '#ede9fe' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Gift size={16} color={platformVoucher ? '#6366f1' : '#9ca3af'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#111827' }}>Voucher ShopHub</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: platformVoucher ? '#6366f1' : '#9ca3af', fontWeight: platformVoucher ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {platformVoucher ? platformVoucher.name || platformVoucher.code : `${platformVouchers.length} voucher trong kho`}
                      </p>
                    </div>
                    {platformVoucher && platformDiscount > 0 && (
                      <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>-{fmt(platformDiscount)}</span>
                    )}
                    <ChevronRight size={16} color="#d1d5db" style={{ flexShrink: 0 }} />
                  </button>
                </div>
              </div>

              {/* 5 — Thanh toán */}
              <div className="ck-card ck-section">
                <div className="ck-card-head">
                  <div className="ck-step" style={{ background: '#fdf4ff', color: '#a21caf' }}>5</div>
                  <CreditCard size={16} color="#a21caf" />
                  <span className="ck-card-title">Phương thức thanh toán</span>
                </div>
                <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                    {/* COD */}
                    <button className={`pay-btn ${paymentMethod === 'COD' ? 'active-cod' : ''}`} onClick={() => setPaymentMethod('COD')}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: paymentMethod === 'COD' ? '#dcfce7' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Receipt size={17} color={paymentMethod === 'COD' ? '#16a34a' : '#9ca3af'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#111827' }}>Tiền mặt</p>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9ca3af' }}>Trả khi nhận hàng</p>
                      </div>
                      {paymentMethod === 'COD' && <CheckCircle size={15} color="#16a34a" style={{ flexShrink: 0 }} />}
                    </button>
                    {/* VNPAY */}
                    <button className={`pay-btn ${paymentMethod === 'VNPAY' ? 'active-vnpay' : ''}`} onClick={() => setPaymentMethod('VNPAY')}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: paymentMethod === 'VNPAY' ? '#dbeafe' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CreditCard size={17} color={paymentMethod === 'VNPAY' ? '#2563eb' : '#9ca3af'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#111827' }}>VNPAY</p>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9ca3af' }}>Thanh toán online</p>
                      </div>
                      {paymentMethod === 'VNPAY' && <CheckCircle size={15} color="#2563eb" style={{ flexShrink: 0 }} />}
                    </button>
                    {/* Wallet */}
                    <button
                      className={`pay-btn ${paymentMethod === 'WALLET' ? 'active-wallet' : ''}`}
                      onClick={() => setPaymentMethod('WALLET')}
                      disabled={walletBalance < totalAmount}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: paymentMethod === 'WALLET' ? '#ede9fe' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Wallet size={17} color={paymentMethod === 'WALLET' ? '#7c3aed' : '#9ca3af'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#111827' }}>Ví ShopHub</p>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: walletBalance < totalAmount ? '#ef4444' : '#9ca3af' }}>
                          {walletBalance < totalAmount ? 'Không đủ số dư' : fmt(walletBalance)}
                        </p>
                      </div>
                      {paymentMethod === 'WALLET' && <CheckCircle size={15} color="#7c3aed" style={{ flexShrink: 0 }} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ══ RIGHT — Summary ══ */}
            <div>
              <div className="summary-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>Tổng kết đơn hàng</span>
                </div>

                {/* Mini item list */}
                <div style={{ background: '#f9fafb', borderRadius: 12, padding: '10px 12px', marginBottom: 18, maxHeight: 160, overflowY: 'auto', border: '1px solid #f3f4f6' }}>
                  {items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0', borderBottom: idx < items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <img src={getImageUrl(item)} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product?.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', flexShrink: 0 }}>×{item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="summary-row" style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Tiền hàng</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{fmt(subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Vận chuyển</span>
                  {loadingFee
                    ? <span style={{ width: 64, height: 16, borderRadius: 6, background: '#f1f5f9', display: 'inline-block', animation: 'pulse 1.5s ease infinite' }} />
                    : <span style={{ fontSize: 13, fontWeight: 600, color: shippingFee === 0 && shippingOptions ? '#16a34a' : '#111827' }}>
                        {!selectedAddressId ? '—' : shippingError ? <span style={{ color: '#f97316', fontSize: 12 }}>Chưa tính được</span> : shippingFee === 0 ? 'Miễn phí' : `+${fmt(shippingFee)}`}
                      </span>
                  }
                </div>
                {totalDiscount > 0 && (
                  <div className="summary-row">
                    <span style={{ fontSize: 13, color: '#6b7280' }}>Giảm giá</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>-{fmt(totalDiscount)}</span>
                  </div>
                )}

                <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '10px 0' }} />

                <div className="summary-row">
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>Tổng cộng</span>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#ef4444', lineHeight: 1, letterSpacing: '-0.5px' }}>{fmt(totalAmount)}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>Đã bao gồm VAT</p>
                  </div>
                </div>

                <button
                  className="order-btn"
                  onClick={handlePlaceOrder}
                  disabled={!selectedAddressId || submitting || loadingFee}
                >
                  {submitting
                    ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Đang xử lý...</>
                    : paymentMethod === 'VNPAY'
                    ? <>Thanh toán VNPAY <ArrowRight size={16} /></>
                    : <>Đặt hàng ngay <ArrowRight size={16} /></>}
                </button>

                {!selectedAddressId && (
                  <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 10 }}>← Chọn địa chỉ để tiếp tục</p>
                )}
                {shippingError && selectedAddressId && (
                  <p style={{ textAlign: 'center', fontSize: 11, color: '#f97316', marginTop: 8, lineHeight: 1.5 }}>⚠ Phí ship cập nhật sau khi ghim bản đồ</p>
                )}
                <p style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', marginTop: 14, lineHeight: 1.6 }}>
                  Bằng cách đặt hàng, bạn đồng ý với điều khoản của ShopHub
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <StoreFooter />
    </div>
  );
};

export default CheckoutPage;