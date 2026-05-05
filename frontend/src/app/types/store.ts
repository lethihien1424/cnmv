export type StoreType = 'B2C' | 'C2C';
export type StoreStatus = 'pending' | 'approved' | 'inactive';

export interface Store {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  storeName: string;
  description?: string;
  type: StoreType;
  status: StoreStatus;
  businessLicense?: string; // Only for B2C
  createdAt: Date;
  updatedAt: Date;
}
