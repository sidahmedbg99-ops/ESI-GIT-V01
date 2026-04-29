import Card from './Card';

export default function StatCard({ label, value, icon, change, color = 'var(--primary)', suffix = '' }) {
  return (
    <Card hover style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 100, height: 100, borderRadius: '50%',
        background: color, opacity: 0.06,
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-md)',
          background: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
        {change !== undefined && (
          <span style={{
            fontSize: '12px', fontWeight: 500,
            color: change >= 0 ? 'var(--success)' : 'var(--danger)',
            background: change >= 0 ? '#DCFCE7' : '#FEE2E2',
            padding: '2px 8px', borderRadius: 'var(--radius-full)',
          }}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Syne', color: 'var(--text-primary)', lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span style={{ fontSize: '16px', color: 'var(--text-secondary)', marginLeft: '2px' }}>{suffix}</span>}
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>{label}</p>
    </Card>
  );
}
