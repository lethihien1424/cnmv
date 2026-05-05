import { apiRequest } from './api';

const DASHBOARD_BASE_PATH = '/admin/dashboard';

export interface AdminDashboardStats {
  totalCustomers: number;
  totalStores: number;
  totalProducts: number;
  totalRevenue: number;
  storeStatusSummary: {
    pending: number;
    approved: number;
    rejected: number;
    inactive: number;
  };
}

export interface PlatformIncomePeriod {
  period: 'day' | 'month' | 'quarter' | 'year' | 'custom';
  range: {
    from: string;
    to: string;
  };
  orderCount: number;
  totalOrderRevenue: number;
  fixedFeeIncome: number;
  paymentFeeIncome: number;
  serviceFeeIncome: number;
  totalPlatformIncome: number;
  totalOwnerIncome: number;
  takeRate: number;
  totalStoresWithOrders: number;
  topStores?: Array<{
    storeId: string;
    storeName: string;
    orderCount: number;
    totalOrderRevenue: number;
    totalPlatformIncome: number;
    totalOwnerIncome: number;
  }>;
  bottomStores?: Array<{
    storeId: string;
    storeName: string;
    orderCount: number;
    totalOrderRevenue: number;
    totalPlatformIncome: number;
    totalOwnerIncome: number;
  }>;
  allStores?: Array<{
    storeId: string;
    storeName: string;
    orderCount: number;
    totalOrderRevenue: number;
    totalPlatformIncome: number;
    totalOwnerIncome: number;
  }>;
}

export interface PlatformIncomeSummary {
  day: PlatformIncomePeriod;
  month: PlatformIncomePeriod;
  quarter: PlatformIncomePeriod;
  year: PlatformIncomePeriod;
}

export async function getAdminDashboardStats(token?: string | null): Promise<AdminDashboardStats> {
  return apiRequest<AdminDashboardStats>(
    `${DASHBOARD_BASE_PATH}/stats`,
    { method: 'GET' },
    token ?? localStorage.getItem('token'),
  );
}

export async function getAdminPlatformIncomeSummary(token?: string | null): Promise<PlatformIncomeSummary> {
  return apiRequest<PlatformIncomeSummary>(
    `${DASHBOARD_BASE_PATH}/platform-income`,
    { method: 'GET' },
    token ?? localStorage.getItem('token'),
  );
}

export interface PlatformIncomeReportFilter {
  period?: 'day' | 'month' | 'quarter' | 'year' | 'custom';
  from?: string;
  to?: string;
}

export async function getAdminPlatformIncomeReport(
  filter: PlatformIncomeReportFilter,
  token?: string | null,
): Promise<PlatformIncomePeriod> {
  const params = new URLSearchParams();

  if (filter.period) {
    params.set('period', filter.period);
  }
  if (filter.from) {
    params.set('from', filter.from);
  }
  if (filter.to) {
    params.set('to', filter.to);
  }

  const query = params.toString();
  const path = query
    ? `${DASHBOARD_BASE_PATH}/platform-income/report?${query}`
    : `${DASHBOARD_BASE_PATH}/platform-income/report`;

  return apiRequest<PlatformIncomePeriod>(
    path,
    { method: 'GET' },
    token ?? localStorage.getItem('token'),
  );
}
