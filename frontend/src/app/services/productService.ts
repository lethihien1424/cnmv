// frontend/src/app/services/productService.ts
import { apiRequest } from './api';
import axios from 'axios';
/* =========================================================
   PATHS
========================================================= */
const PRODUCTS_PATH = '/products';
const CATEGORIES_PATH = '/categories';


/* =========================================================
   REGEX
========================================================= */
const VARIANT_MARKER_REGEX = /<!--variants:(.*?)-->/s;
const SPEC_MARKER_REGEX = /<!--specs:(.*?)-->/s;

/* =========================================================
   TYPES
========================================================= */

export type ProductCondition = 'NEW' | 'USED';

export interface ProductVariant {
  color: string;
  size: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
  image_index?: number;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ParsedProductMetadata {
  plainDescription: string;
  variants: ProductVariant[];
  specifications: ProductSpecification[];
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  price: number;
  description: string | null;
  images: string[] | null;
  stock_quantity: number;
  condition: ProductCondition;
  status: string;

  color?: string;
  size?: string;
  type?: string;
  is_bulky?: boolean;

  is_flash_sale?: boolean;
  flash_sale_price?: number | null;
  flash_sale_sold?: number;
  flash_sale_stock?: number;
  flash_sale_start_time?: string | null;
  flash_sale_end_time?: string | null;

  deleted_at?: string | null;

  created_at: string;
  updated_at: string;

  store?: any;
}

/* =========================================================
   CATEGORY
========================================================= */

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
}

/* =========================================================
   PRODUCT PAYLOAD
========================================================= */

export interface UpsertProductPayload {
  name: string;
  price: number;
  condition: ProductCondition;
  store_id: string;

  description?: string;
  stock_quantity?: number;
  category_id?: string;

  images?: File[];

  color?: string;
  size?: string;
  type?: string;
  is_bulky?: boolean;

  is_flash_sale?: boolean;
  flash_sale_price?: number;
  flash_sale_sold?: number;
  flash_sale_stock?: number;
}

/* =========================================================
   AUTH
========================================================= */

const getToken = (t?: string | null) =>
  t ?? localStorage.getItem('token');

/* =========================================================
   FORM DATA
========================================================= */

// Trong app/services/productService.ts
const buildFormData = (payload: Partial<any>) => {
  const fd = new FormData();

  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;

    // Xử lý File ảnh
    if (k === 'images' && Array.isArray(v)) {
      v.forEach((file) => {
        if (file instanceof File || file instanceof Blob) {
          fd.append('images', file);
        }
      });
      return;
    }

    // Xử lý mảng biến thể (variants)
    if (k === 'variants' && Array.isArray(v)) {
      fd.append('variants', JSON.stringify(v));
      return;
    }

    // Các trường khác (tên, giá, màu, size...)
    fd.append(k, String(v));
  });

  return fd;
};

/* =========================================================
   QUERY
========================================================= */

const qs = (query: any = {}) => {
  const p = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null) p.set(k, String(v));
  });
  return p.toString() ? `?${p}` : '';
};

/* =========================================================
   PRODUCT API
========================================================= */

export async function getProducts(query?: any): Promise<Product[]> {
  return apiRequest(`${PRODUCTS_PATH}${qs(query)}`, { method: 'GET' });
}

export async function getProductDetail(id: string): Promise<Product> {
  return apiRequest(`${PRODUCTS_PATH}/${id}`, { method: 'GET' });
}

// Dòng 214-219: Đây là code FRONTEND bị dán nhầm vào Backend!
export const createProduct = async (formData: FormData, token: string) => {
  // Thay thế đường dẫn bằng URL tuyệt đối để loại trừ lỗi Proxy
  const response = await axios.post(`/api/products`, formData, {
    headers: {
      'Authorization': `Bearer ${token}`, // Đảm bảo token không phải "Bearer undefined"
    },
  });
  return response.data;
};

export const updateProduct = async (id: string, formData: FormData, token: string) => {
  const response = await axios.put(`/api/products/${id}`, formData, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

export async function deleteProduct(id: string, token?: string | null) {
  return apiRequest(
    `${PRODUCTS_PATH}/${id}`,
    { method: 'DELETE' },
    getToken(token)
  );
}

export async function toggleProductStatus(productId: string, token?: string | null): Promise<Product> {
  return apiRequest(
    `${PRODUCTS_PATH}/${productId}/status`,
    { method: 'PATCH' },
    getToken(token)
  );
}

/* =========================================================
   SELLER (FIXED EXPORT MISSING)
========================================================= */

export async function getSellerProducts(options: {
  userId: string;
  storeId?: string;
  storeType?: 'C2C' | 'B2C';
}): Promise<Product[]> {
  const products = await getProducts({
    limit: 100,
    store_type: options.storeType,
    include_discontinued: 'true',
  });

  return products.filter((p) => {
    if (options.storeId && p.store_id === options.storeId) return true;
    return p.store?.owner?.id === options.userId;
  });
}

/* =========================================================
   CATEGORY API (FIX EXPORT ERROR)
========================================================= */

export async function getCategories(): Promise<Category[]> {
  return apiRequest(CATEGORIES_PATH, { method: 'GET' });
}

export async function createCategory(payload: any, token?: string | null) {
  return apiRequest(
    CATEGORIES_PATH,
    { method: 'POST', body: JSON.stringify(payload) },
    getToken(token)
  );
}

export async function updateCategory(id: string, payload: any, token?: string | null) {
  return apiRequest(
    `${CATEGORIES_PATH}/${id}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    getToken(token)
  );
}

export async function deleteCategory(id: string, token?: string | null) {
  return apiRequest(
    `${CATEGORIES_PATH}/${id}`,
    { method: 'DELETE' },
    getToken(token)
  );
}

/* =========================================================
   FLASH SALE (FIXED EXPORT MISSING)
========================================================= */

export async function updateFlashSale(
  productId: string,
  data: {
    is_flash_sale: boolean;
    flash_sale_price?: number | null;
    flash_sale_stock?: number;
  },
  token?: string | null
) {
  return apiRequest(
    `${PRODUCTS_PATH}/${productId}/flash-sale`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    getToken(token)
  );
}

export async function scheduleFlashSale(
  productId: string,
  data: any,
  token?: string | null
) {
  return apiRequest(
    `${PRODUCTS_PATH}/${productId}/flash-sale/schedule`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    getToken(token)
  );
}

export async function suggestFlashSale(productId: string, token?: string | null) {
  return apiRequest(
    `${PRODUCTS_PATH}/${productId}/flash-sale/suggest`,
    { method: 'GET' },
    getToken(token)
  );
}

/* =========================================================
   PARSER (SAFE)
========================================================= */

export function parseDescriptionMetadata(
  description: string | null | undefined
): ParsedProductMetadata {
  const raw = description || '';

  const variantMatch = raw.match(VARIANT_MARKER_REGEX);
  const specMatch = raw.match(SPEC_MARKER_REGEX);

  const plainDescription = raw
    .replace(VARIANT_MARKER_REGEX, '')
    .replace(SPEC_MARKER_REGEX, '')
    .trim();

  let variants: ProductVariant[] = [];
  let specifications: ProductSpecification[] = [];

  // =========================
  // SAFE VARIANT PARSE
  // =========================
  if (variantMatch?.[1]) {
    try {
      const parsed = JSON.parse(decodeURIComponent(variantMatch[1]));

      if (Array.isArray(parsed)) {
        variants = parsed
          .map((v) => ({
            color: v?.color?.trim() || '',
            size: v?.size?.trim() || '',
            price: Number(v?.price ?? 0),
            stock_quantity: Number(v?.stock_quantity ?? 0),
            image_url: v?.image_url || undefined,
            image_index: Number.isInteger(v?.image_index)
              ? v.image_index
              : undefined,
          }))
          // 🔥 IMPORTANT: chỉ giữ variant có ít nhất 1 thông tin thật
          .filter(
            (v) =>
              v.color !== '' ||
              v.size !== '' ||
              Number.isFinite(v.price)
          );
      }
    } catch {
      variants = [];
    }
  }

  // =========================
  // SAFE SPEC PARSE
  // =========================
  if (specMatch?.[1]) {
    try {
      const parsed = JSON.parse(decodeURIComponent(specMatch[1]));

      if (Array.isArray(parsed)) {
        specifications = parsed
          .map((s) => ({
            label: s?.label?.trim() || '',
            value: s?.value?.trim() || '',
          }))
          .filter((s) => s.label && s.value);
      }
    } catch {
      specifications = [];
    }
  }

  return {
    plainDescription,
    variants,
    specifications,
  };
}

/* =========================================================
   BUILDER
========================================================= */

export function buildDescriptionWithVariants(
  desc: string,
  variants: ProductVariant[],
  specs: ProductSpecification[] = []
) {
  let result = desc?.trim() || '';

  if (variants.length) {
    result += `\n<!--variants:${encodeURIComponent(JSON.stringify(variants))}-->`;
  }

  if (specs.length) {
    result += `\n<!--specs:${encodeURIComponent(JSON.stringify(specs))}-->`;
  }

  return result;
}