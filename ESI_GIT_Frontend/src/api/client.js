import axios from 'axios';
import { BASE_URL } from './config';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT access token to every request automatically
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('esi-token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Silent token refresh ────────────────────────────────────────────────────
// When a request gets a 401, try once to get a new access token using the
// stored refresh token. If that also fails, clear everything and redirect to
// login so the user gets a proper message instead of a broken UI.

let isRefreshing = false;
let failedQueue = [];   // requests that arrived while a refresh was in-flight

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401, and never retry the refresh call itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('token/refresh')
    ) {
      const refreshToken = localStorage.getItem('esi-refresh');

      // No refresh token stored → force logout immediately
      if (!refreshToken) {
        localStorage.removeItem('esi-token');
        localStorage.removeItem('esi-refresh');
        localStorage.removeItem('esi-user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // If a refresh is already happening, queue this request until it resolves
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${BASE_URL}token/refresh/`,
          { refresh: refreshToken }
        );

        const newAccess = data.access;
        localStorage.setItem('esi-token', newAccess);

        // ROTATE_REFRESH_TOKENS is True in settings, so the backend returns a
        // new refresh token on every refresh call — store it.
        if (data.refresh) {
          localStorage.setItem('esi-refresh', data.refresh);
        }

        client.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
        processQueue(null, newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('esi-token');
        localStorage.removeItem('esi-refresh');
        localStorage.removeItem('esi-user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default client;