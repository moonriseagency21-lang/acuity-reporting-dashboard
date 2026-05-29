type KpiCardProps = {
  title: string
  value: string | number
  subtitle?: string
  rate?: string
  highlight?: 'green' | 'red'
}

export default function KpiCard({ title, value, subtitle, rate, highlight }: KpiCardProps) {
  const borderColor = highlight === 'green' ? '#00C9A7' : highlight === 'red' ? '#ef4444' : '#e0e0e0'
  const valueColor = highlight === 'green' ? '#15803d' : highlight === 'red' ? '#dc2626' : '#333333'
  return (
    <div
      style={{
        background: '#ffffff',
        border: `1px solid ${borderColor}`,
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
          color: valueColor,
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
