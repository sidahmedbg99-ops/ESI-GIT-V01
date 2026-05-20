import client from './client';
import { ENDPOINTS } from './config';

export const authApi = {
  login: async (email, password) => {
    const { data } = await client.post(ENDPOINTS.auth.login, { email, password });
    return data;
  },
  getMe: async () => {
    const { data } = await client.get(ENDPOINTS.auth.me);
    return data;
  },
  changePassword: async (old_password, new_password) => {
    const { data } = await client.post(ENDPOINTS.auth.changePassword, { old_password, new_password });
    return data;
  },
  forgotPassword: async (email) => {
    const { data } = await client.post('/users/forgot-password/', { email });
    return data;
  },
  resetPasswordConfirm: async (uid, token, new_password) => {
    const { data } = await client.post('/users/reset-password-confirm/', { uid, token, new_password });
    return data;
  },
};
