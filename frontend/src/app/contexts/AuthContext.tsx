// import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import axios from 'axios';
// import { Store, StoreStatus } from '../types/store';

// // URL trỏ đến Backend của bạn
// const API_URL = 'http://localhost:5000/api';

// export type UserRole = 'admin' | 'business' | 'customer';

// export interface User {
//   id: string;
//   username: string;
//   email: string;
//   role: UserRole;
//   status?: string;
//   storeName?: string;
//   businessLicense?: string;
//   taxCode?: string; // Đã thêm Tax Code
//   hasC2CStore?: boolean;
//   c2cStoreId?: string;
// }

// interface AuthContextType {
//   user: User | null;
//   token: string | null;
//   login: (email: string, password: string) => Promise<void>;
//   logout: () => void;
//   registerCustomer: (username: string, email: string, password: string) => Promise<void>;
//   // Đã thêm tham số taxCode vào interface
//   registerBusiness: (username: string, email: string, password: string, storeName: string, businessLicense: string, taxCode: string) => Promise<void>;
//   activateC2CStore: (storeName: string, description: string) => Promise<void>;
//   isLoading: boolean;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [user, setUser] = useState<User | null>(null);
//   const [token, setToken] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const savedToken = localStorage.getItem('token');
//     const savedUser = localStorage.getItem('user');

//     if (savedToken && savedUser) {
//       setToken(savedToken);
//       setUser(JSON.parse(savedUser));
//       axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
//     }
//     setIsLoading(false);
//   }, []);

//   const login = async (email: string, password: string) => {
//     try {
//       setIsLoading(true);
//       const response = await axios.post(`${API_URL}/auth/login`, {
//         email,
//         password
//       });

//       const { token: apiToken, user: apiUser } = response.data.data;

//       const mappedUser: User = {
//         id: apiUser.id,
//         username: apiUser.username,
//         email: apiUser.email,
//         role: apiUser.role.toLowerCase() as UserRole,
//         status: apiUser.status
//       };

//       setUser(mappedUser);
//       setToken(apiToken);

//       localStorage.setItem('token', apiToken);
//       localStorage.setItem('user', JSON.stringify(mappedUser));

//       axios.defaults.headers.common['Authorization'] = `Bearer ${apiToken}`;
//     } catch (error: any) {
//       if (error.response && error.response.data) {
//         throw new Error(error.response.data.message || 'Đăng nhập thất bại');
//       }
//       throw new Error('Lỗi kết nối đến Server');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const logout = () => {
//     setUser(null);
//     setToken(null);
//     localStorage.removeItem('token');
//     localStorage.removeItem('user');
//     delete axios.defaults.headers.common['Authorization'];
//   };

//   const registerCustomer = async (username: string, email: string, password: string) => {
//     try {
//       setIsLoading(true);
//       await axios.post(`${API_URL}/auth/register`, {
//         username,
//         email,
//         password,
//         role: 'Customer'
//       });
//     } catch (error: any) {
//       if (error.response && error.response.data) {
//         throw new Error(error.response.data.message || 'Đăng ký thất bại');
//       }
//       throw new Error('Lỗi kết nối đến Server');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Đã thêm tham số taxCode
//   const registerBusiness = async (
//     username: string,
//     email: string,
//     password: string,
//     storeName: string,
//     businessLicense: string,
//     taxCode: string
//   ) => {
//     try {
//       setIsLoading(true);
//       await axios.post(`${API_URL}/auth/register`, {
//         username,
//         email,
//         password,
//         role: 'Business',
//         store_name: storeName,
//         business_license: businessLicense,
//         tax_code: taxCode // Gửi tax_code xuống Backend
//       });
//     } catch (error: any) {
//       if (error.response && error.response.data) {
//         throw new Error(error.response.data.message || 'Đăng ký doanh nghiệp thất bại');
//       }
//       throw new Error('Lỗi kết nối đến Server');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const activateC2CStore = async (storeName: string, description: string) => {
//     if (!user || user.role !== 'customer') {
//       throw new Error('Chỉ tài khoản Customer mới có thể mở shop C2C');
//     }

//     try {
//       setIsLoading(true);
//       const response = await axios.post(`${API_URL}/stores/activate-c2c`, {
//         store_name: storeName,
//         description: description
//       }, {
//         headers: { Authorization: `Bearer ${token}` }
//       });

//       const apiStore = response.data.data;

//       const updatedUser: User = {
//         ...user,
//         hasC2CStore: true,
//         c2cStoreId: apiStore.id,
//       };

//       setUser(updatedUser);
//       localStorage.setItem('user', JSON.stringify(updatedUser));
//     } catch (error: any) {
//       if (error.response && error.response.data) {
//         throw new Error(error.response.data.message || 'Kích hoạt shop C2C thất bại');
//       }
//       throw new Error('Lỗi kết nối đến Server');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <AuthContext.Provider value={{ 
//       user, 
//       token, 
//       login, 
//       logout, 
//       registerCustomer, 
//       registerBusiness, 
//       activateC2CStore,
//       isLoading 
//     }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// }

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { getMyStoreStatus } from '../services/storeStatusService';

const API_URL = 'http://localhost:5000/api';

export type UserRole = 'admin' | 'business' | 'customer';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status?: string;
  storeName?: string;
  businessLicense?: string;
  taxCode?: string;
  hasC2CStore?: boolean;
  c2cStoreId?: string;
  businessStoreId?: string;
  hasManageShop?: boolean;
  storeStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE' | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  registerCustomer: (username: string, email: string, password: string) => Promise<void>;
  registerBusiness: (
    username: string,
    email: string,
    password: string,
    storeName: string,
    businessLicense: string,
    taxCode: string,
    options?: {
      bankAccount?: string;
      serviceFeeRate?: number;
      policyAccepted?: boolean;
      businessLicenseImage?: File;   // ← file ảnh GPKD
    },
  ) => Promise<void>;
  activateC2CStore: (
    storeName: string,
    description: string,
    options?: {
      identityCard?: string;
      bankAccount?: string;
      serviceFeeRate?: number;
      policyAccepted?: boolean;
    },
  ) => Promise<void>;
  updateUser: (data: Partial<User>) => void; // <--- THÊM HÀM CẬP NHẬT NÀY
  isLoading: boolean;
}

const missingAuthProviderError = new Error('AuthContext consumer rendered outside an AuthProvider');

const fallbackAuthContext: AuthContextType = {
  user: null,
  token: null,
  login: async () => {
    throw missingAuthProviderError;
  },
  logout: () => {
    throw missingAuthProviderError;
  },
  registerCustomer: async () => {
    throw missingAuthProviderError;
  },
  registerBusiness: async () => {
    throw missingAuthProviderError;
  },
  activateC2CStore: async () => {
    throw missingAuthProviderError;
  },
  updateUser: () => {
    throw missingAuthProviderError;
  },
  isLoading: false,
};

const AuthContext = createContext<AuthContextType>(fallbackAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncStoreStatus = async (targetUser: User, authToken: string): Promise<User> => {
    if (!targetUser || targetUser.role === 'admin') {
      return targetUser;
    }

    try {
      const storeStatus = await getMyStoreStatus(authToken);

      if (targetUser.role === 'customer') {
        return {
          ...targetUser,
          hasC2CStore: storeStatus.hasStore && storeStatus.storeType === 'C2C' && storeStatus.storeStatus === 'APPROVED',
          c2cStoreId: storeStatus.storeType === 'C2C' ? storeStatus.storeId || undefined : undefined,
          businessStoreId: undefined,
          storeName: storeStatus.storeName || targetUser.storeName || '',
          hasManageShop: storeStatus.hasManageShop,
          storeStatus: storeStatus.storeStatus,
        };
      }

      return {
        ...targetUser,
        businessStoreId: storeStatus.storeType === 'B2C' ? storeStatus.storeId || undefined : undefined,
        storeName: storeStatus.storeName || targetUser.storeName || '',
        hasManageShop: storeStatus.hasManageShop,
        storeStatus: storeStatus.storeStatus,
      };
    } catch {
      return targetUser;
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      const parsedUser = JSON.parse(savedUser) as User;
      setUser(parsedUser);
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;

      void syncStoreStatus(parsedUser, savedToken).then((syncedUser) => {
        setUser(syncedUser);
        localStorage.setItem('user', JSON.stringify(syncedUser));
      });
    }
    setIsLoading(false);
  }, []);

  // --- HÀM CẬP NHẬT TRẠNG THÁI NGƯỜI DÙNG TỨC THÌ ---
  const updateUser = (data: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...data };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token: apiToken, user: apiUser } = response.data.data;

      const mappedUser: User = {
        id: apiUser.id,
        username: apiUser.username,
        email: apiUser.email,
        role: apiUser.role.toLowerCase() as UserRole,
        status: apiUser.status,
        // Sửa lỗi: Lấy trạng thái cửa hàng từ Backend trả về khi Login
        hasC2CStore: apiUser.hasC2CStore || false,
        c2cStoreId: apiUser.c2cStoreId || undefined,
        businessStoreId: undefined,
        storeName: apiUser.storeName || '',
        hasManageShop: false,
        storeStatus: null,
      };

      const syncedUser = await syncStoreStatus(mappedUser, apiToken);

      setUser(syncedUser);
      setToken(apiToken);
      localStorage.setItem('token', apiToken);
      localStorage.setItem('user', JSON.stringify(syncedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${apiToken}`;
    } catch (error: any) {
      if (error.response && error.response.data) throw new Error(error.response.data.message || 'Đăng nhập thất bại');
      throw new Error('Lỗi kết nối đến Server');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const registerCustomer = async (username: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      await axios.post(`${API_URL}/auth/register`, { username, email, password, role: 'Customer' });
    } catch (error: any) {
      if (error.response && error.response.data) throw new Error(error.response.data.message || 'Đăng ký thất bại');
      throw new Error('Lỗi kết nối đến Server');
    } finally {
      setIsLoading(false);
    }
  };

  const registerBusiness = async (
    username: string,
    email: string,
    password: string,
    storeName: string,
    businessLicense: string,
    taxCode: string,
    options?: {
      bankAccount?: string;
      serviceFeeRate?: number;
      policyAccepted?: boolean;
      businessLicenseImage?: File;  // ← file ảnh GPKD
    },
  ) => {
    try {
      setIsLoading(true);

      // Nếu có file ảnh → gửi FormData (multipart/form-data)
      // Nếu không có → gửi JSON như cũ
      if (options?.businessLicenseImage) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('role', 'Business');
        formData.append('store_name', storeName);
        // Tên field TEXT khác với field FILE để tránh multer bị nhầm
        formData.append('business_license_number', businessLicense);
        formData.append('tax_code', taxCode);
        formData.append('bank_account', options.bankAccount || '');
        formData.append('service_fee_rate', String(options.serviceFeeRate ?? 0));
        formData.append('policy_accepted', String(options.policyAccepted === true));
        // field 'business_license' → Multer lưu file và đặt URL vào req.documentUrls.business_license
        formData.append('business_license', options.businessLicenseImage);

        await axios.post(`${API_URL}/auth/register`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await axios.post(`${API_URL}/auth/register`, {
          username,
          email,
          password,
          role: 'Business',
          store_name: storeName,
          business_license: businessLicense,
          tax_code: taxCode,
          bank_account: options?.bankAccount || null,
          service_fee_rate: options?.serviceFeeRate ?? 0,
          policy_accepted: options?.policyAccepted === true,
        });
      }
    } catch (error: any) {
      if (error.response && error.response.data) throw new Error(error.response.data.message || 'Đăng ký doanh nghiệp thất bại');
      throw new Error('Lỗi kết nối đến Server');
    } finally {
      setIsLoading(false);
    }
  };

  const activateC2CStore = async (
    storeName: string,
    description: string,
    options?: {
      identityCard?: string;
      bankAccount?: string;
      serviceFeeRate?: number;
      policyAccepted?: boolean;
    },
  ) => {
    if (!user || user.role !== 'customer') throw new Error('Chỉ tài khoản Customer mới có thể mở shop C2C');
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${API_URL}/stores/activate-c2c`,
        {
          store_name: storeName,
          description,
          identity_card: options?.identityCard || null,
          bank_account: options?.bankAccount || null,
          service_fee_rate: options?.serviceFeeRate ?? 0,
          policy_accepted: options?.policyAccepted === true,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const apiStore = response.data.data;
      updateUser({ hasC2CStore: true, c2cStoreId: apiStore.id, storeName: storeName, hasManageShop: true, storeStatus: 'APPROVED' });
    } catch (error: any) {
      if (error.response && error.response.data) throw new Error(error.response.data.message || 'Kích hoạt shop C2C thất bại');
      throw new Error('Lỗi kết nối đến Server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, registerCustomer, registerBusiness, activateC2CStore, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}