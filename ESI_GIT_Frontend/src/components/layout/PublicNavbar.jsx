import { Link, NavLink } from 'react-router-dom';
import Logo from '../ui/Logo';
import Button from '../ui/Button';

export default function PublicNavbar() {
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'var(--bg-nav)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        maxWidth: '1200px', margin: '0 auto', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '68px',
      }}>
        <Link to="/"><Logo size={34} /></Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div id="google_translate_element" style={{ marginRight: '16px', marginTop: '4px' }}></div>
          {[{ to: '/', label: 'Accueil' }, { to: '/about', label: 'À propos' }].map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              style={({ isActive }) => ({
                padding: '8px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500,
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--primary-subtle)' : 'transparent',
              })}
            >
              {item.label}
            </NavLink>
          ))}
          <Link to="/login" style={{ marginLeft: '8px' }}>
            <Button size="md">Se connecter</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
