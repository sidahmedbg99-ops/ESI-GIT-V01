import { IoSchoolOutline, IoCodeSlashOutline, IoGlobeOutline, IoHeartOutline, IoArrowBackOutline } from 'react-icons/io5';
import { Link } from 'react-router-dom';
import PublicLayout from '../../layouts/PublicLayout';
import Card from '../../components/ui/Card';

const FadeIn = ({ children }) => (
  <div style={{ animation: 'fade-in 0.6s ease-out' }}>
    {children}
  </div>
);

const team = [
  { name: 'Équipe pédagogique', role: 'Conception académique', icon: <IoSchoolOutline size={28} />, color: 'var(--primary)' },
  { name: 'Équipe dev', role: 'Développement & infrastructure', icon: <IoCodeSlashOutline size={28} />, color: '#10B981' },
  { name: 'Comité ESI', role: 'Gouvernance & stratégie', icon: <IoGlobeOutline size={28} />, color: '#F59E0B' },
  { name: 'Étudiants', role: 'Beta-testeurs & contributeurs', icon: <IoHeartOutline size={28} />, color: '#EF4444' },
];

export default function About() {
  return (
    <PublicLayout>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <FadeIn>
          <div style={{ marginBottom: '40px' }}>
            <Link to="/" style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '8px', 
              color: 'var(--text-secondary)', textDecoration: 'none', 
              fontSize: '14px', fontWeight: 600, transition: '0.2s' 
            }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <IoArrowBackOutline size={20} />
              Retour à l'accueil
            </Link>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '72px' }}>
            <span style={{
              display: 'inline-block', padding: '5px 14px', borderRadius: 'var(--radius-full)',
              background: 'var(--primary-subtle)', color: 'var(--primary)',
              fontSize: '13px', fontWeight: 600, marginBottom: '20px',
            }}>À propos d'ESI-GIT</span>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '20px' }}>
              La plateforme conçue<br />pour l'excellence académique
            </h1>
            <p style={{ fontSize: '17px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '640px', margin: '0 auto' }}>
              ESI-GIT est née d'un besoin concret : simplifier la gestion des projets de fin d'études à ESI Sba.
            </p>
          </div>
        </FadeIn>

        <FadeIn>
          <Card style={{ padding: '40px', marginBottom: '32px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', border: 'none' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>Notre mission</h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>
              Offrir aux étudiants, enseignants et équipes administratives une solution digitale unifiée qui modernise le cycle de vie des projets universitaires — de la formation des groupes jusqu'à la soutenance finale.
            </p>
          </Card>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '64px' }}>
          {team.map((t, i) => (
            <FadeIn key={i}>
              <Card hover style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 'var(--radius-md)',
                  background: t.color + '18', color: t.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                }}>
                  {t.icon}
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>{t.name}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t.role}</p>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
