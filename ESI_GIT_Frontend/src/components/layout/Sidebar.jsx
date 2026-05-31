import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  IoGridOutline, IoPeopleOutline, IoCalendarOutline,
  IoCheckboxOutline, IoArchiveOutline,
  IoChevronForwardOutline,
  IoLogOutOutline, IoBookOutline, IoSettingsOutline,
  IoBarChartOutline, IoRibbonOutline, IoLanguageOutline,
  IoSwapHorizontalOutline, IoPersonOutline
} from 'react-icons/io5';
import Logo from '../ui/Logo';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTeacher } from '../../context/TeacherContext';

const studentNav = [
  { path: '/student/dashboard', labelKey: 'Dashboard',  icon: <IoGridOutline size={20}/> },
  { path: '/student/groupe',    labelKey: 'Groups',     icon: <IoPeopleOutline size={20}/> },
  { path: '/student/reunions',  labelKey: 'Meetings',   icon: <IoCalendarOutline size={20}/> },
  { path: '/student/taches',    labelKey: 'Tasks',      icon: <IoCheckboxOutline size={20}/> },
  { path: '/student/archive',   labelKey: 'Archive',    icon: <IoArchiveOutline size={20}/> },
];

const teacherNav = [
  { path: '/teacher/dashboard', labelKey: 'Dashboard',  icon: <IoGridOutline size={20}/> },
  { path: '/teacher/groupes',   labelKey: 'Groups',     icon: <IoPeopleOutline size={20}/> },
  { path: '/teacher/reunions',  labelKey: 'Meetings',   icon: <IoCalendarOutline size={20}/> },
  { path: '/teacher/jury',      labelKey: 'Juries',     icon: <IoRibbonOutline size={20}/> },
  { path: '/teacher/archive',   labelKey: 'Archive',    icon: <IoArchiveOutline size={20}/> },
];

const adminNav = [
  { path: '/admin/dashboard',   labelKey: 'Dashboard',  icon: <IoGridOutline size={20}/> },
  { path: '/admin/users',       labelKey: 'Users',      icon: <IoPeopleOutline size={20}/> },
  { path: '/admin/students',    labelKey: 'Students',   icon: <IoSchoolOutline size={20}/> },
  { path: '/admin/groupes',     labelKey: 'Groups',     icon: <IoBookOutline size={20}/> },
  { path: '/admin/analytics',   labelKey: 'Projects',   icon: <IoBarChartOutline size={20}/> },
  { path: '/admin/archive',     labelKey: 'Archive',    icon: <IoArchiveOutline size={20}/> },
  { path: '/admin/settings',    labelKey: 'Settings',   icon: <IoSettingsOutline size={20}/> },
];

const navByRole = { student: studentNav, teacher: teacherNav, admin: adminNav };

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, switchRole } = useAuth();
  const { toggleLanguage, t, lang } = useLanguage();
  const navigate = useNavigate();
  
  // Conditionally hide jury for teachers with no assignments
  let teacherCtx = null;
  try { teacherCtx = useTeacher(); } catch(e) { /* not in teacher context */ }
  
  let nav = navByRole[user?.role] || studentNav;

  const handleLogout = () => { logout(); navigate('/login'); };
  const goToProfile  = () => navigate(`/${user?.role}/profil`);

  const handleSwitchRole = () => {
    if (switchRole) {
      const newRole = user?.role === 'admin' ? 'teacher' : 'admin';
      switchRole(newRole);
      navigate(`/${newRole}/dashboard`);
    }
  };

  return (
    <aside style={{ width: collapsed ? 72 : 240, height: '100vh', background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0, zIndex: 100, overflow: 'hidden', flexShrink: 0, transition: 'width 0.2s' }}>
      <div style={{ padding: collapsed ? '16px 12px' : '16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80px' }}>
        <Logo size={20} showText={!collapsed}/>
      </div>

      {collapsed && (
        <button onClick={() => setCollapsed(false)} style={{ margin: '10px 12px 0', height: 26, borderRadius: '7px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <IoChevronForwardOutline size={13}/>
        </button>
      )}

      <nav style={{ flex: 1, padding: '10px', overflowY: 'auto', overflowX: 'hidden' }}>
        {!collapsed && <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '4px 8px 8px' }}>Navigation</p>}
        {nav.map((item) => (
          <NavLink key={item.path} to={item.path} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '11px',
            padding: collapsed ? '11px' : '9px 11px',
            borderRadius: 'var(--radius-md)', marginBottom: '2px',
            fontSize: '14px', fontWeight: isActive ? 600 : 400,
            color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
            background: isActive ? 'var(--primary-subtle)' : 'transparent',
            justifyContent: collapsed ? 'center' : 'flex-start',
            whiteSpace: 'nowrap', overflow: 'hidden',
            borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
          })}>
            <span style={{ flexShrink: 0 }}>{item.icon}</span>
            {!collapsed && <span>{t(item.labelKey)}</span>}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '10px', borderTop: '1px solid var(--border)' }}>
        {user?.is_admin && (
           <button onClick={handleSwitchRole} style={{ width: '100%', padding: collapsed ? '11px' : '9px 11px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: '10px', cursor: 'pointer', color: 'var(--primary)', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              <IoSwapHorizontalOutline size={18}/>
              {!collapsed && <span>{user.role === 'admin' ? t('SwitchToTeacher') : t('SwitchToAdmin')}</span>}
           </button>
        )}

        {/* Language switch */}
        <button onClick={toggleLanguage} style={{ width: '100%', padding: collapsed ? '11px' : '9px 11px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: '10px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          <IoLanguageOutline size={18}/>
          {!collapsed && <span>{lang === 'fr' ? 'Passer en Anglais' : 'Switch to French'}</span>}
        </button>

        {user && (
          <div onClick={goToProfile} title={t('Profile')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: collapsed ? '9px' : '9px 11px', borderRadius: 'var(--radius-md)', marginBottom: '4px', background: 'var(--bg)', justifyContent: collapsed ? 'center' : 'flex-start' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-subtle)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {(user.name || user.email || '?').charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role}</p>
              </div>
            )}
          </div>
        )}
        <button onClick={handleLogout} style={{ width: '100%', padding: collapsed ? '11px' : '9px 11px', borderRadius: 'var(--radius-md)', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: '10px', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px', fontWeight: 500 }}
          onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <IoLogOutOutline size={20}/>
          {!collapsed && <span>{t('Logout')}</span>}
        </button>
      </div>
    </aside>
  );
}
