import { apiRequest } from './api';

const PRODUCTS_PATH = '/products';
const CATEGORIES_PATH = '/categories';

export type ProductCondition = 'NEW' | 'USED';
const VARIANT_MARKER_REGEX = /<!--variants:(.*?)-->/s;
const SPEC_MARKER_REGEX = /<!--specs:(.*?)-->/s;

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
  is_flash_sale?: boolean;
  flash_sale_price?: number | null;
  flash_sale_sold?: number;
  flash_sale_stock?: number;
  flash_sale_start_time?: string | null;
  flash_sale_end_time?: string | null;
  created_at: string;
  updated_at: string;
  store?: {
    id: string;
    store_name: string;
    store_type: 'C2C' | 'B2C';
    status: string;
    owner?: {
      id: string;
      username: string;
      email: string;
      role: string;
      status: string;
    };
  };
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertCategoryPayload {
  name: string;
  description?: string;
  parent_id?: string | null;
}

export interface ParsedProductMetadata {
  plainDescription: string;
  variants: ProductVariant[];
  specifications: ProductSpecification[];
}

export interface UpsertProductPayload {
  name: string;
  price: number;
  condition: ProductCondition;
  store_id: string;
  description?: string;
  stock_quantity?: number;
  is_flash_sale?: boolean;
  flash_sale_price?: number;
  flash_sale_sold?: number;
  flash_sale_stock?: number;
  flash_sale_start_time?: string;
  flash_sale_end_time?: string;
  category_id?: string;
  images?: File[];
}

export interface FlashSalePayload {
  is_flash_sale: boolean;
  flash_sale_price?: number | null;
  flash_sale_stock?: number;
}

export interface FlashSaleSchedulePayload {
  flash_sale_price: number;
  flash_sale_stock?: number;
  flash_sale_start_time: string;
  flash_sale_end_time: string;
}

export interface FlashSaleSuggestion {
  product_id: string;
  product_name: string;
  original_price: number;
  stock_quantity: number;
  suggested_flash_sale_price: number;
  suggested_flash_sale_stock: number;
  suggested_flash_sale_start_time: string;
  suggested_flash_sale_end_time: string;
  rationale: string;
}

export interface ProductQuery {
  keyword?: string;
  category_id?: string;
  store_type?: 'C2C' | 'B2C';
  limit?: number;
  offset?: number;
}

const buildAuthToken = (token?: string | null) => token ?? localStorage.getItem('token');

const buildProductFormData = (payload: Partial<UpsertProductPayload>) => {
  const formData = new FormData();

  if (payload.name !== undefined) formData.append('name', payload.name);
  if (payload.description !== undefined) formData.append('description', payload.description);
  if (payload.price !== undefined) formData.append('price', String(payload.price));
  if (payload.stock_quantity !== undefined) {
    formData.append('stock_quantity', String(payload.stock_quantity));
  }
  if (payload.is_flash_sale !== undefined) {
    formData.append('is_flash_sale', String(payload.is_flash_sale));
  }
  if (payload.flash_sale_price !== undefined) {
    formData.append('flash_sale_price', String(payload.flash_sale_price));
  }
  if (payload.flash_sale_sold !== undefined) {
    formData.append('flash_sale_sold', String(payload.flash_sale_sold));
  }
  if (payload.flash_sale_stock !== undefined) {
    formData.append('flash_sale_stock', String(payload.flash_sale_stock));
  }
  if (payload.category_id !== undefined) formData.append('category_id', payload.category_id);
  if (payload.condition !== undefined) formData.append('condition', payload.condition);
  if (payload.store_id !== undefined) formData.append('store_id', payload.store_id);

  if (payload.images && payload.images.length > 0) {
    payload.images.forEach((file) => formData.append('images', file));
  }

  return formData;
};

const buildQueryString = (query: ProductQuery = {}) => {
  const params = new URLSearchParams();

  if (query.keyword) params.set('keyword', query.keyword);
  if (query.category_id) params.set('category_id', query.category_id);
  if (query.store_type) params.set('store_type', query.store_type);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset !== undefined) params.set('offset', String(query.offset));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

export async function getProducts(query?: ProductQuery): Promise<Product[]> {
  return apiRequest<Product[]>(`${PRODUCTS_PATH}${buildQueryString(query)}`, {
    method: 'GET',
  });
}

export async function getProductDetail(productId: string): Promise<Product> {
  return apiRequest<Product>(`${PRODUCTS_PATH}/${productId}`, {
    method: 'GET',
  });
}

export async function getCategories(): Promise<Category[]> {
  return apiRequest<Category[]>(CATEGORIES_PATH, {
    method: 'GET',
  });
}

export async function createCategory(
  payload: UpsertCategoryPayload,
  token?: string | null,
): Promise<Category> {
  return apiRequest<Category>(
    CATEGORIES_PATH,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    buildAuthToken(token),
  );
}

export async function updateCategory(
  categoryId: string,
  payload: Partial<UpsertCategoryPayload>,
  token?: string | null,
): Promise<Category> {
  return apiRequest<Category>(
    `${CATEGORIES_PATH}/${categoryId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    buildAuthToken(token),
  );
}

export async function deleteCategory(categoryId: string, token?: string | null): Promise<unknown> {
  return apiRequest<unknown>(
    `${CATEGORIES_PATH}/${categoryId}`,
    {
      method: 'DELETE',
    },
    buildAuthToken(token),
  );
}

export function buildDescriptionWithVariants(
  plainDescription: string,
  variants: ProductVariant[],
  specifications: ProductSpecification[] = [],
): string {
  const safeDescription = plainDescription
    .replace(VARIANT_MARKER_REGEX, '')
    .replace(SPEC_MARKER_REGEX, '')
    .trim();

  const sections = [safeDescription].filter(Boolean);

  if (variants.length > 0) {
    const encodedVariants = encodeURIComponent(JSON.stringify(variants));
    sections.push(`<!--variants:${encodedVariants}-->`);
  }

  if (specifications.length > 0) {
    const encodedSpecs = encodeURIComponent(JSON.stringify(specifications));
    sections.push(`<!--specs:${encodedSpecs}-->`);
  }

  if (sections.length === 0) {
    return '';
  }

  if (sections.length === 1 && sections[0] === safeDescription) {
    return safeDescription;
  }

  return sections.join('\n');
}

export function parseDescriptionMetadata(description: string | null | undefined): ParsedProductMetadata {
  const rawDescription = description || '';
  const variantMatch = rawDescription.match(VARIANT_MARKER_REGEX);
  const specMatch = rawDescription.match(SPEC_MARKER_REGEX);
  const plainDescription = rawDescription
    .replace(VARIANT_MARKER_REGEX, '')
    .replace(SPEC_MARKER_REGEX, '')
    .trim();

  let variants: ProductVariant[] = [];
  let specifications: ProductSpecification[] = [];

  if (variantMatch?.[1]) {
    try {
      const parsed = JSON.parse(decodeURIComponent(variantMatch[1])) as ProductVariant[];
      variants = parsed
        .filter((variant) => variant && variant.color && variant.size)
        .map((variant) => ({
          color: String(variant.color),
          size: String(variant.size),
          price: Number(variant.price),
          stock_quantity: Number(variant.stock_quantity || 0),
          image_url: typeof variant.image_url === 'string' ? variant.image_url : undefined,
          image_index:
            typeof variant.image_index === 'number' && Number.isInteger(variant.image_index)
              ? variant.image_index
              : undefined,
        }))
        .filter((variant) => Number.isFinite(variant.price) && variant.price >= 0);
    } catch {
      variants = [];
    }
  }

  if (specMatch?.[1]) {
    try {
      const parsed = JSON.parse(decodeURIComponent(specMatch[1])) as ProductSpecification[];
      specifications = parsed
        .filter((spec) => spec && spec.label && spec.value)
        .map((spec) => ({
          label: String(spec.label).trim(),
          value: String(spec.value).trim(),
        }))
        .filter((spec) => spec.label.length > 0 && spec.value.length > 0);
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

export async function getSellerProducts(options: {
  userId: string;
  token?: string | null;
  storeId?: string;
  storeType?: 'C2C' | 'B2C';
}): Promise<Product[]> {
  const products = await getProducts({
    limit: 100,
    store_type: options.storeType,
  });

  return products.filter((product) => {
    if (options.storeId && product.store_id === options.storeId) {
      return true;
    }

    return product.store?.owner?.id === options.userId;
  });
}

export async function createProduct(
  payload: UpsertProductPayload,
  token?: string | null,
): Promise<Product> {
  return apiRequest<Product>(
    PRODUCTS_PATH,
    {
      method: 'POST',
      body: buildProductFormData(payload),
    },
    buildAuthToken(token),
  );
}

export async function updateProduct(
  productId: string,
  payload: Partial<UpsertProductPayload>,
  token?: string | null,
): Promise<Product> {
  return apiRequest<Product>(
    `${PRODUCTS_PATH}/${productId}`,
    {
      method: 'PUT',
      body: buildProductFormData(payload),
    },
    buildAuthToken(token),
  );
}

export async function deleteProduct(productId: string, token?: string | null): Promise<unknown> {
  return apiRequest<unknown>(
    `${PRODUCTS_PATH}/${productId}`,
    {
      method: 'DELETE',
    },
    buildAuthToken(token),
  );
}
// Thêm vào file src/app/services/productService.ts
export async function updateFlashSale(
  productId: string,
  data: FlashSalePayload,
  token?: string | null,
): Promise<Product> {
  return apiRequest<Product>(
    `${PRODUCTS_PATH}/${productId}/flash-sale`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    buildAuthToken(token),
  );
}

export async function scheduleFlashSale(
  productId: string,
  data: FlashSaleSchedulePayload,
  token?: string | null,
): Promise<Product> {
  return apiRequest<Product>(
    `${PRODUCTS_PATH}/${productId}/flash-sale/schedule`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    buildAuthToken(token),
  );
}

export async function suggestFlashSale(
  productId: string,
  token?: string | null,
): Promise<FlashSaleSuggestion> {
  return apiRequest<FlashSaleSuggestion>(
    `${PRODUCTS_PATH}/${productId}/flash-sale/suggest`,
    {
      method: 'GET',
    },
    buildAuthToken(token),
  );
}