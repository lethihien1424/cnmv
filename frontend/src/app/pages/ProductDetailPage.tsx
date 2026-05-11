import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import StoreHeader from '../components/StoreHeader';
import StoreFooter from '../components/StoreFooter';
import ChatBox from '../components/ChatBox';
import { getProductDetail, getProducts, parseDescriptionMetadata, type Product } from '../services/productService';
import { getReviewsByProduct, type Review } from '../services/reviewService';
import { cartAPI } from '../services/cartService';

import {
  Star,
  StarHalf,
  Heart,
  Share2,
  ShoppingCart,
  Store,
  ChevronRight,
  Minus,
  Plus,
  ThumbsUp,
  MessageCircle,
  User,
  FileText,
  Settings2,
  MessageSquare,
} from 'lucide-react';

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [productData, setProductData] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const fallbackProduct = {
    id: 'fallback-product',
    store_id: 'fallback-store',
    category_id: null,
    description: 'Sản phẩm demo khi chưa tải được dữ liệu từ API.',
    stock_quantity: 50,
    condition: 'NEW' as const,
    status: 'AVAILABLE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    store: {
      id: 'fallback-store',
      store_name: 'Apple Store Official',
      store_type: 'B2C' as const,
      status: 'APPROVED',
      owner: {
        id: 'fallback-owner',
        username: 'ShopHub',
        email: 'shop@example.com',
        role: 'Business',
        status: 'ACTIVE',
      },
    },
    images: [
      '/src/imports/image.png',
      '/src/imports/image-1.png',
      '/src/imports/image-2.png',
      '/src/imports/image-4.png',
      '/src/imports/image-5.png',
    ],
    name: 'iPhone 15 Pro Max 256GB - Chính hãng VN/A',
    price: 29990000,
  };

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setProductData(fallbackProduct);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const detail = await getProductDetail(id);
        setProductData(detail);

        const candidates = await getProducts({
          limit: 100,
          store_type: detail.store?.store_type,
        });

        const sameStoreProducts = candidates
          .filter((item) => item.store_id === detail.store_id && item.id !== detail.id)
          .slice(0, 4);

        setRelatedProducts(sameStoreProducts);

        try {
          const fetchedReviews = await getReviewsByProduct(detail.id);
          setReviews(fetchedReviews);
        } catch (error) {
          console.error("Failed to fetch reviews", error);
        }
      } catch (error) {
        setProductData(fallbackProduct);
        setRelatedProducts([]);
        setErrorMessage(error instanceof Error ? error.message : 'Không tải được sản phẩm');
      } finally {
        setIsLoading(false);
      }
    };

    void loadProduct();
  }, [id]);

  const product = productData || fallbackProduct;
  const currentUserRoleForChat: 'USER' | 'STORE' =
    user && (user.businessStoreId === product.store_id || user.c2cStoreId === product.store_id)
      ? 'STORE'
      : 'USER';

  const parsedMetadata = useMemo(
    () => parseDescriptionMetadata(product.description),
    [product.description],
  );

  const variants = useMemo(() => {
    if (parsedMetadata.variants.length > 0) {
      return parsedMetadata.variants;
    }

    return [
      {
        color: product.condition === 'USED' ? 'Đã qua sử dụng' : 'Mới',
        size: 'Mặc định',
        price: Number(product.price || 0),
        stock_quantity: Number(product.stock_quantity || 0),
        image_url: product.images?.[0],
      },
    ];
  }, [parsedMetadata.variants, product.condition, product.price, product.stock_quantity]);

  const resolveVariantImage = (variant: (typeof variants)[number]) => {
    if (
      typeof variant.image_index === 'number' &&
      Number.isInteger(variant.image_index) &&
      variant.image_index >= 0
    ) {
      const indexedImage = product.images?.[variant.image_index];
      if (indexedImage) {
        return indexedImage;
      }
    }
    return variant.image_url;
  };

  const galleryImages = useMemo(() => {
    const fromProductImages = (product.images || []).filter(Boolean);
    const fromVariantImages = variants
      .map((variant) => resolveVariantImage(variant))
      .filter((image): image is string => Boolean(image));

    return Array.from(new Set([...fromProductImages, ...fromVariantImages]));
  }, [product.images, variants]);

  const colorOptions = useMemo(
    () => Array.from(new Set(variants.map((variant) => variant.color))),
    [variants],
  );

  const getVariantSizes = (rawSize: string) => {
    return rawSize
      .split(/[;,/|]/)
      .map((size) => size.trim())
      .filter(Boolean);
  };

  const colorImageMap = useMemo(() => {
    const map = new Map<string, string>();
    variants.forEach((variant) => {
      const resolvedImage = resolveVariantImage(variant);
      if (variant.color && resolvedImage && !map.has(variant.color)) {
        map.set(variant.color, resolvedImage);
      }
    });
    return map;
  }, [variants]);

  const sizeOptions = useMemo(() => {
    const sizes = variants
      .filter((variant) => (selectedColor ? variant.color === selectedColor : true))
      .flatMap((variant) => getVariantSizes(variant.size));

    return Array.from(new Set(sizes));
  }, [selectedColor, variants]);

  useEffect(() => {
    if (!selectedColor && colorOptions.length > 0) {
      setSelectedColor(colorOptions[0]);
    }
  }, [colorOptions, selectedColor]);

  useEffect(() => {
    if (sizeOptions.length === 0) {
      setSelectedSize('');
      return;
    }
    if (!sizeOptions.includes(selectedSize)) {
      setSelectedSize(sizeOptions[0]);
    }
  }, [selectedSize, sizeOptions]);

  const selectedVariant = useMemo(() => {
    const exactMatch = variants.find(
      (variant) =>
        variant.color === selectedColor &&
        (variant.size === selectedSize || getVariantSizes(variant.size).includes(selectedSize)),
    );
    if (exactMatch) return exactMatch;
    return variants.find((variant) => variant.color === selectedColor) || variants[0];
  }, [selectedColor, selectedSize, variants]);

  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    const colorImage = colorImageMap.get(color);
    if (!colorImage) return;
    const variantImageIndex = galleryImages.findIndex((image) => image === colorImage);
    if (variantImageIndex >= 0) setSelectedImage(variantImageIndex);
  };

  const displayPrice = Number(selectedVariant?.price || product.price || 0);
  const displayStock = Number(selectedVariant?.stock_quantity || product.stock_quantity || 0);

  // ==================== HÀM THÊM VÀO GIỎ HÀNG ====================
  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!selectedVariant) {
      alert("Vui lòng chọn màu sắc / kích thước!");
      return;
    }

    try {
      await cartAPI.addToCart(
        product.id,
        quantity,
        {
          color: selectedColor,
          size: selectedSize,
          price: selectedVariant.price,
        }
      );

      alert("✅ Đã thêm vào giỏ hàng!");
      window.dispatchEvent(new Event("cartUpdated"));
      setCartCount((prev) => prev + quantity);
    } catch (err: any) {
      console.error(err);
      alert("❌ " + (err.message || "Không thể thêm vào giỏ hàng"));
    }
  };
  // ============================================================

  const handleQuantityChange = (type: 'increase' | 'decrease') => {
    if (type === 'increase' && quantity < displayStock) {
      setQuantity(quantity + 1);
    } else if (type === 'decrease' && quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const calculateOriginalPrice = (currentPrice: number) => Math.round(currentPrice * 1.14);
  const discountPercent = 14;

  const validSpecs = (parsedMetadata.specifications || []).filter((s: any) => s.label !== '0' && s.value !== '0');

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1)
    : '0.0';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="size-4 fill-yellow-400 text-yellow-400" />);
    }
    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="size-4 fill-yellow-400 text-yellow-400" />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="size-4 text-gray-300" />);
    }
    return stars;
  };

  const plainDescription =
    parsedMetadata.plainDescription || '';

  // ==================== MUA NGAY ====================
  const handleBuyNow = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!selectedVariant) {
      alert("Vui lòng chọn màu sắc / kích thước!");
      return;
    }

    navigate('/checkout', {
      state: {
        items: [{
          product_id: product.id,
          quantity: quantity,
          product: {
            ...product,
            price: selectedVariant.price || product.price,
            name: product.name,
            image_url: resolveVariantImage(selectedVariant) || product.images?.[0]
          }
        }],
        fromCart: false
      }
    });
  };

  const handleOpenChat = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!product.store_id) return;
    setIsChatOpen(true);
  };

  // ── Tính thống kê sao cho phần đánh giá ──────────────────────────────────
  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Number(r.rating) === star).length,
    pct: reviews.length > 0
      ? Math.round((reviews.filter((r) => Number(r.rating) === star).length / reviews.length) * 100)
      : 0,
  }));

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Đang tải sản phẩm...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearchSubmit={() => {
          const keyword = searchValue.trim();
          navigate(keyword ? `/search?q=${encodeURIComponent(keyword)}` : '/search');
        }}
        searchPlaceholder="Tim kiem san pham..."
      />

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-gray-600 hover:text-indigo-600">Trang chủ</Link>
            <ChevronRight className="size-4 text-gray-400" />
            <Link to="/" className="text-gray-600 hover:text-indigo-600">Điện tử</Link>
            <ChevronRight className="size-4 text-gray-400" />
            <span className="text-gray-900">{product.name}</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="container mx-auto px-4 py-3">
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {errorMessage}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-6">
        <div>
          {/* Product Images & Info */}
          <div>
            <Card>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Image Gallery */}
                  <div>
                    <div className="relative mb-4 bg-gray-50 rounded-lg overflow-hidden group">
                      <ImageWithFallback
                        src={galleryImages[selectedImage] || '/src/imports/image.png'}
                        alt={product.name}
                        className="w-full h-[400px] object-cover"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm hover:bg-white"
                      >
                        <Heart className="size-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-16 bg-white/80 backdrop-blur-sm hover:bg-white"
                      >
                        <Share2 className="size-5" />
                      </Button>
                      {discountPercent > 0 && (
                        <Badge className="absolute top-4 left-4 bg-red-500 text-white">
                          -{discountPercent}%
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {galleryImages.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={`border-2 rounded-lg overflow-hidden transition-all ${selectedImage === index ? 'border-indigo-600' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <ImageWithFallback
                            src={image}
                            alt={`Product ${index + 1}`}
                            className="w-full h-16 object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Product Info */}
                  <div>
                    <div className="flex items-start gap-2 mb-2">
                      {product.store?.store_type === 'B2C' ? (
                        <Badge className="bg-red-600 text-white">Mall</Badge>
                      ) : (
                        <Badge className="bg-red-500">Yêu thích</Badge>
                      )}
                      <Badge variant="outline">{product.store?.store_type || 'C2C'}</Badge>
                    </div>
                    <h1 className="text-2xl mb-3">{product.name}</h1>

                    {/* Rating & Sales */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1">
                        <span className="text-orange-500 underline">{averageRating}</span>
                        <div className="flex">{renderStars(Number(averageRating))}</div>
                      </div>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-gray-600">{reviews.length} Đánh giá</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-gray-600">567 Đã bán</span>
                    </div>

                    {/* Price */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl text-red-600">{formatPrice(displayPrice)}</span>
                        {displayPrice > 0 && (
                          <>
                            <span className="text-lg text-gray-400 line-through">
                              {formatPrice(calculateOriginalPrice(displayPrice))}
                            </span>
                            <Badge className="bg-red-500">-{discountPercent}%</Badge>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Color Selection */}
                    <div className="mb-6">
                      <label className="text-sm text-gray-600 mb-2 block">Màu sắc: {selectedColor}</label>
                      <div className="flex gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            onClick={() => handleSelectColor(color)}
                            className={`px-4 py-2 border-2 rounded-lg transition-all ${selectedColor === color
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            <span className="text-sm">{color}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Size Selection */}
                    <div className="mb-6">
                      <label className="text-sm text-gray-600 mb-2 block">Size: {selectedSize}</label>
                      <div className="flex gap-2">
                        {sizeOptions.map((size) => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`px-4 py-2 border-2 rounded-lg transition-all ${selectedSize === size
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            <span className="text-sm">{size}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="mb-6">
                      <label className="text-sm text-gray-600 mb-2 block">Số lượng</label>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center border-2 border-gray-200 rounded-lg">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleQuantityChange('decrease')}
                            disabled={quantity <= 1}
                          >
                            <Minus className="size-4" />
                          </Button>
                          <Input
                            type="number"
                            value={quantity}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (value >= 1 && value <= displayStock) {
                                setQuantity(value);
                              }
                            }}
                            className="w-16 text-center border-0 focus-visible:ring-0"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleQuantityChange('increase')}
                            disabled={quantity >= displayStock}
                          >
                            <Plus className="size-4" />
                          </Button>
                        </div>
                        <span className="text-sm text-gray-600">{displayStock} sản phẩm có sẵn</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-indigo-600 text-indigo-600 hover:bg-indigo-50 h-12"
                        onClick={handleAddToCart}
                      >
                        <ShoppingCart className="size-5 mr-2" />
                        Thêm vào giỏ hàng
                      </Button>
                      <div className="flex gap-3">
                        <Button
                          className="flex-1 bg-red-600 hover:bg-red-700 h-12"
                          onClick={handleBuyNow}
                        >
                          Mua ngay
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shop Info Section */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="size-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Store className="size-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1 hover:text-indigo-600 cursor-pointer"
                        onClick={() => product.store?.id && navigate(`/shop/${product.store.id}`)}>
                        {product.store?.store_name || 'Cửa hàng'}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Star className="size-4 fill-yellow-400 text-yellow-400" />
                          4.9 / 5.0
                        </span>
                        <Separator orientation="vertical" className="h-4" />
                        <span>125k Người theo dõi</span>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="text-green-600 font-medium">Đang hoạt động</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <Button variant="outline" className="flex-1 md:flex-none border-indigo-600 text-indigo-600 hover:bg-indigo-50" onClick={handleOpenChat}>
                      <MessageCircle className="size-4 mr-2" />
                      Chat ngay
                    </Button>
                    <Button variant="outline" className="flex-1 md:flex-none" onClick={() => product.store?.id && navigate(`/shop/${product.store.id}`)}>
                      <Store className="size-4 mr-2" />
                      Xem Shop
                    </Button>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex justify-between md:justify-start md:gap-4">
                    <span className="text-gray-500">Đánh giá</span>
                    <span className="text-red-600 font-medium">1.2k</span>
                  </div>
                  <div className="flex justify-between md:justify-start md:gap-4">
                    <span className="text-gray-500">Sản phẩm</span>
                    <span className="text-red-600 font-medium">234</span>
                  </div>
                  <div className="flex justify-between md:justify-start md:gap-4">
                    <span className="text-gray-500">Tỉ lệ phản hồi</span>
                    <span className="text-red-600 font-medium">99%</span>
                  </div>
                  <div className="flex justify-between md:justify-start md:gap-4">
                    <span className="text-gray-500">Tham gia</span>
                    <span className="text-red-600 font-medium">2 năm trước</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ══════════════════════════════════════════════════════════
                TABS: Mô tả / Thông số / Đánh giá
            ══════════════════════════════════════════════════════════ */}
            <div className="mt-6">
              <Tabs defaultValue="description">
                {/* Tab bar */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <TabsList className="w-full justify-start border-b rounded-none h-14 bg-transparent p-0 gap-0">
                    <TabsTrigger
                      value="description"
                      className="flex items-center gap-2 h-14 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-indigo-50/40 text-gray-600 hover:text-gray-900 transition-all bg-transparent font-medium"
                    >
                      <FileText className="size-4" />
                      Mô tả sản phẩm
                    </TabsTrigger>
                    <TabsTrigger
                      value="specifications"
                      className="flex items-center gap-2 h-14 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-indigo-50/40 text-gray-600 hover:text-gray-900 transition-all bg-transparent font-medium"
                    >
                      <Settings2 className="size-4" />
                      Thông số kỹ thuật
                    </TabsTrigger>
                    <TabsTrigger
                      value="reviews"
                      className="flex items-center gap-2 h-14 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-indigo-50/40 text-gray-600 hover:text-gray-900 transition-all bg-transparent font-medium"
                    >
                      <MessageSquare className="size-4" />
                      Đánh giá
                      <span className="ml-1 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-semibold px-2 py-0.5 min-w-[24px]">
                        {reviews.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>

                  {/* ── Tab: Mô tả ── */}
                  <TabsContent value="description" className="p-0 m-0">
                    <div className="p-6">
                      {plainDescription ? (
                        <>
                          <div className="flex items-center gap-2 mb-5">
                            <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                            <h3 className="text-base font-semibold text-gray-800">Chi tiết sản phẩm</h3>
                          </div>
                          {/* Tách từng dòng thành row zebra */}
                          <div className="rounded-xl border border-gray-100 overflow-hidden">
                            {plainDescription
                              .split('\n')
                              .map((line: string) => line.trim())
                              .filter((line: string) => line.length > 0)
                              .map((line: string, idx: number) => {
                                // Nếu dòng có dấu ":" thì split thành label : value
                                const colonIdx = line.indexOf(':');
                                if (colonIdx > 0 && colonIdx < 40) {
                                  const label = line.slice(0, colonIdx).trim();
                                  const value = line.slice(colonIdx + 1).trim();
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex gap-0 text-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                    >
                                      <span className="w-44 shrink-0 px-4 py-3 text-gray-500 font-medium border-r border-gray-100">
                                        {label}
                                      </span>
                                      <span className="flex-1 px-4 py-3 text-gray-800">{value}</span>
                                    </div>
                                  );
                                }
                                // Dòng không có ":" → hiện full width
                                return (
                                  <div
                                    key={idx}
                                    className={`px-4 py-3 text-sm text-gray-700 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                  >
                                    {line}
                                  </div>
                                );
                              })}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                          <FileText className="size-10 text-gray-200" />
                          <p className="text-sm">Sản phẩm chưa có mô tả chi tiết.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── Tab: Thông số kỹ thuật ── */}
                  <TabsContent value="specifications" className="p-0 m-0">
                    <div className="p-6">
                      {validSpecs.length > 0 ? (
                        <>
                          <div className="flex items-center gap-2 mb-5">
                            <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                            <h3 className="text-base font-semibold text-gray-800">Thông số kỹ thuật</h3>
                          </div>
                          <div className="rounded-xl border border-gray-100 overflow-hidden">
                            {validSpecs.map((spec: any, idx: number) => (
                              <div
                                key={idx}
                                className={`flex text-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                              >
                                <span className="w-44 shrink-0 px-4 py-3 text-gray-500 font-medium border-r border-gray-100">
                                  {spec.label}
                                </span>
                                <span className="flex-1 px-4 py-3 text-gray-800">{spec.value}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                          <Settings2 className="size-10 text-gray-200" />
                          <p className="text-sm">Không có thông số kỹ thuật.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── Tab: Đánh giá ── */}
                  <TabsContent value="reviews" className="p-0 m-0">
                    <div className="p-6">
                      {reviews.length > 0 ? (
                        <>
                          {/* Thống kê tổng hợp */}
                          <div className="flex items-center gap-2 mb-5">
                            <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                            <h3 className="text-base font-semibold text-gray-800">Đánh giá sản phẩm</h3>
                          </div>

                          <div className="flex flex-col md:flex-row gap-6 mb-6 p-5 bg-orange-50 rounded-xl border border-orange-100">
                            {/* Điểm tổng */}
                            <div className="flex flex-col items-center justify-center min-w-[120px]">
                              <span className="text-5xl font-bold text-orange-500 leading-none">
                                {averageRating}
                              </span>
                              <span className="text-gray-400 text-xs mt-1">trên 5</span>
                              <div className="flex mt-2">{renderStars(Number(averageRating))}</div>
                              <span className="text-gray-500 text-xs mt-1">{reviews.length} đánh giá</span>
                            </div>

                            <div className="w-px bg-orange-200 hidden md:block" />

                            {/* Thanh sao */}
                            <div className="flex-1 flex flex-col justify-center gap-2">
                              {starCounts.map(({ star, count, pct }) => (
                                <div key={star} className="flex items-center gap-3">
                                  <span className="flex items-center gap-1 w-14 text-sm text-gray-600 shrink-0">
                                    {star}
                                    <Star className="size-3 fill-yellow-400 text-yellow-400" />
                                  </span>
                                  <div className="flex-1 h-2 bg-orange-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="w-20 text-xs text-gray-500 text-right shrink-0">
                                    {count} ({pct}%)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Danh sách đánh giá */}
                          <div className="space-y-0 rounded-xl border border-gray-100 overflow-hidden">
                            {reviews.map((review, idx) => (
                              <div
                                key={review.id}
                                className={`flex gap-4 p-5 ${idx !== reviews.length - 1 ? 'border-b border-gray-100' : ''} ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                              >
                                {/* Avatar */}
                                <div className="size-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0 text-sm">
                                  {review.buyer?.username?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                                    <span className="font-medium text-gray-800 text-sm">
                                      {review.buyer?.username || 'Khách hàng'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {new Date(review.created_at).toLocaleDateString('vi-VN')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="flex">{renderStars(review.rating)}</div>
                                    <span className="text-xs text-orange-500 font-medium">
                                      {review.rating}/5
                                    </span>
                                  </div>
                                  <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        /* Không có đánh giá */
                        <div className="flex flex-col items-center justify-center py-14 gap-3 text-gray-400">
                          <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <MessageCircle className="size-8 text-gray-300" />
                          </div>
                          <p className="text-base font-medium text-gray-500">Chưa có đánh giá nào</p>
                          <p className="text-sm text-gray-400">Hãy là người đầu tiên đánh giá sản phẩm này!</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
            {/* ══════════════════════════════════════════════════════════ */}

          </div>
        </div>
      </div>

      {isChatOpen && user?.id && product.store_id ? (
        <ChatBox
          userId={user.id}
          storeId={product.store_id}
          currentUserRole={currentUserRoleForChat}
          onClose={() => setIsChatOpen(false)}
        />
      ) : null}

      <StoreFooter />
    </div>
  );
}