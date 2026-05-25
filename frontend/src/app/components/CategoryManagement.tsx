import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getProducts,
  updateCategory,
  type Category,
} from '../services/productService';
import {
  getCategoryIcon,
  guessCategoryIcon,
  removeCategoryIcon,
  setCategoryIcon,
} from '../utils/categoryIcon';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  FolderOpen,
  Search,
  Tag,
  Package,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryRow = Category & {
  icon: string;
  productCount: number;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Tự động tạo slug từ tên tiếng Việt */
const generateSlug = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// ─── Component ────────────────────────────────────────────────────────────────

export default function CategoryManagement() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '', icon: '📦' });
  const [isSaving, setIsSaving] = useState(false);

  const iconOptions = [
    '📱', '👕', '🛋️', '💄', '🍕', '🎮', '📚', '⚽',
    '📦', '🎨', '🏠', '💻', '🎵', '📷', '🚗', '🌱',
    '🍎', '👟', '🧴', '🔧', '💎', '🧸', '🛒', '🎁',
  ];

  // ── Slug tự động hiển thị preview ─────────────────────────────────────────
  const slugPreview = formData.name ? generateSlug(formData.name) : '';

  // ── Load dữ liệu ──────────────────────────────────────────────────────────
  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const [categoryList, products] = await Promise.all([
        getCategories(),
        getProducts({ limit: 500 }),
      ]);

      const productCountByCategory = new Map<string, number>();
      products.forEach((product) => {
        if (!product.category_id) return;
        productCountByCategory.set(
          product.category_id,
          (productCountByCategory.get(product.category_id) || 0) + 1,
        );
      });

      const mappedCategories: CategoryRow[] = categoryList.map((category, index) => ({
        ...category,
        description: category.description || '',
        icon: getCategoryIcon(category.id) || guessCategoryIcon(category.name) || iconOptions[index % iconOptions.length],
        productCount: productCountByCategory.get(category.id) || 0,
        slug: generateSlug(category.name),
        createdAt: category.createdAt ? new Date(category.createdAt) : new Date(),
        updatedAt: category.updatedAt ? new Date(category.updatedAt) : new Date(),
      }));

      setCategories(mappedCategories);
    } catch {
      setCategories([]);
      toast.error('Không tải được danh mục từ server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadCategories(); }, []);

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }
    setIsSaving(true);
    try {
      const createdCategory = await createCategory(
        { name: formData.name.trim(), description: formData.description.trim() },
        token,
      );
      setCategoryIcon(createdCategory.id, formData.icon);
      await loadCategories();
      setFormData({ name: '', description: '', icon: '📦' });
      setIsAdding(false);
      toast.success(`Đã thêm danh mục "${formData.name.trim()}"`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Thêm danh mục thất bại';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (category: CategoryRow) => {
    setEditingId(category.id);
    setFormData({ name: category.name, description: category.description || '', icon: category.icon });
  };

  const handleUpdate = async () => {
    if (!formData.name.trim() || !editingId) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }
    setIsSaving(true);
    try {
      await updateCategory(
        editingId,
        { name: formData.name.trim(), description: formData.description.trim() },
        token,
      );
      setCategoryIcon(editingId, formData.icon);
      await loadCategories();
      setEditingId(null);
      setFormData({ name: '', description: '', icon: '📦' });
      toast.success('Cập nhật danh mục thành công');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Cập nhật danh mục thất bại';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeletingId(id);
    // Dùng toast confirm thay vì window.confirm
    toast(`Xóa danh mục "${name}"?`, {
      description: 'Hành động này không thể hoàn tác.',
      action: {
        label: 'Xóa',
        onClick: async () => {
          try {
            await deleteCategory(id, token);
            removeCategoryIcon(id);
            await loadCategories();
            toast.success(`Đã xóa danh mục "${name}"`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Xóa danh mục thất bại';
            toast.error(msg);
          } finally {
            setDeletingId(null);
          }
        },
      },
      cancel: {
        label: 'Hủy',
        onClick: () => setDeletingId(null),
      },
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', description: '', icon: '📦' });
  };

  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.slug.includes(searchTerm.toLowerCase()),
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-10 bg-cyan-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="size-5 text-cyan-600" />
            </div>
            <div>
              <CardTitle>Quản lý Danh mục</CardTitle>
              <CardDescription>Thêm, sửa, xóa danh mục sản phẩm</CardDescription>
            </div>
          </div>
          {!isAdding && !editingId && (
            <Button
              id="btn-add-category"
              onClick={() => setIsAdding(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 gap-2"
            >
              <Plus className="size-4" />
              Thêm danh mục
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* ── Thanh tìm kiếm ── */}
        {!isAdding && !editingId && (
          <div className="mb-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                id="input-category-search"
                type="text"
                placeholder="Tìm theo tên, mô tả hoặc slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* ── Form Thêm / Sửa ── */}
        {(isAdding || editingId) && (
          <div className="mb-6 p-6 border rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 space-y-5">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {isAdding ? <Plus className="size-5 text-cyan-600" /> : <Edit className="size-5 text-blue-600" />}
              {isAdding ? 'Thêm danh mục mới' : 'Chỉnh sửa danh mục'}
            </h3>

            {/* Chọn icon */}
            <div>
              <label className="block text-sm font-medium mb-2">Icon đại diện</label>
              <div className="grid grid-cols-8 gap-2">
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`p-2.5 text-2xl border-2 rounded-lg hover:bg-white transition-all ${
                      formData.icon === icon
                        ? 'bg-white border-cyan-500 shadow-md scale-110'
                        : 'bg-white/60 border-transparent'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Tên danh mục */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Tên danh mục <span className="text-red-500">*</span>
              </label>
              <Input
                id="input-category-name"
                type="text"
                placeholder="Ví dụ: Đồ điện tử, Thời trang..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && (isAdding ? void handleAdd() : void handleUpdate())}
              />
              {/* Slug preview */}
              {slugPreview && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Tag className="size-3" />
                  Slug: <code className="bg-gray-100 px-1 rounded">{slugPreview}</code>
                </p>
              )}
            </div>

            {/* Mô tả */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Mô tả</label>
              <Input
                id="input-category-description"
                type="text"
                placeholder="Mô tả ngắn về danh mục này"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                id="btn-save-category"
                onClick={() => void (isAdding ? handleAdd() : handleUpdate())}
                disabled={isSaving || !formData.name.trim()}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 gap-2"
              >
                <Save className="size-4" />
                {isSaving ? 'Đang lưu...' : isAdding ? 'Thêm danh mục' : 'Lưu thay đổi'}
              </Button>
              <Button id="btn-cancel-category" variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="size-4 mr-1" />
                Hủy
              </Button>
            </div>
          </div>
        )}

        {/* ── Bảng danh mục ── */}
        {!isAdding && !editingId && (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="py-3 px-4 text-left font-medium text-gray-600 w-12">STT</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 w-14">Icon</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Tên danh mục</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Mô tả</th>
                  <th className="py-3 px-4 text-center font-medium text-gray-600 w-24">Sản phẩm</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600 w-28">Cập nhật</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-600 w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="size-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        Đang tải danh mục...
                      </div>
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      <FolderOpen className="size-10 mx-auto mb-2 opacity-30" />
                      {searchTerm ? 'Không tìm thấy danh mục phù hợp' : 'Chưa có danh mục nào'}
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((category, index) => (
                    <tr
                      key={category.id}
                      className="border-b last:border-0 hover:bg-cyan-50/40 transition-colors"
                    >
                      {/* STT */}
                      <td className="py-4 px-4 text-gray-400 text-xs font-mono">{index + 1}</td>

                      {/* Icon */}
                      <td className="py-4 px-4">
                        <span className="text-2xl">{category.icon}</span>
                      </td>

                      {/* Tên + Slug */}
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">{category.name}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5 flex items-center gap-1">
                          <Tag className="size-3" />{category.slug}
                        </div>
                      </td>

                      {/* Mô tả */}
                      <td className="py-4 px-4">
                        <div className="text-gray-600 max-w-xs truncate">
                          {category.description || <span className="italic text-gray-300">Chưa có mô tả</span>}
                        </div>
                      </td>

                      {/* Số sản phẩm */}
                      <td className="py-4 px-4 text-center">
                        <Badge
                          variant={category.productCount > 0 ? 'secondary' : 'outline'}
                          className="gap-1"
                        >
                          <Package className="size-3" />
                          {category.productCount}
                        </Badge>
                      </td>

                      {/* Ngày cập nhật */}
                      <td className="py-4 px-4 text-gray-500 text-xs">
                        {new Date(category.updatedAt).toLocaleDateString('vi-VN')}
                      </td>

                      {/* Thao tác */}
                      <td className="py-4 px-4">
                        <div className="flex gap-1.5 justify-end">
                          <Button
                            id={`btn-edit-category-${category.id}`}
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(category)}
                            className="hover:border-blue-400 hover:text-blue-600 h-8"
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <Button
                            id={`btn-delete-category-${category.id}`}
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(category.id, category.name)}
                            disabled={deletingId === category.id}
                            className="h-8"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Summary bar ── */}
        {!isAdding && !editingId && filteredCategories.length > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-gray-500">
            <span>
              Hiển thị <strong className="text-gray-800">{filteredCategories.length}</strong>
              {searchTerm ? ` / ${categories.length}` : ''} danh mục
            </span>
            <span>
              Tổng sản phẩm:{' '}
              <strong className="text-gray-800">
                {filteredCategories.reduce((sum, cat) => sum + cat.productCount, 0)}
              </strong>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
