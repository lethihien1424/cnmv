import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { getDashboardUserDetail, getDashboardUsers, deleteDashboardUser, updateDashboardUser, type AdminUserDetail } from '../services/adminStoreService';
import { Loader2, Users, Eye, Store, Edit, Trash2, Search, Plus } from 'lucide-react';

export default function UserManagementPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<AdminUserDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getDashboardUsers(token);
      setUsers(data || []);
    } catch {
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      return;
    }

    void loadUsers();
  }, [token, user]);

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

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;

    try {
      await deleteDashboardUser(userId, token);
      alert('Xóa người dùng thành công');
      void loadUsers();
    } catch (error: any) {
      alert(`Lỗi khi xóa: ${error.message}`);
    }
  };

  const handleEditUser = async (targetUser: AdminUserDetail) => {
    const newUsername = window.prompt('Nhập tên người dùng mới:', targetUser.username);
    if (newUsername === null || newUsername === targetUser.username) return;

    try {
      await updateDashboardUser(targetUser.id, { username: newUsername }, token);
      alert('Cập nhật người dùng thành công');
      void loadUsers();
    } catch (error: any) {
      alert(`Lỗi khi cập nhật: ${error.message}`);
    }
  };

  const formatMoney = (value: number) => `${value.toLocaleString('vi-VN')}₫`;

  const getTypeBadge = (value: 'C2C' | 'B2C' | string) => (
    <Badge variant="outline" className={value === 'B2C' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-purple-50 text-purple-700 border-purple-300'}>
      {value}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="size-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Quản lý người dùng</CardTitle>
                <CardDescription>Xem và quản lý tài khoản người dùng trong hệ thống</CardDescription>
              </div>
            </div>
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600">
              <Plus className="size-4 mr-2" />
              Thêm người dùng
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Tìm kiếm người dùng..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-sm">Người dùng</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Loại</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Shop</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Đơn hàng</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Tổng chi tiêu</th>
                  <th className="text-right py-3 px-4 font-medium text-sm">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10">
                      <Loader2 className="size-8 animate-spin mx-auto text-blue-600" />
                      <p className="mt-2 text-sm text-gray-500">Đang tải dữ liệu...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-500">
                      Không tìm thấy người dùng phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">{item.username || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-4 text-gray-600 text-sm">{item.email}</td>
                      <td className="py-4 px-4">
                        {getTypeBadge(item.accountType)}
                      </td>
                      <td className="py-4 px-4">
                        {item.totalStores > 0 ? (
                          <Badge variant="secondary" className="bg-green-50 text-green-700 font-normal">
                            {item.totalStores}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm italic">0</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">{item.totalOrders}</div>
                      </td>
                      <td className="py-4 px-4 font-medium text-sm">
                        {formatMoney(item.totalSpent || 0)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" className="h-8" onClick={() => handleViewDetail(item)}>
                            <Eye className="size-3.5 mr-1" />
                            Xem
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => handleEditUser(item)}>
                            <Edit className="size-3.5 mr-1" />
                            Sửa
                          </Button>
                          <Button size="sm" variant="destructive" className="h-8 bg-red-500 hover:bg-red-600" onClick={() => handleDeleteUser(item.id)}>
                            <Trash2 className="size-3.5 mr-1" />
                            Xóa
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

      {selectedUser && (
        <Card className="border-blue-200 bg-blue-50/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Chi tiết người dùng</CardTitle>
              <CardDescription>{selectedUser.username} - {selectedUser.email}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>Đóng</Button>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {detailLoading ? (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Đang tải chi tiết...
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg border p-4">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Loại tài khoản</p>
                    <p className="font-bold text-lg mt-1 text-indigo-600">{selectedUser.accountType}</p>
                  </div>
                  <div className="bg-white rounded-lg border p-4">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Tổng đơn hàng</p>
                    <p className="font-bold text-lg mt-1">{selectedUser.totalOrders}</p>
                  </div>
                  <div className="bg-white rounded-lg border p-4">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Tổng chi tiêu</p>
                    <p className="font-bold text-lg mt-1 text-red-600">{formatMoney(selectedUser.totalSpent || 0)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-gray-700 flex items-center gap-2 px-1">
                    <Store className="size-4 text-blue-500" /> Cửa hàng sở hữu
                  </h4>
                  {!selectedUser.stores || selectedUser.stores.length === 0 ? (
                    <div className="text-center py-6 bg-white rounded-lg border border-dashed text-gray-400 text-sm">
                      Người dùng này chưa có cửa hàng nào.
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      {selectedUser.stores.map((shop) => (
                        <div key={shop.id} className="bg-white rounded-lg border p-4 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="font-bold text-gray-900">{shop.store_name}</p>
                            <p className="text-xs text-gray-500 mt-1">Loại: {shop.store_type} | ID: {shop.id.slice(0, 8)}</p>
                          </div>
                          <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                            {shop.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}