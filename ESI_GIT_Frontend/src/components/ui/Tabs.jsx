export default function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: '4px',
      background: 'var(--bg)', padding: '4px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
      width: 'fit-content', flexWrap: 'wrap',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            position: 'relative', padding: '8px 16px',
            borderRadius: '8px', fontSize: '13px', fontWeight: 500,
            cursor: 'pointer',
            background: active === tab.id ? 'var(--primary)' : 'none',
            border: 'none',
            color: active === tab.id ? '#fff' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
