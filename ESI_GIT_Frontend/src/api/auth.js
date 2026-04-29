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
};
