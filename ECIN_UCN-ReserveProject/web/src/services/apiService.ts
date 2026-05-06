import axios from 'axios';
import type { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let token: string | null = null;

const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
client.interceptors.request.use((config) => {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  setToken(newToken: string | null) {
    token = newToken;
  },

  async get<T>(path: string): Promise<T> {
    const response = await client.get<T>(path);
    return response.data;
  },

  async post<T>(path: string, data: unknown): Promise<T> {
    const response = await client.post<T>(path, data);
    return response.data;
  },

  async delete<T>(path: string): Promise<T> {
    const response = await client.delete<T>(path);
    return response.data;
  },
};

export default apiService;
