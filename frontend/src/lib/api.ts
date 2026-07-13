import axios from 'axios';
import { keysToCamel } from './case';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://gfas-production.up.railway.app/api',
});

// Attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('amovix_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    // Backend entities serialize as snake_case; frontend types are camelCase.
    // Normalize JSON payloads so every consumer receives camelCase keys.
    // Blobs / primitives pass through untouched (see keysToCamel).
    res.data = keysToCamel(res.data);
    return res;
  },
  // Redirect to login on 401
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('amovix_token');
      localStorage.removeItem('amovix_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
