import React from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import CartDrawer from './CartDrawer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { getCategories, type Category } from '../services/productService';
import { cartAPI } from '../services/cartService';
import { getCategoryIcon, guessCategoryIcon } from '../utils/categoryIcon';
import {
  ChevronDown, Heart, LogOut, Menu,
  Search, ShoppingCart, Store, User,
} from 'lucide-react';

type StoreHeaderProps = {
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  searchPlaceholder?: string;
  showBackButton?: boolean;
  onSelectCategory?: (categoryId: string) => void;
  onScrollHome?: () => void;
  onScrollHot?: () => void;
  onScrollPromo?: () => void;
  onScrollContact?: () => void;
};

export default function StoreHeader({
  searchValue = '',
  onSearchValueChange,
  onSearchSubmit,
  searchPlaceholder = 'Tìm kiếm sản phẩm, shop đang bán...',
  showBackButton = false,
  onSelectCategory,
  onScrollHome,
  onScrollHot,
  onScrollPromo,
  onScrollContact,
}: StoreHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isBusiness = user?.role === 'business';
  const isCustomer = user?.role === 'customer';

  const [showCategoryMenu, setShowCategoryMenu] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [categories, setCategories] = React.useState<Category[]>([]);

  // ── Cart ────────────────────────────────────────────────────────────────────
  const [cartOpen, setCartOpen] = React.useState(false);
  const [cartCount, setCartCount] = React.useState(0);

  const hasC2CShop = user?.role === 'customer' &&
    Boolean(user.hasC2CStore || user.c2cStoreId || user.storeName?.trim());
  const canManageBusinessShop =
    user?.role === 'business' && user.hasManageShop === true;

  // Load categories
  React.useEffect(() => {
    const load = async () => {
      try { setCategories(await getCategories()); }
      catch { setCategories([]); }
    };
    void load();
  }, []);

  // Load initial cart count (badge on header)
  React.useEffect(() => {
    if (!isCustomer || !localStorage.getItem('token')) return;
    cartAPI.getCart()
      .then(data => setCartCount(data.length))
      .catch(() => setCartCount(0));
  }, [isCustomer]);

  // Listen to cartUpdated event (e.g. from ProductDetailPage)
  React.useEffect(() => {
    const handleUpdate = () => {
      if (!isCustomer || !localStorage.getItem('token')) return;
      cartAPI.getCart()
        .then(data => setCartCount(data.length))
        .catch(() => {});
    };
    window.addEventListener('cartUpdated', handleUpdate);
    return () => window.removeEventListener('cartUpdated', handleUpdate);
  }, [isCustomer]);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-header-user]')) setShowUserMenu(false);
      if (!t.closest('[data-header-category]')) setShowCategoryMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearchSubmit?.();
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        {/* ── Top promo bar ── */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-white text-xs sm:text-sm">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
            <span className="truncate">🎉 Giảm giá lên đến 50% cho sản phẩm mới!</span>
            {!user ? (
              <div className="flex gap-4">
                <Link to="/login" className="hover:underline">Đăng nhập</Link>
                <Link to="/register/customer" className="hover:underline">Đăng ký</Link>
              </div>
            ) : (
              <div className="relative" data-header-user>
                <button
                  onClick={() => setShowUserMenu(p => !p)}
                  className="hover:underline flex items-center gap-2"
                >
                  <User className="size-4" />
                  {user.username}
                  <ChevronDown className={`size-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 bg-white text-gray-800 border rounded-lg shadow-xl w-56 z-50">
                    <div className="p-2">
                      {isCustomer && (
                        <button onClick={() => { setShowUserMenu(false); navigate('/customer/profile'); }}
                          className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 flex items-center gap-2">
                          <User className="size-4" /> Tài khoản của tôi
                        </button>
                      )}
                      {user.role === 'customer' && !hasC2CShop && (
                        <button onClick={() => { setShowUserMenu(false); navigate('/seller/onboarding'); }}
                          className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 flex items-center gap-2">
                          <Store className="size-4" /> Kích hoạt Shop C2C
                        </button>
                      )}
                      {(canManageBusinessShop || hasC2CShop) && (
                        <button onClick={() => { setShowUserMenu(false); navigate('/seller/dashboard'); }}
                          className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 flex items-center gap-2">
                          <Store className="size-4" /> Quản lý Shop
                        </button>
                      )}
                      <div className="border-t my-2" />
                      <button onClick={() => { setShowUserMenu(false); handleLogout(); }}
                        className="w-full text-left px-4 py-2 rounded hover:bg-red-50 text-red-600 flex items-center gap-2">
                        <LogOut className="size-4" /> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Main bar ── */}
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {showBackButton && (
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                Quay lại
              </Button>
            )}

            <Link to="/" className="flex items-center gap-2">
              <div className="size-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Store className="size-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-700 bg-clip-text text-transparent">
                ShopHub
              </span>
            </Link>

            <div className="flex-1 min-w-[260px] max-w-2xl">
              <form className="relative" onSubmit={handleSubmit}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                <Input
                  type="text"
                  value={searchValue}
                  onChange={e => onSearchValueChange?.(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-10 pr-4 h-11 rounded-full border-2 border-gray-200 focus:border-cyan-500"
                />
              </form>
            </div>

            <div className="ml-auto flex min-w-[160px] items-center justify-end gap-2 sm:gap-3">
              <NotificationBell />

              {!isBusiness && (
                <>
                  <Button variant="ghost" size="icon" className="relative hover:text-cyan-600">
                    <Heart className="size-5" />
                    <span className="absolute -top-1 -right-1 size-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      0
                    </span>
                  </Button>

                  {/* ── Cart button với badge ── */}
                  <Button
                    variant="outline"
                    className="relative hover:border-cyan-500 hover:text-cyan-600 transition-colors gap-2"
                    onClick={() => setCartOpen(true)}
                  >
                    <ShoppingCart className="size-4" />
                    <span>Giỏ hàng</span>
                    {cartCount > 0 && (
                      <span
                        className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm"
                      >
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Nav bar ── */}
        <div className="border-t">
          <div className="container mx-auto px-4 relative">
            <nav className="grid grid-cols-2 gap-2 py-3 text-sm sm:grid-cols-3 lg:grid-cols-6 lg:gap-3">
              {/* Category dropdown */}
              <div className="relative" data-header-category>
                <Button
                  variant="ghost"
                  className="w-full justify-center gap-2"
                  onClick={() => setShowCategoryMenu(p => !p)}
                >
                  <Menu className="size-4" />
                  Danh mục
                  <ChevronDown className={`size-4 ml-1 transition-transform ${showCategoryMenu ? 'rotate-180' : ''}`} />
                </Button>

                {showCategoryMenu && (
                  <div className="absolute top-full left-0 mt-2 bg-white border rounded-lg shadow-xl w-80 z-50">
                    <div className="p-4 grid grid-cols-2 gap-3">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setShowCategoryMenu(false);
                            if (onSelectCategory) { onSelectCategory(cat.id); return; }
                            navigate(`/search?q=${encodeURIComponent(cat.name)}`);
                          }}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                        >
                          <span className="text-2xl">{getCategoryIcon(cat.id) || guessCategoryIcon(cat.name)}</span>
                          <div className="font-medium text-sm">{cat.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => onScrollHome ? onScrollHome() : window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-full rounded-md py-2 hover:bg-cyan-50 hover:text-cyan-600 transition-colors">
                Trang chủ
              </button>
              <button onClick={() => onScrollHot ? onScrollHot() : document.getElementById('homepage-products')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full rounded-md py-2 hover:bg-cyan-50 hover:text-cyan-600 transition-colors">
                Sản phẩm hot
              </button>
              <button onClick={() => onScrollPromo ? onScrollPromo() : document.querySelector('section:nth-of-type(3)')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full rounded-md py-2 hover:bg-cyan-50 hover:text-cyan-600 transition-colors">
                Khuyến mãi
              </button>
              <button onClick={() => navigate('/stores')}
                className="w-full rounded-md py-2 hover:bg-cyan-50 hover:text-cyan-600 transition-colors">
                Cửa hàng
              </button>
              <button onClick={() => onScrollContact ? onScrollContact() : document.querySelector('footer')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full rounded-md py-2 hover:bg-cyan-50 hover:text-cyan-600 transition-colors">
                Liên hệ
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* CartDrawer render ngoài <header> để không bị z-index chặn */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onCountChange={setCartCount}
      />
    </>
  );
}