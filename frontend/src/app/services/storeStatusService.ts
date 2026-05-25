// frontend/src/app/services/storeStatusService.ts
import { apiRequest } from './api';

export type UserStoreStatus = {
  hasStore: boolean;
  hasManageShop: boolean;
  storeId: string | null;
  storeType: 'B2C' | 'C2C' | null;
  storeStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE' | null;
  storeName: string | null;
};

export async function getMyStoreStatus(token?: string | null): Promise<UserStoreStatus> {
  return apiRequest<UserStoreStatus>(
    '/stores/my-store-status',
    { method: 'GET' },
    token ?? localStorage.getItem('token'),
  );
}
