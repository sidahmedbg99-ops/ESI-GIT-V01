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
          <div style={{ marginBottom: '20px' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 700, color: '#fff', margin: '0 auto 14px', boxShadow: '0 6px 20px rgba(79,70,229,0.28)' }}>
              {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>{user?.name}</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'capitalize', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <IoRibbonOutline size={13}/>{user?.role}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: t('Promotion'), value: user?.promo || '2024', color: 'var(--primary)', icon: <IoCalendarOutline size={13}/> },
              { label: t('Year'),      value: user?.year || 'L3', color: 'var(--accent)', icon: <IoSchoolOutline size={13}/> },
              { label: t('Specialty'), value: user?.specialite || 'ISI', color: '#F59E0B', icon: <IoSchoolOutline size={13}/> },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: '8px', background: 'var(--bg)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>{s.icon}{s.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Info card – read-only */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>{t('PersonalInfo')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: t('FullName'), value: user?.name || '—', icon: <IoPersonOutline size={16}/> },
                { label: t('Email'), value: user?.email || '—', icon: <IoMailOutline size={16}/> },
                { label: t('Year'),      value: user?.year || 'L3', icon: <IoSchoolOutline size={16}/> },
                { label: t('Specialty'), value: user?.specialite || 'ISI', icon: <IoSchoolOutline size={16}/> },
                { label: t('Promotion'), value: user?.promo || '2024', icon: <IoCalendarOutline size={16}/> },
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
