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
      // Align with Django backend: data contains { user, access, refresh, role, first_login }
      if (data && data.user) {
        // Align with both Django backend and Mock data structures
        const responseRole = data.role || data.user.role;
        
        // Normalize 'staff' role for frontend ProtectedRoutes
        const normalizedRole = responseRole === 'staff' ? (data.user.is_admin ? 'admin' : 'teacher') : responseRole;

        const fullUser = { 
          ...data.user, 
          role: normalizedRole, 
          first_login: data.first_login ?? data.user.IsFirstLogin,
          _id: data.user.CID || data.user.TID || data.user.id || data.user._id 
        };
        setUser(fullUser);
        localStorage.setItem('esi-user', JSON.stringify(fullUser));
        if (data.access) localStorage.setItem('esi-token', data.access);
        return true;
      }
      return false;
    } catch (err) {
      // loginError will be caught above via the useApi hook
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('esi-user');
    localStorage.removeItem('esi-token');
    toast.success('Déconnecté');
  };

  const clearError = () => setError(null);

  // Sync token check on load
  useEffect(() => {
    if (localStorage.getItem('esi-token') && !user) {
       authApi.getMe().then(r => {
         // Backend returns flat object { role, CID/TID, email, ... }
         if (r && r.email) {
           const normalized = { 
             ...r, 
             _id: r.CID || r.TID || r.id,
             // Ensure role is correctly mapped for redirection logic
             role: r.role === 'staff' ? (r.is_admin ? 'admin' : 'teacher') : r.role
           };
           setUser(normalized);
           localStorage.setItem('esi-user', JSON.stringify(normalized));
         }
       }).catch(() => {
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
