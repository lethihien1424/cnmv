import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Plus, Ticket, Lock, Unlock, Pencil, X, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import voucherService from '../services/voucherService';

type ShopVoucher = {
  id: string;
  code: string;
  name: string;
  voucher_type: 'FIXED' | 'PERCENT';
  discount_value: number;
  max_discount_amount?: number;
  min_order_value: number;
  usage_limit_per_user: number;
  quantity?: number;
  used_count?: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
};

const EMPTY_FORM = {
  code: '',
  name: '',
  voucher_type: 'PERCENT',
  discount_value: '',
  max_discount_amount: '',
  min_order_value: '',
  usage_limit_per_user: '',
  quantity: '',
  end_date: '',       // datetime-local string, e.g. "2025-12-31T23:59"
  is_active: true,
};

export default function VoucherManagementPage() {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<ShopVoucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<typeof EMPTY_FORM>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  /**
   * Xác định loại shop:
   * - businessStoreId / store_type === 'B2C' → MALL (tối đa 20%)
   * - c2cStoreId / store_type === 'C2C'       → C2C  (tối đa 10%)
   */
  const storeType: 'B2C' | 'C2C' = React.useMemo(() => {
    if (user?.businessStoreId) return 'B2C';
    if (user?.c2cStoreId) return 'C2C';
    if ((user as any)?.store_type === 'B2C') return 'B2C';
    if ((user as any)?.store_type === 'C2C') return 'C2C';
    return 'C2C';
  }, [user]);

  const isMall = storeType === 'B2C';
  const maxPercent = isMall ? 20 : 10;

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const data = await voucherService.getMyShopVouchers();
      setVouchers(data || []);
    } catch (err: any) {
      setError(err.message || 'Không tải được danh sách voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.voucher_type === 'PERCENT' && Number(form.discount_value) > maxPercent) {
      setError(`Shop của bạn chỉ được giảm tối đa ${maxPercent}%`);
      return;
    }

    if (!form.end_date) {
      setError('Vui lòng chọn ngày kết thúc');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString(); // start_date = lúc nhấn tạo

      const payload = {
        ...form,
        store_type: storeType,

        // start_date tự động = thời điểm tạo
        start_date: now,

        // end_date từ input datetime-local → ISO string
        end_date: new Date(form.end_date).toISOString(),

        discount_value: Number(form.discount_value),
        min_order_value: Number(form.min_order_value),
        usage_limit_per_user: Number(form.usage_limit_per_user),

        max_discount_amount:
          form.max_discount_amount !== ''
            ? Number(form.max_discount_amount)
            : null,

        quantity:
          form.quantity !== ''
            ? Number(form.quantity)
            : null,
      };

      await voucherService.createShopVoucher(payload);
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      await loadVouchers();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Tạo voucher thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (v: ShopVoucher) => {
    try {
      if (v.is_active) {
        await voucherService.disableShopVoucher(v.id);
      } else {
        await voucherService.enableShopVoucher(v.id);
      }
      await loadVouchers();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Thao tác thất bại');
    }
  };

  const startEdit = (v: ShopVoucher) => {
    setEditingId(v.id);
    setEditError(null);
    setEditForm({
      name: v.name,
      discount_value: String(v.discount_value),
      max_discount_amount: v.max_discount_amount != null ? String(v.max_discount_amount) : '',
      min_order_value: String(v.min_order_value),
      usage_limit_per_user: String(v.usage_limit_per_user),
      quantity: v.quantity != null ? String(v.quantity) : '',
      // Chuyển ISO string → datetime-local format (YYYY-MM-DDTHH:mm)
      end_date: v.end_date ? v.end_date.slice(0, 16) : '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setEditError(null);
  };

  const saveEdit = async (v: ShopVoucher) => {
    if (v.voucher_type === 'PERCENT' && Number(editForm.discount_value) > maxPercent) {
      setEditError(`Chỉ được giảm tối đa ${maxPercent}%`);
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      const payload = {
        name: editForm.name,
        discount_value: Number(editForm.discount_value),
        min_order_value: Number(editForm.min_order_value),
        usage_limit_per_user: Number(editForm.usage_limit_per_user),
        max_discount_amount: editForm.max_discount_amount !== '' ? Number(editForm.max_discount_amount) : null,
        quantity: editForm.quantity !== '' ? Number(editForm.quantity) : null,
        end_date: editForm.end_date ? new Date(editForm.end_date).toISOString() : undefined,
      };
      await voucherService.updateShopVoucher(v.id, payload);
      setEditingId(null);
      await loadVouchers();
    } catch (err: any) {
      setEditError(err.response?.data?.message || err.message || 'Cập nhật thất bại');
    } finally {
      setEditSubmitting(false);
    }
  };

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

  const formatDateDisplay = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Khuyến mãi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Voucher giảm giá dành riêng cho shop của bạn •{' '}
            <span className="font-medium text-cyan-600">
              Giảm tối đa {maxPercent}% ({isMall ? 'Shop MALL' : 'Shop C2C'})
            </span>
          </p>
        </div>
        <Button
          onClick={() => { setShowForm((v) => !v); setError(null); }}
          className="bg-red-500 hover:bg-red-600 text-white gap-2"
        >
          <Plus className="size-4" />
          Tạo voucher
        </Button>
      </div>

      {/* Form tạo */}
      {showForm && (
        <Card className="border-red-100 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Ticket className="size-5 text-red-500" /> Voucher mới
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Tên */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Tên chương trình <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                  placeholder="VD: Giảm 10% cho đơn từ 300k"
                />
              </div>

              {/* Mã */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Mã voucher <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                  placeholder="VD: SHOP10"
                />
              </div>

              {/* Loại */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Loại giảm giá</label>
                <select
                  value={form.voucher_type}
                  onChange={(e) => setForm((p) => ({ ...p, voucher_type: e.target.value as any }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                >
                  <option value="PERCENT">Giảm % (tối đa {maxPercent}%)</option>
                  <option value="FIXED">Giảm tiền (₫)</option>
                </select>
              </div>

              {/* Giá trị giảm */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Giá trị giảm{' '}
                  <span className="text-gray-400">
                    ({form.voucher_type === 'PERCENT' ? `% — tối đa ${maxPercent}%` : '₫'})
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={form.voucher_type === 'PERCENT' ? maxPercent : undefined}
                  required
                  value={form.discount_value}
                  onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                />
              </div>

              {/* Giảm tối đa (PERCENT only) */}
              {form.voucher_type === 'PERCENT' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Giảm tối đa (₫) <span className="text-gray-400 text-xs">tùy chọn</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.max_discount_amount}
                    onChange={(e) => setForm((p) => ({ ...p, max_discount_amount: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                    placeholder="VD: 50000"
                  />
                </div>
              )}

              {/* Đơn tối thiểu */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Đơn hàng tối thiểu (₫)</label>
                <input
                  type="number"
                  min={0}
                  value={form.min_order_value}
                  onChange={(e) => setForm((p) => ({ ...p, min_order_value: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                  placeholder="VD: 300000"
                />
              </div>

              {/* Lượt dùng */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Lượt dùng / người</label>
                <input
                  type="number"
                  min={1}
                  value={form.usage_limit_per_user}
                  onChange={(e) => setForm((p) => ({ ...p, usage_limit_per_user: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                />
              </div>

              {/* Số lượng */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Tổng số lượng <span className="text-gray-400 text-xs">trống = không giới hạn</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                  placeholder="Không giới hạn"
                />
              </div>

              {/* Ngày kết thúc — datetime-local, bắt buộc */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Ngày kết thúc <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs text-gray-400 font-normal">
                    (Ngày bắt đầu tự động = thời điểm tạo)
                  </span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.end_date}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                />
              </div>

              {/* Kích hoạt */}
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="v_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="size-4 rounded text-red-500"
                />
                <label htmlFor="v_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Kích hoạt ngay
                </label>
              </div>

              {error && (
                <div className="md:col-span-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowForm(false); setError(null); }}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {submitting ? 'Đang tạo...' : 'Tạo voucher'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Danh sách */}
      <Card>
        <CardHeader>
          <CardTitle>Voucher của shop ({vouchers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-sm py-8 text-center">Đang tải...</p>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Ticket className="size-12 mx-auto mb-3 opacity-30" />
              <p>Chưa có voucher nào. Tạo voucher đầu tiên để thu hút khách hàng!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vouchers.map((v) => (
                <div
                  key={v.id}
                  className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-4 border rounded-xl transition-colors ${
                    v.is_active ? 'border-gray-200 hover:bg-gray-50' : 'border-gray-100 bg-gray-50 opacity-70'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${v.is_active ? 'bg-red-100' : 'bg-gray-100'}`}>
                      <Ticket className={`size-5 ${v.is_active ? 'text-red-500' : 'text-gray-400'}`} />
                    </div>

                    {editingId === v.id ? (
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-medium text-gray-600">Tên chương trình</label>
                            <input
                              value={editForm.name ?? ''}
                              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-300 outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">
                              Giá trị giảm ({v.voucher_type === 'PERCENT' ? `% max ${maxPercent}%` : '₫'})
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={v.voucher_type === 'PERCENT' ? maxPercent : undefined}
                              value={editForm.discount_value ?? ''}
                              onChange={(e) => setEditForm((p) => ({ ...p, discount_value: e.target.value }))}
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-300 outline-none"
                            />
                          </div>

                          {v.voucher_type === 'PERCENT' && (
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Giảm tối đa (₫)</label>
                              <input
                                type="number"
                                min={0}
                                value={editForm.max_discount_amount ?? ''}
                                onChange={(e) => setEditForm((p) => ({ ...p, max_discount_amount: e.target.value }))}
                                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-300 outline-none"
                                placeholder="Không giới hạn"
                              />
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Đơn tối thiểu (₫)</label>
                            <input
                              type="number"
                              min={0}
                              value={editForm.min_order_value ?? ''}
                              onChange={(e) => setEditForm((p) => ({ ...p, min_order_value: e.target.value }))}
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-300 outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Lượt dùng / người</label>
                            <input
                              type="number"
                              min={1}
                              value={editForm.usage_limit_per_user ?? ''}
                              onChange={(e) => setEditForm((p) => ({ ...p, usage_limit_per_user: e.target.value }))}
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-300 outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">
                              Tổng số lượng <span className="text-gray-400 text-[10px]">trống = không giới hạn</span>
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={editForm.quantity ?? ''}
                              onChange={(e) => setEditForm((p) => ({ ...p, quantity: e.target.value }))}
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-300 outline-none"
                              placeholder="Không giới hạn"
                            />
                          </div>

                          {/* Sửa ngày kết thúc */}
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-medium text-gray-600">Ngày kết thúc</label>
                            <input
                              type="datetime-local"
                              value={editForm.end_date ?? ''}
                              min={new Date().toISOString().slice(0, 16)}
                              onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))}
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-300 outline-none"
                            />
                          </div>

                        </div>

                        {editError && <p className="text-red-500 text-xs">{editError}</p>}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(v)}
                            disabled={editSubmitting}
                            className="bg-red-500 hover:bg-red-600 text-white gap-1"
                          >
                            <Check className="size-3.5" />
                            {editSubmitting ? 'Đang lưu...' : 'Lưu'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="size-3.5 mr-1" />
                            Hủy
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900">{v.code}</span>
                          <Badge className={v.voucher_type === 'PERCENT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                            {v.voucher_type === 'PERCENT' ? 'Giảm %' : 'Giảm tiền'}
                          </Badge>
                          <Badge className={v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                            {v.is_active ? 'Đang hoạt động' : 'Đã tắt'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{v.name}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                          <span>
                            Giảm:{' '}
                            <b className="text-gray-800">
                              {v.voucher_type === 'PERCENT' ? `${v.discount_value}%` : formatMoney(v.discount_value)}
                            </b>
                            {v.max_discount_amount ? ` (tối đa ${formatMoney(v.max_discount_amount)})` : ''}
                          </span>
                          <span>
                            Đơn tối thiểu: <b className="text-gray-800">{formatMoney(v.min_order_value)}</b>
                          </span>
                          <span>
                            Dùng tối đa: <b className="text-gray-800">{v.usage_limit_per_user}x / người</b>
                          </span>
                          {v.quantity != null && (
                            <span>
                              Số lượng: <b className="text-gray-800">{v.used_count ?? 0}/{v.quantity}</b>
                            </span>
                          )}
                          {v.end_date && (
                            <span>
                              Hết hạn: <b className="text-gray-800">{formatDateDisplay(v.end_date)}</b>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {editingId !== v.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(v)}
                        title="Chỉnh sửa"
                        className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil className="size-4" />
                      </Button>

                      {v.is_active ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(v)}
                          title="Tắt voucher"
                          className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Lock className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(v)}
                          title="Bật voucher"
                          className="text-gray-500 hover:text-green-600 hover:bg-green-50"
                        >
                          <Unlock className="size-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}