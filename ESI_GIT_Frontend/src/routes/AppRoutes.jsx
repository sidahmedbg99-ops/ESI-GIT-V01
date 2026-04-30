import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StudentProvider } from '../context/StudentContext';
import { TeacherProvider } from '../context/TeacherContext';
import { AdminProvider }   from '../context/AdminContext';
import ProtectedRoute from './ProtectedRoute';

import Home      from '../pages/public/Home';
import About     from '../pages/public/About';
import Login     from '../pages/public/Login';

import StudentDashboard from '../pages/student/Dashboard';
import Groupe           from '../pages/student/Groupe';
import Reunions         from '../pages/student/Reunions';
import Taches           from '../pages/student/Taches';
import { Archive }      from '../pages/student/Archive';
import Profil           from '../pages/student/Profil';
import Supervisor      from '../pages/student/Supervisor';

import TeacherDashboard  from '../pages/teacher/Dashboard';
import TeacherJury       from '../pages/teacher/TeacherJury';
import TeacherArchive    from '../pages/teacher/TeacherArchive';
import TeacherRequests   from '../pages/teacher/TeacherRequests';
import TeacherProfil     from '../pages/teacher/TeacherProfil';
import TeacherGroups     from '../pages/teacher/TeacherGroups';
import TeacherMeetings   from '../pages/teacher/TeacherMeetings';

import AdminDashboard from '../pages/admin/Dashboard';
import AdminUsers     from '../pages/admin/Users';
import AdminGroupes   from '../pages/admin/AdminGroupes';
import AdminArchive   from '../pages/admin/AdminArchive';
import AdminProfil    from '../pages/admin/AdminProfil';
import { AdminAnalytics, AdminSettings } from '../pages/admin/AdminPages';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  const map = { student: '/student/dashboard', teacher: '/teacher/dashboard', admin: '/admin/dashboard' };
  return <Navigate to={map[user.role] || '/'} replace />;
}

function StudentLayout() {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      <StudentProvider><Outlet /></StudentProvider>
    </ProtectedRoute>
  );
}

function TeacherLayout() {
  return (
    <ProtectedRoute allowedRoles={['teacher']}>
      <TeacherProvider><Outlet /></TeacherProvider>
    </ProtectedRoute>
  );
}

function AdminLayout() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminProvider><Outlet /></AdminProvider>
    </ProtectedRoute>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/"          element={<Home/>}/>
      <Route path="/about"     element={<About/>}/>
      <Route path="/login"     element={<Login/>}/>
      <Route path="/dashboard" element={<RootRedirect/>}/>

      {/* ── Student ── */}
      <Route element={<StudentLayout/>}>
        <Route path="/student"                element={<Navigate to="/student/dashboard" replace/>}/>
        <Route path="/student/dashboard"      element={<StudentDashboard/>}/>
        <Route path="/student/groupe"         element={<Groupe/>}/>
        <Route path="/student/reunions"       element={<Reunions/>}/>
        <Route path="/student/taches"         element={<Taches/>}/>
        <Route path="/student/encadreur"      element={<Supervisor/>}/>
        <Route path="/student/archive"        element={<Archive/>}/>
        <Route path="/student/profil"         element={<Profil/>}/>
      </Route>

      {/* ── Teacher ── */}
      <Route element={<TeacherLayout/>}>
        <Route path="/teacher"                element={<Navigate to="/teacher/dashboard" replace/>}/>
        <Route path="/teacher/dashboard"      element={<TeacherDashboard/>}/>
        <Route path="/teacher/groupes"        element={<TeacherGroups/>}/>
        <Route path="/teacher/reunions"       element={<TeacherMeetings/>}/>
        <Route path="/teacher/requests"       element={<TeacherRequests/>}/>
        <Route path="/teacher/jury"           element={<TeacherJury/>}/>
        <Route path="/teacher/archive"        element={<TeacherArchive/>}/>
        <Route path="/teacher/profil"         element={<TeacherProfil/>}/>
      </Route>

      {/* ── Admin ── */}
      <Route element={<AdminLayout/>}>
        <Route path="/admin"                  element={<Navigate to="/admin/dashboard" replace/>}/>
        <Route path="/admin/dashboard"        element={<AdminDashboard/>}/>
        <Route path="/admin/users"            element={<AdminUsers/>}/>
        <Route path="/admin/groupes"          element={<AdminGroupes/>}/>
        <Route path="/admin/analytics"        element={<AdminAnalytics/>}/>
        <Route path="/admin/archive"          element={<AdminArchive/>}/>
        <Route path="/admin/settings"         element={<AdminSettings/>}/>
        <Route path="/admin/profil"           element={<AdminProfil/>}/>
      </Route>

      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}
