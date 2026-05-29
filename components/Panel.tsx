type Props = {
  title: string
  children: React.ReactNode
}

export default function Panel({ title, children }: Props) {
  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '18px',
        padding: '24px',
      }}
    >
      <div
        style={{
          marginBottom: '16px',
          color: '#333333',
          fontSize: '16px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </div>

      {children}
    </section>
  )
}
