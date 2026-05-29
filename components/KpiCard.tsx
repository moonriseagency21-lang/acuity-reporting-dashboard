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
        border: '1px solid #e0e0e0',
        borderRadius: '18px',
        padding: '24px',
      }}
    >
      <div
        style={{
          color: '#636466',
          fontSize: '13px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: '10px',
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: '#333333',
          fontSize: '36px',
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {value}
      </div>

      {rate ? (
        <div style={{ marginTop: '8px', fontSize: '18px', fontWeight: 600, color: '#0047AB' }}>
          {rate}%
        </div>
      ) : null}
      {subtitle ? (
        <div
          style={{
            marginTop: '10px',
            color: '#636466',
            fontSize: '13px',
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  )
}
