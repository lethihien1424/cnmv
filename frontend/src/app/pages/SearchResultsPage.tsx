import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import { getProducts, type Product } from '../services/productService';
import { Search, Store, Package, ChevronRight, Filter, Star } from 'lucide-react';

export default function SearchResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const [searchValue, setSearchValue] = useState(query);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSearchValue(query);
  }, [query]);

  useEffect(() => {
    const loadResults = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        if (query) {
          const [matchedProducts, productsForShops] = await Promise.all([
            getProducts({ keyword: query, limit: 100, use_ai: true }),
            getProducts({ limit: 100 }),
          ]);

          setProducts(matchedProducts);
          setAllProducts(productsForShops);
        } else {
          const productsForShops = await getProducts({ limit: 100 });
          setProducts([]);
          setAllProducts(productsForShops);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Không tải được kết quả tìm kiếm');
      } finally {
        setIsLoading(false);
      }
    };

    void loadResults();
  }, [query]);

  const formatMoney = (value: number) => `${value.toLocaleString('vi-VN')}₫`;

  const shopCards = useMemo(() => {
    const map = new Map<string, { store: NonNullable<Product['store']>; productCount: number; featuredProduct?: Product }>();

    allProducts.forEach((product) => {
      if (!product.store) {
        return;
      }

      const existing = map.get(product.store.id);
      if (existing) {
        existing.productCount += 1;
        if (!existing.featuredProduct) {
          existing.featuredProduct = product;
        }
      } else {
        map.set(product.store.id, {
          store: product.store,
          productCount: 1,
          featuredProduct: product,
        });
      }
    });

    const keyword = query.toLowerCase();
    return Array.from(map.values()).filter(({ store, featuredProduct }) => {
      if (!keyword) {
        return true;
      }

      const storeName = store.store_name.toLowerCase();
      const ownerName = store.owner?.username?.toLowerCase() || '';
      const productName = featuredProduct?.name?.toLowerCase() || '';
      return [storeName, ownerName, productName].some((value) => value.includes(keyword));
    });
  }, [allProducts, query]);

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <StoreHeader
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearchSubmit={() => {
          const keyword = searchValue.trim();
          navigate(keyword ? `/search?q=${encodeURIComponent(keyword)}` : '/stores');
        }}
        searchPlaceholder="Tim trong shop nay"
        showBackButton
      />

      <main className="container mx-auto space-y-6 px-4 py-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                <Search className="size-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Kết quả tìm kiếm cho “{query || 'shop đang bán'}”</h1>
                <p className="text-sm text-slate-500">Tích hợp AI: Tự động phân tích giá và danh mục từ ngôn ngữ tự nhiên.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Filter className="size-4" />
              Lọc theo shop và sản phẩm
            </div>
          </div>
        </section>

        {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Package className="size-5 text-cyan-500" />
              Sản phẩm phù hợp ({products.length})
            </div>
            <div className="hidden items-center gap-2 text-sm text-slate-500 md:flex">
              Sắp xếp theo liên quan <ChevronRight className="size-4" />
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl bg-white p-8 text-center text-slate-500">Đang tìm sản phẩm...</div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-slate-500">Không tìm thấy sản phẩm phù hợp.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                  <div className="relative">
                    <ImageWithFallback
                      src={product.images?.[0] || 'https://placehold.co/400x400?text=No+Image'}
                      alt={product.name}
                      className="h-52 w-full object-cover"
                    />
                    {product.store?.store_type === 'B2C' ? (
                      <Badge className="absolute left-2 top-2 z-10 bg-red-600 text-white font-bold rounded-sm px-2 py-0.5 text-xs hover:bg-red-700">
                        Mall
                      </Badge>
                    ) : null}
                  </div>
                  <CardContent className="space-y-2 p-3">
                    <p className="line-clamp-2 min-h-12 text-sm text-slate-800">{product.name}</p>
                    <p className="text-lg font-semibold text-cyan-600">{formatMoney(Number(product.price || 0))}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{product.store?.store_name || 'Cửa hàng'}</span>
                      <span>Kho: {product.stock_quantity}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Store className="size-5 text-cyan-500" />
              {query ? `Shop phù hợp (${shopCards.length})` : `Shop đang bán hiện tại (${shopCards.length})`}
            </div>
            <div className="text-sm text-slate-500">Chọn shop để mở storefront</div>
          </div>

          {shopCards.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-slate-500">Không tìm thấy shop phù hợp.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {shopCards.map(({ store, productCount, featuredProduct }) => (
                <Card key={store.id} className="overflow-hidden bg-white shadow-sm transition hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 text-xl font-semibold text-white">
                        {store.store_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-slate-900">{store.store_name}</h3>
                        <p className="truncate text-sm text-slate-500">{store.owner?.username || 'Chủ shop'}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge className="bg-cyan-100 text-cyan-700 hover:bg-cyan-100">{store.store_type}</Badge>
                          <Badge variant="outline">{productCount} sản phẩm</Badge>
                        </div>
                      </div>
                    </div>

                    {featuredProduct && (
                      <div className="flex items-center gap-3 rounded-2xl bg-[#fafafa] p-3">
                        <ImageWithFallback
                          src={featuredProduct.images?.[0] || 'https://placehold.co/120x120?text=No+Image'}
                          alt={featuredProduct.name}
                          className="size-16 rounded-lg object-cover"
                        />
                        <div className="min-w-0 max-w-[180px]">
                          <p className="line-clamp-2 text-sm text-slate-700">{featuredProduct.name}</p>
                          <p className="mt-1 text-sm font-semibold text-cyan-600">{formatMoney(Number(featuredProduct.price || 0))}</p>
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                            Shop đang bán
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={() => navigate(`/shop/${store.id}`)}>
                        Xem shop
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <StoreFooter />
    </div>
  );
}
