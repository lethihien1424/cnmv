import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import ChatBox from '../components/ChatBox';
import NotificationBell from '../components/NotificationBell';
import { toast } from 'sonner'; // Nhớ cài thư viện toast nếu chưa có

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Input } from '../components/ui/input';
// IMPORT TRANG CÀI ĐẶT VÀO ĐÂY
import StoreSettingsPage from './StoreSettingsPage';// Import Input UI
import StoreOrdersPage from './StoreOrdersPage';
import { dashboardAPI } from '../services/dashboardService';
import {
  buildDescriptionWithVariants,
  getCategories,
  createProduct,
  deleteProduct,
  getSellerProducts,
  parseDescriptionMetadata,
  updateProduct,
  updateFlashSale, // Thêm hàm này từ bước trước
  type Category,
  type Product,
  type ProductCondition,
  type ProductSpecification,
  type ProductVariant,
} from '../services/productService';
import {
  getMySellerReport,
  type SellerReportData,
  type SellerReportPeriod,
} from '../services/sellerReportService';
import { orderAPI, type Order } from '../services/orderService';
import { getAbsoluteImageUrl } from '../services/api';
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  Search,
  Plus,
  ChevronDown,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  MessageCircle,
  Truck,
  CheckCircle,
  XCircle,
  Zap // Thêm icon Zap cho Flash Sale
} from 'lucide-react';

type DashboardTab = 'overview' | 'products' | 'orders' | 'customers' | 'reports' | 'settings';

type ChatSender = 'USER' | 'STORE';

interface StoreConversation {
  userId: string;
  customerName?: string;
  storeId: string;
  lastMessage: string;
  lastSender: ChatSender;
  updatedAt: string;
  unreadCount: number;
}

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const handleLogout = () => {
  logout();
  navigate('/login');
};
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showShopPreview, setShowShopPreview] = useState(false);
  const [shopCategoryFilter, setShopCategoryFilter] = useState('ALL');
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([
    { color: '', size: '', price: 0, stock_quantity: 0 },
  ]);
  const [productSpecifications, setProductSpecifications] = useState<ProductSpecification[]>([
    { label: '', value: '' },
  ]);
  const [variantUploadFiles, setVariantUploadFiles] = useState<Array<File | null>>([null]);
  const [variantImagePreviews, setVariantImagePreviews] = useState<string[]>(['']);
  const [storeConversations, setStoreConversations] = useState<StoreConversation[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [reportPeriod, setReportPeriod] = useState<SellerReportPeriod>('month');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [sellerReport, setSellerReport] = useState<SellerReportData | null>(null);
  const inboxSocketRef = useRef<Socket | null>(null);
  // State cho AI Moderation - đánh dấu khi backend trả về lỗi kiểm duyệt
  const [isModerationError, setIsModerationError] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [dateFilterType, setDateFilterType] = useState<'day' | 'month' | 'year'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [recentOrders, setRecentOrders] =
  useState<Order[]>([]);
  
const [selectedOrderDetail, setSelectedOrderDetail] =
  useState<Order | null>(null);
  // STATE CHO MODAL FLASH SALE
  const [flashSaleModal, setFlashSaleModal] = useState<{
    isOpen: boolean;
    product: any | null;
    isFlashSale: boolean;
    price: string;
    stock: string;
    loading: boolean;
  }>({
    isOpen: false,
    product: null,
    isFlashSale: false,
    price: '',
    stock: '',
    loading: false,
  });
  

  const handleVariantImageUpload = (index: number, file: File | null) => {
    if (!file) {
      setVariantUploadFiles((prev) => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
      return;
    }

    setVariantUploadFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });

    setVariantImagePreviews((prev) => {
      const next = [...prev];
      next[index] = file ? URL.createObjectURL(file) : '';
      return next;
    });

    updateVariant(index, 'image_url', '');
  };
  const [productForm, setProductForm] = useState({
    name: '',
    category_id: '',
    description: '',
    price: 0,
    stock_quantity: 0,
    condition: 'USED' as ProductCondition,
    images: [] as File[],
    size: '',
    color: '',
    type: '',
    is_bulky: '',
  });
  const [productImagePreviews, setProductImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    if (productForm.images.length === 0) {
      setProductImagePreviews([]);
      return;
    }

    const objectUrls = productForm.images.map((file) => URL.createObjectURL(file));
    setProductImagePreviews(objectUrls);

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [productForm.images]);

  useEffect(() => {
    return () => {
      variantImagePreviews.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [variantImagePreviews]);

  const storeName = user?.storeName || 'Shop của bạn';
  const storeType = user?.role === 'business' ? 'Doanh nghiệp (B2C)' : 'Cá nhân (C2C)';

  const menuItems = [
    { id: 'overview', label: 'Tổng quan', icon: Home },
    { id: 'products', label: 'Sản phẩm', icon: Package },
    { id: 'orders', label: 'Đơn đặt hàng', icon: ShoppingCart },
    { id: 'customers', label: 'Khách hàng', icon: Users },
    { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  const storeId = useMemo(() => {
    if (user?.businessStoreId) {
      return user.businessStoreId;
    }

    if (user?.c2cStoreId) {
      return user.c2cStoreId;
    }

    if (products.length > 0) {
      return products[0].store_id;
    }

    return undefined;
  }, [products, user?.businessStoreId, user?.c2cStoreId]);
useEffect(() => {

  const loadDashboard = async () => {

    try {

      if (!storeId) return;

      const query: any = {};

if (dateFilterType === 'day') {

  query.period = 'day';
  query.date = selectedDate;
}

if (dateFilterType === 'month') {

  query.period = 'month';
  query.month = selectedDate;
}

if (dateFilterType === 'year') {

  query.period = 'year';
  query.year = selectedDate;
}

const data =
  await dashboardAPI.getStoreOverview(
    storeId,
    query
  );

setOverview(data);

const orders =
  await orderAPI.getStoreOrders(storeId);

setRecentOrders(orders);
    } catch (err: any) {

      toast.error(err.message);

    }
  };

  if (activeTab === 'overview') {
    loadDashboard();
  }

}, [storeId, activeTab]);
  const formatMoney = (value: number) => `${value.toLocaleString('vi-VN')}₫`;

  const formatChatTime = (value: string) => {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(parsedDate);
  };

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) {
      return 'Khác';
    }

    return categoryNameById.get(categoryId) || 'Khác';
  };

  const shopCategoryTabs = useMemo(() => {
    const tabMap = new Map<string, string>();

    products.forEach((product) => {
      const key = product.category_id || 'uncategorized';
      if (!tabMap.has(key)) {
        tabMap.set(key, getCategoryName(product.category_id));
      }
    });

    return [{ id: 'ALL', label: 'Tất cả sản phẩm' }, ...Array.from(tabMap.entries()).map(([id, label]) => ({ id, label }))];
  }, [products, categoryNameById]);

  const displayedShopProducts = useMemo(() => {
    if (shopCategoryFilter === 'ALL') {
      return products;
    }

    if (shopCategoryFilter === 'uncategorized') {
      return products.filter((product) => !product.category_id);
    }

    return products.filter((product) => product.category_id === shopCategoryFilter);
  }, [products, shopCategoryFilter]);

  useEffect(() => {
    const hasSelectedCategory = shopCategoryTabs.some((tab) => tab.id === shopCategoryFilter);
    if (!hasSelectedCategory) {
      setShopCategoryFilter('ALL');
    }
  }, [shopCategoryFilter, shopCategoryTabs]);

  const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':    return <Badge className="bg-yellow-50 text-yellow-800 border border-yellow-200">Chờ xác nhận</Badge>;
    case 'PICKUP':     return <Badge className="bg-blue-50 text-blue-800 border border-blue-200">Chờ lấy hàng</Badge>;
    case 'SHIPPING':   return <Badge className="bg-purple-50 text-purple-800 border border-purple-200">Đang giao</Badge>;
    case 'DELIVERED':  return <Badge className="bg-green-50 text-green-800 border border-green-200">Đã giao</Badge>;
    case 'CANCELLED':  return <Badge className="bg-red-50 text-red-800 border border-red-200">Đã hủy</Badge>;
    case 'AVAILABLE':  return <Badge className="bg-green-50 text-green-800 border border-green-200">Đang bán</Badge>;
    case 'OUT_OF_STOCK': return <Badge className="bg-red-50 text-red-800 border border-red-200">Hết hàng</Badge>;
    case 'DISCONTINUED': return <Badge className="bg-gray-50 text-gray-800 border border-gray-200">Ngừng bán</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};
  const loadProducts = async () => {
    if (!user) {
      return;
    }

    setProductsLoading(true);
    setProductsError(null);

    try {
      const sellerProducts = await getSellerProducts({
        userId: user?.id || '',
        token,
        storeId: user?.businessStoreId || user?.c2cStoreId || '',
        storeType: user?.role === 'business' ? 'B2C' : 'C2C',
      });
      setProducts(sellerProducts);
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : 'Không thể tải sản phẩm');
    } finally {
      setProductsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'products') {
      void loadProducts();
      void loadCategories();
    } 
  }, [activeTab]);

  

 
 

  

  useEffect(() => {
    if (activeTab !== 'customers' || !storeId) {
      setStoreConversations([]);
      setSelectedChatUserId(null);
      setInboxLoading(false);
      setInboxError(null);

      if (inboxSocketRef.current) {
        inboxSocketRef.current.disconnect();
        inboxSocketRef.current = null;
      }
      return;
    }

    setInboxLoading(true);
    setInboxError(null);

    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    inboxSocketRef.current = socket;

    const upsertConversation = (nextConversation: StoreConversation) => {
      setStoreConversations((previous) => {
        const filtered = previous.filter((conversation) => conversation.userId !== nextConversation.userId);
        const nextState = [nextConversation, ...filtered];
        return nextState.sort(
          (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        );
      });
    };

    socket.on('connect', () => {
      socket.emit('join_store_inbox', { storeId });
    });

    socket.on('connect_error', () => {
      setInboxError('Không thể kết nối hộp thư chat. Vui lòng thử lại sau.');
      setInboxLoading(false);
    });

    socket.on('store_conversations', (payload: StoreConversation[]) => {
      const normalized = Array.isArray(payload)
        ? payload
          .filter((conversation) => conversation?.userId && conversation?.storeId)
          .map((conversation) => ({
            ...conversation,
            customerName: conversation.customerName || 'Khách hàng',
          }))
          .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
        : [];

      setStoreConversations(normalized);
      setInboxLoading(false);
      setInboxError(null);

      if (normalized.length > 0) {
        setSelectedChatUserId((current) => current || normalized[0].userId);
      } else {
        setSelectedChatUserId(null);
      }
    });

    socket.on('store_conversation_updated', (payload: StoreConversation) => {
      if (!payload?.userId || !payload?.storeId) {
        return;
      }

      upsertConversation({
        ...payload,
        customerName: payload.customerName || 'Khách hàng',
      });
      setSelectedChatUserId((current) => current || payload.userId);
    });

    return () => {
      socket.disconnect();
      inboxSocketRef.current = null;
    };
  }, [activeTab, storeId]);

  useEffect(() => {
    if (activeTab !== 'reports') {
      return;
    }

    const loadSellerReport = async () => {
      try {
        setReportLoading(true);
        setReportError(null);
        const report = await getMySellerReport(reportPeriod, token);
        setSellerReport(report);
      } catch (error) {
        setReportError(error instanceof Error ? error.message : 'Không thể tải báo cáo doanh thu');
        setSellerReport(null);
      } finally {
        setReportLoading(false);
      }
    };

    void loadSellerReport();
  }, [activeTab, reportPeriod, token]);

  useEffect(() => {
    if (storeConversations.length === 0) {
      return;
    }

    const selectedStillExists = selectedChatUserId
      ? storeConversations.some((conversation) => conversation.userId === selectedChatUserId)
      : false;

    if (!selectedStillExists) {
      setSelectedChatUserId(storeConversations[0].userId);
    }
  }, [selectedChatUserId, storeConversations]);

  const selectedConversation = useMemo(
    () => storeConversations.find((conversation) => conversation.userId === selectedChatUserId) || null,
    [selectedChatUserId, storeConversations],
  );

  // const resetProductForm = () => {
  //   setEditingProduct(null);
  //   setProductVariants([{ color: '', size: '', price: 0, stock_quantity: 0 }]);
  //   setProductSpecifications([{ label: '', value: '' }]);
  //   setVariantUploadFiles([null]);
  //   setVariantImagePreviews(['']);
  //   setProductForm({
  //     name: '',
  //     category_id: '',
  //     description: '',
  //     price: 0,
  //     stock_quantity: 0,
  //     condition: user?.role === 'business' ? 'NEW' : 'USED',
  //     images: [],
  //     size: '',
  //     color: '',
  //     type: '',
  //     is_bulky: '',
  //   });
  // };
  const resetProductForm = () => {
    setProductForm({
      name: '',
      category_id: '',
      description: '',
      price: 0,
      stock_quantity: 0,
      condition: 'NEW',
      images: [],
      size: '',
      color: '',
      type: '',
      is_bulky: '',
    });
    setProductVariants([{ color: '', size: '', price: 0, stock_quantity: 0 }]);
    setProductSpecifications([{ label: '', value: '' }]);
    setProductImagePreviews([]);
    setVariantImagePreviews([]);
    setVariantUploadFiles([]);
    setEditingProduct(null);
    setIsModerationError(false);
  };

  const handleOpenCreate = () => {
    resetProductForm();
    setIsModerationError(false); // Reset lỗi AI khi mở form mới
    setShowProductForm(true);
  };
  
  // const handleOpenEdit = (product: Product) => {
  //   // 1. CHUẨN HÓA MẢNG ẢNH TỪ POSTGRES ({url1,url2})
  //   let parsedImages: string[] = [];
  //   if (product.images) {
  //     if (Array.isArray(product.images)) {
  //       parsedImages = product.images;
  //     } else if (typeof product.images === 'string') {
  //       let imgStr = (product.images as string).trim();
  //       if (imgStr.startsWith('{') && imgStr.endsWith('}')) {
  //         parsedImages = imgStr.slice(1, -1).split(',').map(url => url.trim().replace(/^"|"$/g, '')).filter(Boolean);
  //       } else {
  //         parsedImages = imgStr.split(',').map(url => url.trim()).filter(Boolean);
  //       }
  //     }
  //   }

  //   // 2. KHÔNG DÙNG PARSE DESCRIPTION NỮA - ĐỌC THẲNG TỪ CỘT VARIANTS CỦA DATABASE
  //   let safeVariants: any[] = [];
    
  //   // Nếu BE trả về cột variants độc lập (dạng JSON String hoặc Array)
  //   if ((product as any).variants) {
  //     if (typeof (product as any).variants === 'string') {
  //       try { safeVariants = JSON.parse((product as any).variants); } catch(e) { safeVariants = []; }
  //     } else if (Array.isArray((product as any).variants)) {
  //       safeVariants = (product as any).variants;
  //     }
  //   } 
  //   // Nếu BE chưa trả variants, thử fallback dùng hàm parse cũ của bạn
  //   else {
  //     const metadata = parseDescriptionMetadata(product.description || '');
  //     safeVariants = metadata.variants;
  //   }

  //   const initialVariants = safeVariants.length > 0 
  //     ? safeVariants 
  //     : [{ color: '', size: '', price: Number(product.price || 0), stock_quantity: Number(product.stock_quantity || 0) }];

  //   // 3. CHUẨN HÓA COLOR VÀ SIZE (Nếu cột độc lập rỗng, tự gom từ variants)
  //   let defaultColor = product.color || '';
  //   let defaultSize = product.size || '';
    
  //   if (!defaultColor && initialVariants.length > 0) {
  //     defaultColor = Array.from(new Set(initialVariants.map((v: any) => v.color).filter(Boolean))).join(', ');
  //   }
  //   if (!defaultSize && initialVariants.length > 0) {
  //     defaultSize = Array.from(new Set(initialVariants.map((v: any) => v.size).filter(Boolean))).join(', ');
  //   }

  //  // 4. Lọc bỏ chuỗi JSON (variants, specs) ra khỏi mô tả thuần túy
  // const cleanDescription = (product.description || '')
  // .replace(/VARIANTS_JSON:.*/s, '')
  // .replace(/SPECIFICATIONS_JSON:.*/s, '')
  // .trim();

  //   // 5. CẬP NHẬT ĐỒNG LOẠT VÀO STATE
  //   setEditingProduct(product);
  //   setProductVariants(initialVariants);
  //   setVariantUploadFiles(Array.from({ length: initialVariants.length }, () => null));

  //   setVariantImagePreviews(
  //     initialVariants.map((variant: any, index: number) => {
  //       if (variant.image_url) return getAbsoluteImageUrl(variant.image_url);
  //       return getAbsoluteImageUrl(parsedImages[index] || '');
  //     }),
  //   );

  //   setProductForm({
  //     name: product.name || '',
  //     category_id: product.category_id || '', 
  //     description: cleanDescription, 
  //     price: Number(product.price || 0),
  //     stock_quantity: Number(product.stock_quantity || 0),
  //     condition: product.condition || 'NEW',
  //     images: [],
  //     size: defaultSize, 
  //     color: defaultColor, 
  //     type: product.type || '',
  //     is_bulky: product.is_bulky || '',
  //   });

  //   setProductImagePreviews(parsedImages);
  //   setIsModerationError(false);
    
  //   // Mở Modal
  //   setTimeout(() => {
  //     setShowProductForm(true);
  //   }, 50);
  // };
 const handleOpenEdit = (product: Product) => {
    // 1. CHUẨN HÓA ẢNH TỪ POSTGRES (Giữ nguyên - Đã hoạt động tốt)
    let parsedImages: string[] = [];
    if (product.images) {
      if (Array.isArray(product.images)) {
        parsedImages = product.images;
      } else if (typeof product.images === 'string') {
        let imgStr = (product.images as string).trim();
        if (imgStr.startsWith('{') && imgStr.endsWith('}')) {
          parsedImages = imgStr.slice(1, -1).split(',').map(url => url.trim().replace(/^"|"$/g, '')).filter(Boolean);
        } else {
          parsedImages = imgStr.split(',').map(url => url.trim()).filter(Boolean);
        }
      }
    }

    // 2. CHUẨN HÓA VARIANTS (Đảm bảo lấy được Color/Size từ DB)
    let safeVariants: any[] = [];
    if ((product as any).variants) {
      if (typeof (product as any).variants === 'string') {
        try { safeVariants = JSON.parse((product as any).variants); } catch(e) { safeVariants = []; }
      } else if (Array.isArray((product as any).variants)) {
        safeVariants = (product as any).variants;
      }
    }
    
    const metadata = parseDescriptionMetadata(product.description || '');
    
    // Nếu DB không có cột variants, dùng hàm parse dự phòng
    if (safeVariants.length === 0) {
      safeVariants = metadata.variants || [];
    }

    const initialVariants = safeVariants.length > 0 
      ? safeVariants 
      : [{ color: '', size: '', price: Number(product.price || 0), stock_quantity: Number(product.stock_quantity || 0) }];

    const initialSpecifications = metadata.specifications && metadata.specifications.length > 0 
      ? metadata.specifications 
      : [{ label: '', value: '' }];

    // 3. XỬ LÝ COLOR & SIZE (Gom từ variants nếu cột độc lập trống)
    let defaultColor = product.color || '';
    let defaultSize = product.size || '';
    if (!defaultColor && initialVariants.length > 0) {
      defaultColor = Array.from(new Set(initialVariants.map((v: any) => v.color).filter(Boolean))).join(', ');
    }
    if (!defaultSize && initialVariants.length > 0) {
      defaultSize = Array.from(new Set(initialVariants.map((v: any) => v.size).filter(Boolean))).join(', ');
    }

    // 4. SỬA LỖI DANH MỤC
    const safeCategoryId = product.category_id || (product as any).category?.id || (product as any).category?._id || '';

    // 5. SỬA LỖI MÔ TẢ (Dùng phép cộng chuỗi để khung chat không ăn mất code)
    const variantRegex = new RegExp('<' + '!--variants:(.*?)--' + '>', 's');
    const specsRegex = new RegExp('<' + '!--specs:(.*?)--' + '>', 's');
    
    let cleanDescription = (product.description || '')
      .replace(variantRegex, '')
      .replace(specsRegex, '')
      .trim();
      
    if (!cleanDescription) {
      cleanDescription = metadata.plainDescription || '';
    }

    // 6. CẬP NHẬT ĐỒNG LOẠT VÀO STATE
    setEditingProduct(product);
    setProductVariants(initialVariants);
    setProductSpecifications(initialSpecifications);
    setVariantUploadFiles(Array.from({ length: initialVariants.length }, () => null));

    setVariantImagePreviews(
      initialVariants.map((variant: any, index: number) => {
        if (variant.image_url) return getAbsoluteImageUrl(variant.image_url);
        return getAbsoluteImageUrl(parsedImages[index] || '');
      })
    );

    setProductForm({
      name: product.name || '',
      category_id: safeCategoryId,
      description: cleanDescription,
      price: Number(product.price || 0),
      stock_quantity: Number(product.stock_quantity || 0),
      condition: product.condition || 'NEW',
      images: [],
      size: defaultSize,
      color: defaultColor,
      type: product.type || '',
      is_bulky: product.is_bulky || false,
    });

    setProductImagePreviews(parsedImages);
    setIsModerationError(false);
    
    setTimeout(() => {
      setShowProductForm(true);
    }, 50);
  };

  const handleSaveProduct = async () => {
  // Kiểm tra nếu chưa chọn danh mục hoặc danh mục là chuỗi rỗng
  if (!productForm.category_id || productForm.category_id.trim() === '') {
    toast.error("Vui lòng chọn Danh mục cho sản phẩm!");
    return; // Dừng hàm, không cho gửi API lên backend
  }

  try {
    // Tiếp tục logic build description và gọi API tạo sản phẩm của bạn...
    const finalDescription = buildDescriptionWithVariants(
      productForm.description,
      productVariants,
      productSpecifications
    );

    const submitData = {
      ...productForm,
      description: finalDescription,
      // Đảm bảo không dính mảng rỗng nếu không có variant
      price: Number(productForm.price),
      stock_quantity: Number(productForm.stock_quantity)
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, submitData);
      toast.success("Cập nhật sản phẩm thành công!");
    } else {
      await createProduct(submitData);
      toast.success("Thêm sản phẩm thành công!");
    }
    
    // Reset form và reload lại danh sách sản phẩm...
  } catch (error) {
    console.error(error);
    toast.error("Có lỗi xảy ra khi lưu sản phẩm!");
  }
};

const addVariant = () => {
    setProductVariants((prev) => [...prev, { color: '', size: '', price: 0, stock_quantity: 0 }]);
    setVariantUploadFiles((prev) => [...prev, null]);
    setVariantImagePreviews((prev) => [...prev, '']);
  };

  const updateVariant = (index: number, key: keyof ProductVariant, value: string | number | undefined) => {
    setProductVariants((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const removeVariant = (index: number) => {
    if (productVariants.length <= 1) return;
    setProductVariants((prev) => prev.filter((_, i) => i !== index));
    setVariantUploadFiles((prev) => prev.filter((_, i) => i !== index));
    setVariantImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantNumericInput = (index: number, key: 'price' | 'stock_quantity', value: string) => {
    const onlyDigits = value.replace(/\D/g, '');
    const normalized = onlyDigits.replace(/^0+(?=\d)/, '');
    updateVariant(index, key, normalized === '' ? 0 : Number(normalized));
  };
const handleDeleteProduct = async (product: Product) => {
  if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;
  
  try {
    await deleteProduct(product.id, token);
    toast.success("Xóa sản phẩm thành công!");
    await loadProducts(); // Tải lại danh sách
  } catch (error: any) {
    console.error(error);
    toast.error(error.message || "Lỗi khi xóa sản phẩm");
  }
};

const validateAndFormatVariants = (variants: any[]) => {
  return variants.map(v => ({
    color: v.color || '',
    size: v.size || '',
    price: Number(v.price || 0),
    stock_quantity: Number(v.stock_quantity || 0)
  }));
};
//  const handleSubmitProduct = async (event: React.FormEvent<HTMLFormElement>) => {
//   event.preventDefault();
//   setIsSubmitting(true);
//   try {
//     // 1. Trước khi append, dùng hàm buildDescriptionWithVariants để gộp data (gồm description, variants, specs)
//     const finalDescription = buildDescriptionWithVariants(
//       productForm.description,
//       productVariants,
//       productSpecifications
//     );

//     // Lấy color và size từ mảng variants (lấy biến thể đầu tiên làm mặc định)
//     const mainColor = productVariants.length > 0 ? productVariants[0].color : productForm.color;
//     const mainSize = productVariants.length > 0 ? productVariants[0].size : productForm.size;

//     const formData = new FormData();
    
//     // 2. Append các trường cơ bản từ productForm
//     formData.append('name', productForm.name);
//     formData.append('price', String(productForm.price));
//     formData.append('stock_quantity', String(productForm.stock_quantity));
//     formData.append('category_id', productForm.category_id);
//     formData.append('store_id', storeId || '');
//     formData.append('condition', productForm.condition);
//     formData.append('is_bulky', productForm.is_bulky ? 'true' : 'false');
//     formData.append('description', finalDescription); // Gửi description đã gộp biến thể
//     formData.append('color', mainColor || '');
//     formData.append('size', mainSize || '');

//     // 3. Append các trường biến thể vào FormData (Quan trọng)
//     formData.append('variants', JSON.stringify(productVariants));

//     productForm.images.forEach((file) => {
//       formData.append('images', file);
//     });

//     // 4. Append ảnh biến thể CÙNG KEY 'images'
//     variantUploadFiles.forEach((file) => {
//       if (file) {
//         formData.append('images', file);
//       }
//     });

//     // In ra console chi tiết FormData để dễ debug lỗi 400
//     console.log("--- SUBMIT PRODUCT FORM DATA ---");
//     console.log("store_id:", storeId);
//     console.log("category_id:", productForm.category_id);
//     formData.forEach((value, key) => {
//       if (value instanceof File) {
//         console.log(`[File] ${key}:`, value.name, `(${value.size} bytes)`);
//       } else {
//         console.log(`${key}:`, value);
//       }
//     });
//     console.log("--------------------------------");

//     // Gửi yêu cầu API
//     if (editingProduct) {
//       await updateProduct(editingProduct.id, formData as any, token);
//     } else {
//       await createProduct(formData as any, token);
//     }

//     toast.success('Lưu sản phẩm thành công!');
//     setShowProductForm(false);
//     await loadProducts();
//   } catch (error: any) {
//     // Lấy message thực sự từ Backend trả về để người dùng dễ quan sát
//     const backendErrorMsg = error.response?.data?.error || error.response?.data?.message;
//     console.error("Chi tiết lỗi từ Backend:", error.response?.data || error);
//     toast.error(backendErrorMsg || error.message || 'Lưu không thành công!');
//   } finally {
//     setIsSubmitting(false);
//   }
// };

const handleSubmitProduct = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  
  // KIỂM TRA BẮT BUỘC TRƯỚC KHI GỬI
  if (!productForm.category_id || productForm.category_id.trim() === '') {
    toast.error("Vui lòng chọn Danh mục cho sản phẩm!");
    return;
  }

  setIsSubmitting(true);
  try {
    // 1. Gộp dữ liệu mô tả và biến thể cấu trúc
    const finalDescription = buildDescriptionWithVariants(
      productForm.description || '',
      productVariants,
      productSpecifications
    );

    // Lấy biến thể đầu tiên làm mặc định cho color/size tổng thể
    const mainColor = productVariants.length > 0 && productVariants[0].color ? productVariants[0].color : productForm.color;
    const mainSize = productVariants.length > 0 && productVariants[0].size ? productVariants[0].size : productForm.size;

    const formData = new FormData();
    
    // 2. Append dữ liệu dạng chuỗi và số
    formData.append('name', productForm.name.trim());
    formData.append('price', String(productForm.price || 0));
    formData.append('stock_quantity', String(productForm.stock_quantity || 0));
    formData.append('category_id', productForm.category_id.trim()); // Đảm bảo ăn chắc ID danh mục
    formData.append('store_id', storeId || '');
    formData.append('condition', productForm.condition);
    formData.append('is_bulky', productForm.is_bulky ? 'true' : 'false');
    formData.append('description', finalDescription); // Gửi phần mô tả đã gộp metadata
    formData.append('color', mainColor || '');
    formData.append('size', mainSize || '');

    // 3. Ép kiểu JSON chuỗi cho mảng variants trước khi đẩy qua Form
    formData.append('variants', JSON.stringify(productVariants));

    // 4. Đẩy danh sách file ảnh chính
    if (productForm.images && productForm.images.length > 0) {
      productForm.images.forEach((file) => {
        formData.append('images', file);
      });
    }

    // 5. Đẩy danh sách file ảnh biến thể (nếu có)
    if (variantUploadFiles && variantUploadFiles.length > 0) {
      variantUploadFiles.forEach((file) => {
        if (file) {
          formData.append('images', file);
        }
      });
    }

    // Debug kiểm tra trực tiếp dữ liệu trước khi bắn API
    console.log("--- DỮ LIỆU ĐĂNG SẢN PHẨM GỬI LÊN ---");
    formData.forEach((value, key) => {
      console.log(`${key}:`, value);
    });

    // Gọi API xử lý
    if (editingProduct) {
      await updateProduct(editingProduct.id, formData as any, token);
      toast.success('Cập nhật sản phẩm thành công!');
    } else {
      await createProduct(formData as any, token);
      toast.success('Đăng bán sản phẩm thành công!');
    }

    setShowProductForm(false);
    resetProductForm();
    await loadProducts();
  } catch (error: any) {
    const backendErrorMsg = error.response?.data?.error || error.response?.data?.message;
    console.error("Chi tiết lỗi hệ thống:", error.response?.data || error);
    toast.error(backendErrorMsg || error.message || 'Lưu không thành công!');
  } finally {
    setIsSubmitting(false);
  }
};
  const removeSpecification = (index: number) => {
    setProductSpecifications((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, specIndex) => specIndex !== index);
    });
  };

  const getProductPriceLabel = (product: Product) => {
    const metadata = parseDescriptionMetadata(product.description);
    if (metadata.variants.length === 0) {
      return formatMoney(Number(product.price || 0));
    }

    const prices = metadata.variants.map((variant) => Number(variant.price || 0));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
      return formatMoney(minPrice);
    }

    return `${formatMoney(minPrice)} - ${formatMoney(maxPrice)}`;
  };

  // MỞ MODAL CÀI ĐẶT FLASH SALE
  const openFlashSaleModal = (product: any) => {
    setFlashSaleModal({
      isOpen: true,
      product: product,
      isFlashSale: product.is_flash_sale || false,
      price: product.flash_sale_price || '',
      stock: product.flash_sale_stock || '',
      loading: false,
    });
  };

  // LƯU CÀI ĐẶT FLASH SALE (GỌI API)
  // LƯU CÀI ĐẶT FLASH SALE (GỌI API)
  const handleSaveFlashSale = async () => {
    const { product, isFlashSale, price, stock } = flashSaleModal;

    if (isFlashSale && (!price || !stock)) {
      toast.error("Vui lòng nhập giá và số lượng khuyến mãi");
      return;
    }

    // THÊM ĐOẠN NÀY: Kiểm tra giá Flash Sale phải nhỏ hơn giá gốc
    if (isFlashSale && Number(price) >= Number(product.price)) {
      toast.error(`Giá Flash Sale phải thấp hơn giá gốc (${Number(product.price).toLocaleString('vi-VN')}đ)`);
      return; // Dừng lại, không gọi API
    }

    setFlashSaleModal(prev => ({ ...prev, loading: true }));

    try {
      await updateFlashSale(product.id, {
        is_flash_sale: isFlashSale,
        flash_sale_price: isFlashSale ? Number(price) : undefined,
        flash_sale_stock: isFlashSale ? Number(stock) : undefined,
      });

      toast.success("Cập nhật Flash Sale thành công");
      setFlashSaleModal(prev => ({ ...prev, isOpen: false }));

      // Tải lại danh sách sản phẩm để cập nhật UI
      await loadProducts();
    } catch (error: any) {
      // Bắt lỗi từ Backend trả về
      toast.error(error.message || "Lỗi khi cài đặt Flash Sale");
    } finally {
      setFlashSaleModal(prev => ({ ...prev, loading: false }));
    }
  };

  const canManageShop =
    user?.role === 'business'
      ? user?.storeStatus === 'APPROVED'
      : Boolean(user?.hasC2CStore || user?.c2cStoreId);
  
  if (!canManageShop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Chưa thể quản lý shop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-600">
            <p>
              Cửa hàng của bạn hiện ở trạng thái <span className="font-semibold">{user?.storeStatus || 'chưa xác định'}</span> nên chưa thể truy cập trang quản lý.
            </p>
            <p>Vui lòng chờ duyệt lại hoặc liên hệ quản trị viên để được hỗ trợ.</p>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/')}>Về trang chủ</Button>
              <Button variant="outline" onClick={handleLogout}>Đăng xuất</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col fixed h-screen z-40">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shrink-0">
              <Package className="size-5 text-white" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-semibold truncate" title={storeName}>{storeName}</h2>
              <p className="text-xs text-gray-500">{storeType}</p>
              <button
                type="button"
                onClick={() => {
                      setShowProductForm(false);
                      resetProductForm();
                         }}
                className="mt-1 text-xs text-red-500 hover:text-red-600"
              >
                Xem giao diện shop
              </button>
            </div>
          </div>
          <Badge className="bg-green-100 text-green-700 border-green-300">Đang hoạt động</Badge>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as DashboardTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${isActive
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-2">
          <Button onClick={() => navigate('/')} variant="outline" className="w-full">
            Về trang chủ
          </Button>
          <Button onClick={handleLogout} variant="ghost" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut className="size-4 mr-2" /> Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm sản phẩm, đơn hàng..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <NotificationBell viewAllPath="/seller/dashboard" />
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                  <div className="size-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium leading-none">{user?.username || 'Người dùng'}</p>
                    <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
                  </div>
                  <ChevronDown className="size-4 text-gray-400 ml-2" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          
{/* Overview Tab */}
{activeTab === 'overview' && !selectedOrderDetail && (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Tổng quan</h1>
      <p className="text-gray-500">Theo dõi tình hình kinh doanh của cửa hàng hôm nay</p>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { label: 'Doanh thu', value: formatMoney(overview?.revenue || 0), subValue: 'Tháng này', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        { label: 'Đơn hàng', value: overview?.totalOrders?.toLocaleString('vi-VN') || '0', subValue: 'Tổng đơn', icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
        { label: 'Sản phẩm', value: overview?.totalProducts?.toLocaleString('vi-VN') || '0', subValue: 'Đang bán', icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
        { label: 'Khách hàng', value: overview?.totalCustomers?.toLocaleString('vi-VN') || '0', subValue: 'Đã mua hàng', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
      ].map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className={`border ${stat.border} hover:shadow-lg transition-all duration-200`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-3 tracking-tighter">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.subValue}</p>
                </div>
                <div className={`p-3 rounded-2xl ${stat.bg}`}>
                  <Icon className={`size-9 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
 {/* DATE TYPE */}
<div>
  <p className="text-sm mb-1 text-gray-500">Lọc theo</p>
  <select
    value={dateFilterType}
    onChange={(e) => setDateFilterType(e.target.value as any)}
    className="border rounded-xl px-4 py-2"
  >
    <option value="day">Ngày</option>
    <option value="month">Tháng</option>
    <option value="year">Năm</option>
  </select>
</div>
<select
  value={dateFilterType}

  onChange={(e) => {

    const value =
      e.target.value as
      'day' | 'month' | 'year';

    setDateFilterType(value);

    const now =
      new Date();

    // DAY
    if (value === 'day') {

      setSelectedDate(
        now
          .toISOString()
          .split('T')[0]
      );
    }

    // MONTH
    if (value === 'month') {

      setSelectedDate(
        `${now.getFullYear()}-${String(
          now.getMonth() + 1
        ).padStart(2, '0')}`
      );
    }

    // YEAR
    if (value === 'year') {

      setSelectedDate(
        String(
          now.getFullYear()
        )
      );
    }
  }}

  className="border rounded-xl px-4 py-2"
></select>
{/* DATE */}
<div>
  <p className="text-sm mb-1 text-gray-500">
    {dateFilterType === 'day' ? 'Chọn ngày' : dateFilterType === 'month' ? 'Chọn tháng' : 'Chọn năm'}
  </p>
  <Input
    type={dateFilterType === 'day' ? 'date' : dateFilterType === 'month' ? 'month' : 'number'}
    value={selectedDate}
    onChange={(e) => setSelectedDate(e.target.value)}
    className="w-[180px]"
  />
</div>


    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-3">
        <CardHeader><CardTitle>Thống kê đơn hàng theo trạng thái</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={[
              { name: 'Chờ xác nhận', value: overview?.statusStats?.pending || 0, fill: '#f59e0b' },
              { name: 'Chờ lấy hàng', value: overview?.statusStats?.pickup || 0, fill: '#3b82f6' },
              { name: 'Đang giao', value: overview?.statusStats?.shipping || 0, fill: '#8b5cf6' },
              { name: 'Đã giao', value: overview?.statusStats?.delivered || 0, fill: '#10b981' },
              { name: 'Đã hủy', value: overview?.statusStats?.cancelled || 0, fill: '#ef4444' },
            ]}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Tỷ lệ đơn hàng</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Đã giao', value: overview?.statusStats?.delivered || 0, fill: '#10b981' },
                  { name: 'Đang giao', value: overview?.statusStats?.shipping || 0, fill: '#8b5cf6' },
                  { name: 'Chờ lấy hàng', value: overview?.statusStats?.pickup || 0, fill: '#3b82f6' },
                  { name: 'Chờ xác nhận', value: overview?.statusStats?.pending || 0, fill: '#f59e0b' },
                  { name: 'Đã hủy', value: overview?.statusStats?.cancelled || 0, fill: '#ef4444' },
                ]}
                cx="50%" cy="48%" innerRadius={75} outerRadius={115} dataKey="value"
              />
              <Tooltip formatter={(value: number, name: string, props: any) => {
                const total = (overview?.statusStats?.delivered || 0) + 
                             (overview?.statusStats?.shipping || 0) + 
                             (overview?.statusStats?.pickup || 0) + 
                             (overview?.statusStats?.pending || 0) + 
                             (overview?.statusStats?.cancelled || 0);
                const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return [`${value} đơn (${percent}%)`, name];
              }} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend không hiển thị số lượng */}
          <div className="grid grid-cols-2 gap-3 text-sm mt-6">
            {[
              { label: 'Đã giao', color: '#10b981' },
              { label: 'Đang giao', color: '#8b5cf6' },
              { label: 'Chờ lấy hàng', color: '#3b82f6' },
              { label: 'Chờ xác nhận', color: '#f59e0b' },
              { label: 'Đã hủy', color: '#ef4444' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Recent Orders */}
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Đơn hàng gần đây</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setActiveTab('orders')}>
          Quản lý tất cả đơn hàng
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b text-sm text-gray-500">
                <th className="py-4 px-5 text-left font-medium">Mã đơn</th>
                <th className="py-4 px-5 text-left font-medium">Khách hàng</th>
                <th className="py-4 px-5 text-left font-medium">Thời gian</th>
                <th className="py-4 px-5 text-left font-medium">Tổng tiền</th>
                <th className="py-4 px-5 text-left font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(recentOrders || []).slice(0, 8).map((order: any) => (
                <tr 
  key={order.id} 
  className="hover:bg-gray-50 transition-all cursor-pointer group"
  onClick={() => {
    setSelectedOrderDetail(order);
  }}
>
                  <td className="py-4 px-5 font-medium text-gray-900 group-hover:text-red-600">#{order.id}</td>
                  <td className="py-4 px-5 text-gray-700">{order.customer_name || 'Khách hàng'}</td>
                  <td className="py-4 px-5 text-gray-500 text-sm">
                    {new Date(order.created_at || order.createdAt).toLocaleString('vi-VN', { 
                      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
                    })}
                  </td>
                  <td className="py-4 px-5 font-semibold text-red-600">{formatMoney(order.total_amount || 0)}</td>
                  <td className="py-4 px-5">{getStatusBadge(order.order_status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
)}

{selectedOrderDetail && (
  <div className="max-w-5xl mx-auto space-y-6">

    <Button
      variant="outline"
      onClick={() => setSelectedOrderDetail(null)}
      className="mb-4"
    >
      ← Quay lại Tổng quan
    </Button>

    <Card className="rounded-2xl shadow-lg">
      <CardContent className="p-6">

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              Đơn hàng #{selectedOrderDetail.id}
            </h1>

            <p className="text-gray-500 mt-1">
              {new Date(
                selectedOrderDetail.createdAt ||
                selectedOrderDetail.created_at ||
                ''
              ).toLocaleString('vi-VN')}
            </p>
          </div>

          {getStatusBadge(selectedOrderDetail.order_status)}
        </div>

        {/* Sản phẩm */}
        <h2 className="font-semibold text-lg mb-4">
          Sản phẩm
        </h2>

        <div className="space-y-4">
          {selectedOrderDetail.items?.map((item: any) => (
            <div
              key={item.id}
              className="flex gap-5 border rounded-2xl p-5"
            >
              <img
                src={getAbsoluteImageUrl(
                  item.product?.images?.[0]
                )}
                className="w-28 h-28 object-cover rounded-xl border"
                alt={item.product?.name}
              />

              <div className="flex-1">

                <h3 className="font-semibold text-lg">
                  {item.product?.name}
                </h3>

                <div className="flex gap-3 mt-3 flex-wrap">

                  {item.color && (
                    <span className="px-4 py-1.5 bg-gray-100 rounded-full text-sm">
                      Màu: <b>{item.color}</b>
                    </span>
                  )}

                  {item.size && (
                    <span className="px-4 py-1.5 bg-gray-100 rounded-full text-sm">
                      Size: <b>{item.size}</b>
                    </span>
                  )}

                  {item.product?.is_bulky && (
                    <span className="px-4 py-1.5 bg-orange-100 text-orange-600 rounded-full text-sm font-semibold">
                      ⚠ Hàng cồng kềnh
                    </span>
                  )}

                </div>

                <p className="mt-4 text-sm text-gray-600">
                  Số lượng: <b>{item.quantity}</b>
                </p>

                {/* NOTE */}
                {item.note && (
                  <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                    <p className="text-sm font-semibold text-orange-700 mb-1">
                      Ghi chú
                    </p>

                    <p className="text-sm text-gray-700 leading-relaxed">
                      {item.note}
                    </p>
                  </div>
                )}

              </div>

              <div className="text-right">
                <p className="text-xl font-bold text-red-600">
                  {formatMoney(
                    item.price_at_buy * item.quantity
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div>
           <h3 className="font-semibold mb-3">
  Thông tin nhận hàng
</h3>

<div className="bg-gray-50 p-4 rounded-xl space-y-3">

  <p className="leading-relaxed">
    {selectedOrderDetail.shipping_address}
  </p>

  {(selectedOrderDetail.distance_km ||
    selectedOrderDetail.estimated_delivery_time) && (
    <div className="flex flex-wrap gap-3 pt-2">

      {selectedOrderDetail.distance_km && (
        <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
          📍 {selectedOrderDetail.distance_km.toFixed(1)} km
        </span>
      )}

      {selectedOrderDetail.estimated_delivery_time && (
        <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          🚚 {selectedOrderDetail.estimated_delivery_time}
        </span>
      )}

    </div>
  )}

</div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">
              Thanh toán
            </h3>

            <div className="bg-gray-50 p-4 rounded-xl space-y-3">

              <div className="flex justify-between">
                <span className="text-gray-600">
                  Phương thức
                </span>

                <b>
                  {selectedOrderDetail.payment_method}
                </b>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">
                  Trạng thái
                </span>

                <b>
                  {selectedOrderDetail.payment_status === 'PAID'
                    ? 'Đã thanh toán'
                    : 'Chưa thanh toán'}
                </b>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-semibold">
                <span>Tổng tiền</span>

                <span className="text-red-600">
                  {formatMoney(
                    selectedOrderDetail.total_amount
                  )}
                </span>
              </div>

            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)}
          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl mb-1">Sản phẩm</h1>
                  <p className="text-gray-500">Quản lý sản phẩm của cửa hàng</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setShowShopPreview(true)}>
                    Xem giao diện shop
                  </Button>
                  <Button className="bg-red-500 hover:bg-red-600" onClick={handleOpenCreate}>
                    <Plus className="size-4 mr-2" />
                    Thêm sản phẩm
                  </Button>
                </div>
              </div>

              {productsError && (
                <Card>
                  <CardContent className="p-4 text-sm text-red-600">{productsError}</CardContent>
                </Card>
              )}

              {showProductForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>{editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmitProduct}>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm text-gray-600">Tên sản phẩm</label>
                        <input
                          required
                          value={productForm.name}
                          onChange={(event) =>
                            setProductForm((prev) => ({ ...prev, name: event.target.value }))
                          }
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="Nhập tên sản phẩm"
                        />
                      </div>

                      {/* <div className="space-y-2 md:col-span-2">
                        <label className="text-sm text-gray-600">Danh mục</label>
                        <select
                          required
                         value={productForm.category_id || ''}
                          onChange={(event) =>
                            setProductForm((prev) => ({ ...prev, category_id: event.target.value }))
                          }
                          className="w-full px-3 py-2 border rounded-lg bg-white"
                        >
                          <option value="">Chọn danh mục</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div> */}
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm text-gray-600">Danh mục</label>
                        <select
                          required
                          value={productForm.category_id || ''}
                          onChange={(event) =>
                            setProductForm((prev) => ({ ...prev, category_id: event.target.value }))
                          }
                          className="w-full px-3 py-2 border rounded-lg bg-white"
                        >
                          <option value="">Chọn danh mục</option>
                          {categories.map((category) => (
                            /* Sửa chỗ key và value để bao quát cả id và _id */
                            <option key={category.id || (category as any)._id} value={category.id || (category as any)._id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-600">Biến thể (Màu sắc, Size(Loai), Giá, Tồn kho)</label>
                          <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                            + Thêm biến thể
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {productVariants.map((variant, index) => (
                            <div key={`variant-row-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                              <input
                                value={variant.color || ''}
                                onChange={(event) => updateVariant(index, 'color', event.target.value)}
                                className="md:col-span-2 px-3 py-2 border rounded-lg"
                                placeholder="Màu sắc"
                              />
                              <input
                              value={variant.size || ''}
                                onChange={(event) => updateVariant(index, 'size', event.target.value)}
                                className="md:col-span-2 px-3 py-2 border rounded-lg"
                                placeholder="Size"
                              />
                              <div className="md:col-span-3 flex items-center gap-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(event) =>
                                    handleVariantImageUpload(index, event.target.files?.[0] || null)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg"
                                />
                                {(variantImagePreviews[index] || variant.image_url) && (
                                  <img
                                    src={variantImagePreviews[index] || getAbsoluteImageUrl(variant.image_url)}
                                    alt="preview"
                                    className="size-10 rounded border object-cover"
                                  />
                                )}
                              </div>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={variant.price === 0 ? '' : String(variant.price)}
                                onChange={(event) =>
                                  handleVariantNumericInput(index, 'price', event.target.value)
                                }
                                className="md:col-span-2 px-3 py-2 border rounded-lg"
                                placeholder="Giá"
                              />
                              <input
                                type="text"
                                inputMode="numeric"
                                value={variant.stock_quantity === 0 ? '' : String(variant.stock_quantity)}
                                onChange={(event) =>
                                  handleVariantNumericInput(index, 'stock_quantity', event.target.value)
                                }
                                className="md:col-span-1 px-3 py-2 border rounded-lg"
                                placeholder="Tồn kho"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="md:col-span-2"
                                onClick={() => removeVariant(index)}
                              >
                                Xóa
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-600">Thông số kỹ thuật</label>
                          <Button type="button" variant="outline" size="sm" onClick={addSpecification}>
                            + Thêm thông số
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {productSpecifications.map((spec, index) => (
                            <div key={`spec-row-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                              <input
                                value={spec.label}
                                onChange={(event) => updateSpecification(index, 'label', event.target.value)}
                                className="md:col-span-4 px-3 py-2 border rounded-lg"
                                placeholder="Tên thông số (vd: RAM, Pin)"
                              />
                              <input
                                value={spec.value}
                                onChange={(event) => updateSpecification(index, 'value', event.target.value)}
                                className="md:col-span-6 px-3 py-2 border rounded-lg"
                                placeholder="Giá trị (vd: 8GB, 5000mAh)"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="md:col-span-2"
                                onClick={() => removeSpecification(index)}
                              >
                                Xóa
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div> */}

                      <div className="space-y-2">
                        <label className="text-sm text-gray-600">Tình trạng</label>
                        <select
                          value={productForm.condition}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              condition: event.target.value as ProductCondition,
                            }))
                          }
                          className="w-full px-3 py-2 border rounded-lg bg-white"
                        >
                          <option value="NEW">Mới</option>
                          <option value="USED">Đã qua sử dụng</option>
                        </select>
                      </div>
                      <div className="space-y-2 flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id="is_bulky"
                          checked={productForm.is_bulky}
                          onChange={(event) =>
                            setProductForm((prev) => ({ ...prev, is_bulky: event.target.checked }))
                          }
                          className="size-4 rounded text-red-500 focus:ring-red-400"
                        /> 
                        <label htmlFor="is_bulky" className="text-sm text-gray-600 select-none cursor-pointer font-medium">
                          Hàng cồng kềnh (is_bulky)
                        </label> 
                      </div> 

                      <div className="space-y-2">
  <label className="text-sm text-gray-600">Ảnh sản phẩm (tùy chọn)</label>
  <input
    type="file"
    accept="image/*"
    multiple
    onChange={(event) =>
      setProductForm((prev) => ({
        ...prev,
        // ĐÂY LÀ CHỖ ĐANG BỊ LỖI GHI ĐÈ ẢNH
        images: event.target.files ? Array.from(event.target.files) : [], 
      }))
    }
    className="w-full px-3 py-2 border rounded-lg"
  />
                        {productForm.images.length > 0 && (
                          // <div className="flex flex-wrap gap-2 pt-1">
                          //   {productImagePreviews.map((previewUrl, index) => (
                          //     <img
                          //       key={`preview-${index}`}
                          //       src={previewUrl}
                          //       alt={`preview-${index}`}
                          //       className="size-14 rounded border object-cover"
                          //     />
                          //   ))}
                          // </div>
                          <div className="grid grid-cols-3 gap-3 mt-3">
  {productImagePreviews.map((image, index) => (
    <div key={index}>
      <img
        src={
          image.startsWith('blob:')
            ? image
            : getAbsoluteImageUrl(image)
        }
        alt={`preview-${index}`}
        className="w-full h-24 object-cover rounded border"
      />
    </div>
  ))}
</div>
                        )}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-600">Mô tả</label>
                          {isModerationError && (
                            <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                              🤖 AI phát hiện nội dung vi phạm – vui lòng chỉnh sửa
                            </span>
                          )}
                        </div>
                        <textarea
                          rows={4}
                          value={productForm.description}
                          onChange={(event) => {
                            setProductForm((prev) => ({ ...prev, description: event.target.value }));
                            if (isModerationError) setIsModerationError(false); // Tắt cờ lỗi khi user sửa
                          }}
                          className={`w-full px-3 py-2 border rounded-lg transition-colors ${isModerationError
                            ? 'border-red-500 ring-2 ring-red-200 bg-red-50'
                            : 'border-gray-300 focus:border-red-400'
                            }`}
                          placeholder="Mô tả ngắn về sản phẩm"
                        />
                      </div>

                      <div className="md:col-span-2 flex gap-2 justify-end items-center">
                        {/* Badge AI Moderation – cho thấy tính năng đang hoạt động */}
                        <span className="text-xs text-gray-400 flex items-center gap-1 mr-auto">
                          🛡️ <span>Nội dung được kiểm duyệt bởi AI trước khi đăng</span>
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowProductForm(false);
                            resetProductForm();
                            setIsModerationError(false);
                          }}
                        >
                          Hủy
                        </Button>
                        <Button type="submit" className="bg-red-500 hover:bg-red-600" disabled={isSubmitting}>
                          {isSubmitting ? '🤖 AI đang kiểm duyệt...' : editingProduct ? 'Lưu thay đổi' : '🚀 Đăng Bán'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-6">
                  {productsLoading ? (
                    <p className="text-gray-500">Đang tải sản phẩm...</p>
                  ) : products.length === 0 ? (
                    <p className="text-gray-500">Chưa có sản phẩm nào. Hãy thêm sản phẩm đầu tiên.</p>
                  ) : (
                    <div className="space-y-4">
                      {products.map((product: any) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-all"
                        >
                          <img
                            src={getAbsoluteImageUrl(product.images?.[0]) || 'https://placehold.co/200x200?text=No+Image'}
                            alt={product.name}
                            className="size-16 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h3 className="font-medium mb-1 flex items-center gap-2">
                              {product.name}
                              {/* Hiển thị Nhãn nếu đang có Flash Sale */}
                              {product.is_flash_sale && (
                                <Badge className="bg-red-500 text-[10px] px-1 py-0 h-4">Flash Sale</Badge>
                              )}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Giá: <span className="text-gray-900 font-medium">{getProductPriceLabel(product)}</span></span>
                              <span>Kho: <span className="text-gray-900 font-medium">{product.stock_quantity}</span></span>
                              <span>Danh mục: <span className="text-gray-900 font-medium">{getCategoryName(product.category_id)}</span></span>
                            </div>
                            {(product.size || product.color || product.type || product.is_bulky) && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {product.size && <Badge variant="secondary" className="text-[11px] bg-gray-100">Size: {product.size}</Badge>}
                                {product.color && <Badge variant="secondary" className="text-[11px] bg-gray-100">Màu: {product.color}</Badge>}
                                {product.type && <Badge variant="secondary" className="text-[11px] bg-gray-100">Loại: {product.type}</Badge>}
                                {product.is_bulky && <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] hover:bg-amber-100">Cồng kềnh</Badge>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(product.status)}

                            {/* NÚT THÊM/SỬA FLASH SALE */}
                            <Button
                              variant={product.is_flash_sale ? "default" : "outline"}
                              size="sm"
                              className={product.is_flash_sale ? "bg-red-500 hover:bg-red-600" : "text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-500"}
                              onClick={() => openFlashSaleModal(product)}
                              title={product.is_flash_sale ? "Sửa Flash Sale" : "Cài đặt Flash Sale"}
                            >
                              <Zap className="size-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/product/${product.id}`)}
                              title="Xem sản phẩm"
                            >
                              <Eye className="size-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(product)}>
                              <Edit className="size-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product)}>
                              <Trash2 className="size-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {showShopPreview && (
                <div className="fixed inset-0 z-50 bg-black/50 p-4">
                  <div className="mx-auto h-full max-w-6xl overflow-auto rounded-xl bg-white shadow-xl">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-3">
                      <div>
                        <h3 className="text-lg font-semibold">Giao diện Shop</h3>
                        <p className="text-sm text-gray-500">Xem trước trang shop theo kiểu bạn mong muốn</p>
                      </div>
                      <Button variant="outline" onClick={() => setShowShopPreview(false)}>Đóng</Button>
                    </div>

                    <div className="space-y-6 p-5">
                      <div className="rounded-xl border bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 px-5 py-4 text-white">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xl font-semibold">{storeName}</p>
                              <p className="text-sm text-white/80">{storeType}</p>
                            </div>
                            <div className="text-right text-sm">
                              <p>Sản phẩm: <span className="font-semibold">{products.length}</span></p>
                              <p>Đang bán: <span className="font-semibold">{products.filter((item) => item.status === 'AVAILABLE').length}</span></p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t bg-white px-3 py-2">
                          <div className="flex gap-2 overflow-x-auto">
                            {shopCategoryTabs.map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setShopCategoryFilter(tab.id)}
                                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition-all ${shopCategoryFilter === tab.id
                                  ? 'border-red-500 bg-red-50 text-red-600'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-lg font-medium text-gray-800">Gợi ý cho bạn</p>
                          <p className="text-sm text-red-500">{displayedShopProducts.length} sản phẩm</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {displayedShopProducts.map((product) => (
                            <div
                              key={product.id}
                              className="overflow-hidden rounded-lg border bg-white transition-all hover:-translate-y-0.5 hover:shadow-md"
                            >
                              <button
                                type="button"
                                className="w-full"
                                onClick={() => navigate(`/product/${product.id}`)}
                              >
                                <img
                                  src={getAbsoluteImageUrl(product.images?.[0]) || 'https://placehold.co/400x400?text=No+Image'}
                                  alt={product.name}
                                  className="h-48 w-full object-cover"
                                />
                              </button>
                              <div className="p-3">
                                <p className="line-clamp-2 min-h-12 text-sm text-gray-800">{product.name}</p>
                                <p className="mt-1 text-lg font-semibold text-red-500">{getProductPriceLabel(product)}</p>
                                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                                  <span>{getCategoryName(product.category_id)}</span>
                                  <span>Kho: {product.stock_quantity}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
  <StoreOrdersPage />
)}

          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl mb-1">Khách hàng</h1>
                <p className="text-gray-500">Kiểm tra tin nhắn khách hàng và phản hồi theo thời gian thực</p>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] min-h-[560px]">
                    <div className="border-r bg-slate-50/70">
                      <div className="px-4 py-3 border-b bg-white">
                        <p className="font-medium">Hộp thư khách hàng</p>
                        <p className="text-xs text-gray-500 mt-1">{storeConversations.length} cuộc trò chuyện</p>
                      </div>

                      <div className="max-h-[560px] overflow-y-auto">
                        {inboxLoading && (
                          <p className="px-4 py-5 text-sm text-gray-500">Đang tải hội thoại...</p>
                        )}

                        {!inboxLoading && inboxError && (
                          <p className="px-4 py-5 text-sm text-red-600">{inboxError}</p>
                        )}

                        {!inboxLoading && !inboxError && storeConversations.length === 0 && (
                          <div className="px-4 py-8 text-center text-sm text-gray-500">
                            <MessageCircle className="size-5 mx-auto mb-2 text-gray-400" />
                            Chưa có tin nhắn từ khách hàng.
                          </div>
                        )}

                        {!inboxLoading &&
                          !inboxError &&
                          storeConversations.map((conversation) => {
                            const isSelected = selectedConversation?.userId === conversation.userId;

                            return (
                              <button
                                key={conversation.userId}
                                type="button"
                                onClick={() => setSelectedChatUserId(conversation.userId)}
                                className={`w-full text-left px-4 py-3 border-b transition-colors ${isSelected ? 'bg-red-50 border-l-4 border-l-red-500' : 'hover:bg-white'
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-medium text-sm text-gray-800 truncate">{conversation.customerName || 'Khách hàng'}</p>
                                  <span className="text-[11px] text-gray-500 whitespace-nowrap">
                                    {formatChatTime(conversation.updatedAt)}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-600 line-clamp-2">{conversation.lastMessage}</p>
                                {conversation.unreadCount > 0 && (
                                  <Badge className="mt-2 bg-red-100 text-red-700 border-red-200">
                                    {conversation.unreadCount} tin nhắn mới
                                  </Badge>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    <div className="p-4 bg-white">
                      {selectedConversation && storeId ? (
                        <>
                          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-sm font-medium text-slate-800">Đang trò chuyện với {selectedConversation.customerName || selectedConversation.userId}</p>
                            <p className="text-xs text-slate-500 mt-1">Tin nhắn mới nhất: {formatChatTime(selectedConversation.updatedAt)}</p>
                          </div>
                          <ChatBox
                            userId={selectedConversation.userId}
                            storeId={storeId}
                            currentUserRole="STORE"
                            layout="embedded"
                          />
                        </>
                      ) : (
                        <div className="h-full min-h-[520px] grid place-items-center rounded-xl border border-dashed border-slate-200 text-sm text-gray-500">
                          Chọn một cuộc trò chuyện để bắt đầu phản hồi khách hàng.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl mb-1">Báo cáo doanh thu</h1>
                <p className="text-gray-500">Biểu đồ doanh thu, chi phí, phí trả hàng và thu nhập ròng của shop</p>
              </div>

              <Card>
                <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Kỳ báo cáo</p>
                    <p className="text-xs text-gray-400 mt-1">Dữ liệu được tính theo đơn hàng hợp lệ của shop</p>
                  </div>
                  <select
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value as SellerReportPeriod)}
                    className="rounded-md border border-gray-200 px-3 py-2 text-sm min-w-[180px]"
                  >
                    <option value="date">Trong ngày</option>
                    <option value="month">Trong tháng</option>
                    <option value="quarter">Trong quý</option>
                    <option value="year">Trong năm</option>
                  </select>
                </CardContent>
              </Card>

              {reportError && (
                <Card>
                  <CardContent className="p-6 text-sm text-red-600">{reportError}</CardContent>
                </Card>
              )}

              {reportLoading && (
                <Card>
                  <CardContent className="p-6 text-sm text-gray-500">Đang tải báo cáo doanh thu...</CardContent>
                </Card>
              )}

              {!reportLoading && !reportError && sellerReport && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-5">
                        <p className="text-sm text-gray-500">Doanh thu</p>
                        <p className="text-xl font-semibold text-blue-600 mt-1">{formatMoney(sellerReport.summary.revenue)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-5">
                        <p className="text-sm text-gray-500">Chi phí sàn</p>
                        <p className="text-xl font-semibold text-orange-600 mt-1">{formatMoney(sellerReport.summary.platformCost)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-5">
                        <p className="text-sm text-gray-500">Phí trả hàng</p>
                        <p className="text-xl font-semibold text-rose-600 mt-1">{formatMoney(sellerReport.summary.returnFee)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-5">
                        <p className="text-sm text-gray-500">Thu nhập ròng</p>
                        <p className="text-xl font-semibold text-emerald-600 mt-1">{formatMoney(sellerReport.summary.netIncome)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Biểu đồ doanh thu - chi phí - thu nhập</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {sellerReport.timeline.length === 0 ? (
                        <p className="text-sm text-gray-500">Chưa có đơn hàng trong kỳ để hiển thị biểu đồ.</p>
                      ) : (
                        sellerReport.timeline.map((item) => {
                          const maxValue = Math.max(item.revenue, item.cost, item.income, 1);

                          return (
                            <div key={item.label} className="rounded-lg border border-gray-200 p-4 space-y-3">
                              <p className="text-sm font-medium text-gray-700">{item.label}</p>

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>Doanh thu</span>
                                  <span>{formatMoney(item.revenue)}</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-blue-100 overflow-hidden">
                                  <div className="h-full bg-blue-500" style={{ width: `${(item.revenue / maxValue) * 100}%` }} />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>Chi phí</span>
                                  <span>{formatMoney(item.cost)}</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-orange-100 overflow-hidden">
                                  <div className="h-full bg-orange-500" style={{ width: `${(item.cost / maxValue) * 100}%` }} />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>Thu nhập</span>
                                  <span>{formatMoney(item.income)}</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-emerald-100 overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${(item.income / maxValue) * 100}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>

                  {/* Chi tiết phí và số đơn - Đã cân chỉnh đẹp */}
<Card>
  <CardHeader>
    <CardTitle>Chi tiết phí và số đơn</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white border rounded-2xl p-6 text-center hover:shadow-md transition-all">
        <p className="text-sm text-gray-500 mb-2">Phí cố định</p>
        <p className="text-3xl font-bold text-gray-800">
          {formatMoney(sellerReport?.summary?.fixedFee || 0)}
        </p>
      </div>

      <div className="bg-white border rounded-2xl p-6 text-center hover:shadow-md transition-all">
        <p className="text-sm text-gray-500 mb-2">Phí vận chuyển</p>
        <p className="text-3xl font-bold text-blue-600">
          {formatMoney(sellerReport?.summary?.shippingFee || 0)}
        </p>
      </div>

      <div className="bg-white border rounded-2xl p-6 text-center hover:shadow-md transition-all">
        <p className="text-sm text-gray-500 mb-2">Phí thanh toán</p>
        <p className="text-3xl font-bold text-orange-600">
          {formatMoney(sellerReport?.summary?.paymentFee || 0)}
        </p>
      </div>

      <div className="bg-white border rounded-2xl p-6 text-center hover:shadow-md transition-all">
        <p className="text-sm text-gray-500 mb-2">Phí dịch vụ</p>
        <p className="text-3xl font-bold text-purple-600">
          {formatMoney(sellerReport?.summary?.serviceFee || 0)}
        </p>
      </div>

      {/* Số đơn - chiếm full width dưới cùng */}
      <div className="lg:col-span-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 rounded-2xl p-6 mt-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Tổng số đơn hàng được tính</p>
            <p className="text-4xl font-bold text-red-600 mt-1">
              {sellerReport?.orderCount?.toLocaleString('vi-VN') || '0'}
            </p>
          </div>
          <div className="text-5xl opacity-20">
            📦
          </div>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
                </>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl mb-1">Cài đặt</h1>
                {activeTab === 'settings' && (
                  <StoreSettingsPage />
                )}
              </div>

              <Card>
                <CardContent className="p-12 text-center">
                  <div className="size-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="size-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Tính năng này đang được phát triển</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* THÊM MODAL ĐỂ CÀI ĐẶT FLASH SALE */}
      {flashSaleModal.isOpen && flashSaleModal.product && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-5 shadow-2xl">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Zap className="size-6 text-red-500 fill-red-500" /> Cài đặt Flash Sale
              </h2>
              <p className="text-sm text-gray-500 mt-1 line-clamp-1">{flashSaleModal.product.name}</p>
              <p className="text-sm font-medium mt-1">Giá gốc: {Number(flashSaleModal.product.price || 0).toLocaleString('vi-VN')}₫</p>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
              <input
                type="checkbox"
                id="flashSaleToggle"
                checked={flashSaleModal.isFlashSale}
                onChange={(e) => setFlashSaleModal(prev => ({ ...prev, isFlashSale: e.target.checked }))}
                className="size-5 rounded border-gray-300 text-red-500 focus:ring-red-500"
              />
              <label htmlFor="flashSaleToggle" className="font-medium cursor-pointer">Bật Flash Sale cho sản phẩm này</label>
            </div>

            {flashSaleModal.isFlashSale && (
              <div className="space-y-4 pt-2 border-t">
                <div>
                  <label className="text-sm font-medium mb-1 block">Giá khuyến mãi (VNĐ) <span className="text-red-500">*</span></label>
                  <Input
                    type="number"
                    value={flashSaleModal.price}
                    onChange={(e) => setFlashSaleModal(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="Ví dụ: 50000"
                    className="focus-visible:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Số lượng khuyến mãi <span className="text-red-500">*</span></label>
                  <Input
                    type="number"
                    value={flashSaleModal.stock}
                    onChange={(e) => setFlashSaleModal(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="Ví dụ: 100"
                    className="focus-visible:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Số lượng này dùng để hiển thị thanh "Đã bán %" ngoài trang chủ.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setFlashSaleModal(prev => ({ ...prev, isOpen: false }))}>Hủy bỏ</Button>
              <Button
                onClick={handleSaveFlashSale}
                disabled={flashSaleModal.loading}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {flashSaleModal.loading ? "Đang lưu..." : "Lưu cài đặt"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}