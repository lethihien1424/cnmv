// D:\CongNgheMoi-hien\CongNgheMoi\frontend\src\app\router.tsx
import { createBrowserRouter } from 'react-router';
import LoginPage from './pages/LoginPage';
import RegisterCustomerPage from './pages/RegisterCustomerPage';
import RegisterBusinessPage from './pages/RegisterBusinessPage';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './pages/LandingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import SellerOnboardingPage from './pages/SellerOnboardingPage';
import SellerDashboard from './pages/SellerDashboard';
import FlashSaleManagement from './pages/FlashSaleManagement';
import ShopPage from './pages/ShopPage';
import SearchResultsPage from './pages/SearchResultsPage';
import CustomerProfilePage from './pages/CustomerProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import MyOrdersPage from './pages/MyOrdersPage';
import OrderHistoryPage from './pages/OrderHistoryPage'; // ← THÊM
import ProtectedRoute from './components/ProtectedRoute';
import CartDrawerPage from './pages/CartPage';

export const router = createBrowserRouter([
  { path: '/login',             Component: LoginPage },
  { path: '/register/customer', Component: RegisterCustomerPage },
  { path: '/register/business', Component: RegisterBusinessPage },
  { path: '/',                  Component: LandingPage },
  { path: '/product/:id',       Component: ProductDetailPage },
  { path: '/shop/:storeId',     Component: ShopPage },
  { path: '/search',            Component: SearchResultsPage },
  { path: '/stores',            Component: SearchResultsPage },
  { path: '/cart',              Component: CartDrawerPage },

  // ── Protected routes ──────────────────────────────────────────────────────
  {
    path: '/orders',
    element: (
      <ProtectedRoute allowedRoles={['customer', 'business']}>
        <MyOrdersPage />
      </ProtectedRoute>
    ),
  },

  // ← ROUTE MỚI: Lịch sử mua hàng
  {
    path: '/orders/history',
    element: (
      <ProtectedRoute allowedRoles={['customer', 'business']}>
        <OrderHistoryPage />
      </ProtectedRoute>
    ),
  },

  {
    path: '/seller/onboarding',
    element: (
      <ProtectedRoute allowedRoles={['customer', 'business']}>
        <SellerOnboardingPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/seller/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['customer', 'business']}>
        <SellerDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/seller/flash-sale',
    element: (
      <ProtectedRoute allowedRoles={['customer', 'business']}>
        <FlashSaleManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/customer/profile',
    element: (
      <ProtectedRoute allowedRoles={['customer', 'business']}>
        <CustomerProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/customer/edit-profile',
    element: (
      <ProtectedRoute allowedRoles={['customer', 'business']}>
        <EditProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile/edit',
    element: (
      <ProtectedRoute allowedRoles={['customer', 'business']}>
        <EditProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-4">404</h1>
          <p className="text-gray-600">Trang không tồn tại</p>
        </div>
      </div>
    ),
  },
]);