import { IoSchoolOutline, IoCodeSlashOutline, IoGlobeOutline, IoHeartOutline } from 'react-icons/io5';
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
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 24px 80px' }}>
        <FadeIn>
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

        <FadeIn>
          <div style={{
            padding: '40px', borderRadius: 'var(--radius-2xl)',
            background: 'var(--primary-subtle)', border: '1px solid rgba(79,70,229,0.2)',
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px', color: 'var(--primary)' }}>Accès demo</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Explorez la plateforme avec les comptes de démonstration :
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '20px' }}>
              {[
                { role: 'Étudiant', email: 'student@esi.dz', pwd: 'student123' },
                { role: 'Enseignant', email: 'teacher@esi.dz', pwd: 'teacher123' },
                { role: 'Admin', email: 'admin@esi.dz', pwd: 'admin123' },
              ].map((u, i) => (
                <div key={i} style={{
                  padding: '14px 16px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{u.role}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{u.email}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{u.pwd}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </PublicLayout>
  );
}
