import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IoCloseOutline, IoInformationCircleOutline } from 'react-icons/io5';

export default function Modal({ isOpen, open, onClose, title, description, children, size = 'md', showRequiredHint = true }) {
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
          <div style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 12px 24px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700 }}>{title}</h3>
              <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
                <IoCloseOutline size={18} />
              </button>
            </div>
            {(description || showRequiredHint) && (
              <div style={{ padding: '0 24px 14px 24px' }}>
                {description && (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: showRequiredHint ? '8px' : 0 }}>{description}</p>
                )}
                {showRequiredHint && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                    <IoInformationCircleOutline size={16} style={{ color: '#F59E0B', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 600 }}>Veuillez remplir tous les champs obligatoires</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}