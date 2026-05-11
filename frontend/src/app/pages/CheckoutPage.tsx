import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import AddressSelector from '../components/AddressSelector';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import { apiRequest, API_BASE_URL } from '../services/api';
import { UserAddress } from '../services/addressService';
import {
  Package,
  MapPin,
  Truck,
  CreditCard,
  Receipt,
  ChevronRight,
  AlertCircle,
  Clock,
  Zap,
  CheckCircle,
  Loader2,
  ShoppingBag,
  Tag,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../components/ui/dialog";

interface CheckoutItem {
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    price: number;
    images?: string[];
    image_url?: string;
    store_id?: string;
    store?: {
      id: string;
      store_name: string;
      owner?: { address?: string }
    }
  };
  price?: number;
}

/* ─── Google Font injection ───────────────────────────────────────── */
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
if (!document.head.querySelector('[href*="Plus+Jakarta+Sans"]')) {
  document.head.appendChild(fontLink);
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const paymentStatus = searchParams.get('payment_status');
  const resultOrderId = searchParams.get('order_id');
  const errorCode = searchParams.get('error_code');

  const { items = [], fromCart = false } = (location.state as { items: CheckoutItem[], fromCart: boolean }) || {};

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [shippingMethod, setShippingMethod] = useState<'GHN' | 'J&T' | 'EXPRESS'>('GHN');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'VNPAY'>('COD');
  const [submitting, setSubmitting] = useState(false);
  const [loadingFee, setLoadingFee] = useState(false);
  const [shippingFee, setShippingFee] = useState(0);
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

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + (item.product?.price || item.price || 0) * (item.quantity || 1);
    }, 0);
  }, [items]);

  const totalAmount = subtotal + shippingFee;

  useEffect(() => {
    if (!paymentStatus && items.length === 0) {
      toast.error('Không có sản phẩm để thanh toán');
      navigate('/cart');
    }
  }, [items, navigate, paymentStatus]);

  const handleReturnHome = () => navigate('/', { replace: true });

  const handleSelectAddress = (addressId: string, addressObj?: UserAddress) => {
    setSelectedAddressId(addressId);
    if (addressObj) {
      setSelectedAddress(addressObj);
      calculateFee(addressObj, shippingMethod);
    } else {
      apiRequest<UserAddress[]>('/addresses').then(addresses => {
        const addr = addresses.find(a => a.id === addressId);
        if (addr) { setSelectedAddress(addr); calculateFee(addr, shippingMethod); }
      });
    }
  };

  const calculateFee = async (address: UserAddress, method: string) => {
    setLoadingFee(true);
    try {
      const res = await apiRequest<{ shippingFee: number; success: boolean }>('/shipping/calculate', {
        method: 'POST',
        body: JSON.stringify({
          address_id: address.id,
          service_type: method === 'EXPRESS' ? 1 : 2,
          shipping_provider: method
        })
      });
      if (res.success) {
        const storeCount = Object.keys(groupedItems).length;
        setShippingFee(res.shippingFee * (storeCount || 1));
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tính phí vận chuyển');
    } finally {
      setLoadingFee(false);
    }
  };

  const handleMethodChange = (method: 'GHN' | 'J&T' | 'EXPRESS') => {
    setShippingMethod(method);
    if (selectedAddress) calculateFee(selectedAddress, method);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) { toast.error('Vui lòng chọn địa chỉ nhận hàng'); return; }
    setSubmitting(true);
    try {
      const payload = {
        selected_items: items.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
        payment_method: paymentMethod,
        address_id: selectedAddressId,
        shipping_fee: shippingFee,
        shipping_provider: shippingMethod
      };
      const endpoint = fromCart ? '/orders/from-cart' : '/orders/buy-now';
      const res = await apiRequest<any>(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      if (paymentMethod === 'VNPAY' && res.payUrl) {
        window.location.href = res.payUrl;
      } else {
        toast.success('🎉 Đặt hàng thành công!');
        navigate('/orders');
      }
    } catch (err: any) {
      toast.error(err.message || 'Đặt hàng thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  const getImageUrl = (item: CheckoutItem) => {
    const url = item.product?.image_url || item.product?.images?.[0];
    if (!url) return 'https://via.placeholder.com/150';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL.replace('/api', '')}${url}`;
  };

  const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);

  /* ─── CSS-in-JS styles ──────────────────────────────────────────── */
  const css = `
    .ck-root { font-family: 'Plus Jakarta Sans', sans-serif; }

    /* Step card */
    .ck-card {
      background: #fff;
      border-radius: 20px;
      border: 1.5px solid #f0f0f0;
      overflow: hidden;
      transition: box-shadow .2s;
    }
    .ck-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,.07); }

    .ck-card-head {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 24px;
      border-bottom: 1.5px solid #f7f7f7;
    }
    .ck-step-num {
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800;
      flex-shrink: 0;
    }
    .ck-card-title {
      font-size: 15px; font-weight: 700; color: #111;
      letter-spacing: -.2px;
    }

    /* Shipping method buttons */
    .ship-btn {
      position: relative;
      padding: 16px;
      border-radius: 16px;
      border: 2px solid #efefef;
      background: #fff;
      cursor: pointer;
      transition: all .18s;
      text-align: left;
      width: 100%;
    }
    .ship-btn:hover { border-color: #d0d0d0; transform: translateY(-1px); }
    .ship-btn.active-ghn { border-color: #6366f1; background: #f5f3ff; }
    .ship-btn.active-jt  { border-color: #ef4444; background: #fff5f5; }
    .ship-btn.active-exp { border-color: #f97316; background: #fff7ed; }

    .ship-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 600;
      padding: 2px 8px; border-radius: 99px;
      margin-top: 6px;
    }

    /* Payment buttons */
    .pay-btn {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 20px;
      border-radius: 14px;
      border: 2px solid #efefef;
      background: #fff;
      cursor: pointer;
      transition: all .18s;
      min-width: 220px;
    }
    .pay-btn:hover { border-color: #ccc; transform: translateY(-1px); }
    .pay-btn.active-cod  { border-color: #10b981; background: #f0fdf4; }
    .pay-btn.active-vnpay { border-color: #2563eb; background: #eff6ff; }

    /* Product row */
    .prod-row {
      display: flex; align-items: flex-start; gap: 16px;
      padding: 20px 24px;
    }
    .prod-img {
      width: 76px; height: 76px; border-radius: 12px;
      object-fit: cover; border: 1.5px solid #f0f0f0;
      flex-shrink: 0;
    }

    /* Sidebar summary */
    .summary-card {
      background: #fff;
      border-radius: 24px;
      padding: 28px;
      color: #111;
      position: sticky;
      top: 88px;
      border: 1.5px solid #f0f0f0;
      box-shadow: 0 10px 40px rgba(0,0,0,.04);
    }
    .summary-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0;
    }
    .summary-divider { border: none; border-top: 1px solid rgba(255,255,255,.1); margin: 8px 0; }

    .order-btn {
      width: 100%; padding: 16px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      border: none; border-radius: 14px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 16px; font-weight: 700;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all .2s;
      margin-top: 24px;
      letter-spacing: -.2px;
    }
    .order-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(99,102,241,.4);
    }
    .order-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }

    /* Store header in product list */
    .store-head {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 24px;
      background: #fafafa;
      border-bottom: 1.5px solid #f0f0f0;
    }
    .store-icon {
      width: 22px; height: 22px; border-radius: 6px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 800; color: #fff;
    }

    /* Info note */
    .info-note {
      display: flex; align-items: flex-start; gap: 10px;
      background: #f8faff;
      border: 1.5px solid #e8eeff;
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 12px; color: #64748b;
      line-height: 1.6;
    }

    /* Result dialog custom */
    .result-icon-wrap {
      width: 72px; height: 72px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
    }

    @keyframes fadeUp {
      from { opacity:0; transform:translateY(16px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .ck-section { animation: fadeUp .4s ease both; }
    .ck-section:nth-child(1) { animation-delay: .05s; }
    .ck-section:nth-child(2) { animation-delay: .10s; }
    .ck-section:nth-child(3) { animation-delay: .15s; }
    .ck-section:nth-child(4) { animation-delay: .20s; }
  `;

  /* ─── Result Dialog ─────────────────────────────────────────────── */
  const renderResultDialog = () => {
    if (!paymentStatus) return null;
    const isSuccess = paymentStatus === 'success';
    return (
      <Dialog open onOpenChange={handleReturnHome}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-0 overflow-hidden">
          <div style={{
            background: isSuccess
              ? 'linear-gradient(145deg,#f0fdf4,#dcfce7)'
              : 'linear-gradient(145deg,#fff5f5,#fee2e2)',
            padding: '40px 32px 32px',
            textAlign: 'center'
          }}>
            <div className="result-icon-wrap" style={{
              background: isSuccess ? '#16a34a22' : '#ef444422'
            }}>
              {isSuccess
                ? <CheckCircle size={36} color="#16a34a" />
                : <AlertCircle size={36} color="#ef4444" />}
            </div>
            <h2 style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 22, fontWeight: 800,
              color: '#111', marginBottom: 8, letterSpacing: '-.4px'
            }}>
              {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
              {isSuccess
                ? <>Đơn hàng <span style={{ fontFamily:'monospace', fontWeight:700, color:'#111' }}>#{String(resultOrderId).slice(0,8).toUpperCase()}</span> đã được xác nhận.</>
                : <>Giao dịch không thành công. Mã lỗi: <b>{errorCode}</b></>}
            </p>
          </div>
          <div style={{ padding: '20px 32px 28px', background:'#fff' }}>
            <button
              onClick={handleReturnHome}
              style={{
                width:'100%', padding:'13px',
                background: isSuccess
                  ? 'linear-gradient(135deg,#16a34a,#15803d)'
                  : 'linear-gradient(135deg,#ef4444,#dc2626)',
                color:'#fff', border:'none', borderRadius:12,
                fontFamily:"'Plus Jakarta Sans',sans-serif",
                fontSize:15, fontWeight:700, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8
              }}
            >
              Về trang chủ <ArrowRight size={16} />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="ck-root" style={{ minHeight:'100vh', background:'#f6f7fb', paddingBottom: 80 }}>
      <style>{css}</style>
      {renderResultDialog()}

      <StoreHeader
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearchSubmit={() => {
          const k = searchValue.trim();
          navigate(k ? `/search?q=${encodeURIComponent(k)}` : '/search');
        }}
      />

      {/* ── Page title bar ── */}
      {/* Removed dark header bar */}

      <main style={{ maxWidth:1200, margin:'0 auto', padding:'28px 24px 0' }}>
        {items.length === 0 && !paymentStatus ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 0' }}>
            <Loader2 size={40} color="#6366f1" style={{ animation:'spin 1s linear infinite', marginBottom:16 }} />
            <p style={{ color:'#94a3b8', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:24 }}
            className="checkout-grid">
            <style>{`@media(min-width:1024px){ .checkout-grid{ grid-template-columns: 1fr 380px !important; } }`}</style>

            {/* ══════════ LEFT ══════════ */}
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

              {/* Step 1 — Address */}
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

              {/* Step 2 — Products */}
              <div className="ck-card ck-section">
                <div className="ck-card-head">
                  <div className="ck-step-num" style={{ background:'#fff7ed', color:'#ea580c' }}>2</div>
                  <Package size={18} color="#ea580c" />
                  <span className="ck-card-title">Sản phẩm đặt mua</span>
                  <span style={{
                    marginLeft:'auto',
                    background:'#f1f5f9', color:'#475569',
                    fontSize:12, fontWeight:600,
                    padding:'3px 10px', borderRadius:99
                  }}>{totalQty} món</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {Object.entries(groupedItems).map(([storeId, group]) => (
                    <div key={storeId}>
                      <div className="store-head">
                        <div className="store-icon">S</div>
                        <span style={{ fontWeight:700, fontSize:13, color:'#374151' }}>{group.name}</span>
                        <span style={{ marginLeft:'auto', fontSize:12, color:'#9ca3af' }}>
                          {group.items.length} sản phẩm
                        </span>
                      </div>
                      {group.items.map((item, idx) => (
                        <div key={idx} className="prod-row"
                          style={{ borderBottom: idx < group.items.length-1 ? '1px solid #f7f7f7' : 'none' }}>
                          <img src={getImageUrl(item)} alt="" className="prod-img" />
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontWeight:600, fontSize:14, color:'#111', margin:0, lineHeight:1.4,
                              overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box',
                              WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                              {item.product?.name}
                            </p>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                              <span style={{
                                background:'#f1f5f9', color:'#64748b',
                                fontSize:12, fontWeight:600,
                                padding:'2px 8px', borderRadius:6
                              }}>×{item.quantity}</span>
                              <span style={{ fontSize:12, color:'#9ca3af' }}>
                                {fmt(item.product?.price || item.price || 0)} / cái
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <p style={{ fontWeight:800, fontSize:15, color:'#ef4444', margin:0 }}>
                              {fmt((item.product?.price || item.price || 0) * item.quantity)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3 — Shipping */}
              <div className="ck-card ck-section">
                <div className="ck-card-head">
                  <div className="ck-step-num" style={{ background:'#eff6ff', color:'#2563eb' }}>3</div>
                  <Truck size={18} color="#2563eb" />
                  <span className="ck-card-title">Phương thức vận chuyển</span>
                  {loadingFee && <Loader2 size={14} color="#6366f1" style={{ marginLeft:'auto', animation:'spin 1s linear infinite' }} />}
                </div>
                <div style={{ padding:'20px 24px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>

                  {/* GHN */}
                  <button className={`ship-btn ${shippingMethod==='GHN'?'active-ghn':''}`}
                    onClick={() => handleMethodChange('GHN')}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <span style={{ fontWeight:700, fontSize:13, color:'#111' }}>Giao Hàng Nhanh</span>
                      {shippingMethod==='GHN' && <CheckCircle size={16} color="#6366f1" />}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:6 }}>
                      <Clock size={11} color="#94a3b8" />
                      <span style={{ fontSize:11, color:'#94a3b8' }}>2–3 ngày</span>
                    </div>
                    <span className="ship-badge"
                      style={{ background: shippingMethod==='GHN'?'#ede9fe':'#f1f5f9',
                               color: shippingMethod==='GHN'?'#7c3aed':'#64748b' }}>
                      GHN
                    </span>
                  </button>

                  {/* J&T */}
                  <button className={`ship-btn ${shippingMethod==='J&T'?'active-jt':''}`}
                    onClick={() => handleMethodChange('J&T')}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <span style={{ fontWeight:700, fontSize:13, color:'#111' }}>J&T Express</span>
                      {shippingMethod==='J&T' && <CheckCircle size={16} color="#ef4444" />}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:6 }}>
                      <Clock size={11} color="#94a3b8" />
                      <span style={{ fontSize:11, color:'#94a3b8' }}>3–4 ngày</span>
                    </div>
                    <span className="ship-badge"
                      style={{ background: shippingMethod==='J&T'?'#fee2e2':'#f1f5f9',
                               color: shippingMethod==='J&T'?'#ef4444':'#64748b' }}>
                      J&T
                    </span>
                  </button>

                  {/* Express */}
                  <button className={`ship-btn ${shippingMethod==='EXPRESS'?'active-exp':''}`}
                    onClick={() => handleMethodChange('EXPRESS')}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
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
                    <span className="ship-badge"
                      style={{ background: shippingMethod==='EXPRESS'?'#fff7ed':'#f1f5f9',
                               color: shippingMethod==='EXPRESS'?'#ea580c':'#64748b' }}>
                      <Zap size={9} fill="currentColor" /> NHANH
                    </span>
                  </button>

                </div>
                <div style={{ padding:'0 24px 20px' }}>
                  <div className="info-note">
                    <AlertCircle size={14} color="#94a3b8" style={{ flexShrink:0, marginTop:1 }} />
                    <span>Phí ship tính theo khu vực shop & địa chỉ nhận. Miễn phí nếu cùng tỉnh/thành phố.</span>
                  </div>
                </div>
              </div>

              {/* Step 4 — Payment */}
              <div className="ck-card ck-section">
                <div className="ck-card-head">
                  <div className="ck-step-num" style={{ background:'#fdf4ff', color:'#a21caf' }}>4</div>
                  <CreditCard size={18} color="#a21caf" />
                  <span className="ck-card-title">Phương thức thanh toán</span>
                </div>
                <div style={{ padding:'20px 24px', display:'flex', flexWrap:'wrap', gap:12 }}>

                  <button className={`pay-btn ${paymentMethod==='COD'?'active-cod':''}`}
                    onClick={() => setPaymentMethod('COD')}>
                    <div style={{
                      width:40, height:40, borderRadius:10, flexShrink:0,
                      background: paymentMethod==='COD' ? '#dcfce7' : '#f1f5f9',
                      display:'flex', alignItems:'center', justifyContent:'center'
                    }}>
                      <Receipt size={18} color={paymentMethod==='COD'?'#16a34a':'#94a3b8'} />
                    </div>
                    <div>
                      <p style={{ margin:0, fontWeight:700, fontSize:14, color:'#111' }}>Tiền mặt (COD)</p>
                      <p style={{ margin:0, fontSize:12, color:'#94a3b8', marginTop:2 }}>Trả khi nhận hàng</p>
                    </div>
                    {paymentMethod==='COD' && (
                      <CheckCircle size={16} color="#16a34a" style={{ marginLeft:'auto' }} />
                    )}
                  </button>

                  <button className={`pay-btn ${paymentMethod==='VNPAY'?'active-vnpay':''}`}
                    onClick={() => setPaymentMethod('VNPAY')}>
                    <div style={{
                      width:40, height:40, borderRadius:10, flexShrink:0,
                      background: paymentMethod==='VNPAY' ? '#dbeafe' : '#f1f5f9',
                      display:'flex', alignItems:'center', justifyContent:'center'
                    }}>
                      <CreditCard size={18} color={paymentMethod==='VNPAY'?'#2563eb':'#94a3b8'} />
                    </div>
                    <div>
                      <p style={{ margin:0, fontWeight:700, fontSize:14, color:'#111' }}>VNPAY</p>
                      <p style={{ margin:0, fontSize:12, color:'#94a3b8', marginTop:2 }}>Thanh toán online</p>
                    </div>
                    {paymentMethod==='VNPAY' && (
                      <CheckCircle size={16} color="#2563eb" style={{ marginLeft:'auto' }} />
                    )}
                  </button>

                </div>
              </div>
            </div>

            {/* ══════════ RIGHT — Summary ══════════ */}
            <div>
              <div className="summary-card">
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <Tag size={18} color="#64748b" />
                  <span style={{
                    fontFamily:"'Plus Jakarta Sans',sans-serif",
                    fontSize:16, fontWeight:800, color:'#111', letterSpacing:'-.3px'
                  }}>Tổng kết đơn hàng</span>
                </div>

                {/* mini product list */}
                <div style={{
                  background:'#f8faff',
                  borderRadius:14, padding:'12px 14px',
                  marginBottom:20, maxHeight:180, overflowY:'auto',
                  border: '1px solid #edf2ff'
                }}>
                  {items.map((item, idx) => (
                    <div key={idx} style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'6px 0',
                      borderBottom: idx < items.length-1 ? '1px solid #eef2ff' : 'none'
                    }}>
                      <img src={getImageUrl(item)} alt=""
                        style={{ width:36, height:36, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
                      <span style={{
                        flex:1, fontSize:12, color:'#475569',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
                      }}>{item.product?.name}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:'#111', flexShrink:0 }}>
                        ×{item.quantity}
                      </span>
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
                    ? <span style={{
                        width:72, height:18, borderRadius:6,
                        background:'#f1f5f9',
                        animation:'pulse 1.5s ease infinite'
                      }} />
                    : <span style={{ fontSize:14, fontWeight:600,
                        color: shippingFee===0 ? '#16a34a' : '#111' }}>
                        {shippingFee===0 ? 'Miễn phí' : `+${fmt(shippingFee)}`}
                      </span>
                  }
                </div>

                <hr style={{ border:'none', borderTop:'1px solid #f0f0f0', margin:'8px 0' }} />

                <div className="summary-row" style={{ paddingTop:12 }}>
                  <span style={{ fontSize:15, fontWeight:700, color:'#475569' }}>Tổng cộng</span>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ margin:0, fontSize:26, fontWeight:800, color:'#ef4444', letterSpacing:'-.5px', lineHeight:1 }}>
                      {fmt(totalAmount)}
                    </p>
                    <p style={{ margin:0, fontSize:11, color:'#94a3b8', marginTop:4 }}>
                      ĐÃ BAO GỒM VAT
                    </p>
                  </div>
                </div>

                <button
                  className="order-btn"
                  onClick={handlePlaceOrder}
                  disabled={!selectedAddressId || submitting || loadingFee}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} style={{ animation:'spin 1s linear infinite' }} />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      Đặt hàng ngay
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                {!selectedAddressId && (
                  <p style={{
                    textAlign:'center', fontSize:12,
                    color:'rgba(255,255,255,.4)',
                    marginTop:12
                  }}>
                    ← Chọn địa chỉ để tiếp tục
                  </p>
                )}

                <p style={{
                  textAlign:'center', fontSize:11,
                  color:'#94a3b8',
                  marginTop:16, lineHeight:1.6
                }}>
                  Bằng cách đặt hàng, bạn đồng ý với điều khoản sử dụng của ShopHub
                </p>
              </div>
            </div>

          </div>
        )}
      </main>

      <StoreFooter />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%,100% { opacity:1; }
          50% { opacity:.4; }
        }
      `}</style>
    </div>
  );
};

export default CheckoutPage;