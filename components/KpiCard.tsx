type KpiCardProps = {
  title: string
  value: string | number
  subtitle?: string
  rate?: string
}

export default function KpiCard({ title, value, subtitle, rate }: KpiCardProps) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e5e5',
        borderRadius: '18px',
        padding: '24px',
      }}
    >
      <div
        style={{
          color: '#6b6b6b',
          fontSize: '14px',
          marginBottom: '10px',
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: '#111110',
          fontSize: '36px',
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {value}
      </div>

      {rate ? (
        <div style={{ marginTop: '8px', fontSize: '18px', fontWeight: 600, color: '#374151' }}>
          {rate}%
        </div>
      ) : null}
      {subtitle ? (
        <div
          style={{
            marginTop: '10px',
            color: '#6b6b6b',
            fontSize: '14px',
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  )
}