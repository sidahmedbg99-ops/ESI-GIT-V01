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
import client from '../../api/client';
import { ENDPOINTS } from '../../api/config';
import toast from 'react-hot-toast';

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

          {/* Change Password */}
          <Card>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IoKeyOutline size={18} color="var(--primary)" /> {t('ChangePassword')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>{t('CurrentPassword')}</label>
                <Input type="password" value={passForm.current} onChange={e => setPassForm({...passForm, current: e.target.value})} placeholder="••••••••" />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>{t('NewPassword')}</label>
                <Input type="password" value={passForm.next} onChange={e => setPassForm({...passForm, next: e.target.value})} placeholder="••••••••" />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>{t('ConfirmPassword')}</label>
                <Input type="password" value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})} placeholder="••••••••" />
              </div>
            </div>
            
            {passMsg && <p style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '12px' }}>{passMsg}</p>}
            
            <Button onClick={handlePasswordChange} loading={saved} icon={saved ? <IoCheckmarkOutline size={18}/> : <IoLockClosedOutline size={18}/>}>
              {saved ? t('Saved') : t('UpdatePassword')}
            </Button>
          </Card>

          {/* Teacher Availability (If applicable) */}
          {user?.is_teacher && (
            <Card>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IoTimeOutline size={18} color="var(--primary)" /> Disponibilité pour l'encadrement
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>Être disponible pour de nouveaux projets</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Si actif, vous apparaissez dans la liste des encadreurs disponibles pour les étudiants.</p>
                </div>
                <div 
                  onClick={async () => {
                    try {
                      await client.patch(ENDPOINTS.auth.toggleAvailability);
                      // Force local user update if necessary, or just rely on state
                      window.location.reload(); // Quick way to sync auth user state
                    } catch(e) { console.error(e); }
                  }}
                  style={{ width: '44px', height: '24px', borderRadius: '12px', background: user?.available !== false ? 'var(--primary)' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                  <div style={{ position: 'absolute', top: '2px', left: user?.available !== false ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.3s' }} />
                </div>
              </div>
            </Card>
          )}
        </div>
    </DashboardLayout>
  );
}
