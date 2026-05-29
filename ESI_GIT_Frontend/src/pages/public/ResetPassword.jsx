import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline, IoArrowBackOutline } from 'react-icons/io5';
import { authApi } from '../../api/auth';
import { useLanguage } from '../../context/LanguageContext';
import { toast } from 'react-hot-toast';

export default function ResetPassword() {
  const { uid, token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit faire au moins 6 caractères");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPasswordConfirm(uid, token, password);
      toast.success("Mot de passe réinitialisé avec succès");
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || "Lien invalide ou expiré");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px', color: 'var(--text-primary)' }}>
          Nouveau mot de passe
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '36px' }}>
          Définissez votre nouveau mot de passe pour accéder à votre compte.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>Nouveau mot de passe</label>
              <div style={{ position: 'relative' }}>
                <IoLockClosedOutline size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{ width: '100%', padding: '13px 48px 13px 42px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: '12px', fontSize: '14px', outline: 'none' }}
                />
                <button
                  type="button" onClick={() => setShowPwd(s => !s)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  {showPwd ? <IoEyeOffOutline size={17} /> : <IoEyeOutline size={17} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>Confirmer le mot de passe</label>
              <div style={{ position: 'relative' }}>
                <IoLockClosedOutline size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{ width: '100%', padding: '13px 14px 13px 42px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: '12px', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: loading ? 'var(--primary-subtle)' : 'var(--primary)', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}
          >
            {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
