import { API_BASE_URL } from "./api";

export const dashboardAPI = {

  async getStoreOverview(storeId: string) {

    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_BASE_URL}/dashboard/store-overview/${storeId}`,
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