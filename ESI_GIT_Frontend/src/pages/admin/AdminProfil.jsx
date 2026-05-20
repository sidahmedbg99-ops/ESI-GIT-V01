import { useState } from 'react';
import {
  IoPersonOutline, IoMailOutline, IoShieldCheckmarkOutline,
  IoTimeOutline, IoKeyOutline, IoCheckmarkOutline, IoLockClosedOutline,
  IoCardOutline, IoBusinessOutline, IoBookOutline
} from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../context/AdminContext';
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

  const { stats } = useAdmin();
  const ADMIN_ACTIONS = [
    { label: t('Users'),        value: stats?.usersTotal || '0', color: 'var(--primary)' },
    { label: t('Groups'),       value: stats?.groupsActive || '0',    color: '#10B981' },
    { label: t('Projects'),     value: stats?.groupsTotal || '0',  color: 'var(--accent)' },
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
                { label: 'Matricule (TID)', value: user?.TID || '—', icon: <IoCardOutline size={16}/> },
                { label: t('FullName'),    value: user?.name  || '—', icon: <IoPersonOutline size={16}/> },
                { label: t('Email'), value: user?.email || '—', icon: <IoMailOutline size={16}/> },
                { label: 'Département', value: user?.department || '—', icon: <IoBusinessOutline size={16}/> },
                { label: 'Spécialité', value: user?.specialty || '—', icon: <IoBookOutline size={16}/> },
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
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
