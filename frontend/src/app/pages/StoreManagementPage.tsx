import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  getDashboardStoreDetail,
  getDashboardStores,
  updateAdminStoreStatus,
  type AdminStore,
  type AdminStoreStatus,
  type OcrScanResult,
  scanBusinessLicense,
} from '../services/adminStoreService';
import { toast } from 'sonner';
import axios from 'axios';
import { Store as StoreIcon, Check, X, Clock, Ban, Building2, FileText, Loader2, Eye, Zap, Bot, ScanLine, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

const API_URL = 'http://localhost:5000/api'; // Hãy đảm bảo URL này đúng với Backend của bạn

export default function StoreManagementPage() {
  const { user, token } = useAuth();
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<AdminStore | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // ── AI OCR State ─────────────────────────────────────────────────────────────
  const [ocrState, setOcrState] = useState<{
    isScanning: boolean;
    result: OcrScanResult | null;
    error: string | null;
  }>({ isScanning: false, result: null, error: null });

  // Trạng thái cho cửa sổ Flash Sale
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

  useEffect(() => {
    void loadStores();
  }, []);

  const loadStores = async () => {
    setIsLoading(true);

    try {
      const storesData = await getDashboardStores(token);
      setStores(storesData.filter((store) => store.store_type === 'B2C'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không tải được danh sách cửa hàng';
      toast.error(message);
      setStores([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyStoreStatus = async (storeId: string, status: AdminStoreStatus, successMessage: string) => {
    setIsUpdating(storeId);

    try {
      await updateAdminStoreStatus(storeId, status, token);
      setStores((previous) => {
        const existing = previous.find((item) => item.id === storeId);

        if (!existing) {
          return previous;
        }

        const updated: AdminStore = { ...existing, status };
        const filtered = previous.filter((item) => item.id !== storeId);
        return [updated, ...filtered];
      });

      toast.success(successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cập nhật trạng thái thất bại';
      toast.error(message);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleApprove = (storeId: string) => {
    void applyStoreStatus(storeId, 'APPROVED', 'Cửa hàng đã được duyệt');
  };

  const handleReject = (storeId: string) => {
    void applyStoreStatus(storeId, 'REJECTED', 'Cửa hàng đã bị từ chối');
  };

  const handleDeactivate = (storeId: string) => {
    void applyStoreStatus(storeId, 'INACTIVE', 'Cửa hàng đã được chuyển sang ngưng hoạt động');
  };

  const handleViewStoreDetail = async (storeId: string) => {
    setDetailLoading(true);
    // Reset OCR state mỗi khi xem cửa hàng mới
    setOcrState({ isScanning: false, result: null, error: null });

    try {
      const detail = await getDashboardStoreDetail(storeId, token);
      setSelectedStore(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không tải được chi tiết cửa hàng';
      toast.error(message);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── AI OCR Handler ──────────────────────────────────────────────────────────
  const handleScanLicense = async () => {
    if (!selectedStore) return;

    setOcrState({ isScanning: true, result: null, error: null });

    try {
      const result = await scanBusinessLicense(selectedStore.id, token);
      setOcrState({ isScanning: false, result, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi khi gọi AI OCR';
      setOcrState({ isScanning: false, result: null, error: message });
    }
  };

  // Hàm mở Modal Flash Sale
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

  // Hàm Lưu cài đặt Flash Sale gọi API
  const handleSaveFlashSale = async () => {
    const { product, isFlashSale, price, stock } = flashSaleModal;
    
    if (isFlashSale && (!price || !stock)) {
      toast.error("Vui lòng nhập giá và số lượng khuyến mãi");
      return;
    }

    setFlashSaleModal(prev => ({ ...prev, loading: true }));

    try {
      // Gọi API đã tạo ở Backend
      await axios.put(
        `${API_URL}/products/${product.id}/flash-sale`,
        {
          is_flash_sale: isFlashSale,
          flash_sale_price: isFlashSale ? Number(price) : null,
          flash_sale_stock: isFlashSale ? Number(stock) : 0,
        },
        { headers: { Authorization: `Bearer ${token}` } } // Truyền token nếu route cần
      );

      toast.success("Đã cập nhật Flash Sale thành công");
      
      // Tải lại chi tiết store để thấy thay đổi mới nhất
      if (selectedStore) {
        handleViewStoreDetail(selectedStore.id);
      }
      
      setFlashSaleModal(prev => ({ ...prev, isOpen: false }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật Flash Sale");
    } finally {
      setFlashSaleModal(prev => ({ ...prev, loading: false }));
    }
  };

  const getStatusBadge = (status: AdminStoreStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          <Clock className="size-3 mr-1" />
          Chờ duyệt
        </Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          <Check className="size-3 mr-1" />
          Đã duyệt
        </Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
          <X className="size-3 mr-1" />
          Từ chối
        </Badge>;
      case 'INACTIVE':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
          <Ban className="size-3 mr-1" />
          Không hoạt động
        </Badge>;
    }
  };

  const getTypeBadge = (type: 'B2C' | 'C2C') => {
    return type === 'B2C' ? (
      <Badge variant="secondary">
        <Building2 className="size-3 mr-1" />
        B2C
      </Badge>
    ) : (
      <Badge variant="outline">
        <StoreIcon className="size-3 mr-1" />
        C2C
      </Badge>
    );
  };

  const tabStatusMap: Record<typeof activeTab, AdminStoreStatus[]> = {
    pending: ['PENDING'],
    approved: ['APPROVED'],
    rejected: ['REJECTED', 'INACTIVE'],
  };

  const b2cStores = stores.filter((store) => tabStatusMap[activeTab].includes(store.status));
  const countPending = stores.filter((store) => store.status === 'PENDING').length;
  const countApproved = stores.filter((store) => store.status === 'APPROVED').length;
  const countRejected = stores.filter((store) => ['REJECTED', 'INACTIVE'].includes(store.status)).length;

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <StoreIcon className="size-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Quản lý cửa hàng</CardTitle>
              <CardDescription>Duyệt và quản lý các cửa hàng B2C</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'approved' | 'rejected')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Chờ duyệt ({countPending})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Đã duyệt ({countApproved})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Chưa duyệt ({countRejected})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">
                  <Loader2 className="size-12 mx-auto mb-3 text-gray-300 animate-spin" />
                  <p>Đang tải dữ liệu cửa hàng...</p>
                </div>
              ) : b2cStores.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <StoreIcon className="size-12 mx-auto mb-3 text-gray-300" />
                  <p>Không có cửa hàng nào</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cửa hàng</TableHead>
                      <TableHead>Chủ sở hữu</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Điều khoản</TableHead>
                      <TableHead>GPKD</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {b2cStores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{store.store_name}</p>
                            <p className="text-sm text-gray-500">{store.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{store.owner?.username || store.representative_name || 'Chưa có thông tin'}</p>
                            <p className="text-sm text-gray-500">{store.owner?.email || 'Không có email'}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(store.store_type)}</TableCell>
                        <TableCell>
                          {store.policy_accepted ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              <Check className="size-3 mr-1" /> Đã chấp nhận
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                              <X className="size-3 mr-1" /> Chưa chấp nhận
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <FileText className="size-3" />
                            {store.business_license || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(store.status)}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {format(new Date(store.createdAt), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {store.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-300 hover:bg-green-50"
                                  onClick={() => handleApprove(store.id)}
                                  disabled={isUpdating === store.id}
                                >
                                  <Check className="size-4 mr-1" />
                                  Duyệt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                  onClick={() => handleReject(store.id)}
                                  disabled={isUpdating === store.id}
                                >
                                  <X className="size-4 mr-1" />
                                  Từ chối
                                </Button>
                              </>
                            )}
                            {store.status === 'APPROVED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => handleDeactivate(store.id)}
                                disabled={isUpdating === store.id}
                              >
                                <Ban className="size-4 mr-1" />
                                Khóa
                              </Button>
                            )}
                            {(store.status === 'REJECTED' || store.status === 'INACTIVE') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                                onClick={() => handleApprove(store.id)}
                                disabled={isUpdating === store.id}
                              >
                                <Check className="size-4 mr-1" />
                                Kích hoạt
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewStoreDetail(store.id)}
                              disabled={detailLoading}
                            >
                              <Eye className="size-4 mr-1" />
                              Xem shop
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedStore && (
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết cửa hàng</CardTitle>
            <CardDescription>{selectedStore.store_name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detailLoading ? (
              <p className="text-sm text-gray-500">Đang tải chi tiết...</p>
            ) : (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">Tổng sản phẩm</p>
                    <p className="font-semibold mt-1">{selectedStore.totalProducts || 0}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">Tổng đơn hàng</p>
                    <p className="font-semibold mt-1">{selectedStore.totalOrders || 0}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">Doanh thu</p>
                    <p className="font-semibold mt-1">{(selectedStore.totalRevenue || 0).toLocaleString('vi-VN')}₫</p>
                  </div>
                </div>

                {/* ── AI OCR PANEL ───────────────────────────────────────────── */}
                {selectedStore.store_type === 'B2C' && (
                  <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5 space-y-4">
                    {/* Header Panel */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-9 bg-violet-600 rounded-lg flex items-center justify-center shadow-md">
                          <Bot className="size-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-violet-900">AI Duyệt Hồ Sơ Tự Động</p>
                          <p className="text-xs text-violet-600">Powered by Tesseract.js OCR</p>
                        </div>
                      </div>
                      <Button
                        id={`btn-ocr-scan-${selectedStore.id}`}
                        size="sm"
                        onClick={() => { void handleScanLicense(); }}
                        disabled={ocrState.isScanning || !selectedStore.business_license}
                        className="bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-md transition-all"
                      >
                        {ocrState.isScanning ? (
                          <><Loader2 className="size-4 animate-spin" />Đang quét...</>
                        ) : (
                          <><ScanLine className="size-4" />Quét GPKD</>
                        )}
                      </Button>
                    </div>

                    {/* Trường hợp không có ảnh GPKD */}
                    {!selectedStore.business_license && (
                      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <AlertTriangle className="size-4 shrink-0" />
                        Cửa hàng chưa tải lên ảnh Giấy Phép Kinh Doanh.
                      </div>
                    )}

                    {/* Trạng thái đang quét */}
                    {ocrState.isScanning && (
                      <div className="flex flex-col items-center gap-3 py-6">
                        <div className="relative">
                          <div className="size-14 rounded-full bg-violet-100 flex items-center justify-center">
                            <Bot className="size-7 text-violet-500" />
                          </div>
                          <div className="absolute inset-0 rounded-full border-4 border-violet-400 border-t-transparent animate-spin" />
                        </div>
                        <p className="text-sm text-violet-700 font-medium">AI đang phân tích ảnh GPKD...</p>
                        <p className="text-xs text-violet-500">Quá trình này có thể mất 10–30 giây</p>
                      </div>
                    )}

                    {/* Lỗi OCR */}
                    {ocrState.error && (
                      <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <XCircle className="size-4 shrink-0 mt-0.5" />
                        <span>{ocrState.error}</span>
                      </div>
                    )}

                    {/* Kết quả OCR */}
                    {ocrState.result && !ocrState.isScanning && (() => {
                      const { result } = ocrState;
                      const scorePercent = Math.round(result.matchScore * 100);
                      const scoreColor =
                        result.isMatch
                          ? 'text-green-700 bg-green-100 border-green-300'
                          : scorePercent >= 50
                          ? 'text-amber-700 bg-amber-100 border-amber-300'
                          : 'text-red-700 bg-red-100 border-red-300';
                      const ScoreIcon = result.isMatch ? CheckCircle2 : scorePercent >= 50 ? AlertTriangle : XCircle;

                      return (
                        <div className="space-y-4 animate-in fade-in duration-300">
                          {/* Điểm khớp tổng hợp */}
                          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${scoreColor}`}>
                            <ScoreIcon className="size-5 shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold text-sm">
                                {result.isMatch
                                  ? '✅ Hồ sơ hợp lệ — Có thể duyệt'
                                  : scorePercent >= 50
                                  ? '⚠️ Hồ sơ cần xem xét thêm'
                                  : '❌ Hồ sơ không khớp'}
                              </p>
                              <p className="text-xs mt-0.5 opacity-80">Độ khớp tổng hợp: {scorePercent}%</p>
                            </div>
                            <span className="text-2xl font-bold tabular-nums">{scorePercent}%</span>
                          </div>

                          {/* Bảng đối chiếu chi tiết */}
                          <div className="rounded-lg border bg-white overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left font-medium text-gray-600">Trường</th>
                                  <th className="px-4 py-2 text-left font-medium text-gray-600">Hệ thống</th>
                                  <th className="px-4 py-2 text-left font-medium text-gray-600">AI đọc được</th>
                                  <th className="px-4 py-2 text-center font-medium text-gray-600">Kết quả</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {/* Hàng MST */}
                                <tr className="hover:bg-gray-50/50">
                                  <td className="px-4 py-3 font-medium">Mã số thuế</td>
                                  <td className="px-4 py-3 text-gray-700 font-mono">
                                    {result.details.storeTaxCode || <span className="text-gray-400 italic">Chưa có</span>}
                                  </td>
                                  <td className="px-4 py-3 text-gray-700 font-mono">
                                    {result.extractedTaxCode || <span className="text-gray-400 italic">Không đọc được</span>}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {result.details.taxCodeMatch
                                      ? <CheckCircle2 className="size-5 text-green-500 mx-auto" />
                                      : result.details.storeTaxCode
                                      ? <XCircle className="size-5 text-red-400 mx-auto" />
                                      : <span className="text-xs text-gray-400">N/A</span>}
                                  </td>
                                </tr>
                                {/* Hàng Tên doanh nghiệp */}
                                <tr className="hover:bg-gray-50/50">
                                  <td className="px-4 py-3 font-medium">Tên doanh nghiệp</td>
                                  <td className="px-4 py-3 text-gray-700">{result.details.storeStoreName}</td>
                                  <td className="px-4 py-3 text-gray-700">
                                    <span className="italic text-gray-500 text-xs">Phân tích từ văn bản</span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {result.details.nameMatchScore >= 0.9
                                      ? <CheckCircle2 className="size-5 text-green-500 mx-auto" />
                                      : result.details.nameMatchScore >= 0.5
                                      ? <AlertTriangle className="size-5 text-amber-400 mx-auto" />
                                      : <XCircle className="size-5 text-red-400 mx-auto" />}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Văn bản thô AI đọc được (collapsible) */}
                          <details className="group">
                            <summary className="cursor-pointer text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1">
                              <span className="group-open:hidden">▶ Xem văn bản thô AI đọc được</span>
                              <span className="hidden group-open:inline">▼ Ẩn văn bản thô</span>
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-900 text-gray-100 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                              {result.rawText || '(Trống)'}
                            </pre>
                          </details>

                          {/* Nút Duyệt hồ sơ — chỉ enable khi isMatch = true */}
                          {selectedStore.status === 'PENDING' && (
                            <div className="pt-2 border-t flex items-center gap-3">
                              {result.isMatch ? (
                                <Button
                                  id={`btn-ai-approve-${selectedStore.id}`}
                                  className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm"
                                  onClick={() => handleApprove(selectedStore.id)}
                                  disabled={isUpdating === selectedStore.id}
                                >
                                  {isUpdating === selectedStore.id
                                    ? <Loader2 className="size-4 animate-spin" />
                                    : <CheckCircle2 className="size-4" />}
                                  Duyệt hồ sơ ngay
                                </Button>
                              ) : (
                                <Button
                                  disabled
                                  className="gap-2 opacity-50 cursor-not-allowed"
                                  title="Cần độ khớp ≥ 90% để duyệt tự động"
                                >
                                  <CheckCircle2 className="size-4" />
                                  Duyệt hồ sơ (cần độ khớp ≥ 90%)
                                </Button>
                              )}
                              <p className="text-xs text-gray-500">
                                {result.isMatch
                                  ? 'AI xác nhận hồ sơ hợp lệ.'
                                  : `Độ khớp hiện tại: ${scorePercent}% — Cần xem xét thủ công.`}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {/* ── KẾT THÚC AI OCR PANEL ──────────────────────────────────── */}

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2 text-sm">
                  <p className="font-semibold text-blue-900">Thông tin điều khoản và cấu hình phí</p>
                  <p>- Chấp nhận điều khoản: {selectedStore.policy_accepted ? 'Có' : 'Không'}</p>
                  <p>- Phiên bản chính sách: {selectedStore.fee_policy_version || 'N/A'}</p>
                  <p>- Phí cố định: {Number(selectedStore.fixed_fee_rate || 0) * 100}%</p>
                  <p>- Phí thanh toán: {Number(selectedStore.payment_fee_rate || 0) * 100}%</p>
                  <p>- Phí dịch vụ: {Number(selectedStore.service_fee_rate || 0) * 100}%</p>
                  <p>- Trần phí trả hàng: {Number(selectedStore.return_fee_cap_standard || 0).toLocaleString('vi-VN')}₫ (thường), {Number(selectedStore.return_fee_cap_express || 0).toLocaleString('vi-VN')}₫ (hỏa tốc)</p>
                  <p>- Thuế áp dụng khi doanh thu vượt: {Number(selectedStore.tax_threshold_per_year || 0).toLocaleString('vi-VN')}₫/năm</p>
                  <p>- GTGT: {Number(selectedStore.vat_tax_rate || 0) * 100}% | TNCN: {Number(selectedStore.pit_tax_rate || 0) * 100}%</p>
                </div>

                <div className="space-y-2 mt-6">
                  <h4 className="font-medium">Sản phẩm của shop</h4>
                  {!selectedStore.products || selectedStore.products.length === 0 ? (
                    <p className="text-sm text-gray-500">Chưa có sản phẩm.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedStore.products.map((product: any) => (
                        <div key={product.id} className="rounded-lg border p-4 flex items-center justify-between bg-gray-50/50 hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="font-medium text-base">{product.name}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Kho: {product.stock_quantity} | Trạng thái: {product.status}
                            </p>
                            {product.is_flash_sale && (
                              <Badge className="bg-red-500 hover:bg-red-600 mt-2">
                                <Zap className="size-3 mr-1 fill-white" /> Đang Flash Sale ({Number(product.flash_sale_price).toLocaleString('vi-VN')}đ)
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            <p className="font-semibold text-lg">{Number(product.price || 0).toLocaleString('vi-VN')}₫</p>
                            
                            {/* Nút Cài đặt Flash Sale */}
                            <Button 
                              size="sm" 
                              variant={product.is_flash_sale ? "default" : "outline"}
                              className={product.is_flash_sale ? "bg-red-500 hover:bg-red-600" : "border-red-200 text-red-600 hover:bg-red-50"}
                              onClick={() => openFlashSaleModal(product)}
                            >
                              <Zap className="size-4 mr-1" />
                              {product.is_flash_sale ? "Sửa Flash Sale" : "Thêm vào Flash Sale"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal / Cửa sổ cài đặt Flash Sale */}
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
                onChange={(e) => setFlashSaleModal(prev => ({...prev, isFlashSale: e.target.checked}))} 
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
                    onChange={(e) => setFlashSaleModal(prev => ({...prev, price: e.target.value}))}
                    placeholder="Ví dụ: 50000"
                    className="focus-visible:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Số lượng tung ra bán (Kho) <span className="text-red-500">*</span></label>
                  <Input 
                    type="number" 
                    value={flashSaleModal.stock} 
                    onChange={(e) => setFlashSaleModal(prev => ({...prev, stock: e.target.value}))}
                    placeholder="Ví dụ: 100"
                    className="focus-visible:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Số lượng này sẽ được dùng để hiển thị thanh "Đã bán %" trên màn hình.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setFlashSaleModal(prev => ({...prev, isOpen: false}))}>Hủy bỏ</Button>
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