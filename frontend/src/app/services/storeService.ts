import { Store, StoreStatus } from '../types/store';

// Initialize mock stores in localStorage
export function initializeMockStores() {
  const existingStores = localStorage.getItem('stores');
  if (!existingStores) {
    const mockStores: Store[] = [
      {
        id: 'b2c-store-1',
        ownerId: 'business-1',
        ownerName: 'Nguyễn Văn A',
        ownerEmail: 'business1@example.com',
        storeName: 'Cửa hàng điện tử ABC',
        description: 'Chuyên bán điện thoại, laptop, phụ kiện',
        type: 'B2C',
        status: 'pending',
        businessLicense: 'BL001234567',
        createdAt: new Date('2026-03-15'),
        updatedAt: new Date('2026-03-15'),
      },
      {
        id: 'b2c-store-2',
        ownerId: 'business-2',
        ownerName: 'Trần Thị B',
        ownerEmail: 'business2@example.com',
        storeName: 'Thời trang XYZ',
        description: 'Thời trang nam nữ cao cấp',
        type: 'B2C',
        status: 'pending',
        businessLicense: 'BL009876543',
        createdAt: new Date('2026-03-20'),
        updatedAt: new Date('2026-03-20'),
      },
      {
        id: 'b2c-store-3',
        ownerId: 'business-3',
        ownerName: 'Lê Văn C',
        ownerEmail: 'business3@example.com',
        storeName: 'Nội thất Modern',
        description: 'Nội thất hiện đại cho gia đình',
        type: 'B2C',
        status: 'approved',
        businessLicense: 'BL005551234',
        createdAt: new Date('2026-03-10'),
        updatedAt: new Date('2026-03-25'),
      },
      {
        id: 'b2c-store-4',
        ownerId: 'business-4',
        ownerName: 'Phạm Thị D',
        ownerEmail: 'business4@example.com',
        storeName: 'Siêu thị thực phẩm Online',
        description: 'Thực phẩm tươi sống, an toàn',
        type: 'B2C',
        status: 'inactive',
        businessLicense: 'BL007778888',
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-03-28'),
      },
      {
        id: 'c2c-store-1',
        ownerId: 'customer-1',
        ownerName: 'Hoàng Văn E',
        ownerEmail: 'customer1@example.com',
        storeName: 'Shop đồ cũ E',
        description: 'Bán đồ cũ chất lượng',
        type: 'C2C',
        status: 'approved',
        createdAt: new Date('2026-03-18'),
        updatedAt: new Date('2026-03-18'),
      },
    ];
    localStorage.setItem('stores', JSON.stringify(mockStores));
  }
}

export function getStores(): Store[] {
  const stores = localStorage.getItem('stores');
  if (!stores) {
    initializeMockStores();
    return getStores();
  }
  return JSON.parse(stores).map((store: any) => ({
    ...store,
    createdAt: new Date(store.createdAt),
    updatedAt: new Date(store.updatedAt),
  }));
}

export function getStoresByStatus(status: StoreStatus): Store[] {
  return getStores().filter(store => store.status === status);
}

export function getStoresByType(type: 'B2C' | 'C2C'): Store[] {
  return getStores().filter(store => store.type === type);
}

export function updateStoreStatus(storeId: string, status: StoreStatus): void {
  const stores = getStores();
  const updatedStores = stores.map(store => {
    if (store.id === storeId) {
      return {
        ...store,
        status,
        updatedAt: new Date(),
      };
    }
    return store;
  });
  localStorage.setItem('stores', JSON.stringify(updatedStores));
}

export function getStoreById(storeId: string): Store | null {
  const stores = getStores();
  return stores.find(store => store.id === storeId) || null;
}
