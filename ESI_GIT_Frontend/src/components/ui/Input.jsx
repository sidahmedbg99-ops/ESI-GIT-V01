import { useState } from 'react';

export default function Input({
  label,
  icon,
  error,
  helper,
  type = 'text',
  fullWidth = true,
  style,
  ...props
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ width: fullWidth ? '100%' : 'auto', ...style }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          marginBottom: '6px',
          letterSpacing: '0.01em',
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: focused ? 'var(--primary)' : 'var(--text-muted)',
            display: 'flex',
            transition: 'color 0.2s',
          }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: icon ? '11px 14px 11px 40px' : '11px 14px',
            background: 'var(--bg)',
            border: `1.5px solid ${error ? 'var(--danger)' : focused ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            fontSize: '14px',
            color: 'var(--text-primary)',
            transition: 'all 0.2s ease',
            outline: 'none',
            boxShadow: focused ? '0 0 0 3px rgba(79,70,229,0.12)' : 'none',
          }}
          {...props}
        />
      </div>
      {error && <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{error}</p>}
      {helper && !error && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{helper}</p>}
    </div>
  );
}
