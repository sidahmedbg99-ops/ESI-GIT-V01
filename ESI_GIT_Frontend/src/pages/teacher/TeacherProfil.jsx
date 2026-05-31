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

export default function TeacherProfil() {
  const { user, updateUser } = useAuth();
  const { groups, stats } = useTeacher();
  const { t } = useLanguage();

  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' });
  const [passMsg,  setPassMsg]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  const handleToggleAvailability = async () => {
    setIsUpdatingStatus(true);
    try {
      const { data } = await client.patch(ENDPOINTS.teacher.profile, {
        available: user?.available !== false ? false : true,
      });
      updateUser({ available: data.available });
      toast.success("Statut mis à jour !");
    } catch(e) {
      toast.error(e.response?.data?.error || "Erreur de mise à jour");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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
                { label: t('FullName'),    value: user?.full_name || user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || '—', icon: <IoPersonOutline size={16}/> },
                { label: t('Email'),         value: user?.email      || '—', icon: <IoMailOutline size={16}/> },
                { label: 'Département',    value: user?.department || 'Informatique', icon: <IoSchoolOutline size={16}/> },
                { label: t('Specialty'),     value: user?.specialty  || 'Non renseignée', icon: <IoBookOutline size={16}/> },
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

          {/* Availability Toggle */}
          <Card>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IoTimeOutline size={18} color="var(--accent)" /> Disponibilité pour l'encadrement
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>Être disponible pour de nouveaux projets</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Si actif, vous apparaissez dans la liste des encadreurs disponibles pour les étudiants.</p>
              </div>
              <div 
                onClick={handleToggleAvailability}
                style={{ width: '44px', height: '24px', borderRadius: '12px', background: user?.available !== false ? 'var(--accent)' : 'var(--border)', position: 'relative', cursor: isUpdatingStatus ? 'not-allowed' : 'pointer', transition: 'all 0.3s', opacity: isUpdatingStatus ? 0.6 : 1 }}
              >
                <div style={{ position: 'absolute', top: '2px', left: user?.available !== false ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.3s' }} />
              </div>
            </div>
          </Card>

          {/* Change Password */}
          <Card>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IoKeyOutline size={18} color="var(--accent)" /> {t('ChangePassword')}
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
