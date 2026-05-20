import { IoPersonOutline, IoMailOutline, IoSchoolOutline, IoCalendarOutline, IoRibbonOutline } from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function Profil() {
  const { user } = useAuth();
  const { t } = useLanguage();

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

        </div>
      </div>
    </DashboardLayout>
  );
}
