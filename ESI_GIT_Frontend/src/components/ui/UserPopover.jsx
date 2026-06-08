import { useEffect, useRef } from 'react';
import { IoMailOutline, IoCloseOutline } from 'react-icons/io5';

export default function UserPopover({ user, onClose, anchor }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!user) return null;

  // Position at click point, nudge left/up if too close to screen edge
  const W = 240;
  const left = Math.min(anchor?.x ?? 0, window.innerWidth  - W - 12);
  const top  = Math.min(anchor?.y ?? 0, window.innerHeight - 160 - 12);

  return (
    <div ref={ref} style={{
      position: 'fixed', top, left, zIndex: 9999, width: W,
      background: 'var(--bg-card, #1e1e2e)', border: '1px solid var(--border)',
      borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', padding: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {(user.name || '?').charAt(0).toUpperCase()}
          </div>
          <p style={{ fontSize: '13px', fontWeight: 700 }}>{user.name || '—'}</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', lineHeight: 1 }}>
          <IoCloseOutline size={15}/>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 10px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: '10px' }}>
        <IoMailOutline size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }}/>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.email || '—'}
        </p>
      </div>

      {user.email && (
        <a href={`mailto:${user.email}`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '7px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', fontSize: '12px', fontWeight: 600, textDecoration: 'none', boxSizing: 'border-box' }}>
          <IoMailOutline size={13}/>
          Envoyer un email
        </a>
      )}
    </div>
  );
}