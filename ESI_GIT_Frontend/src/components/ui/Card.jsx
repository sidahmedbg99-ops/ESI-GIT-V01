export default function Card({ children, style, hover = true, padding = '24px', onClick, className, ...props }) {
  return (
    <div 
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...style,
      }} 
      className={`card-premium ${hover ? 'hoverable' : ''} ${className || ''}`} 
      onClick={onClick} 
      {...props}
    >
      {children}
      <style>{`
        .card-premium.hoverable:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--primary-light);
        }
      `}</style>
    </div>
  );
}
