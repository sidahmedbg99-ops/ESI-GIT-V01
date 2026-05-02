import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IoMailOutline, IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline, IoAlertCircleOutline, IoArrowBackOutline } from 'react-icons/io5';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { useLanguage } from '../../context/LanguageContext';
import { toast } from 'react-hot-toast';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isFirstLoginState, setIsFirstLoginState] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState(null);
  const { login, error, clearError } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFirstLoginState) {
      if (!newPassword.trim()) return;
      try {
        setLoading(true);
        // Call backend API to change password
        await authApi.changePassword(password, newPassword);

        let userData = JSON.parse(localStorage.getItem('esi-user'));
        userData.first_login = false;
        localStorage.setItem('esi-user', JSON.stringify(userData));

        const redirectMap = { student: '/student/dashboard', staff: '/teacher/dashboard', teacher: '/teacher/dashboard', admin: '/admin/dashboard' };
        // Correct role mapping for staff
        const role = userData.role === 'staff' ? (userData.is_admin ? 'admin' : 'teacher') : userData.role;

        setLoading(false);
        toast.success(t('Success'));
        navigate(redirectMap[role] || '/');
      } catch (err) {
        setLoading(false);
        const errorMsg = err.response?.data?.error || err.response?.data?.detail || t('Error');
        toast.error(errorMsg);
      }
      return;
    }

    setLoading(true);
    clearError();
    const ok = await login(email, password);
    setLoading(false);
    if (ok) {
      toast.success(t('Success'));
      const userData = JSON.parse(localStorage.getItem('esi-user'));
      if (userData?.first_login) {
        setIsFirstLoginState(true);
      } else {
        const redirectMap = { student: '/student/dashboard', teacher: '/teacher/dashboard', admin: '/admin/dashboard' };
        navigate(redirectMap[userData.role] || '/');
      }
    } else {
      toast.error(t('Error'));
    }
  };

  const handleRoleClick = (role) => {
    const map = {
      student: { email: 'student@esi.dz', password: 'password' },
      teacher: { email: 'teacher@esi.dz', password: 'password' },
      admin: { email: 'admin@esi.dz', password: 'password' },
    };
    setEmail(map[role].email);
    setPassword(map[role].password);
    setActiveRole(role);
    clearError();
  };
  const roles = [
    { key: 'student', label: 'Étudiant', emoji: '🎓', color: '#2EC4B6' },
    { key: 'teacher', label: 'Enseignant', emoji: '👨‍🏫', color: '#1F3A5F' },
    { key: 'admin', label: 'Admin', emoji: '⚙️', color: '#2D5486' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* LEFT PANEL — vivid gradient with decorative shapes */}
      <div
        className="login-left"
        style={{
          flex: '0 0 50%',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0B1120 0%, var(--primary) 40%, var(--primary-light) 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '450px', height: '450px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '60%', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(236,72,153,0.15)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '20%', right: '20%', width: '120px', height: '120px', borderRadius: '30%', transform: 'rotate(45deg)', border: '1px solid rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: '25%', left: '15%', width: '80px', height: '80px', borderRadius: '20%', transform: 'rotate(30deg)', border: '1px solid rgba(255,255,255,0.06)' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, padding: '56px', maxWidth: '460px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/image.png" alt="ESI-GIT" style={{ height: '200px', objectFit: 'contain', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))', marginBottom: '36px' }} />
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#fff', marginBottom: '16px', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Bienvenue sur<br />
            <span style={{ background: 'linear-gradient(to right, var(--primary-light), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ESI-GIT</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', lineHeight: 1.7, marginBottom: '40px' }}>
            La plateforme de gestion de projets académiques de l'École Supérieure d'Informatique de Sidi Bel Abbès.
          </p>

          {/* Decorative feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {['Git Intégré', 'Kanban Board', 'Suivi Temps Réel', 'Multi-rôles'].map((tag, i) => (
              <span key={i} style={{
                padding: '8px 18px', borderRadius: '100px',
                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
                color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.12)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — login form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        minHeight: '100vh',
        background: 'var(--bg)',
        position: 'relative',
      }}>
        {/* Subtle gradient accent in corner */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: '50%', height: '40%',
          background: 'radial-gradient(ellipse at top right, var(--primary-subtle) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
          {/* Back link */}
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', marginBottom: '32px', fontWeight: 500 }}>
            <IoArrowBackOutline size={15} /> Retour à l'accueil
          </Link>

          {/* Logo on mobile */}
          <div className="login-mobile-logo" style={{ marginBottom: '24px' }}>
            <img src="/new-logo.png" alt="ESI-GIT" style={{ height: '56px', objectFit: 'contain' }} />
          </div>

          <h1 style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px', color: 'var(--text-primary)' }}>
            {t('LoginBtn') === 'Log In' ? 'Log In' : 'Se connecter'}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '36px' }}>
            {t('LoginBtn') === 'Log In' ? 'Access your ESI-GIT workspace' : 'Accédez à votre espace ESI-GIT'}
          </p>
          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t('LoginBtn') === 'Log In' ? 'enter your credentials' : 'ou entrez vos identifiants'}
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '24px' }}>
              {isFirstLoginState ? (
                <>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Changer le mot de passe</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Première connexion détectée. Veuillez choisir un nouveau mot de passe.</p>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>Nouveau mot de passe</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                      style={{ width: '100%', padding: '13px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: '12px', fontSize: '14px', outline: 'none' }} onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                  </div>
                </>
              ) : (
                <>
                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>Email</label>
                    <div style={{ position: 'relative' }}>
                      <IoMailOutline size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="votre@esi.dz" required
                        style={{
                          width: '100%', padding: '13px 14px 13px 42px',
                          background: 'var(--bg)', border: '1.5px solid var(--border)',
                          borderRadius: '12px', fontSize: '14px',
                          color: 'var(--text-primary)', outline: 'none',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                        onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 4px var(--primary-subtle)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>
                      {t('LoginBtn') === 'Log In' ? 'Password' : 'Mot de passe'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <IoLockClosedOutline size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••" required
                        style={{
                          width: '100%', padding: '13px 48px 13px 42px',
                          background: 'var(--bg)', border: '1.5px solid var(--border)',
                          borderRadius: '12px', fontSize: '14px',
                          color: 'var(--text-primary)', outline: 'none',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                        onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 4px var(--primary-subtle)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                      />
                      <button
                        type="button" onClick={() => setShowPwd(s => !s)}
                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                      >
                        {showPwd ? <IoEyeOffOutline size={17} /> : <IoEyeOutline size={17} />}
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <a href="#" onClick={(e) => { e.preventDefault(); alert("Veuillez contacter l'administration pour réinitialiser votre mot de passe."); }} style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                        Mot de passe oublié ?
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '14px 16px', borderRadius: '12px',
                background: '#FEF2F2', border: '1px solid #FECACA',
                color: '#DC2626', fontSize: '14px', marginBottom: '18px',
              }}>
                <IoAlertCircleOutline size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: loading ? 'var(--primary-subtle)' : 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                transition: 'opacity 0.2s, transform 0.15s',
                boxShadow: '0 4px 14px rgba(46, 196, 182, 0.35)',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.92'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {loading ? (t('LoginBtn') === 'Log In' ? 'Logging in...' : 'Connexion...') : (isFirstLoginState ? 'Confirmer' : t('LoginBtn'))}
            </button>
          </form>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '28px', lineHeight: 1.6 }}>
            © {new Date().getFullYear()} ESI-GIT — École Supérieure d'Informatique
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .login-left { display: flex !important; }
          .login-mobile-logo { display: none !important; }
        }
        @media (max-width: 899px) {
          .login-mobile-logo { display: block !important; }
        }
      `}</style>
    </div>
  );
}