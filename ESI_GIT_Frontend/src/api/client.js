import axios from 'axios';
import { BASE_URL } from './config';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request automatically
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('esi-token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response error handler
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('esi-token');
      localStorage.removeItem('esi-user');
    }
    return Promise.reject(error);
  }
);

export default client;
