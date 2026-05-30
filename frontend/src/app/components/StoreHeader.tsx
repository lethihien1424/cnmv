import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
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
  const { openChat } = useChat();
  const isBusiness = user?.role === 'business';
  const isCustomer = user?.role === 'customer';

  const [showCategoryMenu, setShowCategoryMenu] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showSearchHistory, setShowSearchHistory] = React.useState(false);
  const [searchHistory, setSearchHistory] = React.useState<string[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);

  // ── Cart ────────────────────────────────────────────────────────────────────
  const [cartOpen, setCartOpen] = React.useState(false);
  const [cartCount, setCartCount] = React.useState(0);

  const hasC2CShop = user?.role === 'customer' &&
    Boolean(user.hasC2CStore || user.c2cStoreId || user.storeName?.trim());
  const canManageBusinessShop =
    user?.role === 'business' && user.hasManageShop === true;

  // Load categories and search history
  React.useEffect(() => {
    const load = async () => {
      try { setCategories(await getCategories()); }
      catch { setCategories([]); }
    };
    void load();
    try {
      const h = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      if (Array.isArray(h)) setSearchHistory(h);
    } catch {}
  }, []);

  // Load initial cart count (badge on header)
  React.useEffect(() => {
    if (!isCustomer || !localStorage.getItem('token')) return;
    cartAPI.getCart()
      .then(data => {
        const total = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
        setCartCount(total);
      })
      .catch(() => setCartCount(0));
  }, [isCustomer]);

  // Listen to cartUpdated event
  React.useEffect(() => {
    const handleUpdate = () => {
      if (!isCustomer || !localStorage.getItem('token')) return;
      cartAPI.getCart()
        .then(data => {
          const total = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
          setCartCount(total);
        })
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
      if (!t.closest('[data-header-search]')) setShowSearchHistory(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchValue.trim()) {
      const newH = [searchValue.trim(), ...searchHistory.filter(x => x !== searchValue.trim())].slice(0, 5);
      localStorage.setItem('searchHistory', JSON.stringify(newH));
      setSearchHistory(newH);
      setShowSearchHistory(false);
    }
    onSearchSubmit?.();
  };

  const handleNavClick = (callback?: () => void, fallbackSelector?: string) => {
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        if (callback) callback();
        else if (fallbackSelector) document.querySelector(fallbackSelector)?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } else {
      if (callback) callback();
      else if (fallbackSelector) document.querySelector(fallbackSelector)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
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
                <Link to="/login" className="hover:underline font-medium">Đăng nhập</Link>
                <Link to="/register/customer" className="hover:underline font-medium">Đăng ký</Link>
              </div>
            ) : (
              <div className="relative" data-header-user>
                <button
                  onClick={() => setShowUserMenu(p => !p)}
                  className="hover:underline flex items-center gap-2 font-medium"
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
                          className="w-full text-left px-4 py-2 rounded-md hover:bg-cyan-50 hover:text-cyan-700 flex items-center gap-2 transition-colors">
                          <User className="size-4" /> Tài khoản của tôi
                        </button>
                      )}
                      {user.role === 'customer' && !hasC2CShop && (
                        <button onClick={() => { setShowUserMenu(false); navigate('/seller/onboarding'); }}
                          className="w-full text-left px-4 py-2 rounded-md hover:bg-cyan-50 hover:text-cyan-700 flex items-center gap-2 transition-colors">
                          <Store className="size-4" /> Kích hoạt Shop C2C
                        </button>
                      )}
                      {(canManageBusinessShop || hasC2CShop) && (
                        <button onClick={() => { setShowUserMenu(false); navigate('/seller/dashboard'); }}
                          className="w-full text-left px-4 py-2 rounded-md hover:bg-cyan-50 hover:text-cyan-700 flex items-center gap-2 transition-colors">
                          <Store className="size-4" /> Quản lý Shop
                        </button>
                      )}
                      <div className="border-t my-2 border-gray-100" />
                      <button onClick={() => { setShowUserMenu(false); handleLogout(); }}
                        className="w-full text-left px-4 py-2 rounded-md hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors">
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
          <div className="flex flex-wrap items-center gap-4">
            {showBackButton && (
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                Quay lại
              </Button>
            )}

            <Link to="/" className="flex items-center gap-2 mr-4">
              <div className="size-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <Store className="size-6 text-white" />
              </div>
              <span className="text-2xl font-black bg-gradient-to-r from-cyan-600 to-blue-700 bg-clip-text text-transparent tracking-tight">
                ShopHub
              </span>
            </Link>

            <div className="flex-1 min-w-[260px] max-w-3xl relative" data-header-search>
              <form className="relative flex items-center w-full" onSubmit={handleSubmit}>
                <Input
                  type="text"
                  value={searchValue}
                  onChange={e => {
                    onSearchValueChange?.(e.target.value);
                    setShowSearchHistory(true);
                  }}
                  onFocus={() => setShowSearchHistory(true)}
                  placeholder={searchPlaceholder}
                  className="pl-4 pr-12 h-11 rounded-full border-2 border-cyan-500 focus-visible:ring-0 focus-visible:border-cyan-600 shadow-sm w-full bg-gray-50"
                />
                <button type="submit" className="absolute right-1 top-1 bottom-1 w-12 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full flex items-center justify-center transition-colors">
                  <Search className="size-5" />
                </button>
              </form>
              {showSearchHistory && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-3 bg-gray-50 text-xs font-semibold text-gray-500 flex justify-between border-b border-gray-100">
                    <span>Lịch sử tìm kiếm</span>
                  </div>
                  <ul className="py-1">
                    {searchHistory.map((item, idx) => (
                      <li key={idx} className="flex items-center hover:bg-cyan-50 transition-colors">
                        <button
                          className="flex-1 text-left px-4 py-2.5 text-sm flex items-center gap-3 text-gray-700"
                          onClick={() => {
                            if (onSearchValueChange) onSearchValueChange(item);
                            setShowSearchHistory(false);
                            navigate(`/search?q=${encodeURIComponent(item)}`);
                          }}
                        >
                          <Search className="size-4 text-gray-400" />
                          <span className="flex-1 truncate">{item}</span>
                        </button>
                        <button
                          className="px-4 py-2.5 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newH = searchHistory.filter((_, i) => i !== idx);
                            setSearchHistory(newH);
                            localStorage.setItem('searchHistory', JSON.stringify(newH));
                          }}
                          title="Xóa khỏi lịch sử"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center justify-end gap-3 sm:gap-6">
              <NotificationBell />

              {!isBusiness && (
                <>
                  <Button variant="ghost" size="icon" className="relative hover:text-cyan-600 hover:bg-cyan-50 rounded-full size-10">
                    <Heart className="size-6" />
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1 border border-white">
                      0
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    className="relative border-cyan-200 text-cyan-700 hover:border-cyan-500 hover:text-cyan-600 hover:bg-cyan-50 transition-colors gap-2 rounded-full h-10 px-4"
                    onClick={() => setCartOpen(true)}
                  >
                    <ShoppingCart className="size-5" />
                    <span className="font-semibold hidden sm:inline-block">Giỏ hàng</span>
                    {cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-sm border-2 border-white">
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
       {/* ── Nav bar ── */}
        <div className="border-t border-gray-100">
          <div className="container mx-auto px-4 relative">
            {/* THÊM 'justify-between w-full' ĐỂ GIÃN ĐỀU, XÓA 'gap-1 sm:gap-6' */}
            <nav className="flex flex-wrap items-center justify-between w-full py-2 text-sm sm:text-base font-medium text-gray-700">
              
              {/* Category dropdown */}
              <div className="relative" data-header-category>
                <button
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors
                    ${showCategoryMenu ? 'bg-cyan-50 text-cyan-700' : 'hover:text-cyan-600 hover:bg-gray-50'}`}
                  onClick={() => setShowCategoryMenu(p => !p)}
                >
                  <Menu className="size-5" />
                  Danh mục
                  <ChevronDown className={`size-4 ml-1 transition-transform ${showCategoryMenu ? 'rotate-180' : ''}`} />
                </button>

                {showCategoryMenu && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl w-64 z-50 overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto py-2">
                      {categories.length > 0 ? categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setShowCategoryMenu(false);
                            if (onSelectCategory) { onSelectCategory(cat.id); return; }
                            navigate(`/search?q=${encodeURIComponent(cat.name)}`);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cyan-50 hover:text-cyan-700 transition-colors text-left"
                        >
                          <span className="text-xl w-6 text-center text-cyan-600">{getCategoryIcon(cat.id) || guessCategoryIcon(cat.name)}</span>
                          <span className="font-medium text-sm">{cat.name}</span>
                        </button>
                      )) : (
                        <div className="p-4 text-center text-gray-500 text-sm">Đang tải danh mục...</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Các liên kết điều hướng */}
              <Link 
                to="/"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="px-4 py-2 rounded-md hover:text-cyan-600 transition-colors whitespace-nowrap"
              >
                Trang chủ
              </Link>
              
            <button
            onClick={openChat}
          className="px-4 py-2 rounded-md hover:text-cyan-600 transition-colors whitespace-nowrap"
            >
           Liên hệ
             </button>
              <Link 
                to="/stores"
                className="px-4 py-2 rounded-md hover:text-cyan-600 transition-colors whitespace-nowrap"
              >
                Cửa hàng
              </Link>
              
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