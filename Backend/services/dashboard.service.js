const dashboardRepo =
require(
  "../repositories/dashboard.repository"
);

const getStoreOverview =
getStoreOverview: async (
  storeId: string,
  params?: any
) => {

  const response =
    await api.get(
      `/dashboard/store-overview/${storeId}`,
      {
        params,
      }
    );

  return response.data.data;
},

  return await dashboardRepo.getStoreOverview(
    storeId,
    filters,
  );
};

module.exports = {
  getStoreOverview,
};