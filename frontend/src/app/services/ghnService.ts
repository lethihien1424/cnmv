import { apiRequest } from './api';

export interface GHNProvince {
  ProvinceID: number;
  ProvinceName: string;
}

export interface GHNDistrict {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
}

export interface GHNWard {
  WardCode: string;
  DistrictID: number;
  WardName: string;
}

export const ghnService = {
  getProvinces: () => apiRequest<GHNProvince[]>('/ghn/provinces'),
  getDistricts: (provinceId: number) => apiRequest<GHNDistrict[]>(`/ghn/districts/${provinceId}`),
  getWards: (districtId: number) => apiRequest<GHNWard[]>(`/ghn/wards/${districtId}`),
};
