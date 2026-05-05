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
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  FolderOpen,
  Search
} from 'lucide-react';

type CategoryRow = Category & {
  icon: string;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export default function CategoryManagement() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📦'
  });

  const iconOptions = ['📱', '👕', '🛋️', '💄', '🍕', '🎮', '📚', '⚽', '📦', '🎨', '🏠', '💻', '🎵', '📷', '🚗', '🌱'];

  const loadCategories = async () => {
    setIsLoading(true);

    try {
      const [categoryList, products] = await Promise.all([
        getCategories(),
        getProducts({ limit: 500 }),
      ]);

      const productCountByCategory = new Map<string, number>();
      products.forEach((product) => {
        if (!product.category_id) {
          return;
        }

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
        createdAt: category.createdAt ? new Date(category.createdAt) : new Date(),
        updatedAt: category.updatedAt ? new Date(category.updatedAt) : new Date(),
      }));

      setCategories(mappedCategories);
    } catch {
      setCategories([]);
      alert('Không tải được danh mục từ backend');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const handleAdd = () => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên danh mục');
      return;
    }

    void (async () => {
      try {
        const createdCategory = await createCategory(
          {
            name: formData.name.trim(),
            description: formData.description.trim(),
          },
          token,
        );
        setCategoryIcon(createdCategory.id, formData.icon);
        await loadCategories();
        setFormData({ name: '', description: '', icon: '📦' });
        setIsAdding(false);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Thêm danh mục thất bại');
      }
    })();
  };

  const handleEdit = (category: CategoryRow) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon
    });
  };

  const handleUpdate = () => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên danh mục');
      return;
    }

    if (!editingId) {
      return;
    }

    void (async () => {
      try {
        await updateCategory(
          editingId,
          {
            name: formData.name.trim(),
            description: formData.description.trim(),
          },
          token,
        );
        setCategoryIcon(editingId, formData.icon);
        await loadCategories();
        setEditingId(null);
        setFormData({ name: '', description: '', icon: '📦' });
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Cập nhật danh mục thất bại');
      }
    })();
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa danh mục này?')) {
      void (async () => {
        try {
          await deleteCategory(id, token);
          removeCategoryIcon(id);
          await loadCategories();
        } catch (error) {
          alert(error instanceof Error ? error.message : 'Xóa danh mục thất bại');
        }
      })();
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', description: '', icon: '📦' });
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Button onClick={() => setIsAdding(true)} className="bg-gradient-to-r from-cyan-500 to-blue-600">
              <Plus className="size-4 mr-2" />
              Thêm danh mục
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Bar */}
        {!isAdding && !editingId && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm danh mục..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="mb-6 p-6 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium mb-4">
              {isAdding ? 'Thêm danh mục mới' : 'Chỉnh sửa danh mục'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Icon</label>
                <div className="grid grid-cols-8 gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`p-3 text-2xl border rounded-lg hover:bg-white transition-colors ${
                        formData.icon === icon ? 'bg-cyan-100 border-cyan-500' : 'bg-white'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tên danh mục *</label>
                <Input
                  type="text"
                  placeholder="Nhập tên danh mục"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Mô tả</label>
                <Input
                  type="text"
                  placeholder="Nhập mô tả danh mục"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={isAdding ? handleAdd : handleUpdate}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  <Save className="size-4 mr-2" />
                  {isAdding ? 'Thêm' : 'Cập nhật'}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="size-4 mr-2" />
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Categories Table */}
        {!isAdding && !editingId && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Icon</th>
                  <th className="text-left py-3 px-4 font-medium">Tên danh mục</th>
                  <th className="text-left py-3 px-4 font-medium">Mô tả</th>
                  <th className="text-left py-3 px-4 font-medium">Sản phẩm</th>
                  <th className="text-left py-3 px-4 font-medium">Cập nhật</th>
                  <th className="text-right py-3 px-4 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      Đang tải danh mục...
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'Không tìm thấy danh mục phù hợp' : 'Chưa có danh mục nào'}
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((category) => (
                    <tr key={category.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <span className="text-3xl">{category.icon}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">{category.name}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {category.description}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="secondary">{category.productCount} SP</Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-500">
                          {new Date(category.updatedAt).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="size-4 mr-1" />
                            Sửa
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(category.id)}
                          >
                            <Trash2 className="size-4 mr-1" />
                            Xóa
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

        {/* Summary */}
        {!isAdding && !editingId && filteredCategories.length > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-600">
            <span>Tổng số: {filteredCategories.length} danh mục</span>
            <span>Tổng sản phẩm: {filteredCategories.reduce((sum, cat) => sum + cat.productCount, 0)} sản phẩm</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
