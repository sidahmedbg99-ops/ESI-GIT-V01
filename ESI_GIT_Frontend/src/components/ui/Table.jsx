export default function Table({ columns, data, loading, emptyText = 'Aucune donnée disponible' }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            {columns.map((col, i) => (
              <th key={i} style={{
                padding: '12px 16px',
                textAlign: col.align || 'left',
                fontSize: '12px', fontWeight: 600,
                color: 'var(--text-secondary)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {columns.map((_, j) => (
                  <td key={j} style={{ padding: '14px 16px' }}>
                    <div style={{
                      height: '14px', borderRadius: '4px',
                      background: 'var(--border)',
                      animation: 'pulse 1.5s infinite',
                      width: `${60 + (j * 13 % 30)}%`,
                    }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{
                padding: '48px 16px', textAlign: 'center',
                color: 'var(--text-muted)', fontSize: '14px',
              }}>
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {columns.map((col, j) => (
                  <td key={j} style={{
                    padding: '14px 16px', fontSize: '14px',
                    color: 'var(--text-primary)',
                    textAlign: col.align || 'left',
                  }}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
