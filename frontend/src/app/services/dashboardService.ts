import { API_BASE_URL } from "./api";

export const dashboardAPI = {
  async getStoreOverview(storeId: string, query?: Record<string, string>) {
    const token = localStorage.getItem("token");
    
    let url = `${API_BASE_URL}/dashboard/store-overview/${storeId}`;
    if (query && Object.keys(query).length > 0) {
      const params = new URLSearchParams(query);
      url += `?${params.toString()}`;
    }

    const res = await fetch(
      url,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message);
    }

    return data.data;
  },
};