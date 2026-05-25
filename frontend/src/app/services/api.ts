// frontend/src/app/services/api.ts
const DEFAULT_API_BASE_URL = 'http://localhost:5000';

const rawApiBaseUrl =
  typeof import.meta !== 'undefined' && (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
    ? (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env!.VITE_API_URL!
    : DEFAULT_API_BASE_URL;

const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '');

export const API_BASE_URL =
  normalizedApiBaseUrl.endsWith('/api')
    ? normalizedApiBaseUrl
    : `${normalizedApiBaseUrl}/api`;

export const BACKEND_URL = normalizedApiBaseUrl.endsWith('/api')
  ? normalizedApiBaseUrl.slice(0, -4)
  : normalizedApiBaseUrl;

export function getAbsoluteImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_URL}${cleanPath}`;
}

type ApiErrorResponse = {
  message?: string;
};

type ApiSuccessResponse<T> = {
  message?: string;
  data: T;
};
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const currentToken = token || localStorage.getItem('token');

  if (currentToken) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = (payload as ApiErrorResponse | null)?.message || 'Request failed';
    throw new Error(errorMessage);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiSuccessResponse<T>).data;
  }

  return payload as T;
}

export const forgotPassword = async (email: string) => {
  return apiRequest<{ success: boolean }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
};

export const resetPassword = async (data: {
  email: string;
  otp: string;
  newPassword: string;
}) => {
  return apiRequest<{ success: boolean }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
};
