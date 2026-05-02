import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 * Works in two modes:
 *   1. Wrapping children directly:  <ProtectedRoute><Page/></ProtectedRoute>
 *   2. As a layout route element:   <Route element={<ProtectedRoute .../>}>
 *        In mode 2, no children are passed — renders <Outlet/> instead.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectMap = {
      student: '/student/dashboard',
      teacher: '/teacher/dashboard',
      admin:   '/admin/dashboard',
    };
    return <Navigate to={redirectMap[user.role] || '/login'} replace />;
  }

  // Nested Route mode: no children passed, render <Outlet/>
  return children ?? <Outlet />;
}
