import { apiRequest } from './api';

export type AdminStoreStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE';

export interface AdminStore {
  id: string;
  owner_id: string;
  store_type: 'B2C' | 'C2C';
  store_name: string;
  description: string | null;
  business_license: string | null;
  status: AdminStoreStatus;
  tax_code: string | null;
  representative_name: string | null;
  identity_card: string | null;
  bank_account?: string | null;
  dossier_key?: string | null;
  policy_accepted?: boolean;
  policy_accepted_at?: string | null;
  fee_policy_version?: string;
  fixed_fee_rate?: number;
  payment_fee_rate?: number;
  service_fee_rate?: number;
  return_fee_cap_standard?: number;
  return_fee_cap_express?: number;
  tax_threshold_per_year?: number;
  vat_tax_rate?: number;
  pit_tax_rate?: number;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    username: string;
    email: string;
  };
  products?: Array<{
    id: string;
    name: string;
    price: number;
    stock_quantity: number;
    status: string;
  }>;
  orders?: Array<{
    id: string;
    total_amount: number;
    order_status: string;
    payment_status: string;
    createdAt: string;
  }>;
  totalRevenue?: number;
  totalOrders?: number;
  totalProducts?: number;
}

export interface AdminUserDetail {
  id: string;
  username: string;
  email: string;
  role: 'Customer' | 'Business';
  status: string;
  createdAt: string;
  stores: Array<{
    id: string;
    store_name: string;
    store_type: 'C2C' | 'B2C';
    status: string;
    description?: string | null;
    business_license?: string | null;
    createdAt: string;
  }>;
  orders: Array<{
    id: string;
    total_amount: number;
    order_status: string;
    payment_status: string;
    createdAt: string;
  }>;
  totalOrders: number;
  totalSpent: number;
  totalStores: number;
  accountType: 'C2C' | 'B2C';
  latestStoreStatus: string | null;
}

const ADMIN_STORES_PATH = '/admin';

export async function getPendingStores(token?: string | null): Promise<AdminStore[]> {
  return apiRequest<AdminStore[]>(`${ADMIN_STORES_PATH}/stores/pending`, { method: 'GET' }, token ?? localStorage.getItem('token'));
}

export async function getApprovedStores(token?: string | null): Promise<AdminStore[]> {
  return apiRequest<AdminStore[]>(`${ADMIN_STORES_PATH}/approved-stores`, { method: 'GET' }, token ?? localStorage.getItem('token'));
}

export async function getDashboardStores(token?: string | null): Promise<AdminStore[]> {
  return apiRequest<AdminStore[]>(`${ADMIN_STORES_PATH}/dashboard/stores`, { method: 'GET' }, token ?? localStorage.getItem('token'));
}

export async function getDashboardStoreDetail(storeId: string, token?: string | null): Promise<AdminStore> {
  return apiRequest<AdminStore>(`${ADMIN_STORES_PATH}/dashboard/stores/${storeId}`, { method: 'GET' }, token ?? localStorage.getItem('token'));
}

export async function getDashboardUsers(token?: string | null): Promise<AdminUserDetail[]> {
  return apiRequest<AdminUserDetail[]>(`${ADMIN_STORES_PATH}/dashboard/users`, { method: 'GET' }, token ?? localStorage.getItem('token'));
}

export async function getDashboardUserDetail(userId: string, token?: string | null): Promise<AdminUserDetail> {
  return apiRequest<AdminUserDetail>(`${ADMIN_STORES_PATH}/dashboard/users/${userId}`, { method: 'GET' }, token ?? localStorage.getItem('token'));
}

export async function updateAdminStoreStatus(
  storeId: string,
  status: AdminStoreStatus,
  token?: string | null,
): Promise<AdminStore> {
  return apiRequest<AdminStore>(
    `${ADMIN_STORES_PATH}/stores/${storeId}/status`,
    {
      method: 'PUT',
      body: JSON.stringify({ status }),
    },
    token ?? localStorage.getItem('token'),
  );
}

// ─── AI OCR Types & Service ──────────────────────────────────────────────────

export interface OcrScanResult {
  /** Văn bản thô AI đọc được từ ảnh GPKD */
  rawText: string;
  /** MST trích xuất được từ ảnh (có thể null nếu không đọc được) */
  extractedTaxCode: string | null;
  /** Tên doanh nghiệp để đối chiếu */
  extractedName: string | null;
  /** Điểm khớp tổng hợp (0.0 – 1.0) */
  matchScore: number;
  /** true nếu matchScore >= 0.9 */
  isMatch: boolean;
  details: {
    /** MST có khớp chính xác không */
    taxCodeMatch: boolean;
    /** Điểm khớp tên doanh nghiệp (0.0 – 1.0) */
    nameMatchScore: number;
    /** MST đã đăng ký trong hệ thống */
    storeTaxCode: string | null;
    /** Tên shop đã đăng ký */
    storeStoreName: string;
  };
}

/**
 * Gọi AI OCR để quét ảnh GPKD của một cửa hàng và đối chiếu thông tin.
 * Chỉ dành cho Admin.
 */
export async function scanBusinessLicense(
  storeId: string,
  token?: string | null,
): Promise<OcrScanResult> {
  return apiRequest<OcrScanResult>(
    `${ADMIN_STORES_PATH}/scan-license/${storeId}`,
    { method: 'POST' },
    token ?? localStorage.getItem('token'),
  );
}

export async function deleteDashboardUser(userId: string, token?: string | null): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/user/${userId}`, { method: 'DELETE' }, token ?? localStorage.getItem('token'));
}

export async function updateDashboardUser(userId: string, data: Partial<AdminUserDetail>, token?: string | null): Promise<AdminUserDetail> {
  return apiRequest<AdminUserDetail>(
    `/user/${userId}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    token ?? localStorage.getItem('token'),
  );
}

export async function createDashboardUser(data: Partial<AdminUserDetail>, token?: string | null): Promise<AdminUserDetail> {
  return apiRequest<AdminUserDetail>(
    '/user',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token ?? localStorage.getItem('token'),
  );
}

