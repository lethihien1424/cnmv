// frontend/src/app/services/addressService.ts
import { apiRequest } from './api';

export interface UserAddress {
  id: string;
  user_id?: string;
  recipient_name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string;
  is_default: boolean;
  province_id?: number;
  district_id?: number;
  ward_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAddressPayload {
  recipient_name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string;
  is_default: boolean;
  province_id?: number;
  district_id?: number;
  ward_code?: string;
}

export const addressService = {
  getAddresses: () => apiRequest<UserAddress[]>('/addresses'),
  createAddress: (payload: CreateAddressPayload) => 
    apiRequest<UserAddress>('/addresses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
