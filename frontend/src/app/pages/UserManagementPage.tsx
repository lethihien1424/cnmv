//D:\CongNgheMoi_new\CongNgheMoi\frontend\src\app\pages\UserManagementPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  getDashboardUserDetail, 
  getDashboardUsers, 
  deleteDashboardUser, 
  updateDashboardUser, 
  AdminUserDetail 
} from '../services/adminStoreService';
import { 
  Loader2, 
  Users, 
  Store, 
  Edit, 
  Trash2, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  User as UserIcon, 
  Shield, 
  Activity, 
  Lock,
  ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';

export default function UserManagementPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserDetail | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    role: '',
    status: '',
    password: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getDashboardUsers(token);
      setUsers(data || []);
    } catch {
      setUsers([]);
      toast.error('Không tải được danh sách người dùng');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      return;
    }
    void loadUsers();
  }, [token, currentUser]);

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, users]);

  const handleViewDetail = async (targetUser: AdminUserDetail) => {
    setDetailLoading(true);
    setSelectedUser(targetUser);

    try {
      const detail = await getDashboardUserDetail(targetUser.id, token);
      setSelectedUser(detail);
    } catch {
      setSelectedUser(targetUser);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteUser = (e: React.MouseEvent, targetUser: AdminUserDetail) => {
    e.stopPropagation();
    toast(`Xóa người dùng "${targetUser.username || targetUser.email}"?`, {
      description: 'Hành động này không thể hoàn tác.',
      action: {
        label: 'Xóa',
        onClick: async () => {
          try {
            await deleteDashboardUser(targetUser.id, token);
            toast.success('Xóa người dùng thành công');
            void loadUsers();
            if (selectedUser?.id === targetUser.id) setSelectedUser(null);
          } catch (error: any) {
            toast.error(`Lỗi khi xóa: ${error.message}`);
          }
        },
      },
      cancel: {
  label: 'Hủy',
  onClick: () => {},  // ✅ thêm dòng này
},
    });
  };

  const handleOpenEdit = (e: React.MouseEvent, targetUser: AdminUserDetail) => {
    e.stopPropagation();
    setEditingUser(targetUser);
    setEditForm({
      username: targetUser.username || '',
      email: targetUser.email || '',
      role: targetUser.role || '',
      status: targetUser.status || '',
      password: ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setIsUpdating(true);
    try {
      const updateData: Partial<AdminUserDetail> = {
        username: editForm.username,
        email: editForm.email,
        status: editForm.status
      };
      if (editForm.password) (updateData as any).password = editForm.password;

      await updateDashboardUser(editingUser.id, updateData, token);
      toast.success('Cập nhật người dùng thành công');
      setIsEditModalOpen(false);
      void loadUsers();
      if (selectedUser?.id === editingUser.id) {
        void handleViewDetail(editingUser);
      }
    } catch (error: any) {
      toast.error(`Lỗi khi cập nhật: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatMoney = (value: number) => `${value.toLocaleString('vi-VN')}₫`;

  const getTypeBadge = (value: string) => (
    <Badge variant="outline" className={value === 'B2C' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-purple-50 text-purple-700 border-purple-300'}>
      {value}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="size-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Quản lý người dùng</CardTitle>
                <CardDescription>Xem và quản lý tài khoản người dùng trong hệ thống</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm người dùng..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="py-3 px-4 text-left font-medium text-gray-600 w-12">STT</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Người dùng</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Email</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Loại</th>
                  <th className="py-3 px-4 text-center font-medium text-gray-600 w-24">Cửa hàng</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-600 w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="size-8 animate-spin text-blue-600" />
                        Đang tải dữ liệu...
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <Users className="size-10 mx-auto mb-2 opacity-30" />
                      Không tìm thấy người dùng phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((item, index) => (
                    <tr 
                      key={item.id} 
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      onClick={() => handleViewDetail(item)}
                    >
                      <td className="py-4 px-4 text-gray-400 text-xs font-mono">{index + 1}</td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">{item.username || 'N/A'}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{item.role}</div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">{item.email}</td>
                      <td className="py-4 px-4">
                        {getTypeBadge(item.accountType)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {item.totalStores > 0 ? (
                          <Badge variant="secondary" className="bg-green-50 text-green-700 font-normal border-green-200">
                            {item.totalStores}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 italic text-xs">0</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-1.5 justify-end">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="hover:border-blue-400 hover:text-blue-600 h-8"
                            onClick={(e) => handleOpenEdit(e, item)}
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="h-8"
                            onClick={(e) => handleDeleteUser(e, item)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* User Detail Section */}
      {selectedUser && (
        <Card className="animate-in slide-in-from-bottom-4 duration-300 border-blue-100">
          <CardHeader className="border-b bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                  {selectedUser.username?.charAt(0) || 'U'}
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">{selectedUser.username}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {selectedUser.email}
                    <Badge variant="outline" className="text-[10px] h-4 py-0">{selectedUser.role}</Badge>
                    {/* Trạng thái: Customer không shop → user.status; có shop hoặc Business → latestStoreStatus */}
                    {(selectedUser.totalStores === 0 && selectedUser.role === 'Customer') ? (
                      <Badge className={`text-[10px] h-4 py-0 border-none ${
                        selectedUser.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {selectedUser.status === 'ACTIVE' ? 'Hoạt động' : selectedUser.status}
                      </Badge>
                    ) : (
                      <Badge className={`text-[10px] h-4 py-0 border-none ${
                        selectedUser.latestStoreStatus === 'APPROVED' ? 'bg-green-100 text-green-700'
                        : selectedUser.latestStoreStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700'
                        : selectedUser.latestStoreStatus === 'REJECTED' ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedUser.latestStoreStatus ?? selectedUser.status}
                      </Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>Đóng</Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {detailLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="size-8 animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-sm text-gray-500">Đang tải chi tiết...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <UserIcon className="size-4" /> Thông tin cơ bản
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tên người dùng:</span>
                        <span className="font-medium text-gray-900">{selectedUser.username || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Email:</span>
                        <span className="font-medium text-gray-900">{selectedUser.email}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Mật khẩu:</span>
                        <span className="font-medium text-gray-900">••••••••</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Vai trò:</span>
                        <span className="font-medium text-gray-900">{selectedUser.role}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <MapPin className="size-4" /> Liên hệ & Địa chỉ
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-3 text-sm">
                        <Phone className="size-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-gray-500 text-xs">Số điện thoại</p>
                          <p className="font-medium text-gray-900">{selectedUser.phone || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="size-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-gray-500 text-xs">Địa chỉ liên hệ</p>
                          <p className="font-medium text-gray-900">{selectedUser.address || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Activity className="size-4" /> Hoạt động
                    </h3>
                    {(selectedUser.role === 'Business' || (selectedUser.totalStores ?? 0) > 0) ? (
                      // Business / Customer có shop → hiện đơn đã bán
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-purple-50 rounded-xl p-4">
                          <p className="text-xs text-purple-600 font-bold uppercase mb-1">Đơn đã bán</p>
                          <p className="text-2xl font-bold text-purple-900">{selectedUser.totalStoreOrders ?? 0}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-4">
                          <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Doanh thu</p>
                          <p className="text-lg font-bold text-emerald-900">{formatMoney(selectedUser.totalStoreRevenue ?? 0)}</p>
                        </div>
                      </div>
                    ) : (
                      // Customer không có shop → hiện đơn đã mua
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-xl p-4">
                          <p className="text-xs text-blue-600 font-bold uppercase mb-1">Đơn đã mua</p>
                          <p className="text-2xl font-bold text-blue-900">{selectedUser.totalOrders}</p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-4">
                          <p className="text-xs text-green-600 font-bold uppercase mb-1">Chi tiêu</p>
                          <p className="text-lg font-bold text-green-900">{formatMoney(selectedUser.totalSpent || 0)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Store className="size-4" /> Cửa hàng sở hữu
                    </h3>
                    {!selectedUser.stores || selectedUser.stores.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Store className="size-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-xs text-gray-500">Chưa có cửa hàng</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedUser.stores.map((shop) => (
                          <div key={shop.id} className="bg-white border rounded-xl p-4 space-y-2 hover:border-blue-200 hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="size-10 bg-gray-50 rounded-lg flex items-center justify-center">
                                  <Store className="size-5 text-gray-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900">{shop.store_name}</p>
                                  <p className="text-[10px] text-gray-400">Loại: {shop.store_type} | MST: {shop.business_license || 'N/A'}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className={`text-[10px] h-4 border-none ${
                                shop.status === 'APPROVED' ? 'bg-green-50 text-green-700'
                                : shop.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700'
                                : shop.status === 'REJECTED' ? 'bg-red-50 text-red-700'
                                : 'bg-gray-50 text-gray-500'
                              }`}>
                                {shop.status}
                              </Badge>
                            </div>
                            {/* Thông tin thêm: thời gian, liên hệ, địa chỉ */}
                            <div className="pl-13 text-[11px] text-gray-500 space-y-1 pt-1 border-t border-gray-50">
                              <div className="flex gap-4 flex-wrap">
                                <span>🗓 Tham gia: {new Date(shop.createdAt).toLocaleDateString('vi-VN')}</span>
                                {shop.updatedAt && shop.updatedAt !== shop.createdAt && (
                                  <span>📦 Cập nhật: {new Date(shop.updatedAt).toLocaleDateString('vi-VN')}</span>
                                )}
                              </div>
                              {shop.contact_phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="size-3" />
                                  <span>{shop.contact_phone}</span>
                                </div>
                              )}
                              {shop.contact_email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="size-3" />
                                  <span>{shop.contact_email}</span>
                                </div>
                              )}
                              {shop.address && (
                                <div className="flex items-start gap-1">
                                  <MapPin className="size-3 mt-0.5" />
                                  <span>{shop.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ====== SECTION ĐƠN HÀNG GẦN ĐÂY ====== */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <ShoppingCart className="size-4" />
                      {(selectedUser.role === 'Business' || (selectedUser.totalStores ?? 0) > 0)
                        ? 'Đơn đã bán (gần nhất)'
                        : 'Đơn đã mua (gần nhất)'}
                    </h3>

                    {(selectedUser.role === 'Business' || (selectedUser.totalStores ?? 0) > 0) ? (
                      // Business / shop → store orders
                      !selectedUser.storeOrders || selectedUser.storeOrders.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <ShoppingCart className="size-6 mx-auto mb-2 text-gray-300" />
                          <p className="text-xs text-gray-500">Chưa có đơn hàng nào</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {selectedUser.storeOrders.slice(0, 10).map((order) => (
                            <div key={order.id} className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between gap-3 text-sm hover:border-purple-200 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="font-mono text-xs text-gray-400 shrink-0">#{order.id.slice(0, 8).toUpperCase()}</span>
                                <div className="min-w-0">
                                  <p className="text-[11px] text-gray-400 truncate max-w-[160px]">{order.shipping_address || '—'}</p>
                                  <p className="text-[10px] text-gray-300">{new Date(order.createdAt ?? order.created_at ?? '').toLocaleDateString('vi-VN')}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  order.order_status === 'DELIVERED' ? 'bg-green-100 text-green-700'
                                  : order.order_status === 'CANCELLED' ? 'bg-red-100 text-red-500'
                                  : order.order_status === 'SHIPPING' ? 'bg-cyan-100 text-cyan-700'
                                  : order.order_status === 'PICKUP' ? 'bg-blue-100 text-blue-700'
                                  : 'bg-yellow-100 text-yellow-700'
                                }`}>{order.order_status}</span>
                                <span className="text-xs font-bold text-purple-700">{formatMoney(Number(order.total_amount))}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      // Customer không có shop → buyer orders
                      !selectedUser.orders || selectedUser.orders.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <ShoppingCart className="size-6 mx-auto mb-2 text-gray-300" />
                          <p className="text-xs text-gray-500">Chưa mua hàng lần nào</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {selectedUser.orders.slice(0, 10).map((order) => (
                            <div key={order.id} className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between gap-3 text-sm hover:border-blue-200 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="font-mono text-xs text-gray-400 shrink-0">#{order.id.slice(0, 8).toUpperCase()}</span>
                                <p className="text-[10px] text-gray-300">{new Date((order as any).createdAt ?? (order as any).created_at ?? '').toLocaleDateString('vi-VN')}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  order.order_status === 'DELIVERED' ? 'bg-green-100 text-green-700'
                                  : order.order_status === 'CANCELLED' ? 'bg-red-100 text-red-500'
                                  : order.order_status === 'SHIPPING' ? 'bg-cyan-100 text-cyan-700'
                                  : order.order_status === 'PICKUP' ? 'bg-blue-100 text-blue-700'
                                  : 'bg-yellow-100 text-yellow-700'
                                }`}>{order.order_status}</span>
                                <span className="text-xs font-bold text-blue-700">{formatMoney(Number(order.total_amount))}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin cho tài khoản {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-username">Tên người dùng</Label>
              <Input
                id="edit-username"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">Mật khẩu mới (Để trống nếu không đổi)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-2">
              <Label>Vai trò (Không được sửa)</Label>
              <Input value={editForm.role} disabled className="bg-gray-50" />
            </div>
            <div className="grid gap-2">
              <Label>Trạng thái</Label>
              <Select 
                value={editForm.status} 
                onValueChange={(val) => setEditForm({ ...editForm, status: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                  <SelectItem value="INACTIVE">Khóa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isUpdating}>
              Hủy
            </Button>
            <Button onClick={handleUpdateUser} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}