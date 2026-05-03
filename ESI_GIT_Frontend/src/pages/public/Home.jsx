import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  IoGitBranchOutline, IoShieldCheckmarkOutline, IoAnalyticsOutline,
  IoPeopleOutline, IoCalendarOutline, IoCheckboxOutline,
  IoArrowForwardOutline, IoSchoolOutline, IoGlobeOutline,
  IoSunnyOutline, IoMoonOutline, IoArrowUpOutline
} from 'react-icons/io5';
import PublicLayout from '../../layouts/PublicLayout';
import Button from '../../components/ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export default function Home() {
  const { t, lang, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [navVisible, setNavVisible] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Navbar visibility logic
      if (currentScrollY < 50) {
        setNavVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setNavVisible(false); // Scrolling down
      } else {
        setNavVisible(true); // Scrolling up
      }
      
      // Scroll to top button visibility
      setShowScrollTop(currentScrollY > 400);
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const features = [
    { icon: <IoGitBranchOutline size={28} />, title: t('Feature1Title'), desc: t('Feature1Desc'), color: '#2EC4B6' },
    { icon: <IoPeopleOutline size={28} />, title: t('Feature2Title'), desc: t('Feature2Desc'), color: '#3B82F6' },
    { icon: <IoCalendarOutline size={28} />, title: t('Feature3Title'), desc: t('Feature3Desc'), color: '#8B5CF6' },
    { icon: <IoCheckboxOutline size={28} />, title: t('Feature4Title'), desc: t('Feature4Desc'), color: '#F59E0B' },
    { icon: <IoAnalyticsOutline size={28} />, title: t('Feature5Title'), desc: t('Feature5Desc'), color: '#10B981' },
    { icon: <IoShieldCheckmarkOutline size={28} />, title: t('Feature6Title'), desc: t('Feature6Desc'), color: '#EF4444' },
  ];

  return (
    <PublicLayout>
      {/* --- Minimalist Navbar --- */}
      <nav style={{
        position: 'fixed', top: navVisible ? '20px' : '-100px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 24px', width: '90%', maxWidth: '1200px', height: '72px',
        background: 'transparent', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/image.png" alt="ESI-GIT" style={{ height: '48px', filter: theme === 'dark' ? 'none' : 'invert(0.1)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={toggleTheme} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '14px',
            width: '44px', height: '44px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.3s',
            backdropFilter: 'blur(10px)'
          }}>
            {theme === 'light' ? <IoMoonOutline size={22} /> : <IoSunnyOutline size={22} />}
          </button>
          
          <button onClick={toggleLanguage} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '14px',
            width: '44px', height: '44px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.3s',
            backdropFilter: 'blur(10px)'
          }}>
            <IoGlobeOutline size={22} />
          </button>
          
          <Link to="/login">
            <button style={{
              background: 'var(--primary)', border: 'none', borderRadius: '14px',
              width: '44px', height: '44px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 20px -5px rgba(46, 196, 182, 0.4)', transition: '0.3s',
            }}>
              <IoSchoolOutline size={22} />
            </button>
          </Link>
        </div>
      </nav>

      {/* --- Scroll to Top Button (Bottom Left) --- */}
      <button 
        onClick={scrollToTop}
        style={{
          position: 'fixed', bottom: '30px', left: showScrollTop ? '30px' : '-80px', zIndex: 1000,
          width: '56px', height: '56px', borderRadius: '18px', background: 'var(--primary)',
          color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          boxShadow: '0 10px 25px rgba(46, 196, 182, 0.4)',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px) scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
      >
        <IoArrowUpOutline size={24} />
      </button>

      {/* --- Hero Section --- */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', textAlign: 'center',
        backgroundImage: 'url(/esi_background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        {/* Overlay with subtle blur for better text isolation */}
        <div style={{ 
          position: 'absolute', inset: 0, 
          background: theme === 'dark' ? 'linear-gradient(135deg, rgba(11, 17, 32, 0.8) 0%, rgba(15, 23, 42, 0.7) 100%)' : 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.5) 100%)', 
          backdropFilter: 'blur(5px)' 
        }} />

        <div style={{ maxWidth: '900px', padding: '0 24px', position: 'relative', zIndex: 1 }} className="animate-fade">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
            <span style={{
              padding: '8px 20px', borderRadius: 'var(--radius-full)',
              background: 'rgba(46, 196, 182, 0.15)', color: 'var(--primary)',
              fontSize: '13px', fontWeight: 700, border: '1px solid rgba(46, 196, 182, 0.3)', textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              {t('HomeBadge')}
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(48px, 8vw, 88px)', fontWeight: 800, marginBottom: '24px', letterSpacing: '-0.05em', lineHeight: 1 }}>
            {t('HomeTitle')}<br />
            <span className="text-gradient">ESI-GIT</span>
          </h1>

          <p style={{ fontSize: '20px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '48px', maxWidth: '640px', margin: '0 auto 48px' }}>
            {t('HomeSubtitle')}
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login">
              <Button size="lg" iconRight={<IoArrowForwardOutline size={18} />} style={{ borderRadius: '16px', padding: '0 36px', height: '56px' }}>
                {t('GetStarted')}
              </Button>
            </Link>
            <Link to="/about">
              <button style={{
                padding: '0 32px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '15px', fontWeight: 600, transition: '0.3s'
              }} className="glass hover-lift">
                {t('LearnMore')}
              </button>
            </Link>
          </div>
        </div>

        {/* Abstract Floating Shapes */}
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: '120px', height: '120px', borderRadius: '30%', background: 'var(--primary-subtle)', filter: 'blur(40px)', opacity: 0.4 }} className="animate-float" />
        <div style={{ position: 'absolute', bottom: '15%', right: '15%', width: '180px', height: '180px', borderRadius: '50%', background: 'var(--accent-light)', filter: 'blur(60px)', opacity: 0.3 }} className="animate-float" />
      </section>

      {/* --- Features Section --- */}
      <section style={{ padding: '120px 24px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, marginBottom: '20px' }}>
              {t('FeaturesTitle')}
            </h2>
            <div style={{ width: '60px', height: '4px', background: 'var(--primary)', margin: '0 auto 24px', borderRadius: '2px' }} />
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto' }}>
              {t('FeaturesSubtitle')}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
            {features.map((f, i) => (
              <div key={i} style={{
                padding: '40px', borderRadius: '28px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', position: 'relative', overflow: 'hidden'
              }} className="hover-lift">
                <div style={{
                  width: '64px', height: '64px', borderRadius: '20px',
                  background: `linear-gradient(135deg, ${f.color}15, ${f.color}08)`,
                  border: `1px solid ${f.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: f.color, marginBottom: '28px',
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px' }}>{f.title}</h3>
                <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
                <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', width: '40px', height: '40px', borderRadius: '50%', background: f.color, opacity: 0.05, filter: 'blur(20px)' }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section style={{ padding: '100px 24px', background: 'var(--bg)' }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto', padding: '80px 24px', borderRadius: '40px',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
          boxShadow: '0 30px 60px -12px rgba(31, 58, 95, 0.3)'
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <IoSchoolOutline size={56} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '24px' }} />
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, color: '#fff', marginBottom: '20px' }}>
              {t('ReadyToStart')}
            </h2>
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
              {t('ReadyToStartSub')}
            </p>
            <Link to="/login">
              <button style={{
                background: '#fff', color: 'var(--primary)', padding: '0 48px', height: '60px',
                borderRadius: '18px', border: 'none', fontWeight: 800, fontSize: '16px',
                transition: '0.3s', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
              }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)'; }}>
                {t('LoginBtn')}
              </button>
            </Link>
          </div>
          
          {/* Decorative Circles */}
          <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        </div>
      </section>

      {/* --- Footer --- */}
      <footer style={{ padding: '48px 24px', background: 'var(--bg)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <img src="/image.png" alt="ESI-GIT" style={{ height: '32px', margin: '0 auto 24px', opacity: 0.5, filter: 'grayscale(1)' }} />
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>
          © {new Date().getFullYear()} {t('FooterText')}
        </p>
      </footer>
    </PublicLayout>
  );
}
