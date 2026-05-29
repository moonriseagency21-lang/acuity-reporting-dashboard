export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f6f6f6',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid #e5e5e5',
        borderTopColor: '#111110',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
      }} />
      <p style={{ margin: 0, color: '#6b6b6b', fontSize: 14 }}>Loading…</p>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
