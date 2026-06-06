import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';
import { useApi } from '../hooks/useApi';
import { toast } from 'react-hot-toast';


const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { 
      const s = localStorage.getItem('esi-user'); 
      return s ? JSON.parse(s) : null; 
    } catch { 
      return null; 
    }
  });

  const { request: loginRequest, loading: isLoginLoading, error: loginError } = useApi(authApi.login);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (loginError) setError(loginError);
  }, [loginError]);

  const login = async (email, password) => {
    setError(null);
    try {
      const data = await loginRequest(email, password);
      // Backend returns { user, access, refresh, role, first_login }
      if (data && data.user) {
        const responseRole = data.role || data.user.role;
        const normalizedRole = responseRole === 'staff'
          ? (data.user.is_admin ? 'admin' : 'teacher')
          : responseRole;

        const fullUser = { 
          ...data.user, 
          name: data.user.name || data.user.full_name || `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim(),
          role: normalizedRole, 
          first_login: data.first_login ?? data.user.IsFirstLogin,
          _id: data.user.CID || data.user.TID || data.user.id || data.user._id 
        };

        setUser(fullUser);
        localStorage.setItem('esi-user', JSON.stringify(fullUser));
        if (data.access)  localStorage.setItem('esi-token',   data.access);
        if (data.refresh) localStorage.setItem('esi-refresh', data.refresh);  // store refresh token

        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('esi-user');
    localStorage.removeItem('esi-token');
    localStorage.removeItem('esi-refresh');
    toast.success('Déconnecté');
  };

  const clearError = () => setError(null);

  // On app load: if we have a stored token but no user in state, re-validate
  // against /me. The axios interceptor will silently refresh the access token
  // if it has expired, so this just needs to call getMe().
  useEffect(() => {
    if (localStorage.getItem('esi-token') && !user) {
      authApi.getMe().then(r => {
        if (r && r.email) {
          const newRole = r.role === 'staff'
            ? (r.is_admin ? 'admin' : 'teacher')
            : r.role;

          const normalized = { 
            ...r, 
            name: r.name || r.full_name || `${r.first_name || ''} ${r.last_name || ''}`.trim(),
            _id: r.CID || r.TID || r.id,
            role: newRole
          };
          setUser(normalized);
          localStorage.setItem('esi-user', JSON.stringify(normalized));
        }
      }).catch(() => {
        // refresh also failed inside the interceptor → interceptor already
        // cleared storage and redirected, nothing left to do here
        logout();
      });
    }
  }, []);

  const switchRole = (newRole) => {
    setUser(prev => {
      if (!prev) return prev;
      const updatedUser = { ...prev, role: newRole };
      localStorage.setItem('esi-user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, error, isLoginLoading, clearError, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);