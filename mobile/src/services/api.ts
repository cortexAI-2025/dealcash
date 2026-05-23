import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: Partial<{ name: string; phone: string; avatarUrl: string; pushToken: string }>) =>
    api.put('/auth/profile', data),
};

export const listingsApi = {
  getAll: (params?: Record<string, string | number>) =>
    api.get('/listings', { params }),
  getOne: (id: string) => api.get(`/listings/${id}`),
  getMine: () => api.get('/listings/my'),
  create: (data: FormData | object) => api.post('/listings', data),
  update: (id: string, data: object) => api.put(`/listings/${id}`, data),
  delete: (id: string) => api.delete(`/listings/${id}`),
};

export const paymentsApi = {
  createIntent: (listingId: string) =>
    api.post('/payments/intent', { listingId }),
  getTransaction: (id: string) => api.get(`/payments/transaction/${id}`),
};

export const agentApi = {
  getRules: () => api.get('/agents'),
  createRule: (data: object) => api.post('/agents', data),
  updateRule: (id: string, data: object) => api.put(`/agents/${id}`, data),
  deleteRule: (id: string) => api.delete(`/agents/${id}`),
  toggleRule: (id: string) => api.post(`/agents/${id}/toggle`),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getNotifications: () => api.get('/dashboard/notifications'),
  markRead: (id: string) => api.put(`/dashboard/notifications/${id}/read`),
  markAllRead: () => api.put('/dashboard/notifications/read-all'),
};
