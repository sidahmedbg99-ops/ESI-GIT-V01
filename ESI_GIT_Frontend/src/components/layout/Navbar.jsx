import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  IoGridOutline, IoPeopleOutline, IoCalendarOutline,
  IoCheckboxOutline, IoArchiveOutline,
  IoLogOutOutline, IoBookOutline, IoSettingsOutline,
  IoBarChartOutline, IoRibbonOutline, IoLanguageOutline,
  IoSwapHorizontalOutline, IoPersonOutline, IoNotificationsOutline,
  IoArrowUpOutline
} from 'react-icons/io5';
import Logo from '../ui/Logo';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { IoSunnyOutline, IoMoonOutline } from 'react-icons/io5';
import client from '../../api/client';
import { ENDPOINTS } from '../../api/config';

const navByRole = {
  student: [
    { path: '/student/dashboard', labelKey: 'Dashboard', icon: <IoGridOutline /> },
    { path: '/student/groupe',    labelKey: 'Groups',    icon: <IoPeopleOutline /> },
    { path: '/student/reunions',  labelKey: 'Meetings',  icon: <IoCalendarOutline /> },
    { path: '/student/taches',    labelKey: 'Tasks',     icon: <IoCheckboxOutline /> },
    { path: '/student/archive',   labelKey: 'Archive',   icon: <IoArchiveOutline /> },
  ],
  teacher: [
    { path: '/teacher/dashboard', labelKey: 'Dashboard', icon: <IoGridOutline /> },
    { path: '/teacher/groupes',   labelKey: 'Groups',    icon: <IoPeopleOutline /> },
    { path: '/teacher/reunions',  labelKey: 'Meetings',  icon: <IoCalendarOutline /> },
    { path: '/teacher/jury',      labelKey: 'Juries',    icon: <IoRibbonOutline /> },
    { path: '/teacher/archive',   labelKey: 'Archive',   icon: <IoArchiveOutline /> },
  ],
  admin: [
    { path: '/admin/dashboard',   labelKey: 'Dashboard', icon: <IoGridOutline /> },
    { path: '/admin/users',       labelKey: 'Users',     icon: <IoPeopleOutline /> },
    { path: '/admin/groupes',     labelKey: 'Groups',    icon: <IoBookOutline /> },
    { path: '/admin/analytics',   labelKey: 'Projects',  icon: <IoBarChartOutline /> },
    { path: '/admin/archive',     labelKey: 'Archive',   icon: <IoArchiveOutline /> },
    { path: '/admin/settings',    labelKey: 'Settings',  icon: <IoSettingsOutline /> },
  ]
};

export default function Navbar() {
  const { user, logout, switchRole } = useAuth();
  const { toggleLanguage, t, lang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Visibility logic
  const hideArchive = localStorage.getItem('hideStudentArchive') === 'true';
  const hideJury    = localStorage.getItem('hideTeacherJury') === 'true';

  const nav = (navByRole[user?.role] || navByRole.student).filter(item => {
    if (user?.role === 'student' && item.labelKey === 'Archive' && hideArchive) return false;
    if (user?.role === 'teacher' && item.labelKey === 'Juries' && hideJury) return false;
    return true;
  });

  const [isVisible, setIsVisible] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [lastScrollTop, setLastScrollTop] = useState(0);

  // Notifications logic — fetch from real backend
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const unseenCount = notifications.filter(n => !n.is_read && !n.IsRead).length;

  useEffect(() => {
    if (!user) return;
    client.get(ENDPOINTS.notifications.list)
      .then(res => setNotifications(Array.isArray(res.data) ? res.data : []))
      .catch(() => setNotifications([]));
  }, [user]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const goToProfile  = () => navigate(`/${user?.role}/profil`);

  const handleSwitchRole = () => {
    if (switchRole) {
      const newRole = user?.role === 'admin' ? 'teacher' : 'admin';
      switchRole(newRole);
      navigate(`/${newRole}/dashboard`);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      
      if (currentScroll > lastScrollTop && currentScroll > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setShowScrollBtn(currentScroll > 400);
      setLastScrollTop(currentScroll <= 0 ? 0 : currentScroll);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollTop]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: `translateX(-50%) translateY(${isVisible ? '0' : '-150%'})`,
      zIndex: 100,
      width: 'auto',
      maxWidth: '95vw',
      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: isVisible ? 'auto' : 'none'
    }}>
      <div style={{
        background: 'var(--bg-nav)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        borderRadius: '30px',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        height: '60px'
      }}>
        {/* Logo Section */}
        <div style={{ display: 'flex', alignItems: 'center', marginRight: '10px' }}>
          <Logo size={18} showText={false} />
        </div>

        <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.1)' }} />

        {/* Main Nav Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontSize: '20px',
                background: isActive ? 'var(--primary)' : 'transparent',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              })}
              title={t(item.labelKey)}
            >
              {item.icon}
            </NavLink>
          ))}
        </div>

        <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.1)' }} />

        {/* Utility Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Switch Role */}
          {user?.isAdmin && user?.isTeacher && (
            <button
              onClick={handleSwitchRole}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'transparent',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              className="nav-utility-btn"
              title={user.role === 'admin' ? t('SwitchToTeacher') : t('SwitchToAdmin')}
            >
              <IoSwapHorizontalOutline size={20} />
            </button>
          )}

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'transparent',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            className="nav-utility-btn"
            title={lang === 'fr' ? 'Switch to English' : 'Passer au Français'}
          >
            <IoLanguageOutline size={20} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'transparent',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            className="nav-utility-btn"
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? <IoMoonOutline size={20} /> : <IoSunnyOutline size={20} />}
          </button>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: showNotifs ? 'var(--primary-subtle)' : 'transparent',
                color: showNotifs ? 'var(--primary)' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.2s',
                border: 'none',
                cursor: 'pointer'
              }}
              className="nav-utility-btn"
              title={t('Notifications')}
            >
              <IoNotificationsOutline size={20} />
              {unseenCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '8px',
                  height: '8px',
                  background: 'var(--danger)',
                  borderRadius: '50%',
                  border: '2px solid var(--bg-nav)'
                }} />
              )}
            </button>
            
            {showNotifs && (
              <div style={{
                position: 'absolute', top: '50px', right: '-80px', width: '320px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                padding: '16px', zIndex: 1000
              }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>Notifications</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0' }}>Aucune notification</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id || n.NID} style={{ padding: '10px', background: (n.is_read || n.IsRead) ? 'transparent' : 'var(--primary-subtle)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>{n.message || n.Message}</p>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>{new Date(n.created_at || n.CreatedAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <button
            onClick={goToProfile}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--primary-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--primary)',
              padding: 0,
              overflow: 'hidden',
              cursor: 'pointer'
            }}
            title={user?.name || user?.email}
          >
            <div style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}>
              {(user?.name || user?.email || '?').charAt(0)}
            </div>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'transparent',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            className="nav-utility-btn"
            title={t('Logout')}
          >
            <IoLogOutOutline size={22} />
          </button>
        </div>
      </div>

      <style>{`
        .nav-utility-btn:hover {
          background: rgba(0,0,0,0.05) !important;
          transform: translateY(-2px);
        }
        @media (max-width: 600px) {
           nav { top: 10px; }
           div[style*="padding: 10px 24px"] { padding: 8px 12px !important; gap: 10px !important; }
        }
        .scroll-top-btn {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          color: var(--primary);
          display: flex;
          align-items: center;
          justifyContent: center;
          cursor: pointer;
          z-index: 999;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0;
          transform: scale(0.5);
          pointer-events: none;
        }
        .scroll-top-btn.visible {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
        }
        .scroll-top-btn:hover {
          transform: scale(1.1);
          background: #fff;
          box-shadow: 0 6px 16px rgba(0,0,0,0.15);
        }
      `}</style>

      {/* Back to Top Button */}
      <button 
        className={`scroll-top-btn ${showScrollBtn ? 'visible' : ''}`}
        onClick={scrollToTop}
        title={t('BackToTop')}
      >
        <IoArrowUpOutline size={22} />
      </button>
    </nav>
  );
}