//D:\CongNgheMoi-hien\CongNgheMoi\frontend\src\app\pages\UserManagementPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { getDashboardUserDetail, getDashboardUsers, type AdminUserDetail } from '../services/adminStoreService';
import { Loader2, Users, Eye, Store } from 'lucide-react';

export default function UserManagementPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<AdminUserDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'c2c' | 'b2c'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      return;
    }

    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const data = await getDashboardUsers(token);
        setUsers(data);
      } catch {
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadUsers();
  }, [token, user]);

  const filteredUsers = useMemo(() => {
    if (activeTab === 'all') {
      return users;
    }

    const targetType = activeTab.toUpperCase();
    return users.filter((item) => item.accountType === targetType);
  }, [activeTab, users]);

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

  const formatMoney = (value: number) => `${value.toLocaleString('vi-VN')}₫`;

  const getTypeBadge = (value: 'C2C' | 'B2C') => (
    <Badge variant="outline" className={value === 'B2C' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-purple-50 text-purple-700 border-purple-300'}>
      {value}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="size-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Quản lý người dùng</CardTitle>
              <CardDescription>Danh sách người dùng C2C/B2C và thông tin chi tiết</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'c2c' | 'b2c')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Tất cả ({users.length})</TabsTrigger>
          <TabsTrigger value="c2c">C2C ({users.filter((u) => u.accountType === 'C2C').length})</TabsTrigger>
          <TabsTrigger value="b2c">B2C ({users.filter((u) => u.accountType === 'B2C').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <Loader2 className="size-12 mx-auto mb-3 text-gray-300 animate-spin" />
              <p>Đang tải danh sách người dùng...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="size-12 mx-auto mb-3 text-gray-300" />
              <p>Không có người dùng phù hợp</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Đơn hàng</TableHead>
                  <TableHead>Tổng chi tiêu</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.username || 'Chưa đặt tên'}</TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>{getTypeBadge(item.accountType)}</TableCell>
                    <TableCell>{item.totalStores}</TableCell>
                    <TableCell>{item.totalOrders}</TableCell>
                    <TableCell>{formatMoney(item.totalSpent)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handleViewDetail(item)}>
                        <Eye className="size-4 mr-1" />
                        Xem
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết người dùng</CardTitle>
            <CardDescription>{selectedUser.username} - {selectedUser.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detailLoading ? (
              <div className="text-sm text-gray-500">Đang tải chi tiết...</div>
            ) : (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">Loại tài khoản</p>
                    <p className="font-semibold mt-1">{selectedUser.accountType}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">Tổng đơn hàng</p>
                    <p className="font-semibold mt-1">{selectedUser.totalOrders}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">Tổng chi tiêu</p>
                    <p className="font-semibold mt-1">{formatMoney(selectedUser.totalSpent)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2"><Store className="size-4" /> Cửa hàng</h4>
                  {selectedUser.stores.length === 0 ? (
                    <p className="text-sm text-gray-500">Chưa có cửa hàng.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedUser.stores.map((shop) => (
                        <div key={shop.id} className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">{shop.store_name}</p>
                          <p className="text-gray-500">Loại: {shop.store_type} | Trạng thái: {shop.status}</p>
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
