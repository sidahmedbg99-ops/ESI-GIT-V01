const variants = {
  success: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: 'rgba(16, 185, 129, 0.2)' },
  warning: { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.2)' },
  danger: { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: 'rgba(239, 68, 68, 0.2)' },
  info: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', border: 'rgba(59, 130, 246, 0.2)' },
  primary: { bg: 'var(--primary-subtle)', color: 'var(--primary)', border: 'rgba(79, 70, 229, 0.1)' },
  gray: { bg: 'var(--bg)', color: 'var(--text-secondary)', border: 'var(--border)' },
};

export default function Badge({ children, variant = 'gray', style }) {
  const v = variants[variant] || variants.gray;
  return (
    <span style={{
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '5px',
      padding: '4px 12px', 
      borderRadius: 'var(--radius-full)',
      fontSize: '11px', 
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      background: v.bg, 
      color: v.color,
      border: `1px solid ${v.border}`,
      whiteSpace: 'nowrap',
      transition: 'all 0.2s ease',
      ...style,
    }}>
      {children}
    </span>
  );
}
