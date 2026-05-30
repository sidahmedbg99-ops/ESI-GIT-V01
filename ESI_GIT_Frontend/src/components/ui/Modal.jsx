import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IoCloseOutline } from 'react-icons/io5';

export default function Modal({ isOpen, open, onClose, title, children, size = 'md' }) {
  const visible = isOpen || open;
  const widths = { sm: '440px', md: '560px', lg: '720px', xl: '900px' };

  useEffect(() => {
    if (visible) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  if (!visible) return null;

  // Use portal to render into document.body — bypasses any CSS transform
  // on ancestor elements that would break position:fixed
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: `min(${widths[size] || widths.md}, 100%)`,
          maxHeight: 'calc(100vh - 48px)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>{title}</h3>
            <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
              <IoCloseOutline size={18} />
            </button>
          </div>
        )}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}