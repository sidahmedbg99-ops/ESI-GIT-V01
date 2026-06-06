import { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function AttachmentsPopover({ attachments = [], label = null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const downloadAll = async () => {
    if (!attachments.length) return;
    const zip = new JSZip();
    await Promise.all(attachments.map(async (a) => {
      try {
        const res = await fetch(a.file_url);
        const blob = await res.blob();
        zip.file(a.filename, blob);
      } catch {}
    }));
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'livrables.zip');
  };

  if (!attachments.length) return null;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title={`${attachments.length} livrable(s)`}
        style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '5px 10px', cursor: 'pointer', fontSize: '16px', lineHeight: 1,
          color: open ? 'var(--primary)' : 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', gap: '5px',
        }}
      >
        📎 {label !== null ? label : <span style={{ fontSize: '12px', fontWeight: 600 }}>{attachments.length}</span>}
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, zIndex: 999,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          width: '280px', overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Livrables ({attachments.length})
            </span>
            <button onClick={downloadAll} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px', borderRadius: '6px', background: 'var(--primary-subtle)' }}>
              ⬇ Tout télécharger
            </button>
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '8px' }}>
            {attachments.map((a, i) => (
              <a key={a.id ?? i} href={a.file_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: '8px', textDecoration: 'none', color: 'inherit', gap: '8px' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  📄 {a.filename}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>{a.attachment_type}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}