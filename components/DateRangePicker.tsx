'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  startDate: string
  endDate: string
}

const inputStyle: React.CSSProperties = {
  border: '1px solid #e5e5e5',
  borderRadius: '8px',
  padding: '7px 10px',
  fontSize: '14px',
  color: '#111110',
  backgroundColor: '#ffffff',
  cursor: 'pointer',
  outline: 'none',
}

export default function DateRangePicker({ startDate, endDate }: Props) {
  const router = useRouter()
  const [start, setStart] = useState(startDate)
  const [end, setEnd] = useState(endDate)

  const apply = () => {
    if (start && end && start <= end) {
      router.push(`/?startDate=${start}&endDate=${end}`)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input
        type="date"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        style={inputStyle}
      />
      <span style={{ color: '#6b7280', fontSize: '13px' }}>to</span>
      <input
        type="date"
        value={end}
        min={start}
        onChange={(e) => setEnd(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
        style={inputStyle}
      />
      <button
        onClick={apply}
        style={{
          background: '#111110',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Apply
      </button>
    </div>
  )
}
