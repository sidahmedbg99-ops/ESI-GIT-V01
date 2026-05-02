export default function Logo({ size = 60 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', userSelect: 'none', width: '100%' }}>
      <img
        src="/image.png"
        alt="ESI-GIT"
        style={{
          width: size * 3.5,
          height: size * 3.5,
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
        }}
      />
    </div>
  );
}
