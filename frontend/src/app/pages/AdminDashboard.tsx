// //D:\CongNgheMoi_new\CongNgheMoi\frontend\src\app\pages\AdminDashboard.tsx
// import React from 'react';
// import { useAuth } from '../contexts/AuthContext';
// import { Button } from '../components/ui/button';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
// import { Badge } from '../components/ui/badge';
// import { Shield, Users, Store, Package, LogOut, TrendingUp, FolderOpen, BarChart3 } from 'lucide-react';
// import { useNavigate } from 'react-router';
// import StoreManagementPage from './StoreManagementPage';
// import CategoryManagement from '../components/CategoryManagement';
// import {
//   getAdminDashboardStats,
//   getAdminPlatformIncomeReport,
//   getAdminPlatformIncomeSummary,
//   type PlatformIncomePeriod,
//   type PlatformIncomeSummary,
// } from '../services/adminDashboardService';
// import UserManagementPage from './UserManagementPage';

// export default function AdminDashboard() {
//   const { user, logout, token } = useAuth();
//   const navigate = useNavigate();
//   const [activeTab, setActiveTab] = React.useState<'overview' | 'stores' | 'categories' | 'users' | 'reports'>('overview');
//   const [statsData, setStatsData] = React.useState({
//     totalCustomers: 0,
//     totalStores: 0,
//     totalProducts: 0,
//     totalRevenue: 0,
//   });
//   const [platformIncome, setPlatformIncome] = React.useState<PlatformIncomeSummary | null>(null);
//   const [incomeFilter, setIncomeFilter] = React.useState<{
//     period: 'day' | 'month' | 'quarter' | 'year' | 'custom';
//     from: string;
//     to: string;
//   }>({
//     period: 'month',
//     from: '',
//     to: '',
//   });
//   const [filteredIncome, setFilteredIncome] = React.useState<PlatformIncomePeriod | null>(null);
//   const [isIncomeLoading, setIsIncomeLoading] = React.useState(false);
//   const [incomeError, setIncomeError] = React.useState<string | null>(null);
//   const [shopRankingMode, setShopRankingMode] = React.useState<'highest' | 'lowest' | 'all'>('highest');

//   React.useEffect(() => {
//     if (!user || user.role !== 'admin') {
//       return;
//     }

//     const loadStats = async () => {
//       try {
//         const [response, incomeSummary] = await Promise.all([
//           getAdminDashboardStats(token),
//           getAdminPlatformIncomeSummary(token),
//         ]);
//         setStatsData({
//           totalCustomers: response.totalCustomers,
//           totalStores: response.totalStores,
//           totalProducts: response.totalProducts,
//           totalRevenue: response.totalRevenue,
//         });
//         setPlatformIncome(incomeSummary);

//         const firstReport = await getAdminPlatformIncomeReport({ period: 'month' }, token);
//         setFilteredIncome(firstReport);
//         setIncomeError(null);
//       } catch {
//         setStatsData({
//           totalCustomers: 0,
//           totalStores: 0,
//           totalProducts: 0,
//           totalRevenue: 0,
//         });
//         setPlatformIncome(null);
//         setFilteredIncome(null);
//       }
//     };

//     void loadStats();
//   }, [token, user]);

//   const handleApplyIncomeFilter = async () => {
//     try {
//       setIsIncomeLoading(true);
//       setIncomeError(null);

//       if (
//         incomeFilter.period === 'custom' &&
//         (!incomeFilter.from || !incomeFilter.to)
//       ) {
//         setIncomeError('Vui lòng chọn đủ Từ ngày và Đến ngày khi dùng bộ lọc tùy chỉnh.');
//         setIsIncomeLoading(false);
//         return;
//       }

//       if (
//         incomeFilter.period === 'custom' &&
//         new Date(incomeFilter.to).getTime() <= new Date(incomeFilter.from).getTime()
//       ) {
//         setIncomeError('Đến ngày phải lớn hơn Từ ngày.');
//         setIsIncomeLoading(false);
//         return;
//       }

//       const payload =
//         incomeFilter.period === 'custom'
//           ? {
//             period: 'custom' as const,
//             from: incomeFilter.from,
//             to: incomeFilter.to,
//           }
//           : {
//             period: incomeFilter.period,
//           };

//       const report = await getAdminPlatformIncomeReport(payload, token);
//       setFilteredIncome(report);
//     } catch (error) {
//       setIncomeError(error instanceof Error ? error.message : 'Không tải được báo cáo theo bộ lọc đã chọn.');
//       setFilteredIncome(null);
//     } finally {
//       setIsIncomeLoading(false);
//     }
//   };

//   const formatMoney = (value: number) =>
//     new Intl.NumberFormat('vi-VN', {
//       style: 'currency',
//       currency: 'VND',
//       maximumFractionDigits: 0,
//     }).format(value);

//   const handleLogout = () => {
//     logout();
//     navigate('/login');
//   };

//   if (!user || user.role !== 'admin') {
//     return null;
//   }

//   const stats = [
//     { label: 'Tổng khách hàng', value: statsData.totalCustomers.toLocaleString('vi-VN'), icon: Users, color: 'bg-blue-500' },
//     { label: 'Cửa hàng', value: statsData.totalStores.toLocaleString('vi-VN'), icon: Store, color: 'bg-purple-500' },
//     { label: 'Sản phẩm', value: statsData.totalProducts.toLocaleString('vi-VN'), icon: Package, color: 'bg-green-500' },
//     { label: 'Doanh thu cửa hàng', value: formatMoney(statsData.totalRevenue), icon: TrendingUp, color: 'bg-orange-500' },
//   ];

//   const periodLabels: Record<'day' | 'month' | 'quarter' | 'year', string> = {
//     day: 'Trong ngày',
//     month: 'Trong tháng',
//     quarter: 'Trong quý',
//     year: 'Trong năm',
//   };

//   const platformIncomeCards = platformIncome
//     ? ([platformIncome.day, platformIncome.month, platformIncome.quarter, platformIncome.year] as const)
//     : [];

//   const periodFilterLabels: Record<'day' | 'month' | 'quarter' | 'year' | 'custom', string> = {
//     day: 'Trong ngày',
//     month: 'Trong tháng',
//     quarter: 'Trong quý',
//     year: 'Trong năm',
//     custom: 'Tùy chỉnh',
//   };

//   const revenueAmount = filteredIncome?.totalOrderRevenue ?? 0;
//   const platformCostAmount = filteredIncome?.totalPlatformIncome ?? 0;
//   const ownerIncomeAmount = filteredIncome?.totalOwnerIncome ?? (revenueAmount - platformCostAmount);

//   const chartRows = [
//     {
//       key: 'revenue',
//       label: 'Doanh thu',
//       value: revenueAmount,
//       color: 'bg-blue-500',
//     },
//     {
//       key: 'platformCost',
//       label: 'Tổng chi phí sàn thu',
//       value: platformCostAmount,
//       color: 'bg-orange-500',
//     },
//     {
//       key: 'ownerIncome',
//       label: 'Thu nhập chủ shop',
//       value: ownerIncomeAmount,
//       color: 'bg-emerald-500',
//     },
//   ];

//   const maxChartValue = Math.max(
//     ...chartRows.map((row) => Math.max(0, row.value)),
//     1,
//   );

//   const topStoresSafe = filteredIncome?.topStores ?? [];
//   const bottomStoresSafe = filteredIncome?.bottomStores ?? [];
//   const allStoresSafe = filteredIncome?.allStores ?? [];

//   const rankedShops = filteredIncome
//     ? shopRankingMode === 'highest'
//       ? topStoresSafe
//       : shopRankingMode === 'lowest'
//         ? bottomStoresSafe
//         : allStoresSafe
//     : [];

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
//       {/* Header */}
//       <header className="bg-white border-b">
//         <div className="container mx-auto px-4 py-4 flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <div className="size-8 bg-red-600 rounded-lg flex items-center justify-center">
//               <Shield className="size-5 text-white" />
//             </div>
//             <span className="text-xl">Admin Dashboard</span>
//           </div>
//           <div className="flex items-center gap-4">
//             <div className="flex items-center gap-2">
//               <Badge variant="destructive">Admin</Badge>
//               <span className="text-sm">{user.username}</span>
//             </div>
//             <Button variant="outline" onClick={handleLogout}>
//               <LogOut className="size-4 mr-2" />
//               Đăng xuất
//             </Button>
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
//       <main className="container mx-auto px-4 py-8">
//         <div className="space-y-6">
//           {/* Welcome Section */}
//           <div>
//             <h1 className="text-3xl mb-2">Chào mừng, {user.username}!</h1>
//             <p className="text-gray-600">Quản lý hệ thống và theo dõi hoạt động</p>
//           </div>

//           {/* Tabs Navigation */}
//           <div className="flex gap-2 border-b">
//             <button
//               onClick={() => setActiveTab('overview')}
//               className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'overview'
//                 ? 'text-cyan-600'
//                 : 'text-gray-600 hover:text-gray-900'
//                 }`}
//             >
//               <div className="flex items-center gap-2">
//                 <TrendingUp className="size-4" />
//                 Tổng quan
//               </div>
//               {activeTab === 'overview' && (
//                 <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600"></div>
//               )}
//             </button>
//             <button
//               onClick={() => setActiveTab('stores')}
//               className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'stores'
//                 ? 'text-cyan-600'
//                 : 'text-gray-600 hover:text-gray-900'
//                 }`}
//             >
//               <div className="flex items-center gap-2">
//                 <Store className="size-4" />
//                 Quản lý Cửa hàng
//               </div>
//               {activeTab === 'stores' && (
//                 <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600"></div>
//               )}
//             </button>
//             <button
//               onClick={() => setActiveTab('categories')}
//               className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'categories'
//                 ? 'text-cyan-600'
//                 : 'text-gray-600 hover:text-gray-900'
//                 }`}
//             >
//               <div className="flex items-center gap-2">
//                 <FolderOpen className="size-4" />
//                 Quản lý Danh mục
//               </div>
//               {activeTab === 'categories' && (
//                 <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600"></div>
//               )}
//             </button>
//             <button
//               onClick={() => setActiveTab('users')}
//               className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'users'
//                 ? 'text-cyan-600'
//                 : 'text-gray-600 hover:text-gray-900'
//                 }`}
//             >
//               <div className="flex items-center gap-2">
//                 <Users className="size-4" />
//                 Quản lý người dùng
//               </div>
//               {activeTab === 'users' && (
//                 <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600"></div>
//               )}
//             </button>
//             <button
//               onClick={() => setActiveTab('reports')}
//               className={`px-6 py-3 font-medium transition-colors relative ${activeTab === 'reports'
//                 ? 'text-cyan-600'
//                 : 'text-gray-600 hover:text-gray-900'
//                 }`}
//             >
//               <div className="flex items-center gap-2">
//                 <BarChart3 className="size-4" />
//                 Báo cáo & Thống kê
//               </div>
//               {activeTab === 'reports' && (
//                 <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600"></div>
//               )}
//             </button>
//           </div>

//           {/* Tab Content - Overview */}
//           {activeTab === 'overview' && (
//             <>
//               {/* Stats Grid */}
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//                 {stats.map((stat, index) => (
//                   <Card key={index}>
//                     <CardContent className="p-6">
//                       <div className="flex items-center justify-between">
//                         <div>
//                           <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
//                           <p className="text-2xl">{stat.value}</p>
//                         </div>
//                         <div className={`size-12 ${stat.color} rounded-lg flex items-center justify-center`}>
//                           <stat.icon className="size-6 text-white" />
//                         </div>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 ))}
//               </div>

//               {/* Management Cards */}
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                 <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('stores')}>
//                   <CardHeader>
//                     <div className="flex items-center gap-2">
//                       <div className="size-10 bg-purple-100 rounded-lg flex items-center justify-center">
//                         <Store className="size-5 text-purple-600" />
//                       </div>
//                       <div>
//                         <CardTitle>Quản lý Cửa hàng</CardTitle>
//                         <CardDescription>Duyệt và quản lý cửa hàng</CardDescription>
//                       </div>
//                     </div>
//                   </CardHeader>
//                   <CardContent>
//                     <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">
//                       Xem chi tiết
//                     </Button>
//                   </CardContent>
//                 </Card>

//                 <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('categories')}>
//                   <CardHeader>
//                     <div className="flex items-center gap-2">
//                       <div className="size-10 bg-cyan-100 rounded-lg flex items-center justify-center">
//                         <FolderOpen className="size-5 text-cyan-600" />
//                       </div>
//                       <div>
//                         <CardTitle>Quản lý Danh mục</CardTitle>
//                         <CardDescription>Thêm, sửa, xóa danh mục</CardDescription>
//                       </div>
//                     </div>
//                   </CardHeader>
//                   <CardContent>
//                     <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
//                       Xem chi tiết
//                     </Button>
//                   </CardContent>
//                 </Card>

//                 <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('users')}>
//                   <CardHeader>
//                     <div className="flex items-center gap-2">
//                       <div className="size-10 bg-blue-100 rounded-lg flex items-center justify-center">
//                         <Users className="size-5 text-blue-600" />
//                       </div>
//                       <div>
//                         <CardTitle>Quản lý người dùng</CardTitle>
//                         <CardDescription>Xem và quản lý tài khoản</CardDescription>
//                       </div>
//                     </div>
//                   </CardHeader>
//                   <CardContent>
//                     <Button className="w-full" variant="outline" onClick={() => setActiveTab('users')}>
//                       Xem chi tiết
//                     </Button>
//                   </CardContent>
//                 </Card>

//                 <Card>
//                   <CardHeader>
//                     <div className="flex items-center gap-2">
//                       <div className="size-10 bg-green-100 rounded-lg flex items-center justify-center">
//                         <Package className="size-5 text-green-600" />
//                       </div>
//                       <div>
//                         <CardTitle>Quản lý sản phẩm</CardTitle>
//                         <CardDescription>Kiểm duyệt sản phẩm</CardDescription>
//                       </div>
//                     </div>
//                   </CardHeader>
//                   <CardContent>
//                     <Button className="w-full" variant="outline">
//                       Xem chi tiết
//                     </Button>
//                   </CardContent>
//                 </Card>

//                 <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('reports')}>
//                   <CardHeader>
//                     <div className="flex items-center gap-2">
//                       <div className="size-10 bg-orange-100 rounded-lg flex items-center justify-center">
//                         <TrendingUp className="size-5 text-orange-600" />
//                       </div>
//                       <div>
//                         <CardTitle>Báo cáo & Thống kê</CardTitle>
//                         <CardDescription>Xem báo cáo chi tiết</CardDescription>
//                       </div>
//                     </div>
//                   </CardHeader>
//                   <CardContent>
//                     <Button className="w-full" variant="outline" onClick={() => setActiveTab('reports')}>
//                       Xem chi tiết
//                     </Button>
//                   </CardContent>
//                 </Card>
//               </div>

//               {/* Recent Activity */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Hoạt động gần đây</CardTitle>
//                   <CardDescription>Các hoạt động mới nhất trong hệ thống</CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="space-y-4">
//                     {[
//                       { action: 'Người dùng mới đăng ký', user: 'customer@example.com', time: '5 phút trước' },
//                       { action: 'Cửa hàng mới được tạo', user: 'Cửa hàng ABC', time: '15 phút trước' },
//                       { action: 'Sản phẩm mới được thêm', user: 'Sản phẩm XYZ', time: '30 phút trước' },
//                       { action: 'Đơn hàng mới', user: 'Đơn #12345', time: '1 giờ trước' },
//                     ].map((activity, index) => (
//                       <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
//                         <div>
//                           <p className="font-medium">{activity.action}</p>
//                           <p className="text-sm text-gray-500">{activity.user}</p>
//                         </div>
//                         <span className="text-sm text-gray-400">{activity.time}</span>
//                       </div>
//                     ))}
//                   </div>
//                 </CardContent>
//               </Card>
//             </>
//           )}

//           {/* Tab Content - Store Management */}
//           {activeTab === 'stores' && (
//             <StoreManagementPage />
//           )}

//           {/* Tab Content - Category Management */}
//           {activeTab === 'categories' && (
//             <CategoryManagement />
//           )}

//           {activeTab === 'users' && (
//             <UserManagementPage />
//           )}

//           {activeTab === 'reports' && (
//             <div className="space-y-6">
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Thu nhập sàn theo kỳ</CardTitle>
//                   <CardDescription>Doanh thu phí sàn (phí cố định + phí thanh toán + phí dịch vụ)</CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//                     {platformIncomeCards.map((item) => (
//                       <div key={item.period} className="rounded-lg border border-gray-200 p-4 bg-white">
//                         <p className="text-sm text-gray-500">{periodLabels[item.period as keyof typeof periodLabels] ?? item.period}</p>
//                         <p className="text-xl font-semibold text-gray-900 mt-1">{formatMoney(item.totalPlatformIncome)}</p>
//                         <p className="text-xs text-gray-500 mt-2">Doanh thu đơn: {formatMoney(item.totalOrderRevenue)}</p>
//                         <p className="text-xs text-gray-500">Đơn hàng tính phí: {item.orderCount.toLocaleString('vi-VN')}</p>
//                       </div>
//                     ))}
//                   </div>
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardHeader>
//                   <CardTitle>Bộ lọc thời gian báo cáo</CardTitle>
//                   <CardDescription>Lọc thu nhập sàn theo kỳ hoặc khoảng thời gian tùy chỉnh</CardDescription>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
//                     <select
//                       value={incomeFilter.period}
//                       onChange={(e) =>
//                         setIncomeFilter((prev) => ({
//                           ...prev,
//                           period: e.target.value as 'day' | 'month' | 'quarter' | 'year' | 'custom',
//                         }))
//                       }
//                       className="rounded-md border border-gray-200 px-3 py-2 text-sm"
//                     >
//                       <option value="day">Trong ngày</option>
//                       <option value="month">Trong tháng</option>
//                       <option value="quarter">Trong quý</option>
//                       <option value="year">Trong năm</option>
//                       <option value="custom">Tùy chỉnh từ ngày - đến ngày</option>
//                     </select>

//                     <input
//                       type="datetime-local"
//                       value={incomeFilter.from}
//                       onChange={(e) =>
//                         setIncomeFilter((prev) => ({
//                           ...prev,
//                           period: 'custom',
//                           from: e.target.value,
//                         }))
//                       }
//                       className="rounded-md border border-gray-200 px-3 py-2 text-sm"
//                     />

//                     <input
//                       type="datetime-local"
//                       value={incomeFilter.to}
//                       onChange={(e) =>
//                         setIncomeFilter((prev) => ({
//                           ...prev,
//                           period: 'custom',
//                           to: e.target.value,
//                         }))
//                       }
//                       className="rounded-md border border-gray-200 px-3 py-2 text-sm"
//                     />

//                     <Button onClick={handleApplyIncomeFilter} disabled={isIncomeLoading}>
//                       {isIncomeLoading ? 'Đang tải...' : 'Áp dụng lọc'}
//                     </Button>
//                   </div>

//                   <p className="text-xs text-gray-500">Khi chọn ngày giờ, bộ lọc sẽ tự chuyển sang chế độ Tùy chỉnh.</p>

//                   {incomeError && (
//                     <p className="text-sm text-red-600">{incomeError}</p>
//                   )}

//                   {filteredIncome && (
//                     <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 space-y-2">
//                       <p className="text-sm text-cyan-700 font-medium">
//                         Kỳ đang xem: {periodFilterLabels[filteredIncome.period]}
//                       </p>
//                       <p className="text-xs text-cyan-700">
//                         Từ {new Date(filteredIncome.range.from).toLocaleString('vi-VN')} đến {new Date(filteredIncome.range.to).toLocaleString('vi-VN')}
//                       </p>
//                       <p className="text-2xl font-semibold text-cyan-900">
//                         Thu nhập sàn: {formatMoney(filteredIncome.totalPlatformIncome)}
//                       </p>
//                       <p className="text-sm text-cyan-900">
//                         Thu nhập ròng chủ shop: {formatMoney(filteredIncome.totalOwnerIncome)}
//                       </p>
//                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-cyan-900">
//                         <p>Doanh thu đơn: {formatMoney(filteredIncome.totalOrderRevenue)}</p>
//                         <p>Phí cố định: {formatMoney(filteredIncome.fixedFeeIncome)}</p>
//                         <p>Phí thanh toán: {formatMoney(filteredIncome.paymentFeeIncome)}</p>
//                         <p>Phí dịch vụ: {formatMoney(filteredIncome.serviceFeeIncome)}</p>
//                       </div>
//                       <p className="text-xs text-cyan-800">
//                         Số đơn tính phí: {filteredIncome.orderCount.toLocaleString('vi-VN')}
//                       </p>
//                       <p className="text-xs text-cyan-800">
//                         Số shop có đơn trong kỳ: {filteredIncome.totalStoresWithOrders.toLocaleString('vi-VN')} | Tỷ lệ phí sàn: {(filteredIncome.takeRate * 100).toFixed(2)}%
//                       </p>
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardHeader>
//                   <CardTitle>Biểu đồ doanh thu - chi phí - thu nhập chủ shop</CardTitle>
//                   <CardDescription>
//                     So sánh nhanh tổng doanh thu đơn, tổng phí sàn ShopHub thu và tổng thu nhập ròng của các chủ shop theo bộ lọc hiện tại
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//                     <div className="rounded-lg border border-gray-200 p-3">
//                       <p className="text-sm text-gray-500">Doanh thu</p>
//                       <p className="text-lg font-semibold text-blue-600">{formatMoney(revenueAmount)}</p>
//                     </div>
//                     <div className="rounded-lg border border-gray-200 p-3">
//                       <p className="text-sm text-gray-500">Tổng chi phí sàn thu</p>
//                       <p className="text-lg font-semibold text-orange-600">{formatMoney(platformCostAmount)}</p>
//                     </div>
//                     <div className="rounded-lg border border-gray-200 p-3">
//                       <p className="text-sm text-gray-500">Thu nhập chủ shop</p>
//                       <p className="text-lg font-semibold text-emerald-600">{formatMoney(ownerIncomeAmount)}</p>
//                     </div>
//                   </div>

//                   <div className="space-y-4">
//                     {chartRows.map((row) => {
//                       const normalizedWidth = `${Math.max(0, (row.value / maxChartValue) * 100)}%`;

//                       return (
//                         <div key={row.key} className="space-y-1">
//                           <div className="flex items-center justify-between text-sm">
//                             <span className="text-gray-700">{row.label}</span>
//                             <span className="font-medium text-gray-900">{formatMoney(row.value)}</span>
//                           </div>
//                           <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
//                             <div className={`h-full ${row.color}`} style={{ width: normalizedWidth }} />
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>

//                   {filteredIncome && (
//                     <div className="rounded-lg border border-gray-200 p-4">
//                       <div className="mb-3 flex items-center justify-between gap-3">
//                         <p className="text-sm font-medium text-gray-800">
//                           {shopRankingMode === 'highest'
//                             ? 'Top 5 shop doanh thu cao nhất'
//                             : shopRankingMode === 'lowest'
//                               ? 'Top 5 shop doanh thu thấp nhất'
//                               : 'Tất cả shop theo doanh thu (cao xuống thấp)'}
//                         </p>
//                         <select
//                           value={shopRankingMode}
//                           onChange={(e) => setShopRankingMode(e.target.value as 'highest' | 'lowest' | 'all')}
//                           className="rounded-md border border-gray-200 px-3 py-1.5 text-sm"
//                         >
//                           <option value="highest">Shop cao nhất</option>
//                           <option value="lowest">Shop thấp nhất</option>
//                           <option value="all">Tất cả shop</option>
//                         </select>
//                       </div>
//                       {rankedShops.length === 0 ? (
//                         <p className="text-sm text-gray-500">Chưa có dữ liệu đơn hàng trong khoảng thời gian này.</p>
//                       ) : (
//                         <div className="space-y-2">
//                           {rankedShops.map((shop, index) => (
//                             <div key={shop.storeId} className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-md border border-gray-100 p-3 text-sm">
//                               <p className="font-medium text-gray-900">#{index + 1} {shop.storeName}</p>
//                               <p className="text-gray-600">Doanh thu: {formatMoney(shop.totalOrderRevenue)}</p>
//                               <p className="text-gray-600">Phí sàn thu: {formatMoney(shop.totalPlatformIncome)}</p>
//                               <p className="text-gray-600">Thu nhập shop: {formatMoney(shop.totalOwnerIncome)}</p>
//                             </div>
//                           ))}
//                         </div>
//                       )}
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>
//             </div>
//           )}
//         </div>
//       </main>
//     </div>
//   );
// }

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Shield, Users, Store, Package, LogOut, TrendingUp, FolderOpen, BarChart3, Ticket  } from 'lucide-react';
import { useNavigate } from 'react-router';
import StoreManagementPage from './StoreManagementPage';
import CategoryManagement from '../components/CategoryManagement';
import {
  getAdminDashboardStats,
  getAdminPlatformIncomeReport,
  getAdminPlatformIncomeSummary,
  type PlatformIncomePeriod,
  type PlatformIncomeSummary,
} from '../services/adminDashboardService';
import AdminVoucherPage from './AdminVoucherPage';
import UserManagementPage from './UserManagementPage';

export default function AdminDashboard() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  
 const [activeTab, setActiveTab] = React.useState<
    'overview'
    | 'stores'
    | 'categories'
    | 'users'
    | 'reports'
    | 'promotions'
    >('overview');
  
  const [statsData, setStatsData] = React.useState({
    totalCustomers: 0,
    totalStores: 0,
    totalProducts: 0,
    totalRevenue: 0,
  });
  
  const [platformIncome, setPlatformIncome] = React.useState<PlatformIncomeSummary | null>(null);
  
  const [incomeFilter, setIncomeFilter] = React.useState<{
    period: 'day' | 'month' | 'quarter' | 'year' | 'custom';
    from: string;
    to: string;
  }>({
    period: 'month',
    from: '',
    to: '',
  });
  
  const [filteredIncome, setFilteredIncome] = React.useState<PlatformIncomePeriod | null>(null);
  const [isIncomeLoading, setIsIncomeLoading] = React.useState(false);
  const [incomeError, setIncomeError] = React.useState<string | null>(null);
  const [shopRankingMode, setShopRankingMode] = React.useState<'highest' | 'lowest' | 'all'>('highest');

  React.useEffect(() => {
    if (!user || user.role !== 'admin') {
      return;
    }

    const loadStats = async () => {
      try {
        const [response, incomeSummary] = await Promise.all([
          getAdminDashboardStats(token),
          getAdminPlatformIncomeSummary(token),
        ]);
        
        setStatsData({
          totalCustomers: response.totalCustomers,
          totalStores: response.totalStores,
          totalProducts: response.totalProducts,
          totalRevenue: response.totalRevenue,
        });
        setPlatformIncome(incomeSummary);

        const firstReport = await getAdminPlatformIncomeReport({ period: 'month' }, token);
        setFilteredIncome(firstReport);
        setIncomeError(null);
      } catch {
        setStatsData({
          totalCustomers: 0,
          totalStores: 0,
          totalProducts: 0,
          totalRevenue: 0,
        });
        setPlatformIncome(null);
        setFilteredIncome(null);
      }
    };

    void loadStats();
  }, [token, user]);

  const handleApplyIncomeFilter = async () => {
    try {
      setIsIncomeLoading(true);
      setIncomeError(null);

      if (
        incomeFilter.period === 'custom' &&
        (!incomeFilter.from || !incomeFilter.to)
      ) {
        setIncomeError('Vui lòng chọn đủ Từ ngày và Đến ngày khi dùng bộ lọc tùy chỉnh.');
        setIsIncomeLoading(false);
        return;
      }

      if (
        incomeFilter.period === 'custom' &&
        new Date(incomeFilter.to).getTime() <= new Date(incomeFilter.from).getTime()
      ) {
        setIncomeError('Đến ngày phải lớn hơn Từ ngày.');
        setIsIncomeLoading(false);
        return;
      }

      const payload =
        incomeFilter.period === 'custom'
          ? {
            period: 'custom' as const,
            from: incomeFilter.from,
            to: incomeFilter.to,
          }
          : {
            period: incomeFilter.period,
          };

      const report = await getAdminPlatformIncomeReport(payload, token);
      setFilteredIncome(report);
    } catch (error) {
      setIncomeError(error instanceof Error ? error.message : 'Không tải được báo cáo theo bộ lọc đã chọn.');
      setFilteredIncome(null);
    } finally {
      setIsIncomeLoading(false);
    }
  };

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  const stats = [
    { label: 'Tổng khách hàng', value: statsData.totalCustomers.toLocaleString('vi-VN'), icon: Users, color: 'bg-blue-500' },
    { label: 'Cửa hàng', value: statsData.totalStores.toLocaleString('vi-VN'), icon: Store, color: 'bg-purple-500' },
    { label: 'Sản phẩm', value: statsData.totalProducts.toLocaleString('vi-VN'), icon: Package, color: 'bg-green-500' },
    { label: 'Doanh thu cửa hàng', value: formatMoney(statsData.totalRevenue), icon: TrendingUp, color: 'bg-orange-500' },
  ];

  const periodLabels: Record<'day' | 'month' | 'quarter' | 'year', string> = {
    day: 'Trong ngày',
    month: 'Trong tháng',
    quarter: 'Trong quý',
    year: 'Trong năm',
  };

  const platformIncomeCards = platformIncome
    ? ([platformIncome.day, platformIncome.month, platformIncome.quarter, platformIncome.year] as const)
    : [];

  const periodFilterLabels: Record<'day' | 'month' | 'quarter' | 'year' | 'custom', string> = {
    day: 'Trong ngày',
    month: 'Trong tháng',
    quarter: 'Trong quý',
    year: 'Trong năm',
    custom: 'Tùy chỉnh',
  };

  const revenueAmount = filteredIncome?.totalOrderRevenue ?? 0;
  const platformCostAmount = filteredIncome?.totalPlatformIncome ?? 0;
  const ownerIncomeAmount = filteredIncome?.totalOwnerIncome ?? (revenueAmount - platformCostAmount);

  const chartRows = [
    {
      key: 'revenue',
      label: 'Doanh thu',
      value: revenueAmount,
      color: 'bg-blue-500',
    },
    {
      key: 'platformCost',
      label: 'Tổng chi phí sàn thu',
      value: platformCostAmount,
      color: 'bg-orange-500',
    },
    {
      key: 'ownerIncome',
      label: 'Thu nhập chủ shop',
      value: ownerIncomeAmount,
      color: 'bg-emerald-500',
    },
  ];

  const maxChartValue = Math.max(
    ...chartRows.map((row) => Math.max(0, row.value)),
    1,
  );

  const topStoresSafe = filteredIncome?.topStores ?? [];
  const bottomStoresSafe = filteredIncome?.bottomStores ?? [];
  const allStoresSafe = filteredIncome?.allStores ?? [];

  const rankedShops = filteredIncome
    ? shopRankingMode === 'highest'
      ? topStoresSafe
      : shopRankingMode === 'lowest'
        ? bottomStoresSafe
        : allStoresSafe
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Shield className="size-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
              <Badge variant="destructive" className="shadow-sm">Admin</Badge>
              <span className="text-sm font-medium text-gray-700">{user.username}</span>
            </div>
            <Button variant="outline" onClick={handleLogout} className="border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
              <LogOut className="size-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chào mừng, {user.username}!</h1>
          <p className="text-gray-600">Quản lý hệ thống và theo dõi hoạt động toàn sàn.</p>
        </div>

        {/* Layout Grid: Left Sidebar & Right Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
         {/* LEFT SIDEBAR - Navigation */}
          <div className="lg:col-span-3">
            <nav className="flex flex-col gap-2 sticky top-24 bg-white p-3 rounded-xl shadow-sm border border-gray-200 min-h-[calc(100vh-8rem)]">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-left
                  ${activeTab === 'overview' 
                    ? 'bg-cyan-600 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-cyan-50 hover:text-cyan-700'}`}
              >
                <TrendingUp className="size-5" />
                Tổng quan
              </button>

              <button
                onClick={() => setActiveTab('stores')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-left
                  ${activeTab === 'stores' 
                    ? 'bg-cyan-600 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-cyan-50 hover:text-cyan-700'}`}
              >
                <Store className="size-5" />
                Quản lý Cửa hàng
              </button>

              <button
                onClick={() => setActiveTab('categories')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-left
                  ${activeTab === 'categories' 
                    ? 'bg-cyan-600 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-cyan-50 hover:text-cyan-700'}`}
              >
                <FolderOpen className="size-5" />
                Quản lý Danh mục
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-left
                  ${activeTab === 'users' 
                    ? 'bg-cyan-600 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-cyan-50 hover:text-cyan-700'}`}
              >
                <Users className="size-5" />
                Quản lý người dùng
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-left
                  ${activeTab === 'reports' 
                    ? 'bg-cyan-600 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-cyan-50 hover:text-cyan-700'}`}
              >
                <BarChart3 className="size-5" />
                Báo cáo & Thống kê
              </button>
              <button
                onClick={() =>
                  setActiveTab(
                    'promotions'
                  )
                }
                className={`px-6 py-3 font-medium transition-colors relative ${
                  activeTab === 'promotions'
                    ? 'text-cyan-600'
                    : 'text-gray-600'
                }`}>
                <div className="flex items-center gap-2">
                  <Ticket className="size-4" />
                  Quản lý khuyến mãi
                </div>
              </button>
            </nav>
          </div>

          {/* RIGHT CONTENT */}
          <main className="lg:col-span-9 min-h-[500px]">
            <div className="space-y-6">
              
              {/* Tab Content - Overview */}
              {activeTab === 'overview' && (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {stats.map((stat, index) => (
                      <Card key={index} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                            </div>
                            <div className={`size-12 ${stat.color} rounded-xl flex items-center justify-center shadow-sm`}>
                              <stat.icon className="size-6 text-white" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Management Shortcut Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="cursor-pointer hover:shadow-md transition-shadow border-gray-200" onClick={() => setActiveTab('stores')}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="size-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Store className="size-6 text-purple-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Quản lý Cửa hàng</CardTitle>
                            <CardDescription>Kiểm duyệt và thống kê cửa hàng</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">
                          Mở trình quản lý
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:shadow-md transition-shadow border-gray-200" onClick={() => setActiveTab('categories')}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="size-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                            <FolderOpen className="size-6 text-cyan-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Quản lý Danh mục</CardTitle>
                            <CardDescription>Thêm, sửa, xóa danh mục hệ thống</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                          Mở trình quản lý
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:shadow-md transition-shadow border-gray-200" onClick={() => setActiveTab('users')}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="size-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Users className="size-6 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Quản lý người dùng</CardTitle>
                            <CardDescription>Xem và quản lý thông tin tài khoản</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button className="w-full" variant="outline" onClick={() => setActiveTab('users')}>
                          Mở trình quản lý
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:shadow-md transition-shadow border-gray-200" onClick={() => setActiveTab('reports')}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="size-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <TrendingUp className="size-6 text-orange-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Báo cáo & Thống kê</CardTitle>
                            <CardDescription>Theo dõi chi tiết dòng tiền hệ thống</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button className="w-full" variant="outline" onClick={() => setActiveTab('reports')}>
                          Xem báo cáo
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Activity */}
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader>
                      <CardTitle>Hoạt động gần đây</CardTitle>
                      <CardDescription>Các hoạt động mới nhất được ghi nhận trên hệ thống</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {[
                          { action: 'Người dùng mới đăng ký', user: 'customer@example.com', time: '5 phút trước' },
                          { action: 'Cửa hàng mới được tạo', user: 'Cửa hàng ABC', time: '15 phút trước' },
                          { action: 'Sản phẩm mới được thêm', user: 'Sản phẩm XYZ', time: '30 phút trước' },
                          { action: 'Đơn hàng mới', user: 'Đơn #12345', time: '1 giờ trước' },
                        ].map((activity, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border-b last:border-0 border-gray-100">
                            <div>
                              <p className="font-medium text-gray-900">{activity.action}</p>
                              <p className="text-sm text-gray-500">{activity.user}</p>
                            </div>
                            <span className="text-sm text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{activity.time}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Tab Content - Store Management */}
              {activeTab === 'stores' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-full">
                  <StoreManagementPage />
                </div>
              )}

              {/* Tab Content - Category Management */}
              {activeTab === 'categories' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-full">
                  <CategoryManagement />
                </div>
              )}

              {/* Tab Content - User Management */}
              {activeTab === 'users' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-full">
                  <UserManagementPage />
                </div>
              )}

              {/* Tab Content - Reports */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  <Card className="shadow-sm border-gray-200">
                    <CardHeader>
                      <CardTitle>Thu nhập sàn theo kỳ</CardTitle>
                      <CardDescription>Doanh thu phí sàn (phí cố định + phí thanh toán + phí dịch vụ)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {platformIncomeCards.map((item) => (
                          <div key={item.period} className="rounded-xl border border-gray-200 p-5 bg-gray-50 hover:bg-white transition-colors">
                            <p className="text-sm font-medium text-gray-500 mb-2">{periodLabels[item.period as keyof typeof periodLabels] ?? item.period}</p>
                            <p className="text-2xl font-bold text-gray-900 mb-3">{formatMoney(item.totalPlatformIncome)}</p>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-600 flex justify-between"><span>Doanh thu đơn:</span> <span className="font-medium">{formatMoney(item.totalOrderRevenue)}</span></p>
                              <p className="text-xs text-gray-600 flex justify-between"><span>Đơn tính phí:</span> <span className="font-medium">{item.orderCount.toLocaleString('vi-VN')}</span></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-gray-200">
                    <CardHeader>
                      <CardTitle>Bộ lọc thời gian báo cáo</CardTitle>
                      <CardDescription>Lọc thu nhập sàn theo kỳ hoặc khoảng thời gian tùy chỉnh</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <select
                          value={incomeFilter.period}
                          onChange={(e) =>
                            setIncomeFilter((prev) => ({
                              ...prev,
                              period: e.target.value as 'day' | 'month' | 'quarter' | 'year' | 'custom',
                            }))
                          }
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                        >
                          <option value="day">Trong ngày</option>
                          <option value="month">Trong tháng</option>
                          <option value="quarter">Trong quý</option>
                          <option value="year">Trong năm</option>
                          <option value="custom">Tùy chỉnh từ ngày - đến ngày</option>
                        </select>

                        <input
                          type="datetime-local"
                          value={incomeFilter.from}
                          onChange={(e) =>
                            setIncomeFilter((prev) => ({
                              ...prev,
                              period: 'custom',
                              from: e.target.value,
                            }))
                          }
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                        />

                        <input
                          type="datetime-local"
                          value={incomeFilter.to}
                          onChange={(e) =>
                            setIncomeFilter((prev) => ({
                              ...prev,
                              period: 'custom',
                              to: e.target.value,
                            }))
                          }
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                        />

                        <Button 
                          onClick={handleApplyIncomeFilter} 
                          disabled={isIncomeLoading}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white"
                        >
                          {isIncomeLoading ? 'Đang tải...' : 'Áp dụng lọc'}
                        </Button>
                      </div>

                      <p className="text-xs text-gray-500 italic">Khi chọn ngày giờ, bộ lọc sẽ tự động chuyển sang chế độ Tùy chỉnh.</p>

                      {incomeError && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md text-sm border border-red-100">
                          {incomeError}
                        </div>
                      )}

                      {filteredIncome && (
                        <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-6 space-y-4">
                          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                              <p className="text-sm text-cyan-800 font-bold uppercase tracking-wider mb-1">
                                Kỳ đang xem: {periodFilterLabels[filteredIncome.period]}
                              </p>
                              <p className="text-xs text-cyan-700">
                                Thời gian: {new Date(filteredIncome.range.from).toLocaleString('vi-VN')} đến {new Date(filteredIncome.range.to).toLocaleString('vi-VN')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-cyan-900 font-medium mb-1">Thu nhập sàn</p>
                              <p className="text-3xl font-bold text-cyan-700">
                                {formatMoney(filteredIncome.totalPlatformIncome)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="h-px bg-cyan-200 w-full my-4"></div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="bg-white p-3 rounded-lg border border-cyan-100 shadow-sm">
                              <p className="text-gray-500 text-xs mb-1">Doanh thu đơn</p>
                              <p className="font-semibold text-gray-900">{formatMoney(filteredIncome.totalOrderRevenue)}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-cyan-100 shadow-sm">
                              <p className="text-gray-500 text-xs mb-1">Phí cố định</p>
                              <p className="font-semibold text-gray-900">{formatMoney(filteredIncome.fixedFeeIncome)}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-cyan-100 shadow-sm">
                              <p className="text-gray-500 text-xs mb-1">Phí thanh toán</p>
                              <p className="font-semibold text-gray-900">{formatMoney(filteredIncome.paymentFeeIncome)}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-cyan-100 shadow-sm">
                              <p className="text-gray-500 text-xs mb-1">Phí dịch vụ</p>
                              <p className="font-semibold text-gray-900">{formatMoney(filteredIncome.serviceFeeIncome)}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-xs text-cyan-800 pt-2 font-medium">
                            <span className="bg-cyan-100 px-2 py-1 rounded-md">Thu nhập ròng chủ shop: {formatMoney(filteredIncome.totalOwnerIncome)}</span>
                            <span className="bg-cyan-100 px-2 py-1 rounded-md">Số đơn tính phí: {filteredIncome.orderCount.toLocaleString('vi-VN')}</span>
                            <span className="bg-cyan-100 px-2 py-1 rounded-md">Shop có đơn: {filteredIncome.totalStoresWithOrders.toLocaleString('vi-VN')}</span>
                            <span className="bg-cyan-100 px-2 py-1 rounded-md">Tỷ lệ phí sàn: {(filteredIncome.takeRate * 100).toFixed(2)}%</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-gray-200">
                    <CardHeader>
                      <CardTitle>Phân bổ Dòng tiền</CardTitle>
                      <CardDescription>
                        So sánh tổng doanh thu đơn hàng, phần trích lập phí sàn và thu nhập ròng của các shop
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                          <p className="text-sm font-medium text-blue-800 mb-1">Tổng Doanh thu</p>
                          <p className="text-2xl font-bold text-blue-600">{formatMoney(revenueAmount)}</p>
                        </div>
                        <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
                          <p className="text-sm font-medium text-orange-800 mb-1">Nền tảng giữ lại (Phí sàn)</p>
                          <p className="text-2xl font-bold text-orange-600">{formatMoney(platformCostAmount)}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                          <p className="text-sm font-medium text-emerald-800 mb-1">Chủ shop nhận về (Ròng)</p>
                          <p className="text-2xl font-bold text-emerald-600">{formatMoney(ownerIncomeAmount)}</p>
                        </div>
                      </div>

                      <div className="space-y-5 bg-white p-6 rounded-xl border border-gray-100">
                        {chartRows.map((row) => {
                          const normalizedWidth = `${Math.max(0, (row.value / maxChartValue) * 100)}%`;

                          return (
                            <div key={row.key} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700">{row.label}</span>
                                <span className="font-bold text-gray-900">{formatMoney(row.value)}</span>
                              </div>
                              <div className="h-4 rounded-full bg-gray-100 overflow-hidden shadow-inner">
                                <div className={`h-full transition-all duration-1000 ease-out ${row.color}`} style={{ width: normalizedWidth }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {filteredIncome && (
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                          <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <h3 className="text-base font-bold text-gray-800">
                              Bảng Xếp Hạng Doanh Thu Cửa Hàng
                            </h3>
                            <select
                              value={shopRankingMode}
                              onChange={(e) => setShopRankingMode(e.target.value as 'highest' | 'lowest' | 'all')}
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium bg-white shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                            >
                              <option value="highest">Hiển thị: Top doanh thu cao</option>
                              <option value="lowest">Hiển thị: Top doanh thu thấp</option>
                              <option value="all">Hiển thị: Tất cả các cửa hàng</option>
                            </select>
                          </div>
                          
                          <div className="p-4 bg-white">
                            {rankedShops.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                <Store className="size-12 mx-auto text-gray-300 mb-3" />
                                <p>Chưa có dữ liệu đơn hàng trong khoảng thời gian này.</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {rankedShops.map((shop, index) => (
                                  <div key={shop.storeId} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center rounded-lg border border-gray-100 p-3 text-sm hover:bg-gray-50 transition-colors">
                                    <div className="md:col-span-5 flex items-center gap-3">
                                      <div className={`size-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-xs
                                        ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                          index === 1 ? 'bg-gray-200 text-gray-700' : 
                                          index === 2 ? 'bg-orange-100 text-orange-800' : 
                                          'bg-gray-100 text-gray-500'}`}
                                      >
                                        #{index + 1}
                                      </div>
                                      <p className="font-semibold text-gray-900 truncate">{shop.storeName}</p>
                                    </div>
                                    <div className="md:col-span-3">
                                      <p className="text-xs text-gray-500 mb-0.5">Doanh thu</p>
                                      <p className="font-medium text-gray-900">{formatMoney(shop.totalOrderRevenue)}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                      <p className="text-xs text-gray-500 mb-0.5">Phí sàn</p>
                                      <p className="font-medium text-orange-600">{formatMoney(shop.totalPlatformIncome)}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                      <p className="text-xs text-gray-500 mb-0.5">Thực nhận</p>
                                      <p className="font-medium text-emerald-600">{formatMoney(shop.totalOwnerIncome)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
              {activeTab === 'promotions' && (
                <AdminVoucherPage />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}



