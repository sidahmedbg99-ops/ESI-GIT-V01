import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IoMailOutline, IoCloseOutline } from 'react-icons/io5';

/**
 * UserPopover
 *
 * Props:
 *   user    – { name, email, avatar? }
 *   anchor  – { x: clientX, y: clientY }  (raw click coordinates)
 *   onClose – () => void
 *
 * Renders into document.body via a React Portal so parent overflow/z-index
 * stacking contexts never clip or reposition it.
 */
export default function UserPopover({ user, anchor, onClose }) {
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!user) return null;

  // Clamp so the card never bleeds off-screen.
  // W=260, H≈140 are the maximum card dimensions.
  const W = 260;
  const H = 140;
  const OFFSET = 8;
  const raw_left = (anchor?.x ?? 0) + OFFSET;
  const raw_top  = (anchor?.y ?? 0) + OFFSET;
  const left = Math.min(raw_left, window.innerWidth  - W - 12);
  const top  = Math.min(raw_top,  window.innerHeight - H - 12);

  const initial = (user.name || '?').charAt(0).toUpperCase();

  const card = (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 99999,
        width: W,
        background: 'var(--bg-card, #1e1e2e)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)',
        padding: '14px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header row: avatar + name/email + close */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        {/* Avatar */}
        {user.avatar
          ? (
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'var(--primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '15px', fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {initial}
            </div>
          )
        }

        {/* Name + email */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '13px', fontWeight: 700,
            color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user.name || '—'}
          </p>
          <p style={{
            fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user.email || '—'}
          </p>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '2px', lineHeight: 1, flexShrink: 0,
            borderRadius: '6px', display: 'flex', alignItems: 'center',
          }}
          aria-label="Fermer"
        >
          <IoCloseOutline size={16} />
        </button>
      </div>

      {/* Send Email button */}
      {user.email && (
        <a
          href={`mailto:${user.email}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '6px', width: '100%', padding: '8px',
            borderRadius: '9px', background: 'var(--primary)', color: '#fff',
            fontSize: '12px', fontWeight: 600, textDecoration: 'none',
            boxSizing: 'border-box', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <IoMailOutline size={13} />
          Envoyer un email
        </a>
      )}
    </div>
  );

  return createPortal(card, document.body);
}