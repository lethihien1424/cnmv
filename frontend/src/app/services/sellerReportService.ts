import { apiRequest } from './api';

export type SellerReportPeriod = 'day' | 'month' | 'quarter' | 'year';

export interface SellerReportTimelineItem {
  label: string;
  revenue: number;
  cost: number;
  income: number;
}

export interface SellerReportData {
  storeId: string;
  storeName: string;
  period: SellerReportPeriod;
  range: {
    from: string;
    to: string;
  };
  orderCount: number;
  summary: {
    revenue: number;
    fixedFee: number;
    paymentFee: number;
    shippingFee: number;
    serviceFee: number;
    returnFee: number;
    platformCost: number;
    netIncome: number;
  };
  timeline: SellerReportTimelineItem[];
}

export async function getMySellerReport(
  period: SellerReportPeriod,
  token?: string | null,
): Promise<SellerReportData> {
  const authToken = token ?? localStorage.getItem('token');
  const reportPath = `my-report?period=${encodeURIComponent(period)}`;
  const candidatePaths = [
    `/stores/${reportPath}`,
    `/admin/${reportPath}`,
  ];

  let lastStatus = 0;
  let lastMessage = 'Không thể tải báo cáo doanh thu';

  for (const path of candidatePaths) {
    try {
      return await apiRequest<SellerReportData>(path, { method: 'GET' }, authToken);
    } catch (error: any) {
      lastStatus = error?.response?.status || 0;
      lastMessage = error?.message || `Request failed with status ${lastStatus}`;

      if (lastStatus !== 404) {
        break;
      }
    }
  }

  if (lastStatus === 404) {
    throw new Error('Không tìm thấy endpoint báo cáo doanh thu (404). Vui lòng restart backend để nạp route mới.');
  }

  throw new Error(lastMessage);
}
