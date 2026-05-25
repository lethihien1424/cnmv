import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { getMyStoreStatus } from '../services/storeStatusService';
import { toast } from 'sonner';

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
      policyAccepted?: boolean;
      representativeName?: string;
      identityCard?: string;
      contactPhone?: string;
      businessLicenseImage?: File;
    },
  ) => Promise<void>;
  activateC2CStore: (
    storeName: string,
    description: string,
    options?: {
      identity_card?: string;
      bankAccount?: string;
      serviceFeeRate?: number;
      policyAccepted?: boolean;
      address?: string;
    },
  ) => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  updateStore: (data: {
  store_name: string;
  address: string;
  contact_phone: string;
  contact_email: string;
  description: string;

  latitude?: number | null;
  longitude?: number | null;
}) => Promise<any>;
  isLoading: boolean;
}

const missingAuthProviderError = new Error('AuthContext consumer rendered outside an AuthProvider');

const fallbackAuthContext: AuthContextType = {
  user: null,
  token: null,
  login: async () => { throw missingAuthProviderError; },
  logout: () => { throw missingAuthProviderError; },
  registerCustomer: async () => { throw missingAuthProviderError; },
  registerBusiness: async () => { throw missingAuthProviderError; },
  activateC2CStore: async () => { throw missingAuthProviderError; },
  updateUser: () => { throw missingAuthProviderError; },
  updateStore: async () => { throw missingAuthProviderError; },
  isLoading: false,
};

const AuthContext = createContext<AuthContextType>(fallbackAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncStoreStatus = async (targetUser: User, authToken: string): Promise<User> => {
    if (!targetUser || targetUser.role === 'admin') return targetUser;
    try {
      const storeStatus = await getMyStoreStatus(authToken);
      const isC2C = storeStatus.storeType === 'C2C';
      return {
        ...targetUser,
        hasC2CStore: storeStatus.hasStore && isC2C && storeStatus.storeStatus === 'APPROVED',
        c2cStoreId: isC2C ? storeStatus.storeId || undefined : undefined,
        businessStoreId: !isC2C ? storeStatus.storeId || undefined : undefined,
        storeName: storeStatus.storeName || targetUser.storeName || '',
        hasManageShop: storeStatus.hasManageShop,
        storeStatus: storeStatus.storeStatus,
      };
    } catch { return targetUser; }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      const parsedUser = JSON.parse(savedUser) as User;
      setUser(parsedUser);
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      syncStoreStatus(parsedUser, savedToken).then((syncedUser) => {
        setUser(syncedUser);
        localStorage.setItem('user', JSON.stringify(syncedUser));
      });
    }
    setIsLoading(false);
  }, []);

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
        hasC2CStore: apiUser.hasC2CStore || false,
        storeName: apiUser.storeName || '',
      };
      const syncedUser = await syncStoreStatus(mappedUser, apiToken);
      setUser(syncedUser);
      setToken(apiToken);
      localStorage.setItem('token', apiToken);
      localStorage.setItem('user', JSON.stringify(syncedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${apiToken}`;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Đăng nhập thất bại');
    } finally { setIsLoading(false); }
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
      throw new Error(error.response?.data?.message || 'Đăng ký thất bại');
    } finally { setIsLoading(false); }
  };

  const registerBusiness = async (username: string, email: string, password: string, storeName: string, businessLicense: string, taxCode: string, options?: any) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('role', 'Business');
      formData.append('store_name', storeName);
      formData.append('business_license', businessLicense);
      formData.append('tax_code', taxCode);
      if (options?.businessLicenseImage) formData.append('business_license_image', options.businessLicenseImage);
      await axios.post(`${API_URL}/auth/register`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Đăng ký thất bại');
    } finally { setIsLoading(false); }
  };

  const updateStore = async (data: {
  store_name: string;
  address: string;
  contact_phone: string;
  contact_email: string;
  description: string;

  latitude?: number | null;
  longitude?: number | null;
}) => {
    try {
      const response = await axios.put(`${API_URL}/stores/update-info`, data);
      updateUser({ storeName: data.store_name });
      toast.success("Cập nhật thông tin shop thành công!");
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi cập nhật");
      throw error;
    }
  };

  const activateC2CStore = async (storeName: string, description: string, options?: any) => {
    if (!user || user.role !== 'customer') throw new Error('Yêu cầu quyền Customer');
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/stores/activate-c2c`, {
        store_name: storeName,
        description,
        address: options?.address || '',
        policy_accepted: options?.policyAccepted === true,
      });
      updateUser({ hasC2CStore: true, storeName: storeName, storeStatus: 'APPROVED' });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Kích hoạt thất bại');
    } finally { setIsLoading(false); }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, registerCustomer, registerBusiness, activateC2CStore, updateUser, updateStore, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}