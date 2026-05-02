import { useState } from 'react';
import {
  IoPersonOutline, IoMailOutline, IoShieldCheckmarkOutline,
  IoTimeOutline, IoKeyOutline, IoCheckmarkOutline, IoLockClosedOutline,
} from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminProfil() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' });
  const [saved,    setSaved]    = useState(false);
  const [passMsg,  setPassMsg]  = useState('');

  const handlePasswordChange = () => {
    if (!passForm.current || !passForm.next) { setPassMsg(t('Error')); return; }
    if (passForm.next !== passForm.confirm)  { setPassMsg(t('Error')); return; }
    if (passForm.next.length < 8)           { setPassMsg(t('Error')); return; }
    setPassMsg('');
    setSaved(true);
    setPassForm({ current: '', next: '', confirm: '' });
    setTimeout(() => setSaved(false), 3000);
  };

  const ADMIN_ACTIONS = [
    { label: t('Users'),        value: '2 500+', color: 'var(--primary)' },
    { label: t('Groups'),       value: '180',    color: '#10B981' },
    { label: t('Projects'),     value: '2 100',  color: 'var(--accent)' },
  ];

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('ProfileTitle')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('ProfileSubtitle')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>

        {/* ── Left: identity card ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card style={{ textAlign: 'center' }}>
            {/* Avatar */}
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6, var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 700, color: '#fff', margin: '0 auto 14px', boxShadow: '0 6px 20px rgba(79,70,229,0.28)' }}>
              {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>{user?.name}</h2>
            <Badge variant="primary">{t('Admin')}</Badge>

            {/* Quick stats */}
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ADMIN_ACTIONS.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: '8px', background: 'var(--bg)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{a.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: a.color }}>{a.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Last login */}
          <Card style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <IoTimeOutline size={15} color="var(--text-muted)" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Date')}</span>
            </div>
            <p style={{ fontSize: '13px', fontWeight: 600 }}>{new Date().toLocaleDateString()}</p>
          </Card>
        </div>

        {/* ── Right: info + password ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Account info */}
          <Card>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IoPersonOutline size={18} color="var(--primary)" /> {t('PersonalInfo')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: t('FullName'),    value: user?.name  || '—', icon: <IoPersonOutline size={16}/> },
                { label: t('Email'), value: user?.email || '—', icon: <IoMailOutline size={16}/> },
                { label: t('Status'),           value: t('Admin'), icon: <IoShieldCheckmarkOutline size={16}/> },
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{f.label}</p>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>{f.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px dashed var(--border)' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {t('AdminLock')}
              </p>
            </div>
          </Card>

          {/* Change password */}
          <Card>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IoKeyOutline size={18} color="#F59E0B" /> {t('Settings')}
            </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '420px' }}>
              <p style={{fontSize: '14px', color: 'var(--text-secondary)'}}>{t('AdminLock')}</p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
