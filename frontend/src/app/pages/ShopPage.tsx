import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import ChatBox from '../components/ChatBox';
import { useAuth } from '../contexts/AuthContext';
import { getCategories, getProducts, type Category, type Product } from '../services/productService';
import { Star, MessageCircle, Store, Heart } from 'lucide-react';

export default function ShopPage() {
  const navigate = useNavigate();
  const { storeId } = useParams();
  const { user } = useAuth();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Logic dữ liệu
  const shop = useMemo(() => products[0]?.store, [products]);
  const availableCount = useMemo(() => products.filter((p) => p.status === 'AVAILABLE').length, [products]);
  const averageRating = useMemo(() => shop?.rating || 5.0, [shop]);
  const responseRate = useMemo(() => shop?.response_rate || 99, [shop]);

 const categoryTabs = useMemo(() => {
    // 1. Lấy danh sách ID danh mục từ các sản phẩm của shop này
    const shopCategoryIds = new Set(products.map(p => p.category_id).filter(Boolean));
    
    // 2. Tab mặc định
    const tabs = [{ id: 'ALL', label: 'Tất cả sản phẩm' }];
    
    // 3. Chỉ thêm các danh mục có trong Set shopCategoryIds
    categories.forEach(c => {
      if (shopCategoryIds.has(c.id)) {
        tabs.push({ id: c.id, label: c.name });
      }
    });
    
    return tabs;
  }, [categories, products]);

  const visibleProducts = useMemo(() => {
    if (activeCategory === 'ALL') return products;
    return products.filter((p) => (p.category_id || 'uncategorized') === activeCategory);
  }, [activeCategory, products]);

  useEffect(() => {
    const loadShop = async () => {
      if (!storeId) { setIsLoading(false); return; }
      try {
        const [allProducts, categoryList] = await Promise.all([
          getProducts({ limit: 100 }),
          getCategories(),
        ]);
        setProducts(allProducts.filter((p) => p.store_id === storeId));
        setCategories(categoryList);
      } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };
    void loadShop();
  }, [storeId]);

  const formatMoney = (val: number) => `${val.toLocaleString('vi-VN')}₫`;

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearchSubmit={() => navigate(`/search?q=${encodeURIComponent(searchValue)}`)}
        showBackButton
      />

      <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 space-y-6">
        {/* KHỐI THÔNG TIN SHOP */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-cyan-50 to-blue-50"></div>
          <div className="px-6 pb-6 pt-2">
            <div className="flex flex-col md:flex-row items-center gap-6 mt-4">
              <div className="flex items-center gap-4 mr-auto">
                <div className="size-16 rounded-2xl bg-cyan-100 flex items-center justify-center shadow-inner">
                  <Store className="size-8 text-cyan-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">{shop?.store_name || 'Đang tải...'}</h1>
                  <p className="text-xs text-slate-500">Đang hoạt động</p>
                </div>
              </div>

              <div className="flex items-center gap-6 border-l border-slate-100 pl-6">
                <div className="text-center"><p className="text-[10px] text-slate-400 font-bold uppercase">SP</p><p className="text-lg font-bold text-slate-800">{products.length}</p></div>
                <div className="text-center"><p className="text-[10px] text-slate-400 font-bold uppercase">Bán</p><p className="text-lg font-bold text-cyan-600">{availableCount}</p></div>
                <div className="text-center"><p className="text-[10px] text-slate-400 font-bold uppercase">Đánh giá</p><p className="text-sm font-bold text-slate-800 flex items-center justify-center"><Star className="size-3 text-yellow-400 fill-yellow-400 mr-1" /> {averageRating}</p></div>
                <div className="text-center"><p className="text-[10px] text-slate-400 font-bold uppercase">Phản hồi</p><p className="text-sm font-bold text-cyan-600">{responseRate}%</p></div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button variant="outline" className="h-9 px-4 text-xs rounded-full" onClick={() => setIsChatOpen(true)}>
                  <MessageCircle className="size-3.5 mr-2" /> Chat
                </Button>
                <Button className="h-9 px-4 text-xs bg-cyan-100 text-cyan-700 rounded-full border border-cyan-200
hover:bg-cyan-200 hover:shadow-sm hover:-translate-y-[1px]
transition-all duration-200 ease-in-out">
  <Heart className="size-3.5 mr-2" /> Theo dõi
</Button>
              </div>
            </div>
          </div>
        </section>

        {/* DANH MỤC */}
        <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2 overflow-x-auto pb-1">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory === tab.id ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </section>

     
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {visibleProducts.map((p) => (
              <Card key={p.id} className="cursor-pointer hover:shadow-lg transition-all rounded-2xl border-0 shadow-sm" onClick={() => navigate(`/product/${p.id}`)}>
                <div className="relative">
                  <ImageWithFallback src={p.images?.[0]} alt={p.name} className="aspect-square w-full object-cover rounded-t-2xl" />
                </div>
                <CardContent className="p-3">
                  <h3 className="text-sm font-medium line-clamp-2 h-10 text-slate-700">{p.name}</h3>
                  <p className="text-md font-bold text-cyan-600">{formatMoney(Number(p.price))}</p>
                </CardContent>
              </Card>
            ))}
        </div>
      </main>

      {isChatOpen && shop && (
        <ChatBox storeId={shop.id} userId={user?.id || 'guest'} currentUserRole="USER" onClose={() => setIsChatOpen(false)} />
      )}
      <StoreFooter />
    </div>
  );
}
// import React, { useEffect, useMemo, useState } from 'react';
// import { useNavigate, useParams } from 'react-router';
// import { Button } from '../components/ui/button';
// import { Badge } from '../components/ui/badge';
// import { Card, CardContent } from '../components/ui/card';
// import { ImageWithFallback } from '../components/figma/ImageWithFallback';
// import StoreHeader from '../components/StoreHeader';
// import StoreFooter from '../components/StoreFooter';
// import { getCategories, getProducts, parseDescriptionMetadata, type Category, type Product } from '../services/productService';
// import { ChevronRight, Heart, MessageCircle, Share2, Store, Tag } from 'lucide-react';

// export default function ShopPage() {
//   const navigate = useNavigate();
//   const { storeId } = useParams();
//   const [products, setProducts] = useState<Product[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [activeCategory, setActiveCategory] = useState('ALL');
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [searchValue, setSearchValue] = useState('');

//   useEffect(() => {
//     const loadShop = async () => {
//       if (!storeId) {
//         setProducts([]);
//         setIsLoading(false);
//         return;
//       }

//       setIsLoading(true);
//       setErrorMessage(null);

//       try {
//         const [allProducts, categoryList] = await Promise.all([
//           getProducts({ limit: 100 }),
//           getCategories(),
//         ]);

//         setProducts(allProducts.filter((product) => product.store_id === storeId));
//         setCategories(categoryList);
//       } catch (error) {
//         setErrorMessage(error instanceof Error ? error.message : 'Không tải được shop');
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     void loadShop();
//   }, [storeId]);

//   const shop = products[0]?.store;
//   const categoryNameById = useMemo(() => {
//     const map = new Map<string, string>();
//     products.forEach((product) => {
//       const categoryId = product.category_id || 'uncategorized';
//       if (!map.has(categoryId)) {
//         const categoryLabel = categories.find((category) => category.id === product.category_id)?.name || 'Khác';
//         map.set(categoryId, categoryLabel);
//       }
//     });
//     return map;
//   }, [categories, products]);

//   const categoryTabs = useMemo(() => {
//     const tabs = [{ id: 'ALL', label: 'Tất cả sản phẩm' }];
//     products.forEach((product) => {
//       const key = product.category_id || 'uncategorized';
//       if (!tabs.some((tab) => tab.id === key)) {
//         tabs.push({ id: key, label: categoryNameById.get(key) || 'Khác' });
//       }
//     });
//     return tabs;
//   }, [categoryNameById, products]);

//   useEffect(() => {
//     if (!categoryTabs.some((tab) => tab.id === activeCategory)) {
//       setActiveCategory('ALL');
//     }
//   }, [activeCategory, categoryTabs]);

//   const visibleProducts = useMemo(() => {
//     if (activeCategory === 'ALL') {
//       return products;
//     }
//     return products.filter((product) => (product.category_id || 'uncategorized') === activeCategory);
//   }, [activeCategory, products]);

//   const formatMoney = (value: number) => `${value.toLocaleString('vi-VN')}₫`;

//   const getPriceLabel = (product: Product) => {
//     const metadata = parseDescriptionMetadata(product.description);
//     if (metadata.variants.length === 0) {
//       return formatMoney(Number(product.price || 0));
//     }
//     const prices = metadata.variants.map((variant) => Number(variant.price || 0));
//     const minPrice = Math.min(...prices);
//     const maxPrice = Math.max(...prices);
//     return minPrice === maxPrice ? formatMoney(minPrice) : `${formatMoney(minPrice)} - ${formatMoney(maxPrice)}`;
//   };

//   const availableCount = products.filter((item) => item.status === 'AVAILABLE').length;

//   return (
//     <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_42%,#f4fbff_100%)]">
//       <StoreHeader
//         searchValue={searchValue}
//         onSearchValueChange={setSearchValue}
//         onSearchSubmit={() => {
//           const keyword = searchValue.trim();
//           navigate(keyword ? `/search?q=${encodeURIComponent(keyword)}` : '/search');
//         }}
//         searchPlaceholder="Tim san pham trong ShopHub..."
//         showBackButton
//       />

//       <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 space-y-6">
//         <section className="overflow-hidden rounded-3xl border border-cyan-100 bg-gradient-to-r from-cyan-500 via-sky-600 to-blue-600 text-white shadow-[0_12px_40px_rgba(14,165,233,0.18)]">
//           <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1.35fr_0.95fr] lg:px-8 lg:py-6">
//             <div className="space-y-3">
//               <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-50">
//                 <Tag className="size-3.5" />
//                 Gian hàng đang hoạt động
//               </div>

//               <div className="space-y-3">
//                 <h1 className="max-w-2xl text-2xl font-semibold leading-tight md:text-[2.35rem]">
//                   {shop?.store_name || 'Gian hàng'}
//                 </h1>
//                 <p className="max-w-2xl text-sm leading-6 text-white/80 md:text-base">
//                   Giao diện mua sắm của shop này được trình bày theo phong cách trang chủ: nổi bật, rõ danh mục, dễ lướt sản phẩm và tập trung vào trải nghiệm khám phá.
//                 </p>
//               </div>

//               <div className="flex flex-wrap gap-3">
//                 <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-sm">
//                   <p className="text-xs uppercase tracking-wide text-white/60">Loại shop</p>
//                   <p className="mt-1 text-lg font-semibold">{shop?.store_type || 'C2C'}</p>
//                 </div>
//                 <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-sm">
//                   <p className="text-xs uppercase tracking-wide text-white/60">Sản phẩm</p>
//                   <p className="mt-1 text-lg font-semibold">{products.length}</p>
//                 </div>
//                 <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-sm">
//                   <p className="text-xs uppercase tracking-wide text-white/60">Đang bán</p>
//                   <p className="mt-1 text-lg font-semibold">{availableCount}</p>
//                 </div>
//               </div>

//               <div className="flex flex-wrap gap-3">
//                 <Button className="bg-cyan-500 text-white hover:bg-cyan-600">
//                   <MessageCircle className="mr-2 size-4" />
//                   Nhắn shop
//                 </Button>
//                 <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
//                   <Share2 className="mr-2 size-4" />
//                   Chia sẻ shop
//                 </Button>
//               </div>
//             </div>

//             <Card className="border-white/10 bg-white/10 text-white shadow-none backdrop-blur-sm">
//               <CardContent className="space-y-4 p-4 sm:p-5">
//                 <div className="flex items-center gap-4">
//                   <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10">
//                     <Store className="size-7" />
//                   </div>
//                   <div>
//                     <p className="text-sm text-white/60">Xem shop như trang chủ</p>
//                     <h2 className="text-lg font-semibold sm:text-xl">{shop?.store_name || 'Gian hàng'}</h2>
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-2 gap-3">
//                   <div className="rounded-2xl bg-white/10 p-4 shadow-sm">
//                     <p className="text-xs uppercase tracking-wide text-white/55">Tổng sản phẩm</p>
//                     <p className="mt-1 text-2xl font-semibold">{products.length}</p>
//                   </div>
//                   <div className="rounded-2xl bg-white/10 p-4 shadow-sm">
//                     <p className="text-xs uppercase tracking-wide text-white/55">Đang bán</p>
//                     <p className="mt-1 text-2xl font-semibold">{availableCount}</p>
//                   </div>
//                 </div>

//                 <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
//                   Duyệt sản phẩm theo danh mục, xem shop theo phong cách storefront và mở từng sản phẩm chi tiết từ ngay trang này.
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </section>

//         <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
//           <div className="flex flex-wrap items-center justify-between gap-3">
//             <div>
//               <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-600">Danh mục</p>
//               <h2 className="text-2xl font-semibold text-slate-900">Lọc sản phẩm của shop</h2>
//             </div>
//             <div className="text-sm text-slate-500">{visibleProducts.length} sản phẩm hiển thị</div>
//           </div>

//           <div className="flex gap-2 overflow-x-auto pb-1">
//             {categoryTabs.map((tab) => (
//               <button
//                 key={tab.id}
//                 type="button"
//                 onClick={() => setActiveCategory(tab.id)}
//                 className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-all ${
//                   activeCategory === tab.id
//                     ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
//                     : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
//                 }`}
//               >
//                 {tab.label}
//               </button>
//             ))}
//           </div>
//         </section>

//         {errorMessage && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

//         {isLoading ? (
//           <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500">Đang tải shop...</div>
//         ) : visibleProducts.length === 0 ? (
//           <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-slate-500">
//             Shop chưa có sản phẩm phù hợp.
//           </div>
//         ) : (
//           <section className="space-y-4">
//             <div className="flex items-end justify-between gap-3">
//               <div>
//                 <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-600">Sản phẩm nổi bật</p>
//                 <h2 className="text-2xl font-semibold text-slate-900">{shop?.store_name || 'Gian hàng'}</h2>
//               </div>
//               <div className="hidden items-center gap-2 text-sm text-slate-500 md:flex">
//                 Xem chi tiết từng sản phẩm <ChevronRight className="size-4" />
//               </div>
//             </div>

//             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
//               {visibleProducts.map((product) => (
//                 <Card key={product.id} className="group overflow-hidden border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer rounded-2xl" onClick={() => navigate(`/product/${product.id}`)}>
//                   <div className="relative">
//                     <ImageWithFallback
//                       src={product.images?.[0] || 'https://placehold.co/400x400?text=No+Image'}
//                       alt={product.name}
//                       className="h-52 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
//                     />
//                     {product.store?.store_type === 'B2C' ? (
//                       <Badge className="absolute left-3 top-3 z-10 bg-red-600 text-white font-bold rounded-sm px-2 py-0.5 text-xs hover:bg-red-700">
//                         Mall
//                       </Badge>
//                     ) : null}
//                     <Button variant="ghost" size="icon" className="absolute right-3 top-3 bg-white/90 text-slate-700 shadow-sm hover:bg-white">
//                       <Heart className="size-4" />
//                     </Button>
//                     <Badge className="absolute left-3 top-11 bg-cyan-600 text-white">
//                       {product.status === 'AVAILABLE' ? 'Đang bán' : product.status}
//                     </Badge>
//                   </div>
//                   <CardContent className="space-y-2 p-4">
//                     <p className="line-clamp-2 min-h-12 text-sm font-medium text-slate-900">{product.name}</p>
//                     <p className="text-lg font-semibold text-cyan-600">{getPriceLabel(product)}</p>
//                     <div className="flex items-center justify-between text-xs text-slate-500">
//                       <span className="truncate">{product.store?.store_name}</span>
//                       <span>Kho: {product.stock_quantity}</span>
//                     </div>
//                   </CardContent>
//                 </Card>
//               ))}
//             </div>
//           </section>
//         )}
//       </main>

//       <StoreFooter />
//     </div>
//   );
// }
