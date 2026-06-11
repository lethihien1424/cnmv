import { apiRequest } from "./api";

export const dashboardAPI = {
  async getStoreOverview(storeId: string, query?: Record<string, string>) {
    let path = `/dashboard/store-overview/${storeId}`;
    if (query && Object.keys(query).length > 0) {
      const params = new URLSearchParams(query);
      path += `?${params.toString()}`;
    }

    return apiRequest<any>(path, { method: 'GET' });
  },
};
