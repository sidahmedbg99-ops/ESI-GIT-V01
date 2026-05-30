import { useState } from 'react';
import {
  IoPersonOutline, IoMailOutline, IoSchoolOutline,
  IoKeyOutline, IoCheckmarkOutline, IoLockClosedOutline,
  IoTimeOutline, IoStarOutline, IoPeopleOutline,
  IoBookOutline, IoToggleOutline,
} from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useTeacher } from '../../context/TeacherContext';
import { useLanguage } from '../../context/LanguageContext';
import client from '../../api/client';
import { ENDPOINTS } from '../../api/config';
import { toast } from 'react-hot-toast';
import { authApi } from '../../api/auth';

export default function TeacherProfil() {
  const { user } = useAuth();
  const { groups, stats } = useTeacher();
  const { t } = useLanguage();

  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' });
  const [saved,    setSaved]    = useState(false);
  const [passMsg,  setPassMsg]  = useState('');
  const [available, setAvailable] = useState(user?.available !== false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const safeGroups = groups || [];
  const activeGroups  = safeGroups.filter(g => g.status === 'active' || g.status === 'approved').length;
  const totalStudents = safeGroups.reduce((acc, g) => acc + (g.members?.length || g.studentIds?.length || 0), 0);

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('ProfileTitle')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('ProfileSubtitle')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>

        {/* ── Left ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), #0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 700, color: '#fff', margin: '0 auto 14px', boxShadow: '0 6px 20px rgba(6,182,212,0.28)' }}>
              {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>{user?.full_name || user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{user?.email}</p>
            <Badge variant="info">{t('Teachers')}</Badge>
          </Card>
        </div>

        {/* ── Right ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Account info */}
          <Card>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IoPersonOutline size={18} color="var(--accent)"/> {t('PersonalInfo')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: t('FullName'),  value: user?.full_name || user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || '—', icon: <IoPersonOutline size={16}/> },
                { label: t('Email'),     value: user?.email     || '—', icon: <IoMailOutline size={16}/> },
                { label: 'Département', value: user?.department || 'Informatique', icon: <IoSchoolOutline size={16}/> },
                { label: t('Specialty'), value: user?.specialty || 'Non renseignée', icon: <IoBookOutline size={16}/> },
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{f.label}</p>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>{f.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Availability */}
          <Card>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IoToggleOutline size={18} color="var(--accent)"/> {t('Status')}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>
                  {available ? 'Disponible pour encadrement' : 'Non disponible'}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {available ? 'Visible aux étudiants' : 'Caché de la liste des encadreurs'}
                </p>
              </div>
              <button
                disabled={isUpdatingStatus}
                onClick={async () => {
                  setIsUpdatingStatus(true);
                  try {
                    await client.patch(ENDPOINTS.teacher.profile, { available: !available });
                    setAvailable(a => !a);
                    toast.success('Statut mis à jour');
                  } catch {
                    toast.error('Erreur lors de la mise à jour');
                  } finally {
                    setIsUpdatingStatus(false);
                  }
                }}
                style={{ width: 44, height: 24, borderRadius: '12px', background: available ? 'var(--primary)' : 'var(--border)', border: 'none', cursor: isUpdatingStatus ? 'not-allowed' : 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
              >
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: available ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}/>
              </button>
            </div>
          </Card>

          {/* Change Password */}
          <Card>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IoKeyOutline size={18} color="var(--accent)"/> {t('ChangePassword')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: 'current', label: t('CurrentPassword'),  type: 'password' },
                { key: 'next',    label: t('NewPassword'),      type: 'password' },
                { key: 'confirm', label: t('ConfirmPassword'),  type: 'password' },
              ].map(f => (
                <input key={f.key} type={f.type} placeholder={f.label}
                  value={passForm[f.key]} onChange={e => setPassForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}/>
              ))}
              {passMsg && <p style={{ fontSize: '13px', color: '#EF4444' }}>{passMsg}</p>}
              {saved   && <p style={{ fontSize: '13px', color: '#10B981' }}>✓ {t('Saved')}</p>}
              <Button onClick={async () => {
                if (!passForm.current || !passForm.next) { setPassMsg(t('fieldsRequired')); return; }
                if (passForm.next !== passForm.confirm)  { setPassMsg(t('passwordMismatch')); return; }
                if (passForm.next.length < 8)           { setPassMsg(t('passwordTooShort')); return; }
                setPassMsg('');
                try {
                  await authApi.changePassword(passForm.current, passForm.next);
                  setSaved(true);
                  setPassForm({ current: '', next: '', confirm: '' });
                  setTimeout(() => setSaved(false), 3000);
                } catch(e) {
                  setPassMsg(e?.response?.data?.error || t('Error'));
                }
              }}>{t('Save')}</Button>
            </div>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  );
}