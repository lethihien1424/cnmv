import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import {
  getSellerProducts,
  scheduleFlashSale,
  suggestFlashSale,
  type FlashSaleSuggestion,
  type Product,
} from '../services/productService';

const toDatetimeLocalValue = (isoDate: string) => {
  const date = new Date(isoDate);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const formatMoney = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

export default function FlashSaleManagement() {
  const { user, token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [targetStock, setTargetStock] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<FlashSaleSuggestion | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  useEffect(() => {
    const loadProducts = async () => {
      if (!user) return;

      setIsLoadingProducts(true);
      try {
        const sellerProducts = await getSellerProducts({
          userId: user.id,
          token,
          storeId: user.c2cStoreId,
          storeType: user.role === 'business' ? 'B2C' : 'C2C',
        });
        setProducts(sellerProducts);
        if (sellerProducts.length > 0) {
          setSelectedProductId((current) => current || sellerProducts[0].id);
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Không tải được danh sách sản phẩm');
      } finally {
        setIsLoadingProducts(false);
      }
    };

    void loadProducts();
  }, [token, user]);

  const handleAIGuess = async () => {
    if (!selectedProductId) {
      alert('Vui lòng chọn sản phẩm trước khi gợi ý AI');
      return;
    }

    setIsSuggesting(true);
    try {
      const suggestion = await suggestFlashSale(selectedProductId, token);
      setAiSuggestion(suggestion);
      setTargetPrice(String(suggestion.suggested_flash_sale_price));
      setTargetStock(String(suggestion.suggested_flash_sale_stock));
      setStartAt(toDatetimeLocalValue(suggestion.suggested_flash_sale_start_time));
      setEndAt(toDatetimeLocalValue(suggestion.suggested_flash_sale_end_time));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không thể lấy gợi ý AI');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!selectedProductId) {
      alert('Vui lòng chọn sản phẩm');
      return;
    }

    const price = Number(targetPrice);
    const stock = Number(targetStock);

    if (!Number.isFinite(price) || price <= 0) {
      alert('Giá Flash Sale không hợp lệ');
      return;
    }

    if (!Number.isFinite(stock) || stock <= 0 || !Number.isInteger(stock)) {
      alert('Số lượng Flash Sale phải là số nguyên lớn hơn 0');
      return;
    }

    if (selectedProduct && price >= Number(selectedProduct.price || 0)) {
      alert(`Giá Flash Sale phải thấp hơn giá gốc (${formatMoney(Number(selectedProduct.price || 0))})`);
      return;
    }

    if (selectedProduct && stock > Number(selectedProduct.stock_quantity || 0)) {
      alert(`Số lượng Flash Sale không được vượt quá tồn kho hiện tại (${selectedProduct.stock_quantity || 0})`);
      return;
    }

    if (!startAt || !endAt) {
      alert('Vui lòng chọn thời gian bắt đầu và kết thúc');
      return;
    }

    if (new Date(endAt) <= new Date(startAt)) {
      alert('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    setIsSaving(true);
    try {
      await scheduleFlashSale(
        selectedProductId,
        {
          flash_sale_price: price,
          flash_sale_stock: stock,
          flash_sale_start_time: new Date(startAt).toISOString(),
          flash_sale_end_time: new Date(endAt).toISOString(),
        },
        token,
      );

      alert('Đã lên lịch thành công! Hệ thống sẽ tự động bật/tắt Flash Sale đúng giờ.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Lên lịch Flash Sale thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-1 text-lg font-bold">Cài đặt Flash Sale tự động</h3>
      <p className="mb-4 text-sm text-gray-600">
        Chọn sản phẩm, nhập thời gian và giá giảm. Đến đúng giờ, hệ thống sẽ tự động kích hoạt Flash Sale.
      </p>

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium">Sản phẩm</label>
        <select
          className="h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={selectedProductId}
          onChange={(event) => {
            setSelectedProductId(event.target.value);
            setAiSuggestion(null);
          }}
          disabled={isLoadingProducts || products.length === 0}
        >
          {products.length === 0 ? <option value="">Không có sản phẩm</option> : null}
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} - {formatMoney(Number(product.price || 0))}
            </option>
          ))}
        </select>
      </div>

      {selectedProduct ? (
        <div className="mb-4 rounded-md border border-dashed p-3 text-sm text-gray-700">
          <div>Giá gốc: {formatMoney(Number(selectedProduct.price || 0))}</div>
          <div>Tồn kho: {selectedProduct.stock_quantity ?? 0}</div>
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
        <div className="w-full md:max-w-[260px]">
          <label className="mb-2 block text-sm font-medium">Giá Flash Sale</label>
          <Input
            type="number"
            placeholder="Nhập giá giảm"
            value={targetPrice}
            onChange={(event) => setTargetPrice(event.target.value)}
          />
        </div>
        <div className="w-full md:max-w-[220px]">
          <label className="mb-2 block text-sm font-medium">Số lượng Flash Sale</label>
          <Input
            type="number"
            placeholder="Nhập số lượng"
            value={targetStock}
            onChange={(event) => setTargetStock(event.target.value)}
          />
        </div>
        <Button variant="outline" onClick={handleAIGuess} disabled={isSuggesting || !selectedProductId}>
          {isSuggesting ? 'Đang gợi ý...' : 'AI gợi ý thông minh'}
        </Button>
      </div>

      {aiSuggestion ? (
        <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          <div className="font-semibold">Gợi ý AI đã áp dụng</div>
          <div>{aiSuggestion.rationale}</div>
        </div>
      ) : null}

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Bắt đầu</label>
          <Input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Kết thúc</label>
          <Input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} />
        </div>
      </div>

      <Button onClick={handleSaveSchedule} disabled={isSaving || !selectedProductId}>
        {isSaving ? 'Đang lưu...' : 'Đồng ý và lên lịch tự động'}
      </Button>
    </div>
  );
}