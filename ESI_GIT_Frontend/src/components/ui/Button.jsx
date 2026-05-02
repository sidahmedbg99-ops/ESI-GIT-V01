const variants = {
  primary: { background: 'var(--primary)', color: '#fff', border: 'none' },
  secondary: { background: 'var(--primary-subtle)', color: 'var(--primary)', border: 'none' },
  outline: { background: 'transparent', color: 'var(--text-primary)', border: '1.5px solid var(--border)' },
  danger: { background: '#FEF2F2', color: 'var(--danger)', border: 'none' },
  ghost: { background: 'transparent', color: 'var(--text-secondary)', border: 'none' },
};

const sizes = {
  sm: { padding: '6px 14px', fontSize: '13px', borderRadius: '8px', height: '32px' },
  md: { padding: '10px 20px', fontSize: '14px', borderRadius: '10px', height: '40px' },
  lg: { padding: '13px 28px', fontSize: '15px', borderRadius: '12px', height: '48px' },
};

export default function Button({
  children, variant = 'primary', size = 'md',
  icon, iconRight, loading, disabled, fullWidth,
  onClick, type = 'button', style, ...props
}) {
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 500,
        letterSpacing: '0.01em',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? '100%' : 'auto',
        fontFamily: 'DM Sans, sans-serif',
        boxShadow: variant === 'primary' ? '0 2px 8px rgba(79,70,229,0.25)' : 'none',
        ...v, ...s, ...style,
      }}
      {...props}
    >
      {loading ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.8s linear infinite' }}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      ) : icon}
      {children}
      {!loading && iconRight}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
