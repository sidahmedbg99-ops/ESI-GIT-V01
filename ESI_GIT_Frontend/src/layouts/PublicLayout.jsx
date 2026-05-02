export default function PublicLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div>{children}</div>
    </div>
  );
}
