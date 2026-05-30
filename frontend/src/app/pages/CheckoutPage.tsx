// export default CheckoutPage;
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AddressSelector from '../components/AddressSelector';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import { apiRequest, API_BASE_URL } from '../services/api';
import { UserAddress } from '../services/addressService';
import {
  Package, MapPin, Truck, CreditCard, Receipt,
  AlertCircle, Clock, Zap, CheckCircle, Loader2,
  Tag, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '../components/ui/dialog';

// ─── Types ────────────────────────────────────────────────────────────────────
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

interface ShippingOption {
  fee: number;
  available: boolean;
  name: string;
  eta: string;
  reason?: string;
}
interface ShippingOptions {
  success: boolean;
  standard: ShippingOption;
  express: ShippingOption;
}

/* ─── Google Font ─────────────────────────────────────────────────────────── */
if (!document.head.querySelector('[href*="Plus+Jakarta+Sans"]')) {
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
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

// ─── CheckoutPage ─────────────────────────────────────────────────────────────
const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // VNPAY return params
  const paymentStatus = searchParams.get('payment_status');
  const resultOrderId = searchParams.get('order_id');
  const errorCode     = searchParams.get('error_code');

  const { items = [], fromCart = false } =
    (location.state as { items: CheckoutItem[]; fromCart: boolean }) || {};

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedAddress,   setSelectedAddress]   = useState<UserAddress | null>(null);
  const [shippingMethod, setShippingMethod] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [paymentMethod,     setPaymentMethod]     = useState<'COD' | 'VNPAY' | 'WALLET'>('COD');
  const [walletBalance, setWalletBalance] = useState(0);
  const [submitting,        setSubmitting]        = useState(false);
  const [loadingFee,        setLoadingFee]        = useState(false);
  const [shippingFee,       setShippingFee]       = useState(0);
  const [shippingOptions,   setShippingOptions]   = useState<ShippingOptions | null>(null);
  const [shippingError,     setShippingError]     = useState<string | null>(null);
  const [searchValue,       setSearchValue]       = useState('');

  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      const storeId   = item.product?.store_id || 'unknown';
      const storeName = item.product?.store?.store_name || 'Cửa hàng';
      if (!acc[storeId]) acc[storeId] = { name: storeName, items: [] };
      acc[storeId].items.push(item);
      return acc;
    }, {} as Record<string, { name: string; items: CheckoutItem[] }>);
  }, [items]);

  // ── Flash Sale: helper lấy giá hiệu lực (có tính bậc giá) ───────────────
  const getItemPrice = (item: CheckoutItem) => {
    const p = item.product;
    if (!p) return item.price || 0;
    const now = new Date();
    const flashActive =
      p.is_flash_sale &&
      p.flash_sale_price &&
      (!p.flash_sale_start_time || new Date(p.flash_sale_start_time) <= now) &&
      (!p.flash_sale_end_time || new Date(p.flash_sale_end_time) >= now);

    if (!flashActive) return Number(p.price || item.price || 0);

    // Tính bậc giá: N suất đầu giá Flash Sale, còn lại giá gốc
    const qty = item.quantity || 1;
    const flashPrice = Number(p.flash_sale_price);
    const originalPrice = Number(p.price || item.price || 0);
    const flashSaleLimit = Number(p.flash_sale_stock || 0);
    const alreadySold = Number(p.flash_sale_sold || 0);
    const availableSlots = Math.max(0, flashSaleLimit - alreadySold);
    const flashQty = Math.min(qty, availableSlots);
    const normalQty = qty - flashQty;

    const total = flashQty * flashPrice + normalQty * originalPrice;
    return qty > 0 ? total / qty : originalPrice; // trả về giá trung bình/1 sp
  };

  // Tổng tiền đã tính bậc giá Flash Sale
  const subtotal = useMemo(
    () => items.reduce((s, i) => {
      const qty = i.quantity || 1;
      const unitPrice = getItemPrice(i);
      return s + unitPrice * qty;
    }, 0),
    [items]
  );

  // Cảnh báo nếu mua vượt suất Flash Sale
  const flashSaleWarnings = useMemo(() => {
    return items.map((item) => {
      const p = item.product;
      if (!p?.is_flash_sale || !p.flash_sale_price) return null;
      const now = new Date();
      const flashActive =
        (!p.flash_sale_start_time || new Date(p.flash_sale_start_time) <= now) &&
        (!p.flash_sale_end_time || new Date(p.flash_sale_end_time) >= now);
      if (!flashActive) return null;
      const remaining = Math.max(0, (p.flash_sale_stock || 0) - (p.flash_sale_sold || 0));
      const qty = item.quantity || 1;
      if (remaining > 0 && qty > remaining) {
        return {
          name: p.name,
          flashQty: remaining,
          normalQty: qty - remaining,
          flashPrice: Number(p.flash_sale_price),
          originalPrice: Number(p.price || 0),
        };
      }
      return null;
    }).filter(Boolean);
  }, [items]);
  const storeCount  = Object.keys(groupedItems).filter((k) => k !== 'unknown').length || 1;
  const totalAmount = subtotal + shippingFee;
  const totalQty    = items.reduce((s, i) => s + (i.quantity || 1), 0);
  useEffect(() => {
  const fetchWallet = async () => {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(
        `${API_BASE_URL}/orders/my-wallet`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const json = await res.json();

      setWalletBalance(
        Number(json?.data?.wallet?.balance || 0)
      );
    } catch {}
  };

  fetchWallet();
}, []);
  useEffect(() => {
    if (!paymentStatus && items.length === 0) {
      toast.error('Không có sản phẩm để thanh toán');
      navigate('/cart');
    }
  }, []);

  // ─── Tính phí ship ────────────────────────────────────────────────────────
  const fetchShippingFees = async (address: UserAddress) => {
    setShippingError(null);

    if (!address.latitude || !address.longitude) {
      setShippingOptions(null);
      setShippingFee(0);
      setShippingError('Địa chỉ chưa có tọa độ — phí ship sẽ được xác nhận sau khi ghim bản đồ.');
      return;
    }

    setLoadingFee(true);
    try {
      const firstStoreId = Object.keys(groupedItems).find((k) => k !== 'unknown') ?? null;
      const hasBulky     = items.some((i) => i.product?.is_bulky === true);

      const res = await apiRequest<ShippingOptions>('/shipping/calculate', {
        method: 'POST',
        body: JSON.stringify({ address_id: address.id, store_id: firstStoreId, is_bulky: hasBulky }),
      });

      if (!res.success) {
        setShippingError(res.standard?.name || 'Không tính được phí vận chuyển');
        setShippingOptions(null); setShippingFee(0);
        return;
      }

      setShippingOptions(res);
     const method = shippingMethod === 'EXPRESS' &&
            res.express.available
              ? 'EXPRESS'
              : 'STANDARD';

      if (method !== shippingMethod) 
        setShippingMethod('STANDARD');
      setShippingFee((method === 'EXPRESS' ? res.express.fee : res.standard.fee) * storeCount);
    } catch (err: any) {
      setShippingError(err.message || 'Lỗi kết nối khi tính phí vận chuyển');
      setShippingOptions(null); setShippingFee(0);
    } finally {
      setLoadingFee(false);
    }
  };

  const handleSelectAddress = (addressId: string, addressObj?: UserAddress) => {
    setSelectedAddressId(addressId);
    if (addressObj) {
      setSelectedAddress(addressObj);
      fetchShippingFees(addressObj);
    } else {
      apiRequest<UserAddress[]>('/addresses').then((list) => {
        const a = list.find((x) => x.id === addressId);
        if (a) { setSelectedAddress(a); fetchShippingFees(a); }
      });
    }
  };

  const handleMethodChange = (method: 'STANDARD' | 'EXPRESS') => {
    if (method === 'EXPRESS' && !shippingOptions?.express.available) return;
    setShippingMethod(method);
    if (shippingOptions) {
      setShippingFee(
        (method === 'EXPRESS' ? shippingOptions.express.fee : shippingOptions.standard.fee) * storeCount
      );
    }
  };

  // ─── ĐẶT HÀNG ────────────────────────────────────────────────────────────
  
const handlePlaceOrder = async () => {
  if (!selectedAddressId) {
    toast.error('Vui lòng chọn địa chỉ nhận hàng');
    return;
  }
  setSubmitting(true);

  try {
    const token = localStorage.getItem('token');

    const endpoint = fromCart
      ? `${API_BASE_URL}/orders/from-cart`
      : `${API_BASE_URL}/orders/buy-now`;

    const body = fromCart
      ? {
          selected_items: items.map((i) => ({
            product_id: i.product_id,
            quantity:   i.quantity,
            size:       i.size  ?? null,
            color:      i.color ?? null,
          })),
          payment_method:    paymentMethod,
          address_id:        selectedAddressId,
          shipping_provider: 'GHN',
          shipping_service_type: shippingMethod,
        }
      : (() => {
          const item = items[0];
          if (!item) throw new Error('Không có sản phẩm');
          return {
            product_id:        item.product_id,
            quantity:          item.quantity,
            size:              item.size  ?? null,
            color:             item.color ?? null,
            payment_method:    paymentMethod,
            address_id:        selectedAddressId,
            shipping_provider: 'GHN',
            shipping_service_type: shippingMethod,
          };
        })();

    // ── fetch thẳng để nhận FULL response body (payUrl, success, data) ──
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    // Luôn parse JSON dù status bao nhiêu
    const payload = await res.json().catch(() => null);

    if (!res.ok || payload?.success === false) {
      throw new Error(payload?.message || 'Đặt hàng thất bại');
    }

    // ── VNPAY ────────────────────────────────────────────────────────────
    if (paymentMethod === 'VNPAY') {
      if (payload?.payUrl) {
        window.location.href = payload.payUrl;
        return;
      }
      throw new Error(payload?.message || 'Không nhận được link thanh toán VNPAY');
    }

    // ── COD ──────────────────────────────────────────────────────────────
    toast.success('🎉 Đặt hàng thành công!');
    navigate('/orders');

  } catch (err: any) {
    toast.error(err.message || 'Đặt hàng thất bại');
  } finally {
    setSubmitting(false);
  }
};
  const handleReturnHome = () => navigate('/', { replace: true });

  // ─── CSS ──────────────────────────────────────────────────────────────────
  const css = `
    .ck-root { font-family:'Plus Jakarta Sans',sans-serif; }
    .ck-card { background:#fff; border-radius:20px; border:1.5px solid #f0f0f0; overflow:hidden; transition:box-shadow .2s; }
    .ck-card:hover { box-shadow:0 8px 32px rgba(0,0,0,.07); }
    .ck-card-head { display:flex; align-items:center; gap:14px; padding:18px 24px; border-bottom:1.5px solid #f7f7f7; }
    .ck-step-num { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; flex-shrink:0; }
    .ck-card-title { font-size:15px; font-weight:700; color:#111; letter-spacing:-.2px; }

    .ship-btn { position:relative; padding:16px; border-radius:16px; border:2px solid #efefef; background:#fff; cursor:pointer; transition:all .18s; text-align:left; width:100%; }
    .ship-btn:hover:not(:disabled) { border-color:#d0d0d0; transform:translateY(-1px); }
    .ship-btn:disabled { opacity:.45; cursor:not-allowed; }
    .ship-btn.active-ghn { border-color:#6366f1; background:#f5f3ff; }
    .ship-btn.active-exp { border-color:#f97316; background:#fff7ed; }
    .ship-fee { font-size:13px; font-weight:700; color:#374151; margin-top:4px; }
    .ship-badge { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; padding:2px 8px; border-radius:99px; margin-top:6px; }
    .ship-unavailable { font-size:11px; color:#ef4444; margin-top:4px; }

    .pay-btn { display:flex; align-items:center; gap:12px; padding:16px 20px; border-radius:14px; border:2px solid #efefef; background:#fff; cursor:pointer; transition:all .18s; flex:1; min-width:180px; }
    .pay-btn:hover { border-color:#ccc; transform:translateY(-1px); }
    .pay-btn.active-cod   { border-color:#10b981; background:#f0fdf4; }
    .pay-btn.active-vnpay { border-color:#2563eb; background:#eff6ff; }

    .prod-row { display:flex; align-items:flex-start; gap:16px; padding:20px 24px; }
    .prod-img { width:76px; height:76px; border-radius:12px; object-fit:cover; border:1.5px solid #f0f0f0; flex-shrink:0; }

    .summary-card { background:#fff; border-radius:24px; padding:28px; position:sticky; top:88px; border:1.5px solid #f0f0f0; box-shadow:0 10px 40px rgba(0,0,0,.04); }
    .summary-row  { display:flex; justify-content:space-between; align-items:center; padding:10px 0; }

    .order-btn { width:100%; padding:16px; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none; border-radius:14px; font-family:'Plus Jakarta Sans',sans-serif; font-size:16px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all .2s; margin-top:24px; }
    .order-btn:hover:not(:disabled) { background:linear-gradient(135deg,#4f46e5,#7c3aed); transform:translateY(-2px); box-shadow:0 8px 24px rgba(99,102,241,.4); }
    .order-btn:disabled { opacity:.6; cursor:not-allowed; transform:none; }

    .store-head { display:flex; align-items:center; gap:8px; padding:10px 24px; background:#fafafa; border-bottom:1.5px solid #f0f0f0; }
    .store-icon { width:22px; height:22px; border-radius:6px; background:linear-gradient(135deg,#6366f1,#8b5cf6); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; color:#fff; }

    .info-note { display:flex; align-items:flex-start; gap:10px; background:#f8faff; border:1.5px solid #e8eeff; border-radius:12px; padding:12px 16px; font-size:12px; color:#64748b; line-height:1.6; }
    .warn-note { display:flex; align-items:flex-start; gap:10px; background:#fff7ed; border:1.5px solid #fed7aa; border-radius:12px; padding:12px 16px; font-size:12px; color:#92400e; line-height:1.6; }
    .result-icon-wrap { width:72px; height:72px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }

    @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    .ck-section { animation:fadeUp .4s ease both; }
    .ck-section:nth-child(1){animation-delay:.05s} .ck-section:nth-child(2){animation-delay:.10s}
    .ck-section:nth-child(3){animation-delay:.15s} .ck-section:nth-child(4){animation-delay:.20s}
    @keyframes spin  { to{transform:rotate(360deg)} }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  `;

  // ─── VNPAY Result Dialog ──────────────────────────────────────────────────
  const renderResultDialog = () => {
    if (!paymentStatus) return null;
    const ok = paymentStatus === 'success';
    return (
      <Dialog open onOpenChange={handleReturnHome}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-0 overflow-hidden">
          <div style={{ background: ok ? 'linear-gradient(145deg,#f0fdf4,#dcfce7)' : 'linear-gradient(145deg,#fff5f5,#fee2e2)', padding:'40px 32px 32px', textAlign:'center' }}>
            <div className="result-icon-wrap" style={{ background: ok ? '#16a34a22' : '#ef444422' }}>
              {ok ? <CheckCircle size={36} color="#16a34a" /> : <AlertCircle size={36} color="#ef4444" />}
            </div>
            <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:22, fontWeight:800, color:'#111', marginBottom:8 }}>
              {ok ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
            </h2>
            <p style={{ color:'#64748b', fontSize:14, lineHeight:1.6 }}>
              {ok
                ? <>Đơn hàng <b style={{ fontFamily:'monospace', color:'#111' }}>#{String(resultOrderId).slice(0,8).toUpperCase()}</b> đã xác nhận.</>
                : <>Giao dịch thất bại. Mã lỗi: <b>{errorCode}</b></>}
            </p>
          </div>
          <div style={{ padding:'20px 32px 28px', background:'#fff' }}>
            <button
              onClick={ok ? () => navigate('/orders') : handleReturnHome}
              style={{ width:'100%', padding:13, background: ok ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', border:'none', borderRadius:12, fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
            >
              {ok ? <>Xem đơn hàng <ArrowRight size={16} /></> : <>Về trang chủ <ArrowRight size={16} /></>}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="ck-root" style={{ minHeight:'100vh', background:'#f6f7fb', paddingBottom:80 }}>
      <style>{css}</style>
      {renderResultDialog()}

      <StoreHeader
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearchSubmit={() => { const k = searchValue.trim(); navigate(k ? `/search?q=${encodeURIComponent(k)}` : '/search'); }}
      />

      <main style={{ maxWidth:1200, margin:'0 auto', padding:'28px 24px 0' }}>
        {items.length === 0 && !paymentStatus ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 0' }}>
            <Loader2 size={40} color="#6366f1" style={{ animation:'spin 1s linear infinite', marginBottom:16 }} />
            <p style={{ color:'#94a3b8' }}>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:24 }} className="checkout-grid">
            <style>{`@media(min-width:1024px){.checkout-grid{grid-template-columns:1fr 380px!important}}`}</style>

            {/* ══ LEFT ══ */}
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

              {/* 1. Địa chỉ */}
              <div className="ck-card ck-section">
                <div className="ck-card-head">
                  <div className="ck-step-num" style={{ background:'#ede9fe', color:'#7c3aed' }}>1</div>
                  <MapPin size={18} color="#7c3aed" />
                  <span className="ck-card-title">Địa chỉ nhận hàng</span>
                </div>
                <div style={{ padding:'20px 24px' }}>
                  <AddressSelector selectedId={selectedAddressId} onSelect={handleSelectAddress} />
                </div>
              </div>

              {/* 2. Sản phẩm */}
              <div className="ck-card ck-section">
                <div className="ck-card-head">
                  <div className="ck-step-num" style={{ background:'#fff7ed', color:'#ea580c' }}>2</div>
                  <Package size={18} color="#ea580c" />
                  <span className="ck-card-title">Sản phẩm đặt mua</span>
                  <span style={{ marginLeft:'auto', background:'#f1f5f9', color:'#475569', fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:99 }}>{totalQty} món</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column' }}>
                  {Object.entries(groupedItems).map(([sid, g]) => (
                    <div key={sid}>
                      <div className="store-head">
                        <div className="store-icon">S</div>
                        <span style={{ fontWeight:700, fontSize:13, color:'#374151' }}>{g.name}</span>
                        <span style={{ marginLeft:'auto', fontSize:12, color:'#9ca3af' }}>{g.items.length} sp</span>
                      </div>
                      {g.items.map((item, idx) => (
                        <div key={idx} className="prod-row" style={{ borderBottom: idx < g.items.length-1 ? '1px solid #f7f7f7' : 'none' }}>
                          <img src={getImageUrl(item)} alt="" className="prod-img" />
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontWeight:600, fontSize:14, color:'#111', margin:0, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                              {item.product?.name}
                            </p>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                              <span style={{ background:'#f1f5f9', color:'#64748b', fontSize:12, fontWeight:600, padding:'2px 8px', borderRadius:6 }}>×{item.quantity}</span>
                              <span style={{ fontSize:12, color:'#9ca3af' }}>{fmt(getItemPrice(item))} / cái</span>
                            </div>
                          </div>
                          <p style={{ fontWeight:800, fontSize:15, color:'#ef4444', margin:0, flexShrink:0 }}>
                            {fmt(getItemPrice(item) * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                  {/* Cảnh báo mua vượt suất Flash Sale */}
                  {flashSaleWarnings.length > 0 && (
                    <div style={{ padding: '12px 24px', background: '#fff7ed', borderTop: '1px solid #fed7aa' }}>
                      {flashSaleWarnings.map((w: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9a3412' }}>
                          <span>⚠️</span>
                          <span>
                            <b>{w.name}</b>: {w.flashQty} sản phẩm giá {fmt(w.flashPrice)}, {w.normalQty} sản phẩm giá gốc {fmt(w.originalPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Vận chuyển */}
              <div className="ck-card ck-section">
                <div className="ck-card-head">
                  <div className="ck-step-num" style={{ background:'#eff6ff', color:'#2563eb' }}>3</div>
                  <Truck size={18} color="#2563eb" />
                  <span className="ck-card-title">Phương thức vận chuyển</span>
                  {loadingFee && <Loader2 size={14} color="#6366f1" style={{ marginLeft:'auto', animation:'spin 1s linear infinite' }} />}
                </div>
                <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:12 }}>
                  {shippingError && (
                    <div className="warn-note">
                      <AlertCircle size={14} color="#f97316" style={{ flexShrink:0, marginTop:1 }} />
                      <span>{shippingError}</span>
                    </div>
                  )}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    {/* GHN */}
                    <button className={`ship-btn ${shippingMethod==='STANDARD'?'active-ghn':''}`} onClick={() => handleMethodChange('STANDARD')} disabled={!shippingOptions}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontWeight:700, fontSize:13, color:'#111' }}>Giao Hàng Nhanh</span>
                        {shippingMethod==='STANDARD' && <CheckCircle size={16} color="#6366f1" />}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:6 }}>
                        <Clock size={11} color="#94a3b8" />
                        <span style={{ fontSize:11, color:'#94a3b8' }}>{shippingOptions?.standard.eta ?? '2–3 ngày'}</span>
                      </div>
                      <div className="ship-fee">
                        {loadingFee ? '...' : shippingOptions ? (shippingOptions.standard.fee===0 ? 'Miễn phí' : fmt(shippingOptions.standard.fee)) : '—'}
                      </div>
                      <span className="ship-badge" style={{ background:shippingMethod==='STANDARD'?'#ede9fe':'#f1f5f9', color:shippingMethod==='STANDARD'?'#7c3aed':'#64748b' }}>STANDARD</span>
                    </button>
                    {/* Express */}
                    <button className={`ship-btn ${shippingMethod==='EXPRESS'?'active-exp':''}`} onClick={() => handleMethodChange('EXPRESS')} disabled={!shippingOptions||!shippingOptions.express.available}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <Zap size={13} color="#f97316" fill="#f97316" />
                          <span style={{ fontWeight:700, fontSize:13, color:'#111' }}>Hỏa tốc</span>
                        </div>
                        {shippingMethod==='EXPRESS' && <CheckCircle size={16} color="#f97316" />}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:6 }}>
                        <Clock size={11} color="#94a3b8" />
                        <span style={{ fontSize:11, color:'#94a3b8' }}>Trong ngày</span>
                      </div>
                      {shippingOptions && !shippingOptions.express.available
                        ? <div className="ship-unavailable"><AlertCircle size={10} style={{ display:'inline', marginRight:3 }} />{shippingOptions.express.reason}</div>
                        : <div className="ship-fee">{loadingFee ? '...' : shippingOptions ? fmt(shippingOptions.express.fee) : '—'}</div>
                      }
                      <span className="ship-badge" style={{ background:shippingMethod==='EXPRESS'?'#fff7ed':'#f1f5f9', color:shippingMethod==='EXPRESS'?'#ea580c':'#64748b' }}>
                        <Zap size={9} fill="currentColor" /> EXPRESS
                      </span>
                    </button>
                  </div>
                  <div className="info-note">
                    <AlertCircle size={14} color="#94a3b8" style={{ flexShrink:0, marginTop:1 }} />
                    <span>Phí ship tính theo khoảng cách từ kho đến địa chỉ nhận. Hỏa tốc chỉ khả dụng trong 15km.</span>
                  </div>
                </div>
              </div>

              {/* 4. Thanh toán */}
              <div className="ck-card ck-section">
                <div className="ck-card-head">
                  <div className="ck-step-num" style={{ background:'#fdf4ff', color:'#a21caf' }}>4</div>
                  <CreditCard size={18} color="#a21caf" />
                  <span className="ck-card-title">Phương thức thanh toán</span>
                </div>
                <div style={{ padding:'20px 24px', display:'flex', flexWrap:'wrap', gap:12 }}>
                  {/* COD */}
                  <button className={`pay-btn ${paymentMethod==='COD'?'active-cod':''}`} onClick={() => setPaymentMethod('COD')}>
                    <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, background:paymentMethod==='COD'?'#dcfce7':'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Receipt size={18} color={paymentMethod==='COD'?'#16a34a':'#94a3b8'} />
                    </div>
                    <div>
                      <p style={{ margin:0, fontWeight:700, fontSize:14, color:'#111' }}>Tiền mặt (COD)</p>
                      <p style={{ margin:0, fontSize:12, color:'#94a3b8', marginTop:2 }}>Trả khi nhận hàng</p>
                    </div>
                    {paymentMethod==='COD' && <CheckCircle size={16} color="#16a34a" style={{ marginLeft:'auto' }} />}
                  </button>
                  {/* VNPAY */}
                  <button className={`pay-btn ${paymentMethod==='VNPAY'?'active-vnpay':''}`} onClick={() => setPaymentMethod('VNPAY')}>
                    <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, background:paymentMethod==='VNPAY'?'#dbeafe':'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <CreditCard size={18} color={paymentMethod==='VNPAY'?'#2563eb':'#94a3b8'} />
                    </div>
                    <div>
                      <p style={{ margin:0, fontWeight:700, fontSize:14, color:'#111' }}>VNPAY</p>
                      <p style={{ margin:0, fontSize:12, color:'#94a3b8', marginTop:2 }}>Thanh toán online</p>
                    </div>
                    {paymentMethod==='VNPAY' && <CheckCircle size={16} color="#2563eb" style={{ marginLeft:'auto' }} />}
                  </button>
                  <button
  className={`pay-btn ${
    paymentMethod === 'WALLET'
      ? 'active-vnpay'
      : ''
  }`}
  onClick={() => setPaymentMethod('WALLET')}
  disabled={walletBalance < totalAmount}
>
  <div
    style={{
      width:40,
      height:40,
      borderRadius:10,
      flexShrink:0,
      background:
        paymentMethod === 'WALLET'
          ? '#ede9fe'
          : '#f1f5f9',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
    }}
  >
    💰
  </div>

  <div style={{ textAlign:'left' }}>
    <p
      style={{
        margin:0,
        fontWeight:700,
        fontSize:14,
        color:'#111',
      }}
    >
      Ví
    </p>

    <p
      style={{
        margin:0,
        fontSize:12,
        color:
          walletBalance < totalAmount
            ? '#ef4444'
            : '#94a3b8',
        marginTop:2,
      }}
    >
      {walletBalance < totalAmount
        ? 'Số dư ví không đủ'
        : `Số dư: ${fmt(walletBalance)}`}
    </p>
  </div>
</button>
                </div>
              </div>
            </div>

            {/* ══ RIGHT — Summary ══ */}
            <div>
              <div className="summary-card">
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <Tag size={18} color="#64748b" />
                  <span style={{ fontSize:16, fontWeight:800, color:'#111' }}>Tổng kết đơn hàng</span>
                </div>

                {/* mini list */}
                <div style={{ background:'#f8faff', borderRadius:14, padding:'12px 14px', marginBottom:20, maxHeight:180, overflowY:'auto', border:'1px solid #edf2ff' }}>
                  {items.map((item, idx) => (
                    <div key={idx} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:idx<items.length-1?'1px solid #eef2ff':'none' }}>
                      <img src={getImageUrl(item)} alt="" style={{ width:36, height:36, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
                      <span style={{ flex:1, fontSize:12, color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.product?.name}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:'#111', flexShrink:0 }}>×{item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="summary-row">
                  <span style={{ fontSize:14, color:'#64748b' }}>Tiền hàng</span>
                  <span style={{ fontSize:14, fontWeight:600, color:'#111' }}>{fmt(subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span style={{ fontSize:14, color:'#64748b' }}>Vận chuyển</span>
                  {loadingFee
                    ? <span style={{ width:72, height:18, borderRadius:6, background:'#f1f5f9', display:'inline-block', animation:'pulse 1.5s ease infinite' }} />
                    : <span style={{ fontSize:14, fontWeight:600, color:shippingFee===0&&shippingOptions?'#16a34a':'#111' }}>
                        {!selectedAddressId ? '—' : shippingError ? <span style={{ color:'#f97316', fontSize:12 }}>Chưa tính được</span> : shippingFee===0 ? 'Miễn phí' : `+${fmt(shippingFee)}`}
                      </span>
                  }
                </div>

                <hr style={{ border:'none', borderTop:'1px solid #f0f0f0', margin:'8px 0' }} />

                <div className="summary-row" style={{ paddingTop:12 }}>
                  <span style={{ fontSize:15, fontWeight:700, color:'#475569' }}>Tổng cộng</span>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ margin:0, fontSize:26, fontWeight:800, color:'#ef4444', lineHeight:1 }}>{fmt(totalAmount)}</p>
                    <p style={{ margin:0, fontSize:11, color:'#94a3b8', marginTop:4 }}>ĐÃ BAO GỒM VAT</p>
                  </div>
                </div>

                <button className="order-btn" onClick={handlePlaceOrder} disabled={!selectedAddressId||submitting||loadingFee}>
                  {submitting
                    ? <><Loader2 size={18} style={{ animation:'spin 1s linear infinite' }} />Đang xử lý...</>
                    : paymentMethod==='VNPAY'
                      ? <>Thanh toán VNPAY <ArrowRight size={18} /></>
                      : <>Đặt hàng ngay <ArrowRight size={18} /></>
                  }
                </button>

                {!selectedAddressId && <p style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:12 }}>← Chọn địa chỉ để tiếp tục</p>}
                {shippingError && selectedAddressId && <p style={{ textAlign:'center', fontSize:11, color:'#f97316', marginTop:10, lineHeight:1.5 }}>⚠ Phí ship sẽ cập nhật sau khi ghim bản đồ</p>}
                <p style={{ textAlign:'center', fontSize:11, color:'#94a3b8', marginTop:16, lineHeight:1.6 }}>
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