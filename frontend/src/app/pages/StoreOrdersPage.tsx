import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI, type Order } from '../services/orderService';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import { Separator } from '../components/ui/separator';
import { 
  Eye, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Search,
  ArrowLeft,
  ChevronRight,
  ShoppingCart
} from 'lucide-react';

export default function StoreOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const storeId = user?.businessStoreId || user?.c2cStoreId;

  const loadOrders = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const data = await orderAPI.getStoreOrders(storeId);
      setOrders(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role === 'customer' && !user.hasC2CStore) {
        navigate('/');
        return;
    }
    void loadOrders();
  }, [storeId]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await orderAPI.updateStatus(orderId, status);
      toast.success(`Cập nhật trạng thái thành ${status} thành công`);
      void loadOrders();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) return;
    try {
      await orderAPI.cancelOrder(orderId);
      toast.success("Đã hủy đơn hàng");
      void loadOrders();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.shipping_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Chờ xác nhận</Badge>;
      case 'PICKUP': return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Chờ lấy hàng</Badge>;
      case 'SHIPPING': return <Badge className="bg-purple-100 text-purple-700 border-purple-300">Đang giao</Badge>;
      case 'DELIVERED': return <Badge className="bg-green-100 text-green-700 border-green-300">Đã giao</Badge>;
      case 'CANCELLED': return <Badge className="bg-red-100 text-red-700 border-red-300">Đã hủy</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StoreHeader />

      <main className="flex-1 py-8">
        <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb & Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <button onClick={() => navigate('/seller/dashboard')} className="hover:text-indigo-600 flex items-center gap-1">
                  <ArrowLeft className="size-3" /> Dashboard
                </button>
                <ChevronRight className="size-3" />
                <span className="text-gray-900 font-medium">Quản lý đơn hàng</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Đơn hàng của Shop</h1>
              <p className="text-gray-500 mt-1">Bạn có tổng cộng {orders.length} đơn hàng</p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Tìm mã đơn, địa chỉ..."
                className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin size-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="py-20">
              <CardContent className="flex flex-col items-center justify-center">
                <div className="size-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <ShoppingCart className="size-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Không tìm thấy đơn hàng</h3>
                <p className="text-gray-500 mt-1">Shop của bạn hiện chưa có đơn hàng nào phù hợp.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-gray-50/50 px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString('vi-VN')}</span>
                      {getStatusBadge(order.order_status)}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">Thanh toán: <span className="font-medium text-gray-900">{order.payment_method}</span></span>
                      <Badge variant={order.payment_status === 'PAID' ? 'default' : 'outline'} className={order.payment_status === 'PAID' ? 'bg-green-500' : ''}>
                        {order.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="grid lg:grid-cols-12 gap-8">
                      {/* Products */}
                      <div className="lg:col-span-7 space-y-4">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex gap-4 p-3 rounded-lg border border-gray-100 bg-white">
                            <div className="size-16 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                                {item.product?.images?.[0] ? (
                                    <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">{item.product?.name || 'Sản phẩm không còn tồn tại'}</h4>
                              <p className="text-sm text-gray-500">Số lượng: {item.quantity}</p>
                              <p className="text-sm font-semibold text-indigo-600">{formatPrice(item.price_at_buy)}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Info & Actions */}
                      <div className="lg:col-span-5 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                            <h5 className="text-sm font-bold text-indigo-900 mb-2">Địa chỉ giao hàng</h5>
                            <p className="text-sm text-indigo-800 leading-relaxed">{order.shipping_address}</p>
                          </div>
                          
                          <div className="flex justify-between items-end">
                            <div className="text-sm text-gray-500">
                              <p>Tiền hàng: {formatPrice(order.total_amount - order.shipping_fee)}</p>
                              <p>Phí ship: {formatPrice(order.shipping_fee)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Tổng cộng</p>
                              <p className="text-xl font-bold text-red-600">{formatPrice(order.total_amount)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-6">
                          {/* Actions based on status */}
                          {order.order_status === 'PENDING' && (
                            <>
                              <Button 
                                className="bg-indigo-600 hover:bg-indigo-700" 
                                onClick={() => handleUpdateStatus(order.id, 'PICKUP')}
                              >
                                <Package className="size-4 mr-2" /> Xác nhận & Chuẩn bị hàng
                              </Button>
                              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleCancelOrder(order.id)}>
                                <XCircle className="size-4 mr-2" /> Hủy đơn
                              </Button>
                            </>
                          )}

                          {order.order_status === 'PICKUP' && (
                            <>
                              <Button 
                                className="bg-blue-600 hover:bg-blue-700" 
                                onClick={() => handleUpdateStatus(order.id, 'SHIPPING')}
                              >
                                <Truck className="size-4 mr-2" /> Giao cho đơn vị vận chuyển
                              </Button>
                              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleCancelOrder(order.id)}>
                                <XCircle className="size-4 mr-2" /> Hủy đơn
                              </Button>
                            </>
                          )}

                          {order.order_status === 'SHIPPING' && (
                            <Button 
                              className="bg-green-600 hover:bg-green-700" 
                              onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                            >
                              <CheckCircle className="size-4 mr-2" /> Xác nhận đã giao hàng
                            </Button>
                          )}

                          <Button variant="ghost" onClick={() => navigate(`/order/${order.id}`)}>
                            <Eye className="size-4 mr-2" /> Xem chi tiết
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
