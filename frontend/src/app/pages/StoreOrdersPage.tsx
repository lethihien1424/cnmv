// frontend/src/app/pages/StoreOrdersPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI, type Order } from '../services/orderService';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { Search, Eye, Trash2, ArrowLeft, Truck, CheckCircle, Package } from 'lucide-react';
import { getAbsoluteImageUrl } from '../services/api';
import { API_BASE_URL } from '../services/api';

// ─── Lý do hủy đơn (shop) ────────────────────────────────────────────────────
const STORE_CANCEL_REASONS: { code: string; label: string }[] = [
  { code: 'OUT_OF_STOCK',          label: 'Hết hàng' },
  { code: 'WRONG_PRICE',           label: 'Sai giá sản phẩm' },
  { code: 'UNAVAILABLE_VARIANT',   label: 'Hết size/màu đã chọn' },
  { code: 'DELIVERY_UNSUPPORTED',  label: 'Không hỗ trợ giao tới khu vực này' },
  { code: 'PRODUCT_DAMAGED',       label: 'Sản phẩm bị lỗi/hư hỏng' },
  { code: 'STORE_TEMP_CLOSED',     label: 'Shop tạm ngưng hoạt động' },
  { code: 'UNABLE_TO_CONTACT',     label: 'Không liên lạc được khách' },
  { code: 'SUSPECTED_FRAUD',       label: 'Đơn hàng bất thường' },
  { code: 'SHIPPING_DELAY',        label: 'Không thể giao đúng thời gian' },
  { code: 'OTHER',                 label: 'Lý do khác' },
];

// ─── Cancel Modal (Store) ─────────────────────────────────────────────────────
function StoreCancelModal({
  orderId,
  onClose,
  onConfirmed,
  token,
}: {
  orderId: string;
  onClose: () => void;
  onConfirmed: () => void;
  token: string;
}) {
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cancel_reason: selected, cancelled_by: 'STORE' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Hủy đơn thất bại');
      toast.success('Đã hủy đơn hàng');
      onConfirmed();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Hủy đơn thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-red-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Hủy đơn hàng</h3>
              <p className="text-[11px] text-gray-500">Vui lòng chọn lý do hủy</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-100 transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </button>
        </div>

        {/* Reasons */}
        <div className="px-5 py-4 max-h-72 overflow-y-auto">
          <div className="space-y-2">
            {STORE_CANCEL_REASONS.map(r => (
              <button key={r.code} onClick={() => setSelected(r.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all
                  ${selected === r.code
                    ? 'border-red-400 bg-red-50 text-red-700 font-semibold'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
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

export default function StoreOrdersPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

  const storeId = user?.businessStoreId || user?.c2cStoreId;

  const loadOrders = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const data = await orderAPI.getStoreOrders(storeId);
      setOrders(data);
    } catch (error: any) {
      toast.error(error.message || 'Không tải được đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || (user.role === 'customer' && !user.hasC2CStore)) { navigate('/'); return; }
    void loadOrders();
  }, [storeId, user]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await orderAPI.updateStatus(orderId, status);
      toast.success(`Cập nhật trạng thái thành ${status}`);
      await loadOrders();
      // Refresh selectedOrder nếu đang xem
      if (selectedOrder?.id === orderId) {
        const updated = orders.find(o => o.id === orderId);
        if (updated) setSelectedOrder({ ...updated, order_status: status as Order['order_status'] });
      }
    } catch (error: any) { toast.error(error.message); }
  };

  const filteredOrders = useMemo(() =>
    orders.filter(o =>
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.shipping_address?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [orders, searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':   return <Badge className="bg-yellow-100 text-yellow-700">Chờ xác nhận</Badge>;
      case 'PICKUP':    return <Badge className="bg-blue-100 text-blue-700">Chờ lấy hàng</Badge>;
      case 'SHIPPING':  return <Badge className="bg-purple-100 text-purple-700">Đang giao</Badge>;
      case 'DELIVERED': return <Badge className="bg-green-100 text-green-700">Đã giao</Badge>;
      case 'CANCELLED': return <Badge className="bg-red-100 text-red-600">Đã hủy</Badge>;
      case 'REFUNDED':  return <Badge className="bg-purple-100 text-purple-700">Hoàn tiền</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + '₫';

  const canCancel = (status: string) => status === 'PENDING' || status === 'PICKUP';

  // ── CHI TIẾT ĐƠN HÀNG ────────────────────────────────────────────────────
  if (selectedOrder) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => setSelectedOrder(null)} className="mb-4">
          <ArrowLeft className="size-4 mr-2" /> Quay lại danh sách đơn hàng
        </Button>

        <Card className="rounded-2xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold">Đơn hàng #{selectedOrder.id}</h1>
                <p className="text-gray-500 mt-1">
                  {new Date(selectedOrder.createdAt || selectedOrder.created_at || '').toLocaleString('vi-VN')}
                </p>
              </div>
              {getStatusBadge(selectedOrder.order_status)}
            </div>

            {/* Cancel info */}
            {(selectedOrder.order_status === 'CANCELLED' || selectedOrder.order_status === 'REFUNDED') &&
              (selectedOrder as any).cancel_reason && (
              <div className="mb-4 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">
                <p className="font-semibold mb-0.5">Lý do hủy:</p>
                <p>{STORE_CANCEL_REASONS.find(r => r.code === (selectedOrder as any).cancel_reason)?.label ?? (selectedOrder as any).cancel_reason}</p>
                {(selectedOrder as any).cancelled_by && (
                  <p className="text-xs text-red-500 mt-1">
                    Người hủy: {(selectedOrder as any).cancelled_by === 'CUSTOMER' ? 'Khách hàng' : 'Shop'}
                  </p>
                )}
              </div>
            )}

            {/* Sản phẩm */}
            <h2 className="font-semibold text-lg mb-4">Sản phẩm</h2>
            <div className="space-y-4">
              {selectedOrder.items?.map((item: any) => (
                <div key={item.id} className="flex gap-5 border rounded-2xl p-5">
                  <img src={getAbsoluteImageUrl(item.product?.images?.[0])} className="w-28 h-28 object-cover rounded-xl border" alt={item.product?.name} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{item.product?.name}</h3>
                    <div className="flex gap-3 mt-3 flex-wrap">
                      {item.color && <span className="px-4 py-1.5 bg-gray-100 rounded-full text-sm">Màu: <b>{item.color}</b></span>}
                      {item.size && <span className="px-4 py-1.5 bg-gray-100 rounded-full text-sm">Size: <b>{item.size}</b></span>}
                      {item.product?.is_bulky && <span className="px-4 py-1.5 bg-orange-100 text-orange-600 rounded-full text-sm font-semibold">⚠ Hàng cồng kềnh</span>}
                    </div>
                    <p className="mt-4 text-sm text-gray-600">Số lượng: <b>{item.quantity}</b></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-red-600">{formatPrice(item.price_at_buy * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-8" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Thông tin nhận hàng</h3>
                <h3 className="font-semibold mb-3">
  Thông tin nhận hàng
</h3>

<div className="bg-gray-50 p-4 rounded-xl space-y-3">

  <p className="leading-relaxed">
    {selectedOrder.shipping_address}
  </p>

  {(selectedOrder.distance_km ||
    selectedOrder.estimated_delivery_time) && (
    <div className="flex flex-wrap gap-3 pt-2">

      {selectedOrder.distance_km && (
        <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
          📍 {selectedOrder.distance_km.toFixed(1)} km
        </span>
      )}

      {selectedOrder.estimated_delivery_time && (
        <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          🚚 {selectedOrder.estimated_delivery_time}
        </span>
      )}

    </div>
  )}

</div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Thanh toán</h3>
                <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phương thức</span>
                    <b>{selectedOrder.payment_method}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trạng thái</span>
                    <b>{selectedOrder.payment_status === 'PAID' ? 'Đã thanh toán' : selectedOrder.payment_status === 'REFUNDED' ? 'Đã hoàn tiền' : 'Chưa thanh toán'}</b>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Tổng tiền</span>
                    <span className="text-red-600">{formatPrice(selectedOrder.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              {selectedOrder.order_status === 'PENDING' && (
                <Button className="flex-1 bg-red-500" onClick={() => handleUpdateStatus(selectedOrder.id, 'PICKUP')}>
                  <Package className="mr-2 size-4" /> Xác nhận
                </Button>
              )}
              {selectedOrder.order_status === 'PICKUP' && (
                <Button className="flex-1 bg-blue-500" onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPING')}>
                  <Truck className="mr-2 size-4" /> Giao hàng
                </Button>
              )}
              {selectedOrder.order_status === 'SHIPPING' && (
                <Button className="flex-1 bg-green-600" onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}>
                  <CheckCircle className="mr-2 size-4" /> Hoàn thành
                </Button>
              )}
              {canCancel(selectedOrder.order_status) && (
                <Button variant="outline" className="text-red-500" onClick={() => setCancelOrderId(selectedOrder.id)}>
                  <Trash2 className="mr-2 size-4" /> Hủy đơn
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cancel Modal */}
        {cancelOrderId && token && (
          <StoreCancelModal
            orderId={cancelOrderId}
            token={token}
            onClose={() => setCancelOrderId(null)}
            onConfirmed={async () => {
              setSelectedOrder(null);
              await loadOrders();
            }}
          />
        )}
      </div>
    );
  }

  // ── DANH SÁCH ĐƠN HÀNG ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quản lý đơn hàng</h1>
          <p className="text-gray-500">Bạn có tổng cộng {orders.length} đơn hàng</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input type="text" placeholder="Tìm mã đơn hoặc địa chỉ..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin size-10 border-4 border-red-500 border-t-transparent rounded-full" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-10 text-center">Không tìm thấy đơn hàng nào</Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="rounded-2xl overflow-hidden shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-xl">#{order.id}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt || order.created_at || '').toLocaleString('vi-VN')}
                    </p>
                  </div>
                  {getStatusBadge(order.order_status)}
                </div>

                {/* Products (max 2) */}
                {order.items?.slice(0, 2).map((item: any) => (
                  <div key={item.id} className="flex gap-4 py-3 border-b last:border-0">
                    <img src={getAbsoluteImageUrl(item.product?.images?.[0])} className="w-16 h-16 object-cover rounded-lg border" alt={item.product?.name} />
                    <div className="flex-1">
                      <p className="font-medium line-clamp-2">{item.product?.name}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {item.color && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Màu: {item.color}</span>}
                        {item.size && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Size: {item.size}</span>}
                        {item.product?.is_bulky && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-medium">⚠ Cồng kềnh</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">{formatPrice(item.price_at_buy)}</p>
                      <p className="text-xs text-gray-500">x{item.quantity}</p>
                    </div>
                  </div>
                ))}

                {/* Footer */}
                <div className="flex items-center justify-between mt-5 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-500">Tổng thanh toán</p>
                    <p className="text-2xl font-bold text-red-600">{formatPrice(order.total_amount)}</p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {order.order_status === 'PENDING' && (
                      <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => handleUpdateStatus(order.id, 'PICKUP')}>
                        <Package className="size-4 mr-1" /> Xác nhận
                      </Button>
                    )}
                    {order.order_status === 'PICKUP' && (
                      <Button size="sm" className="bg-blue-500 hover:bg-blue-600" onClick={() => handleUpdateStatus(order.id, 'SHIPPING')}>
                        <Truck className="size-4 mr-1" /> Giao hàng
                      </Button>
                    )}
                    {order.order_status === 'SHIPPING' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}>
                        <CheckCircle className="size-4 mr-1" /> Hoàn thành
                      </Button>
                    )}

                    <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                      <Eye className="size-5" />
                    </Button>

                    {canCancel(order.order_status) && (
                      <Button variant="ghost" size="icon" className="text-red-500"
                        onClick={() => setCancelOrderId(order.id)}>
                        <Trash2 className="size-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cancel Modal */}
      {cancelOrderId && token && (
        <StoreCancelModal
          orderId={cancelOrderId}
          token={token}
          onClose={() => setCancelOrderId(null)}
          onConfirmed={async () => {
            await loadOrders();
          }}
        />
      )}
    </div>
  );
}