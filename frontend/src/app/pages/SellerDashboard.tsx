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
import { Input } from '../components/ui/input'; // Import Input UI
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');

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
    { id: 'orders', label: 'Đơn hàng', icon: ShoppingCart },
    { id: 'customers', label: 'Khách hàng', icon: Users },
    { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  const stats = [
    { label: 'Doanh thu', value: '45,250,000₫', change: '+12.5%', isPositive: true, icon: DollarSign },
    { label: 'Đơn hàng', value: '156', change: '+8.2%', isPositive: true, icon: ShoppingCart },
    { label: 'Sản phẩm', value: '42', change: '+3', isPositive: true, icon: Package },
    { label: 'Lượt xem', value: '2,340', change: '-2.4%', isPositive: false, icon: Eye },
  ];

  const recentOrders = [
    { id: '#ORD-001', customer: 'Nguyễn Văn A', total: '450,000₫', status: 'pending', date: '02/04/2025' },
    { id: '#ORD-002', customer: 'Trần Thị B', total: '320,000₫', status: 'processing', date: '02/04/2025' },
    { id: '#ORD-003', customer: 'Lê Văn C', total: '890,000₫', status: 'completed', date: '01/04/2025' },
    { id: '#ORD-004', customer: 'Phạm Thị D', total: '150,000₫', status: 'completed', date: '01/04/2025' },
    { id: '#ORD-005', customer: 'Hoàng Văn E', total: '670,000₫', status: 'pending', date: '31/03/2025' },
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
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Chờ xử lý</Badge>;
      case 'processing': return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Đang xử lý</Badge>;
      case 'completed': return <Badge className="bg-green-100 text-green-700 border-green-300">Hoàn thành</Badge>;
      case 'active': return <Badge className="bg-green-100 text-green-700 border-green-300">Đang bán</Badge>;
      case 'out-of-stock': return <Badge className="bg-red-100 text-red-700 border-red-300">Hết hàng</Badge>;
      case 'AVAILABLE': return <Badge className="bg-green-100 text-green-700 border-green-300">Đang bán</Badge>;
      case 'OUT_OF_STOCK': return <Badge className="bg-red-100 text-red-700 border-red-300">Hết hàng</Badge>;
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
    } else if (activeTab === 'orders') {
      void loadOrders();
    }
  }, [activeTab]);

  const loadOrders = async () => {
    if (!storeId) return;
    setOrdersLoading(true);
    try {
      const data = await orderAPI.getStoreOrders(storeId);
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await orderAPI.updateStatus(orderId, status);
      toast.success(`Cập nhật trạng thái thành ${status} thành công`);
      void loadOrders();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) return;
    try {
      await orderAPI.cancelOrder(orderId);
      toast.success("Đã hủy đơn hàng");
      void loadOrders();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o =>
      o.id.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      o.shipping_address.toLowerCase().includes(orderSearchTerm.toLowerCase())
    );
  }, [orders, orderSearchTerm]);

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

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductVariants([{ color: '', size: '', price: 0, stock_quantity: 0 }]);
    setProductSpecifications([{ label: '', value: '' }]);
    setVariantUploadFiles([null]);
    setVariantImagePreviews(['']);
    setProductForm({
      name: '',
      category_id: '',
      description: '',
      price: 0,
      stock_quantity: 0,
      condition: user?.role === 'business' ? 'NEW' : 'USED',
      images: [],
    });
  };

  const handleOpenCreate = () => {
    resetProductForm();
    setIsModerationError(false); // Reset lỗi AI khi mở form mới
    setShowProductForm(true);
  };

  const handleOpenEdit = (product: Product) => {
    const metadata = parseDescriptionMetadata(product.description);
    const initialVariants =
      metadata.variants.length > 0
        ? metadata.variants
        : [{ color: '', size: '', price: Number(product.price || 0), stock_quantity: Number(product.stock_quantity || 0) }];
    const initialSpecifications =
      metadata.specifications.length > 0 ? metadata.specifications : [{ label: '', value: '' }];

    setEditingProduct(product);
    setProductVariants(initialVariants);
    setProductSpecifications(initialSpecifications);
    setVariantUploadFiles(Array.from({ length: initialVariants.length }, () => null));
    setVariantImagePreviews(
      initialVariants.map((variant) => {
        if (variant.image_url) {
          return variant.image_url;
        }

        if (
          typeof variant.image_index === 'number' &&
          Number.isInteger(variant.image_index) &&
          variant.image_index >= 0
        ) {
          return product.images?.[variant.image_index] || '';
        }

        return '';
      }),
    );
    setProductForm({
      name: product.name,
      category_id: product.category_id || '',
      description: metadata.plainDescription,
      price: Number(product.price || 0),
      stock_quantity: Number(product.stock_quantity || 0),
      condition: product.condition,
      images: [],
    });
    setIsModerationError(false); // Reset lỗi AI khi mở chỉnh sửa
    setShowProductForm(true);
  };

  const handleSubmitProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    const resolvedStoreId = storeId;

    if (!resolvedStoreId) {
      setProductsError('Không tìm thấy cửa hàng để quản lý sản phẩm. Hãy kích hoạt shop trước.');
      return;
    }

    if (!productForm.category_id) {
      setProductsError('Vui lòng chọn danh mục cho sản phẩm.');
      return;
    }

    setIsSubmitting(true);
    setProductsError(null);
    setIsModerationError(false); // Reset trạng thái lỗi AI trước mỗi lần submit

    try {
      const uploadedImages: File[] = [...productForm.images];
      const normalizedVariants = productVariants
        .map((variant, index) => ({ variant, index }))
        .filter(({ variant }) => variant.color.trim() && variant.size.trim())
        .map(({ variant, index }) => {
          const uploadedVariantFile = variantUploadFiles[index];
          const imageIndex = uploadedVariantFile ? uploadedImages.push(uploadedVariantFile) - 1 : undefined;

          const validImageUrl =
            variant.image_url &&
              !variant.image_url.startsWith('data:') &&
              (variant.image_url.startsWith('http://') ||
                variant.image_url.startsWith('https://') ||
                variant.image_url.startsWith('/uploads/'))
              ? variant.image_url.trim()
              : undefined;

          return {
            color: variant.color.trim(),
            size: variant.size.trim(),
            price: Number(variant.price),
            stock_quantity: Number(variant.stock_quantity || 0),
            image_index: imageIndex,
            image_url: validImageUrl,
          };
        })
        .filter((variant) => Number.isFinite(variant.price) && variant.price >= 0);

      if (normalizedVariants.length === 0) {
        throw new Error('Vui lòng thêm ít nhất 1 biến thể có màu sắc, size và giá hợp lệ.');
      }

      const lowestPrice = Math.min(...normalizedVariants.map((variant) => variant.price));
      const totalStock = normalizedVariants.reduce(
        (sum, variant) => sum + Math.max(0, Number(variant.stock_quantity || 0)),
        0,
      );
      const normalizedSpecifications = productSpecifications
        .map((spec) => ({
          label: spec.label.trim(),
          value: spec.value.trim(),
        }))
        .filter((spec) => spec.label && spec.value);

      const payload = {
        name: productForm.name.trim(),
        category_id: productForm.category_id,
        description: buildDescriptionWithVariants(
          productForm.description.trim(),
          normalizedVariants,
          normalizedSpecifications,
        ),
        price: lowestPrice,
        stock_quantity: totalStock,
        condition: productForm.condition,
        store_id: resolvedStoreId,
        images: uploadedImages,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload, token);
      } else {
        await createProduct(payload, token);
      }

      // ✅ Thành công - đóng form và reload
      setShowProductForm(false);
      resetProductForm();
      toast.success('🎉 Thêm sản phẩm thành công! Sản phẩm đã được đăng bán.');
      await loadProducts();
    } catch (error: any) {
      // 🤖 Kiểm tra xem có phải lỗi từ AI Moderation không (HTTP 403)
      const isModerationBlocked =
        error?.status === 403 ||
        error?.statusCode === 403 ||
        error?.message?.includes('vi phạm') ||
        error?.message?.includes('cấm');

      if (isModerationBlocked) {
        // Bật cờ để viền đỏ textarea mô tả
        setIsModerationError(true);
        // Hiển thị toast lỗi đỏ nổi bật
        toast.error(
          '🚫 Nội dung vi phạm: Sản phẩm của bạn chứa từ ngữ vi phạm tiêu chuẩn cộng đồng hoặc hàng hóa cấm kinh doanh. Vui lòng chỉnh sửa lại tên và mô tả.',
          { duration: 6000 }
        );
        setProductsError('🤖 AI phát hiện nội dung vi phạm. Vui lòng chỉnh sửa tên và mô tả sản phẩm.');
      } else {
        setIsModerationError(false);
        setProductsError(error instanceof Error ? error.message : 'Lưu sản phẩm thất bại');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Xóa sản phẩm "${product.name}"?`)) {
      return;
    }

    setProductsError(null);
    try {
      await deleteProduct(product.id, token);
      await loadProducts();
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : 'Xóa sản phẩm thất bại');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const updateVariant = (
    index: number,
    key: keyof ProductVariant,
    value: string | number | undefined,
  ) => {
    setProductVariants((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [key]: value,
      };
      return next;
    });
  };

  const addVariant = () => {
    setProductVariants((prev) => [...prev, { color: '', size: '', price: 0, stock_quantity: 0 }]);
    setVariantUploadFiles((prev) => [...prev, null]);
    setVariantImagePreviews((prev) => [...prev, '']);
  };

  const handleVariantNumericInput = (
    index: number,
    key: 'price' | 'stock_quantity',
    value: string,
  ) => {
    const onlyDigits = value.replace(/\D/g, '');
    const normalized = onlyDigits.replace(/^0+(?=\d)/, '');
    updateVariant(index, key, normalized === '' ? 0 : Number(normalized));
  };

  const removeVariant = (index: number) => {
    setProductVariants((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, variantIndex) => variantIndex !== index);
    });

    setVariantUploadFiles((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, variantIndex) => variantIndex !== index);
    });

    setVariantImagePreviews((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, variantIndex) => variantIndex !== index);
    });
  };

  const updateSpecification = (
    index: number,
    key: keyof ProductSpecification,
    value: string,
  ) => {
    setProductSpecifications((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [key]: value,
      };
      return next;
    });
  };

  const addSpecification = () => {
    setProductSpecifications((prev) => [...prev, { label: '', value: '' }]);
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
              Cửa hàng của bạn hiện ở trạng thái <span className="font-semibold">{user.storeStatus || 'chưa xác định'}</span> nên chưa thể truy cập trang quản lý.
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
                onClick={() => setShowShopPreview(true)}
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
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl mb-1">Tổng quan</h1>
                <p className="text-gray-500">Theo dõi hiệu suất kinh doanh của bạn</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={stat.label}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-gray-500">{stat.label}</p>
                          <Icon className="size-5 text-gray-400" />
                        </div>
                        <p className="text-2xl mb-1">{stat.value}</p>
                        <div className="flex items-center gap-1">
                          {stat.isPositive ? (
                            <ArrowUpRight className="size-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="size-4 text-red-600" />
                          )}
                          <span
                            className={`text-sm ${stat.isPositive ? 'text-green-600' : 'text-red-600'
                              }`}
                          >
                            {stat.change}
                          </span>
                          <span className="text-sm text-gray-500">so với tháng trước</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Recent Orders */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Đơn hàng gần đây</CardTitle>
                  <Button variant="outline" size="sm">
                    Xem tất cả
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Mã đơn</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Khách hàng</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ngày</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tổng tiền</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => (
                          <tr key={order.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{order.id}</td>
                            <td className="py-3 px-4">{order.customer}</td>
                            <td className="py-3 px-4 text-gray-500">{order.date}</td>
                            <td className="py-3 px-4 font-medium">{order.total}</td>
                            <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm text-gray-600">Danh mục</label>
                        <select
                          required
                          value={productForm.category_id}
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
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-600">Biến thể (Màu sắc, Size, Giá, Tồn kho)</label>
                          <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                            + Thêm biến thể
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {productVariants.map((variant, index) => (
                            <div key={`variant-row-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                              <input
                                value={variant.color}
                                onChange={(event) => updateVariant(index, 'color', event.target.value)}
                                className="md:col-span-2 px-3 py-2 border rounded-lg"
                                placeholder="Màu sắc"
                              />
                              <input
                                value={variant.size}
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
                                    src={variantImagePreviews[index] || variant.image_url}
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

                      <div className="space-y-2 md:col-span-2">
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
                      </div>

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

                      <div className="space-y-2">
                        <label className="text-sm text-gray-600">Ảnh sản phẩm (tùy chọn)</label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              images: event.target.files ? Array.from(event.target.files) : [],
                            }))
                          }
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                        {productForm.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {productImagePreviews.map((previewUrl, index) => (
                              <img
                                key={`preview-${index}`}
                                src={previewUrl}
                                alt={`preview-${index}`}
                                className="size-14 rounded border object-cover"
                              />
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
                            src={product.images?.[0] || 'https://placehold.co/200x200?text=No+Image'}
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
                                  src={product.images?.[0] || 'https://placehold.co/400x400?text=No+Image'}
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
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
                  <p className="text-gray-500">Bạn có tổng cộng {orders.length} đơn hàng</p>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm mã đơn, địa chỉ..."
                    className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-red-500 transition-all outline-none"
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {ordersLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin size-10 border-4 border-red-500 border-t-transparent rounded-full" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <Card className="py-20">
                  <CardContent className="flex flex-col items-center justify-center">
                    <div className="size-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <ShoppingCart className="size-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Không tìm thấy đơn hàng</h3>
                    <p className="text-gray-500 mt-1">Shop của bạn hiện chưa có đơn hàng nào.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                      <div className="bg-gray-50/80 px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</span>
                          <Separator orientation="vertical" className="h-4" />
                          <span className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString('vi-VN')}</span>
                          {getStatusBadge(order.order_status)}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500">Thanh toán: <span className="font-medium text-gray-900">{order.payment_method}</span></span>
                          <Badge variant={order.payment_status === 'PAID' ? 'default' : 'outline'} className={order.payment_status === 'PAID' ? 'bg-green-500 text-white border-transparent' : ''}>
                            {order.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row gap-6">
                          {/* Products Info */}
                          <div className="flex-1 space-y-3">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex gap-3 p-2 rounded-lg border border-gray-50 bg-white">
                                <div className="size-12 rounded overflow-hidden bg-gray-50 flex-shrink-0">
                                  {item.product?.images?.[0] ? (
                                    <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl text-gray-300">📦</div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-gray-900 truncate">{item.product?.name || 'Sản phẩm'}</h4>
                                  <div className="flex justify-between items-center mt-1">
                                    <p className="text-xs text-gray-500">Số lượng: {item.quantity}</p>
                                    <p className="text-sm font-semibold text-red-500">{(item.price_at_buy || 0).toLocaleString('vi-VN')}₫</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Shipping & Summary */}
                          <div className="lg:w-80 flex flex-col justify-between border-t lg:border-t-0 lg:border-l lg:pl-6 pt-4 lg:pt-0">
                            <div className="space-y-3">
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Địa chỉ nhận hàng</h5>
                                <p className="text-sm text-gray-700 line-clamp-2">{order.shipping_address}</p>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Tổng cộng:</span>
                                <span className="text-lg font-bold text-red-600">{order.total_amount.toLocaleString('vi-VN')}₫</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-4">
                              {order.order_status === 'PENDING' && (
                                <>
                                  <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => handleUpdateOrderStatus(order.id, 'PICKUP')}>
                                    <Package className="size-4 mr-1.5" /> Xác nhận
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleCancelOrder(order.id)}>
                                    Hủy
                                  </Button>
                                </>
                              )}
                              {order.order_status === 'PICKUP' && (
                                <Button size="sm" className="bg-blue-500 hover:bg-blue-600" onClick={() => handleUpdateOrderStatus(order.id, 'SHIPPING')}>
                                  <Truck className="size-4 mr-1.5" /> Giao hàng
                                </Button>
                              )}
                              {order.order_status === 'SHIPPING' && (
                                <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')}>
                                  <CheckCircle className="size-4 mr-1.5" /> Hoàn tất
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/order/${order.id}`)}>
                                <Eye className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
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
                    <option value="day">Trong ngày</option>
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

                  <Card>
                    <CardHeader>
                      <CardTitle>Chi tiết phí và số đơn</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Phí cố định</p>
                        <p className="font-semibold mt-1">{formatMoney(sellerReport.summary.fixedFee)}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Phí thanh toán</p>
                        <p className="font-semibold mt-1">{formatMoney(sellerReport.summary.paymentFee)}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Phí dịch vụ</p>
                        <p className="font-semibold mt-1">{formatMoney(sellerReport.summary.serviceFee)}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Tổng đơn tính</p>
                        <p className="font-semibold mt-1">{sellerReport.orderCount.toLocaleString('vi-VN')}</p>
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
                <p className="text-gray-500">Nội dung đang được phát triển</p>
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