import React from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import HeroCarousel from '../components/HeroCarousel';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import { getCategories, getProducts, type Category, type Product } from '../services/productService';
import { getCategoryIcon, guessCategoryIcon } from '../utils/categoryIcon';
import { 
  Search,
  ShoppingCart, 
  Heart, 
  Star, 
  TrendingUp,
  Store,
  Package,
  ArrowRight,
  Tag,
  Ticket,
  Gift,
  Zap
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = React.useState('');
  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [productsLoading, setProductsLoading] = React.useState(true);
  const [categoriesLoading, setCategoriesLoading] = React.useState(true);
  const [activeSearchQuery, setActiveSearchQuery] = React.useState('');
  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);
  
  // STATE ĐẾM NGƯỢC THỜI GIAN FLASH SALE
  const [timeLeft, setTimeLeft] = React.useState({
    hours: 2,
    minutes: 45,
    seconds: 30,
  });

  React.useEffect(() => {
    const loadLandingData = async () => {
      setProductsLoading(true);
      setCategoriesLoading(true);

      try {
        const [allProducts, allCategories] = await Promise.all([
          getProducts({ limit: 100 }),
          getCategories(),
        ]);

        setProducts(allProducts);
        setCategories(allCategories);
      } catch {
        setProducts([]);
        setCategories([]);
      } finally {
        setProductsLoading(false);
        setCategoriesLoading(false);
      }
    };

    void loadLandingData();
  }, []);

  // LOGIC ĐẾM NGƯỢC TỰ ĐỘNG GIẢM MỖI GIÂY
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        // Reset lại khi đếm về 0 (tuần hoàn Flash Sale)
        return { hours: 23, minutes: 59, seconds: 59 }; 
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearchSubmit = () => {
    const query = searchValue.trim();
    setActiveSearchQuery(query);
    document.getElementById('homepage-products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const categoryNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categories]);

  const categoryCards = React.useMemo(() => {
    const countByCategory = new Map<string, number>();

    products.forEach((product) => {
      if (!product.category_id) {
        return;
      }

      countByCategory.set(product.category_id, (countByCategory.get(product.category_id) || 0) + 1);
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      icon: getCategoryIcon(category.id) || guessCategoryIcon(category.name),
      count: countByCategory.get(category.id) || 0,
    }));
  }, [categories, products]);

  const quickLinks = [
    { icon: Tag, label: 'Deal Từ 1.000Đ', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { icon: Store, label: 'Shopee Xử Lý', color: 'text-red-600', bgColor: 'bg-red-50' },
    { icon: Ticket, label: 'Shopee Style Voucher 30%', color: 'text-pink-600', bgColor: 'bg-pink-50' },
    { icon: Gift, label: 'Khách Hàng Thân Thiết', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { icon: Zap, label: 'Mã Giảm Giá', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  ];

  const featuredProducts = [
    { id: 1, name: 'iPhone 15 Pro Max', price: 29990000, image: '/src/imports/image.png' },
    { id: 2, name: 'Samsung Galaxy S24 Ultra', price: 26990000, image: '/src/imports/image-1.png' },
    { id: 3, name: 'MacBook Pro M3', price: 45990000, image: '/src/imports/image-2.png' },
    { id: 4, name: 'Sony WH-1000XM5', price: 7990000, image: '/src/imports/image-4.png' },
    { id: 5, name: 'iPad Air M2', price: 16990000, image: '/src/imports/image-5.png' },
    { id: 6, name: 'Apple Watch Series 9', price: 10990000, image: '/src/imports/image.png' },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const flashSaleItems = products.length > 0
    ? products
        .filter((product) => product.is_flash_sale === true)
        .map((product) => {
          const salePrice = Number(product.flash_sale_price);
          const sold = Number(product.flash_sale_sold || 0);
          const stock = Number(product.flash_sale_stock || 0);
          const rawSoldPercent = stock > 0 ? Math.round((sold / stock) * 100) : 0;

          return {
            id: product.id,
            name: product.name,
            price: Number.isFinite(salePrice) ? salePrice : Number(product.price || 0),
            image: product.images?.[0] || '/src/imports/image.png',
            soldPercent: Math.max(0, Math.min(rawSoldPercent, 100)),
          };
        })
        .slice(0, 6)
    : featuredProducts.map((product, index) => ({
        id: String(product.id),
        name: product.name,
        price: product.price,
        image: product.image,
        soldPercent: [45, 53, 61, 69, 77, 85][index % 6],
      }));

  const visibleProducts = React.useMemo(() => {
    const keyword = activeSearchQuery.trim().toLowerCase();
    const hasCategoryFilter = Boolean(activeCategoryId);
    const matchesCategory = (product: Product) => !activeCategoryId || product.category_id === activeCategoryId;

    if (!keyword && !hasCategoryFilter) {
      return products.slice(0, 8);
    }

    return products.filter((product) => {
      if (!matchesCategory(product)) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const productName = product.name.toLowerCase();
      const storeName = product.store?.store_name?.toLowerCase() || '';
      const ownerName = product.store?.owner?.username?.toLowerCase() || '';
      const categoryName = product.category_id ? (categoryNameById.get(product.category_id)?.toLowerCase() || '') : '';

      return [productName, storeName, ownerName, categoryName].some((value) => value.includes(keyword));
    });
  }, [activeCategoryId, activeSearchQuery, categoryNameById, products]);

  return (
    <div className="min-h-screen bg-white">
      <StoreHeader
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearchSubmit={handleSearchSubmit}
        searchPlaceholder="Tìm kiếm sản phẩm, shop đang bán..."
        onSelectCategory={(categoryId) => {
          setActiveCategoryId(categoryId);
          setActiveSearchQuery('');
          document.getElementById('homepage-products')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onScrollHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onScrollHot={() => document.getElementById('homepage-products')?.scrollIntoView({ behavior: 'smooth' })}
        onScrollPromo={() => document.querySelector('section:nth-of-type(3)')?.scrollIntoView({ behavior: 'smooth' })}
        onScrollContact={() => document.querySelector('footer')?.scrollIntoView({ behavior: 'smooth' })}
      />

      {/* Hero Section */}
      <section className="bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <Badge className="mb-4 bg-cyan-500 text-white px-4 py-1 rounded-full">
                Ưu đãi đặc biệt
              </Badge>
              <h1 className="text-4xl leading-tight">
                Mua sắm thông minh
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
                  Giá cả hợp lý
                </span>
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed">
                Khám phá hàng ngàn sản phẩm chất lượng từ các cửa hàng uy tín. 
                Giao hàng nhanh chóng, thanh toán an toàn.
              </p>
              <div className="flex gap-3">
                <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6">
                  Khám phá ngay
                  <ArrowRight className="size-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="px-6">
                  Xem khuyến mãi
                </Button>
              </div>
              <div className="flex gap-6 pt-4">
                <div>
                  <div className="text-2xl mb-1">1000+</div>
                  <p className="text-gray-600 text-sm">Cửa hàng</p>
                </div>
                <div>
                  <div className="text-2xl mb-1">50K+</div>
                  <p className="text-gray-600 text-sm">Sản phẩm</p>
                </div>
                <div>
                  <div className="text-2xl mb-1">100K+</div>
                  <p className="text-gray-600 text-sm">Khách hàng</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-9">
              <HeroCarousel />
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
                {quickLinks.map((link, index) => (
                  <Card key={index} className="hover:shadow-md transition-all cursor-pointer group">
                    <CardContent className="p-4 text-center">
                      <div className={`size-12 ${link.bgColor} rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                        <link.icon className={`size-6 ${link.color}`} />
                      </div>
                      <p className="text-sm font-medium leading-tight">{link.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THÊM GIAO DIỆN ĐẾM NGƯỢC Ở PHẦN FLASH SALE NÀY */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-3xl text-cyan-600 font-bold flex items-center uppercase tracking-wide">
                  F<Zap className="size-8 text-cyan-500 fill-cyan-500 mx-0.5" />ASH SALE
                </h2>
                {/* Countdown Timer */}
                <div className="flex items-center gap-1.5 text-white font-mono text-xl font-bold bg-slate-900 px-3 py-1.5 rounded-lg shadow-md border border-slate-700">
                  <div className="bg-slate-800 px-2 py-1 rounded w-10 text-center tracking-widest">{String(timeLeft.hours).padStart(2, '0')}</div>
                  <span className="text-slate-400 -mt-1">:</span>
                  <div className="bg-slate-800 px-2 py-1 rounded w-10 text-center tracking-widest">{String(timeLeft.minutes).padStart(2, '0')}</div>
                  <span className="text-slate-400 -mt-1">:</span>
                  <div className="bg-slate-800 px-2 py-1 rounded w-10 text-center tracking-widest text-cyan-400">{String(timeLeft.seconds).padStart(2, '0')}</div>
                </div>
              </div>
              <p className="text-gray-600 font-medium">Săn deal giới hạn theo khung giờ</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/search')} className="border-cyan-200 text-cyan-700 hover:bg-cyan-50 shrink-0">
              Xem tất cả
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {productsLoading ? (
              <p className="text-sm text-gray-500">Đang tải flash sale...</p>
            ) : flashSaleItems.map((item) => (
              <Card
                key={item.id}
                className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden group"
                onClick={() => navigate(`/product/${item.id}`)}
              >
                <div className="bg-gray-100 relative">
                  {/* Tag giảm giá */}
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 shadow">
                    GIẢM SỐC
                  </div>
                  <ImageWithFallback src={item.image} alt={item.name} className="h-36 w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2 line-clamp-2 min-h-10 group-hover:text-cyan-600 transition-colors">{item.name}</h3>
                  <p className="text-red-500 font-bold text-lg mb-2">{formatPrice(item.price)}</p>
                  <div className="relative h-4 w-full rounded-full bg-cyan-100 overflow-hidden mt-1">
                    <div className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${item.soldPercent}%` }} />
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white uppercase drop-shadow-md z-10">Đã bán {item.soldPercent}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section id="homepage-products" className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl mb-2">
                {activeSearchQuery
                  ? `Kết quả tìm kiếm cho “${activeSearchQuery}”`
                  : activeCategoryId
                    ? `Sản phẩm danh mục “${categoryNameById.get(activeCategoryId) || 'Đã chọn'}”`
                    : 'Sản phẩm từ các shop đang bán'}
              </h2>
              <p className="text-gray-600">
                {activeSearchQuery
                  ? 'Hiển thị sản phẩm phù hợp từ các shop trên website'
                  : activeCategoryId
                    ? 'Hiển thị sản phẩm thuộc danh mục bạn vừa chọn'
                    : 'Sản phẩm đang được đăng bán trên trang chủ'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Hot nhất</Button>
              <Button variant="ghost">Mới nhất</Button>
              <Button variant="ghost">Bán chạy</Button>
            </div>
          </div>
          {productsLoading ? (
            <p className="text-gray-500">Đang tải sản phẩm từ các shop...</p>
          ) : visibleProducts.length === 0 ? (
            <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
              Không tìm thấy sản phẩm phù hợp.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {visibleProducts.map((product) => (
                <Card key={product.id} className="group hover:shadow-xl transition-all cursor-pointer overflow-hidden" onClick={() => navigate(`/product/${product.id}`)}>
                  <div className="relative overflow-hidden bg-gray-50">
                    <ImageWithFallback src={product.images?.[0] || '/src/imports/image.png'} alt={product.name} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300" />
                    {product.store?.store_type === 'B2C' ? (
                      <Badge className="absolute top-3 left-3 z-10 bg-red-600 text-white font-bold rounded-sm px-2 py-0.5 text-xs hover:bg-red-700">
                        Mall
                      </Badge>
                    ) : null}
                    <Button variant="ghost" size="icon" className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm hover:bg-white">
                      <Heart className="size-4" />
                    </Button>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button className="w-full bg-white text-black hover:bg-gray-100">
                        <ShoppingCart className="size-4 mr-2" /> Xem chi tiết
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2 line-clamp-2 group-hover:text-cyan-600 transition-colors">{product.name}</h3>
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                      <Store className="size-4" />
                      <span className="truncate">{product.store?.store_name || 'Cửa hàng'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xl text-cyan-600">{formatPrice(Number(product.price || 0))}</span>
                      <Badge variant="outline">{product.condition === 'NEW' ? 'Mới' : 'Đã qua sử dụng'}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Kho: {product.stock_quantity}</span>
                      <span>{product.status === 'AVAILABLE' ? 'Đang bán' : product.status}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center mt-8">
            <Button
              size="lg"
              variant="outline"
              className="px-8"
              onClick={() => {
                setActiveSearchQuery('');
                setActiveCategoryId(null);
              }}
            >
              Xem thêm sản phẩm
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <StoreFooter />
    </div>
  );
}