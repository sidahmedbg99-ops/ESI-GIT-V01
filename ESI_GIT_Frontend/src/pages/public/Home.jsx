import { Link } from 'react-router-dom';
import {
  IoGitBranchOutline, IoShieldCheckmarkOutline, IoAnalyticsOutline,
  IoPeopleOutline, IoCalendarOutline, IoCheckboxOutline,
  IoArrowForwardOutline, IoSchoolOutline, IoGlobeOutline
} from 'react-icons/io5';
import PublicLayout from '../../layouts/PublicLayout';
import Button from '../../components/ui/Button';
import { useLanguage } from '../../context/LanguageContext';

import { useTheme } from '../../context/ThemeContext';
import { IoSunnyOutline, IoMoonOutline } from 'react-icons/io5';

function FadeIn({ children }) {
  return <>{children}</>;
}

export default function Home() {
  const { t, lang, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const features = [
    { icon: <IoGitBranchOutline size={28} />, title: t('Feature1Title'), desc: t('Feature1Desc'), color: 'var(--primary)' },
    { icon: <IoPeopleOutline size={28} />, title: t('Feature2Title'), desc: t('Feature2Desc'), color: 'var(--accent)' },
    { icon: <IoCalendarOutline size={28} />, title: t('Feature3Title'), desc: t('Feature3Desc'), color: 'var(--primary)' },
    { icon: <IoCheckboxOutline size={28} />, title: t('Feature4Title'), desc: t('Feature4Desc'), color: 'var(--accent)' },
    { icon: <IoAnalyticsOutline size={28} />, title: t('Feature5Title'), desc: t('Feature5Desc'), color: 'var(--primary)' },
    { icon: <IoShieldCheckmarkOutline size={28} />, title: t('Feature6Title'), desc: t('Feature6Desc'), color: 'var(--accent)' },
  ];

  const stats = [
    { value: '2,400+', label: t('StatsActiveStudents') },
    { value: '180+', label: t('StatsProjects') },
    { value: '95', label: t('StatsTeachers') },
    { value: '99.9%', label: t('StatsUptime') },
  ];

  return (
    <PublicLayout>
      {/* Full Navbar */}
      <nav style={{
        position: 'fixed', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 24px', background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        borderRadius: '24px', width: '90%', maxWidth: '1200px', height: '70px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/image.png" alt="ESI-GIT Logo" style={{ height: '50px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={toggleTheme} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px',
            padding: '10px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
          }}>
            {theme === 'light' ? <IoMoonOutline size={22} /> : <IoSunnyOutline size={22} />}
          </button>
          
          <button onClick={toggleLanguage} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px',
            padding: '10px 16px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s',
          }}>
            <IoGlobeOutline size={18} /> {lang.toUpperCase()}
          </button>
          
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <button style={{
              background: '#fff', border: 'none', borderRadius: '12px',
              padding: '10px 20px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
              transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(255,255,255,0.15)'
            }}>
              {t('LoginBtn')}
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          minHeight: '100vh',
          paddingTop: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
          backgroundImage: 'url(/new-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Background decoration & overlay with blur */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.7) 100%)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />

        <div style={{ maxWidth: '860px', padding: '0 24px', position: 'relative', zIndex: 1, marginTop: '60px' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <span style={{
              padding: '8px 20px', borderRadius: 'var(--radius-full)',
              background: 'rgba(46, 196, 182, 0.2)', color: 'var(--primary-light)',
              fontSize: '14px', fontWeight: 600, border: '1px solid rgba(46, 196, 182, 0.4)', backdropFilter: 'blur(5px)'
            }}>
              {t('HomeBadge')}
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(44px, 7vw, 84px)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              marginBottom: '24px',
              color: '#fff',
              textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            {t('HomeTitle')}<br />
            <span style={{ 
              background: 'linear-gradient(to right, var(--primary), var(--accent))', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}>ESI-GIT</span>
          </h1>

          <p
            style={{
              fontSize: '18px', color: '#cbd5e1',
              lineHeight: 1.7, marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px',
            }}
          >
            {t('HomeSubtitle')}
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login">
              <Button size="lg" iconRight={<IoArrowForwardOutline size={18} />}>
                {t('GetStarted')}
              </Button>
            </Link>
            <Link to="/about">
              <button style={{
                 padding: '0 24px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: '15px', fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(5px)'
              }}>
                {t('LearnMore')}
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{
        padding: '70px 24px',
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
        position: 'relative',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', position: 'relative', zIndex: 1 }}>
          {stats.map((s, i) => (
            <FadeIn key={i}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '44px', fontWeight: 800, fontFamily: 'Syne', color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</p>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '15px', marginTop: '6px' }}>{s.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '100px 24px', background: 'var(--bg)', position: 'relative' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '16px' }}>
              {t('FeaturesTitle')}
            </h2>
            <p style={{ fontSize: '17px', color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto' }}>
              {t('FeaturesSubtitle')}
            </p>
          </div>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {features.map((f, i) => (
            <FadeIn key={i}>
              <div>
                <div style={{ 
                  padding: '32px', 
                  borderRadius: '24px', 
                  background: 'var(--bg-card)', 
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  cursor: 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(0, 0, 0, 0.1)';
                }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: '16px',
                    background: `linear-gradient(135deg, ${f.color}22, ${f.color}11)`,
                    border: `1px solid ${f.color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: f.color, marginBottom: '20px',
                    boxShadow: `0 4px 12px ${f.color}15`
                  }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '12px' }}>{f.title}</h3>
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '100px 24px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-50%', left: '-10%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-30%', right: '-5%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />
        <FadeIn>
          <IoSchoolOutline size={48} style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }} />
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800, color: '#fff', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            {t('ReadyToStart')}
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', marginBottom: '32px' }}>
            {t('ReadyToStartSub')}
          </p>
          <Link to="/login">
            <Button size="lg" style={{ background: '#fff', color: 'var(--primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
              {t('LoginBtn')}
            </Button>
          </Link>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer style={{
        background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
        padding: '32px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} {t('FooterText')}
        </p>
      </footer>
    </PublicLayout>
  );
}
