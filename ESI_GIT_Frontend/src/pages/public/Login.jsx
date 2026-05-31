import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IoMailOutline, IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline, IoAlertCircleOutline, IoArrowBackOutline, IoChevronForward } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { groupApi } from '../../api/groups';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isFirstLoginState, setIsFirstLoginState] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, error, clearError } = useAuth();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotRole, setForgotRole] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [contactEmail, setContactEmail] = useState('aced@esi.dz');
  const navigate = useNavigate();

  useEffect(() => {
    groupApi.getPublicSettings()
      .then(res => {
        if (res && res.contact_email) {
          setContactEmail(res.contact_email);
        }
      })
      .catch(err => console.error("Error loading public settings:", err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFirstLoginState) {
      if (!newPassword.trim()) return;
      try {
        setLoading(true);
        await authApi.changePassword(password, newPassword);

        let userData = JSON.parse(localStorage.getItem('esi-user'));
        userData.first_login = false;
        localStorage.setItem('esi-user', JSON.stringify(userData));

        const redirectMap = { student: '/student/dashboard', staff: '/teacher/dashboard', teacher: '/teacher/dashboard', admin: '/admin/dashboard' };
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



  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: theme === 'dark' 
        ? 'radial-gradient(at 0% 0%, rgba(46, 196, 182, 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(236, 72, 153, 0.12) 0px, transparent 50%), var(--bg)'
        : 'radial-gradient(at 0% 0%, rgba(46, 196, 182, 0.1) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(99, 102, 241, 0.1) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(236, 72, 153, 0.08) 0px, transparent 50%), var(--bg)',
      padding: '24px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <button 
        onClick={toggleTheme}
        style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10, width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      {/* Decorative Blur Blobs */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'var(--primary-subtle)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '350px', height: '350px', borderRadius: '50%', background: 'rgba(46, 196, 182, 0.15)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{
        width: '100%',
        maxWidth: '1000px',
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '40px',
        zIndex: 1,
        position: 'relative',
      }} className="login-container">
        
        {/* Main Grid Wrapper */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border)',
          borderRadius: '32px',
          overflow: 'hidden',
          boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.2)',
        }} className="login-card-wrapper">
          
          {/* LEFT SIDE: Brand & Welcome */}
          <div style={{
            padding: '60px 48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: theme === 'dark' ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)' : 'linear-gradient(135deg, var(--bg) 0%, var(--primary-subtle) 100%)',
            borderRight: '1px solid var(--border)',
            position: 'relative',
          }} className="login-left-brand">
            
            {/* Top Logo and Back Link */}
            <div>
              <Link to="/" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                textDecoration: 'none',
                marginBottom: '40px',
                fontWeight: 500,
                transition: 'color 0.2s',
              }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                <IoArrowBackOutline size={16} /> Retour à l'accueil
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
                <img src="/image.png" alt="ESI-GIT Logo" style={{ height: '44px', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' }} />
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>ESI-GIT</h2>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</p>
                </div>
              </div>

              <h1 style={{ fontSize: '38px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '20px', letterSpacing: '-0.03em', lineHeight: 1.25 }}>
                Gérez vos projets académiques de manière{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #2EC4B6 0%, #6366F1 50%, #EC4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 900
                }}>collaborative.</span>
              </h1>

              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.7, marginBottom: '40px', maxWidth: '420px' }}>
                Rejoignez une équipe, configurez votre dépôt Git, suivez les tâches et collaborez avec vos encadreurs en temps réel.
              </p>
            </div>

            {/* Features list */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['✨ Git Sync', '📊 Suivi Jury', '📅 Soutenances', '🔐 Multi-rôles'].map((tag, i) => (
                <span key={i} style={{
                  padding: '8px 16px',
                  borderRadius: '100px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  backdropFilter: 'blur(8px)'
                }}>
                  {tag}
                </span>
              ))}
            </div>

          </div>

          {/* RIGHT SIDE: Login form & Quick Logins */}
          <div style={{
            padding: '60px 48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }} className="login-right-form">
            
            <div style={{ marginBottom: '32px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                display: 'block',
                marginBottom: '8px'
              }}>ESPACE D'ACCÈS</span>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                {isFirstLoginState ? 'Changer de mot de passe' : 'Connexion'}
              </h2>
            </div>



            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
                {isFirstLoginState ? (
                  <>
                    <p style={{ fontSize: '13px', color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Première connexion détectée. Veuillez choisir un nouveau mot de passe pour sécuriser votre compte.
                    </p>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Nouveau mot de passe</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          background: theme === 'dark' ? '#152033' : '#F8FAFC',
                          border: theme === 'dark' ? '1.5px solid #243347' : '1.5px solid #CBD5E1',
                          borderRadius: '14px',
                          fontSize: '14px',
                          color: theme === 'dark' ? '#F1F5F9' : '#0F172A',
                          outline: 'none',
                          transition: 'all 0.2s',
                        }}
                        onFocus={e => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.background = theme === 'dark' ? '#1E293B' : '#FFFFFF';
                          e.target.style.boxShadow = '0 0 0 4px rgba(46, 196, 182, 0.15)';
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = theme === 'dark' ? '#243347' : '#CBD5E1';
                          e.target.style.background = theme === 'dark' ? '#152033' : '#F8FAFC';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Email Input */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Adresse Email</label>
                      <div style={{ position: 'relative' }}>
                        <IoMailOutline size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="nom@esi.dz"
                          required
                          style={{
                            width: '100%',
                            padding: '14px 16px 14px 46px',
                            background: theme === 'dark' ? '#152033' : '#F8FAFC',
                            border: theme === 'dark' ? '1.5px solid #243347' : '1.5px solid #CBD5E1',
                            borderRadius: '14px',
                            fontSize: '14px',
                            color: theme === 'dark' ? '#F1F5F9' : '#0F172A',
                            outline: 'none',
                            transition: 'all 0.2s',
                          }}
                          onFocus={e => {
                            e.target.style.borderColor = 'var(--primary)';
                            e.target.style.background = theme === 'dark' ? '#1E293B' : '#FFFFFF';
                            e.target.style.boxShadow = '0 0 0 4px rgba(46, 196, 182, 0.15)';
                          }}
                          onBlur={e => {
                            e.target.style.borderColor = theme === 'dark' ? '#243347' : '#CBD5E1';
                            e.target.style.background = theme === 'dark' ? '#152033' : '#F8FAFC';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mot de passe</label>
                        <span onClick={() => setShowForgotModal(true)} style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                          Mot de passe oublié ?
                        </span>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <IoLockClosedOutline size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type={showPwd ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          style={{
                            width: '100%',
                            padding: '14px 48px 14px 46px',
                            background: theme === 'dark' ? '#152033' : '#F8FAFC',
                            border: theme === 'dark' ? '1.5px solid #243347' : '1.5px solid #CBD5E1',
                            borderRadius: '14px',
                            fontSize: '14px',
                            color: theme === 'dark' ? '#F1F5F9' : '#0F172A',
                            outline: 'none',
                            transition: 'all 0.2s',
                          }}
                          onFocus={e => {
                            e.target.style.borderColor = 'var(--primary)';
                            e.target.style.background = theme === 'dark' ? '#1E293B' : '#FFFFFF';
                            e.target.style.boxShadow = '0 0 0 4px rgba(46, 196, 182, 0.15)';
                          }}
                          onBlur={e => {
                            e.target.style.borderColor = theme === 'dark' ? '#243347' : '#CBD5E1';
                            e.target.style.background = theme === 'dark' ? '#152033' : '#F8FAFC';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd(s => !s)}
                          style={{
                            position: 'absolute',
                            right: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {showPwd ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#FCA5A5',
                  fontSize: '13.5px',
                  marginBottom: '20px',
                }}>
                  <IoAlertCircleOutline size={20} style={{ flexShrink: 0, color: '#EF4444' }} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '14px',
                  border: 'none',
                  background: loading ? 'var(--bg)' : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: loading ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: loading ? 'none' : '0 8px 24px rgba(46, 196, 182, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(46, 196, 182, 0.4)';
                  }
                }}
                onMouseLeave={e => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(46, 196, 182, 0.3)';
                  }
                }}
              >
                {loading ? (t('LoginBtn') === 'Log In' ? 'Logging in...' : 'Connexion...') : (isFirstLoginState ? 'Confirmer' : t('LoginBtn'))}
                {!loading && <IoChevronForward size={16} />}
              </button>
            </form>

          </div>
        </div>

        <p style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginTop: '10px',
          lineHeight: 1.6
        }}>
          © {new Date().getFullYear()} ESI-GIT — École Supérieure d'Informatique Sidi Bel Abbès. Tous droits réservés.
        </p>
      </div>

      <Modal isOpen={showForgotModal} onClose={() => { setShowForgotModal(false); setForgotRole(''); setForgotEmail(''); setForgotLoading(false); setForgotSent(false); }} title="Mot de passe oublié" showRequiredHint={false}>
        <div style={{ padding: '8px 0', lineHeight: 1.6, color: 'var(--text-primary)' }}>
          {!forgotRole ? (
            <>
              <p style={{ marginBottom: '16px', fontSize: '14px' }}>Veuillez sélectionner votre rôle :</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { role: 'admin', label: '🔑 Administrateur', desc: 'Réinitialiser par e-mail' },
                  { role: 'teacher', label: '👨‍🏫 Enseignant', desc: 'Contacter la scolarité' },
                  { role: 'student', label: '🎓 Étudiant', desc: 'Contacter la scolarité' },
                ].map(r => (
                  <button key={r.role} onClick={() => setForgotRole(r.role)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 18px', borderRadius: '12px', background: 'var(--bg)',
                      border: '1.5px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s',
                      textAlign: 'left', width: '100%',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-subtle)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)'; }}
                  >
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{r.label}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.desc}</p>
                    </div>
                    <IoChevronForward size={16} style={{ color: 'var(--text-muted)' }} />
                  </button>
                ))}
              </div>
            </>
          ) : forgotRole === 'admin' ? (
            <>
              {forgotSent ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>✉️</div>
                  <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>E-mail envoyé !</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Si un compte existe avec cette adresse, un lien de réinitialisation a été envoyé.
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ marginBottom: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Entrez votre adresse e-mail administrateur pour recevoir un lien de réinitialisation.
                  </p>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Adresse e-mail</label>
                    <input
                      type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      placeholder="admin@esi.dz" required
                      style={{
                        width: '100%', padding: '12px 16px',
                        background: theme === 'dark' ? '#152033' : '#F8FAFC',
                        border: theme === 'dark' ? '1.5px solid #243347' : '1.5px solid #CBD5E1',
                        borderRadius: '12px', fontSize: '14px',
                        color: theme === 'dark' ? '#F1F5F9' : '#0F172A',
                        outline: 'none',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 4px rgba(46, 196, 182, 0.15)'; }}
                      onBlur={e => { e.target.style.borderColor = theme === 'dark' ? '#243347' : '#CBD5E1'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button onClick={() => { setForgotRole(''); setForgotEmail(''); setForgotSent(false); }}
                  style={{ padding: '10px 18px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                  Retour
                </button>
                {!forgotSent && (
                  <button
                    disabled={forgotLoading || !forgotEmail.trim()}
                    onClick={async () => {
                      setForgotLoading(true);
                      try {
                        await authApi.forgotPassword(forgotEmail);
                        setForgotSent(true);
                        toast.success('E-mail envoyé');
                      } catch (err) {
                        toast.error(err?.response?.data?.error || "Erreur d'envoi");
                      } finally { setForgotLoading(false); }
                    }}
                    style={{
                      padding: '10px 20px', borderRadius: '10px',
                      background: (!forgotEmail.trim() || forgotLoading) ? 'var(--border)' : 'var(--primary)',
                      border: 'none', color: '#fff', fontWeight: 600, fontSize: '13px',
                      cursor: (!forgotEmail.trim() || forgotLoading) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {forgotLoading ? 'Envoi...' : 'Envoyer le lien'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <p style={{ marginBottom: '14px' }}>
                Pour réinitialiser ou récupérer votre mot de passe, veuillez vous présenter au service de la scolarité / <strong>l'administration</strong> de l'ESI.
              </p>
              <p>
                Vous pouvez également contacter l'administrateur système par e-mail à l'adresse suivante :<br />
                <a href={`mailto:${contactEmail}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>{contactEmail}</a>
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button onClick={() => setForgotRole('')}
                  style={{ padding: '10px 18px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                  Retour
                </button>
                <button onClick={() => { setShowForgotModal(false); setForgotRole(''); }}
                  style={{ padding: '10px 20px', borderRadius: '10px', background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  Fermer
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <style>{`
        @media (max-width: 850px) {
          .login-card-wrapper {
            grid-template-columns: 1fr !important;
          }
          .login-left-brand {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}