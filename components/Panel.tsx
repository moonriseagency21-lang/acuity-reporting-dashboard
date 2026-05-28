type Props = {
  title: string
  children: React.ReactNode
}

export default function Panel({ title, children }: Props) {
  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #e5e5e5',
        borderRadius: '18px',
        padding: '24px',
      }}
    >
      <div
        style={{
          marginBottom: '16px',
          color: '#111110',
          fontSize: '20px',
          fontWeight: 600,
        }}
      >
        {title}
      </div>

      {children}
    </section>
  )
}