import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Plus, Ticket, Lock, Unlock, Pencil, X, Check } from 'lucide-react';
import voucherService from '../services/voucherService';

type VoucherType = 'FIXED' | 'PERCENT' | 'FREESHIP';

type PlatformVoucher = {
  id: string;
  code: string;
  name: string;
  voucher_type: VoucherType;
  discount_value: number;
  max_discount_amount?: number;
  min_order_value: number;
  usage_limit_per_user: number;
  quantity?: number;
  used_count?: number;
  target_audience: string;
  validity_hours_after_grant?: number;
  is_active: boolean;
  created_at: string;

  // Freeship fields
  applicable_shipping_type?: 'ALL' | 'STANDARD' | 'EXPRESS';
  applicable_product_type?: 'ALL' | 'BULKY';
  freeship_discount_percent?: number;
  max_distance_km?: number;
};

type FormState = {
  code: string;
  name: string;
  voucher_type: VoucherType;
  discount_value: number | '';
  max_discount_amount: string;
  min_order_value: number | '';
  usage_limit_per_user: number | '';
  quantity: string;
  target_audience: string;
  validity_hours_after_grant: string;
  is_active: boolean;

  // Freeship fields
  applicable_shipping_type?: 'ALL' | 'STANDARD' | 'EXPRESS';
  applicable_product_type?: 'ALL' | 'BULKY';
  freeship_discount_percent: number | '';
  max_distance_km: number | '';
};

const EMPTY_FORM: FormState = {
  code: '',
  name: '',
  voucher_type: 'FIXED',
  discount_value: '',
  max_discount_amount: '',
  min_order_value: '',
  usage_limit_per_user: '',
  quantity: '',
  target_audience: 'ALL',
  validity_hours_after_grant: '',
  is_active: true,

  applicable_shipping_type: 'ALL',
  applicable_product_type: 'ALL',
  freeship_discount_percent: 100,
  max_distance_km: '',
};

export default function AdminVoucherPage() {
  const [vouchers, setVouchers] = useState<PlatformVoucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FormState>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const data = await voucherService.getPlatformVouchers();
      setVouchers(data || []);
    } catch (err: any) {
      setError(err.message || 'Không tải được danh sách voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...form,
        discount_value: Number(form.discount_value),
        min_order_value: Number(form.min_order_value),
        usage_limit_per_user: Number(form.usage_limit_per_user),
        max_discount_amount: form.max_discount_amount !== '' ? Number(form.max_discount_amount) : null,
        quantity: form.quantity !== '' ? Number(form.quantity) : null,
        validity_hours_after_grant: form.validity_hours_after_grant !== '' 
          ? Number(form.validity_hours_after_grant) : null,
        freeship_discount_percent: form.freeship_discount_percent !== '' 
          ? Number(form.freeship_discount_percent) : 100,
        max_distance_km: form.max_distance_km !== '' 
          ? Number(form.max_distance_km) : null,
      };

      await voucherService.createPlatformVoucher(payload);
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      await loadVouchers();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Tạo voucher thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (v: PlatformVoucher) => {
    try {
      if (v.is_active) {
        await voucherService.disablePlatformVoucher(v.id);
      } else {
        await voucherService.enablePlatformVoucher(v.id);
      }
      await loadVouchers();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Thao tác thất bại');
    }
  };

  const startEdit = (v: PlatformVoucher) => {
    setEditingId(v.id);
    setEditError(null);
    setEditForm({
      name: v.name,
      discount_value: v.discount_value,
      max_discount_amount: v.max_discount_amount != null ? String(v.max_discount_amount) : '',
      min_order_value: v.min_order_value,
      usage_limit_per_user: v.usage_limit_per_user,
      quantity: v.quantity != null ? String(v.quantity) : '',
      validity_hours_after_grant: v.validity_hours_after_grant != null ? String(v.validity_hours_after_grant) : '',
      target_audience: v.target_audience,
      applicable_shipping_type: v.applicable_shipping_type,
      applicable_product_type: v.applicable_product_type,
      freeship_discount_percent: v.freeship_discount_percent ?? 100,
      max_distance_km: v.max_distance_km ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setEditError(null);
  };

  const saveEdit = async (v: PlatformVoucher) => {
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
        validity_hours_after_grant: editForm.validity_hours_after_grant !== ''
          ? Number(editForm.validity_hours_after_grant) : null,
        target_audience: editForm.target_audience || v.target_audience,
        applicable_shipping_type: editForm.applicable_shipping_type,
        applicable_product_type: editForm.applicable_product_type,
        freeship_discount_percent: editForm.freeship_discount_percent !== ''
          ? Number(editForm.freeship_discount_percent) : 100,
        max_distance_km: editForm.max_distance_km !== ''
          ? Number(editForm.max_distance_km) : null,
      };

      await voucherService.updatePlatformVoucher(v.id, payload);
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

  const typeLabel = (type: string) => {
    if (type === 'FIXED') return 'Giảm tiền';
    if (type === 'PERCENT') return 'Giảm %';
    if (type === 'FREESHIP') return 'Freeship';
    return type;
  };

  const typeColor = (type: string) => {
    if (type === 'FIXED') return 'bg-blue-100 text-blue-700';
    if (type === 'PERCENT') return 'bg-purple-100 text-purple-700';
    if (type === 'FREESHIP') return 'bg-green-100 text-green-700';
    return '';
  };

  const audienceLabel = (a: string) => {
    if (a === 'NEW_USER') return 'Người dùng mới';
    if (a === 'ALL') return 'Tất cả';
    return a;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Voucher Sàn</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tạo và quản lý voucher áp dụng cho toàn hệ thống ShopHub
          </p>
        </div>
        <Button
          onClick={() => { setShowForm((v) => !v); setError(null); }}
          className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
        >
          <Plus className="size-4" />
          Tạo voucher mới
        </Button>
      </div>

      {/* Form tạo voucher */}
      {showForm && (
        <Card className="border-cyan-200 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyan-700">
              <Ticket className="size-5" /> Thông tin Voucher Sàn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Tên voucher <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                  placeholder="VD: Chào mừng người dùng mới"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Mã voucher <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                  placeholder="VD: WELCOME10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Loại voucher <span className="text-red-500">*</span></label>
                <select
                  value={form.voucher_type}
                  onChange={(e) => setForm((p) => ({ ...p, voucher_type: e.target.value as VoucherType }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                >
                  <option value="FIXED">Giảm tiền (FIXED)</option>
                  <option value="PERCENT">Giảm % (PERCENT)</option>
                  <option value="FREESHIP">Freeship</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Giá trị giảm{' '}
                  <span className="text-gray-400">
                    ({form.voucher_type === 'PERCENT' ? '%' : form.voucher_type === 'FREESHIP' ? 'không cần' : '₫'})
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.discount_value}
                  onChange={(e) => setForm((p) => ({
                    ...p,
                    discount_value: e.target.value === '' ? '' : Number(e.target.value),
                  }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                  placeholder="VD: 10"
                  disabled={form.voucher_type === 'FREESHIP'}
                />
              </div>

              {form.voucher_type === 'PERCENT' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Giảm tối đa (₫)</label>
                  <input
                    type="number"
                    value={form.max_discount_amount}
                    onChange={(e) => setForm((p) => ({ ...p, max_discount_amount: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                    placeholder="VD: 50000"
                  />
                </div>
              )}

              {/* FREESHIP Fields */}
              {form.voucher_type === 'FREESHIP' && (
                <>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Loại vận chuyển áp dụng</label>
                    <select
                      value={form.applicable_shipping_type || 'ALL'}
                      onChange={(e) => setForm((p) => ({ ...p, applicable_shipping_type: e.target.value as any }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                    >
                      <option value="ALL">Tất cả</option>
                      <option value="STANDARD">Tiêu chuẩn</option>
                      <option value="EXPRESS">Hỏa tốc</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Áp dụng cho hàng</label>
                    <select
                      value={form.applicable_product_type || 'ALL'}
                      onChange={(e) => setForm((p) => ({ ...p, applicable_product_type: e.target.value as any }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                    >
                      <option value="ALL">Tất cả</option>
                      <option value="BULKY">Hàng cồng kềnh</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Giảm % phí ship</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={form.freeship_discount_percent}
                      onChange={(e) => setForm((p) => ({
                        ...p,
                        freeship_discount_percent: e.target.value === '' ? '' : Number(e.target.value),
                      }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Khoảng cách tối đa (km)</label>
                    <input
                      type="number"
                      value={form.max_distance_km}
                      onChange={(e) => setForm((p) => ({
                        ...p,
                        max_distance_km: e.target.value === '' ? '' : Number(e.target.value),
                      }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                      placeholder="Để trống = không giới hạn"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Đơn hàng tối thiểu (₫)</label>
                <input
                  type="number"
                  value={form.min_order_value}
                  onChange={(e) => setForm((p) => ({
                    ...p,
                    min_order_value: e.target.value === '' ? '' : Number(e.target.value),
                  }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                  placeholder="VD: 100000"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Lượt dùng / người</label>
                <input
                  type="number"
                  value={form.usage_limit_per_user}
                  onChange={(e) => setForm((p) => ({
                    ...p,
                    usage_limit_per_user: e.target.value === '' ? '' : Number(e.target.value),
                  }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Tổng số lượng</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                  placeholder="VD: 1000"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Đối tượng nhận</label>
                <select
                  value={form.target_audience}
                  onChange={(e) => setForm((p) => ({ ...p, target_audience: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                >
                  <option value="ALL">Tất cả người dùng</option>
                  <option value="NEW_USER">Người dùng mới</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Thời hạn sau khi cấp (giờ)</label>
                <input
                  type="number"
                  value={form.validity_hours_after_grant}
                  onChange={(e) => setForm((p) => ({ ...p, validity_hours_after_grant: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                  placeholder="VD: 24"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="size-4 rounded text-cyan-600"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
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
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {submitting ? 'Đang tạo...' : 'Tạo voucher'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Danh sách voucher */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Voucher Sàn ({vouchers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-sm py-8 text-center">Đang tải...</p>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Ticket className="size-12 mx-auto mb-3 opacity-30" />
              <p>Chưa có voucher nào. Hãy tạo voucher đầu tiên.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vouchers.map((v) => (
                <div
                  key={v.id}
                  className={`flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 border rounded-xl transition-colors ${
                    v.is_active ? 'border-gray-100 hover:bg-gray-50' : 'border-gray-100 bg-gray-50 opacity-70'
                  }`}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${v.is_active ? 'bg-cyan-100' : 'bg-gray-100'}`}>
                      <Ticket className={`size-6 ${v.is_active ? 'text-cyan-600' : 'text-gray-400'}`} />
                    </div>

                    {editingId === v.id ? (
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-medium text-gray-600">Tên voucher</label>
                            <input
                              value={editForm.name ?? ''}
                              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">
                              Giá trị giảm ({v.voucher_type === 'PERCENT' ? '%' : '₫'})
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={editForm.discount_value ?? ''}
                              onChange={(e) => setEditForm((p) => ({ ...p, discount_value: Number(e.target.value) }))}
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                              disabled={v.voucher_type === 'FREESHIP'}
                            />
                          </div>

                          {v.voucher_type === 'PERCENT' && (
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Giảm tối đa (₫)</label>
                              <input
                                type="number"
                                value={editForm.max_discount_amount ?? ''}
                                onChange={(e) => setEditForm((p) => ({ ...p, max_discount_amount: e.target.value }))}
                                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                              />
                            </div>
                          )}
                          {v.voucher_type === 'FREESHIP' && (
                        <>
                            <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">
                                Loại vận chuyển
                            </label>

                            <select
                                value={
                                editForm.applicable_shipping_type ||
                                "ALL"
                                }
                                onChange={(e) =>
                                setEditForm((p) => ({
                                    ...p,
                                    applicable_shipping_type:
                                    e.target.value as any,
                                }))
                                }
                                className="w-full border rounded-lg px-3 py-1.5 text-sm"
                            >
                                <option value="ALL">
                                Tất cả
                                </option>

                                <option value="STANDARD">
                                Tiêu chuẩn
                                </option>

                                <option value="EXPRESS">
                                Hỏa tốc
                                </option>
                            </select>
                            </div>

                            <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">
                                Loại hàng
                            </label>

                            <select
                                value={
                                editForm.applicable_product_type ||
                                "ALL"
                                }
                                onChange={(e) =>
                                setEditForm((p) => ({
                                    ...p,
                                    applicable_product_type:
                                    e.target.value as any,
                                }))
                                }
                                className="w-full border rounded-lg px-3 py-1.5 text-sm"
                            >
                                <option value="ALL">
                                Tất cả
                                </option>

                                <option value="BULKY">
                                Hàng cồng kềnh
                                </option>
                            </select>
                            </div>

                            <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">
                                % giảm phí ship
                            </label>

                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={
                                editForm.freeship_discount_percent ??
                                ""
                                }
                                onChange={(e) =>
                                setEditForm((p) => ({
                                    ...p,
                                    freeship_discount_percent:
                                    e.target.value === ""
                                        ? ""
                                        : Number(
                                            e.target.value
                                        ),
                                }))
                                }
                                className="w-full border rounded-lg px-3 py-1.5 text-sm"
                            />
                            </div>

                            <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">
                                Khoảng cách tối đa (km)
                            </label>

                            <input
                                type="number"
                                value={
                                editForm.max_distance_km ??
                                ""
                                }
                                onChange={(e) =>
                                setEditForm((p) => ({
                                    ...p,
                                    max_distance_km:
                                    e.target.value === ""
                                        ? ""
                                        : Number(
                                            e.target.value
                                        ),
                                }))
                                }
                                className="w-full border rounded-lg px-3 py-1.5 text-sm"
                            />
                            </div>
                        </>
                        )}

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Đơn tối thiểu (₫)</label>
                            <input
                              type="number"
                              value={editForm.min_order_value ?? ''}
                              onChange={(e) => setEditForm((p) => ({ ...p, min_order_value: Number(e.target.value) }))}
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Lượt dùng / người</label>
                            <input
                              type="number"
                              value={editForm.usage_limit_per_user ?? ''}
                              onChange={(e) => setEditForm((p) => ({ ...p, usage_limit_per_user: Number(e.target.value) }))}
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Đối tượng nhận</label>
                            <select
                              value={editForm.target_audience ?? v.target_audience}
                              onChange={(e) => setEditForm((p) => ({ ...p, target_audience: e.target.value }))}
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-cyan-400 outline-none bg-white"
                            >
                              <option value="ALL">Tất cả người dùng</option>
                              <option value="NEW_USER">Người dùng mới</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Thời hạn sau cấp (giờ)</label>
                            <input
                              type="number"
                              value={editForm.validity_hours_after_grant ?? ''}
                              onChange={(e) => setEditForm((p) => ({ ...p, validity_hours_after_grant: e.target.value }))}
                              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                            />
                          </div>
                        </div>

                        {editError && <p className="text-red-500 text-xs">{editError}</p>}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(v)}
                            disabled={editSubmitting}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1"
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
                          <Badge className={`text-[11px] ${typeColor(v.voucher_type)}`}>
                            {typeLabel(v.voucher_type)}
                          </Badge>
                          <Badge className={v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                            {v.is_active ? 'Đang hoạt động' : 'Đã tắt'}
                          </Badge>
                          {v.target_audience === 'NEW_USER' && (
                            <Badge className="bg-orange-100 text-orange-700 text-[11px]">
                              Người mới
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{v.name}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                          <span>
                            Giảm:{' '}
                            <b className="text-gray-800">
                              {v.voucher_type === 'PERCENT'
                                ? `${v.discount_value}%`
                                : v.voucher_type === 'FREESHIP'
                                ? `Freeship ${v.freeship_discount_percent || 100}%`
                                : formatMoney(v.discount_value)}
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
                          {v.validity_hours_after_grant != null && (
                            <span>
                              Hết hạn sau: <b className="text-gray-800">{v.validity_hours_after_grant}h</b>
                            </span>
                          )}
                          <span>
                            Đối tượng: <b className="text-gray-800">{audienceLabel(v.target_audience)}</b>
                          </span>
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
                        className="text-gray-500 hover:text-cyan-600 hover:bg-cyan-50"
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