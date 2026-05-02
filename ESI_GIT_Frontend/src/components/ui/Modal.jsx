import { useEffect } from 'react';
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

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: `min(${widths[size] || widths.md}, calc(100vw - 32px))`, maxHeight: 'calc(100vh - 48px)', background: 'var(--bg-card)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', zIndex: 2001, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>{title}</h3>
            <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <IoCloseOutline size={18} />
            </button>
          </div>
        )}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </>
  );
}