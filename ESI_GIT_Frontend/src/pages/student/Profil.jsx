import { useState } from 'react';
import { IoPersonOutline, IoMailOutline, IoSchoolOutline, IoCalendarOutline, IoRibbonOutline, IoKeyOutline, IoCheckmarkOutline, IoLockClosedOutline } from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import client from '../../api/client';
import { ENDPOINTS } from '../../api/config';
import { toast } from 'react-hot-toast';

export default function Profil() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);
  const [passMsg, setPassMsg] = useState('');

  const handlePasswordChange = async () => {
    if (!passForm.current || !passForm.next || !passForm.confirm) {
      setPassMsg("Veuillez remplir tous les champs");
      return;
    }
    if (passForm.next !== passForm.confirm) {
      setPassMsg("Les mots de passe ne correspondent pas");
      return;
    }
    if (passForm.next.length < 8) {
      setPassMsg("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setSubmitting(true);
    setPassMsg('');
    try {
      await client.post(ENDPOINTS.auth.changePassword, {
        old_password: passForm.current,
        new_password: passForm.next
      });
      toast.success("Mot de passe mis à jour !");
      setPassForm({ current: '', next: '', confirm: '' });
    } catch (e) {
      setPassMsg(e.response?.data?.error || "Erreur lors du changement de mot de passe");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('ProfileTitle')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('ProfileSubtitle')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>
        {/* Avatar card */}
        <Card style={{ textAlign: 'center', alignSelf: 'start' }}>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 700, color: '#fff', margin: '0 auto 14px', boxShadow: '0 6px 20px rgba(79,70,229,0.28)' }}>
              {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>{user?.name}</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'capitalize', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <IoRibbonOutline size={13}/>{user?.role}
            </p>
          </div>
        </Card>

        {/* Info card – read-only */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>{t('PersonalInfo')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: t('FullName'), value: user?.full_name || user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || '—', icon: <IoPersonOutline size={16}/> },
                { label: t('Email'),   value: user?.email || '—', icon: <IoMailOutline size={16}/> },
                { label: t('Year'),    value: (['L1', 'L2', 'L3', 'M1', 'M2'][Number(user?.level) - 1]) || (user?.level ? `Niveau ${user.level}` : '—'), icon: <IoSchoolOutline size={16}/> },
                { label: t('Specialty'), value: user?.specialty || '—', icon: <IoSchoolOutline size={16}/> },
                { label: 'Département', value: user?.department || '—', icon: <IoSchoolOutline size={16}/> },
                { label: t('Promotion'), value: user?.academic_year || '—', icon: <IoCalendarOutline size={16}/> },
              ].map((field, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>{field.icon}</div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{field.label}</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{field.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px dashed var(--border)' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {t('AdminLock')}
              </p>
            </div>
          </Card>

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
            
            <Button onClick={handlePasswordChange} loading={submitting} icon={submitting ? null : <IoLockClosedOutline size={18}/>}>
              {submitting ? "Mise à jour..." : t('UpdatePassword')}
            </Button>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
