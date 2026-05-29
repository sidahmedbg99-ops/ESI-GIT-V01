import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IoMailOutline, IoArrowBackOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import { authApi } from '../../api/auth';
import { useLanguage } from '../../context/LanguageContext';
import { toast } from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
      toast.success(t('Success'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('Error'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <IoCheckmarkCircleOutline size={48} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>Email envoyé !</h1>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px' }}>
            Si un compte existe avec l'adresse <strong>{email}</strong>, un lien de réinitialisation a été envoyé. Veuillez vérifier votre boîte de réception.
          </p>
          <Link to="/login" style={{ display: 'inline-block', width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--primary)', color: '#fff', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', marginBottom: '32px', fontWeight: 500 }}>
          <IoArrowBackOutline size={15} /> Retour à la connexion
        </Link>

        <h1 style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px', color: 'var(--text-primary)' }}>
          Mot de passe oublié
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '36px' }}>
          Entrez votre email pour recevoir un lien de réinitialisation sécurisé.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <IoMailOutline size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="votre@esi.dz" required
                style={{ width: '100%', padding: '13px 14px 13px 42px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: '12px', fontSize: '14px', outline: 'none' }}
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: loading ? 'var(--primary-subtle)' : 'var(--primary)', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}
          >
            {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
          </button>
        </form>
      </div>
    </div>
  );
}
