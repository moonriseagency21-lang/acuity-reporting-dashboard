import Link from 'next/link'
import { OPPORTUNITY_LABELS, NO_OPPORTUNITY_LABELS } from '@/lib/labelBuckets'

type LabelRow = { name: string; count: number; isSale: boolean }

function buildGroup(labelCounts: Record<string, number>, knownSet: Set<string>): LabelRow[] {
  return Object.entries(labelCounts)
    .filter(([name]) => knownSet.has(name))
    .map(([name, count]) => ({ name, count, isSale: name.startsWith('$ale') }))
    .sort((a, b) => {
      if (a.isSale !== b.isSale) return a.isSale ? -1 : 1
      return b.count - a.count
    })
}

function LabelGroup({
  title, color, rows, total, startDate, endDate,
}: {
  title: string; color: string; rows: LabelRow[]; total: number; startDate: string; endDate: string
}) {
  if (rows.length === 0) return null
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '8px', paddingBottom: '6px',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <span style={{
          display: 'inline-block', width: '10px', height: '10px',
          borderRadius: '2px', backgroundColor: color, flexShrink: 0,
        }} />
        <span style={{ fontWeight: 600, fontSize: '13px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af' }}>
          {total.toLocaleString()} total
        </span>
      </div>
      {rows.map((row) => (
        <Link
          key={row.name}
          href={`/appointments?startDate=${startDate}&endDate=${endDate}&label=${encodeURIComponent(row.name)}`}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px', fontSize: '13px', textDecoration: 'none',
            borderRadius: '4px', margin: '0 -4px',
            transition: 'background 0.1s',
          }}
          className="label-row-link"
        >
          <span style={{ color: row.isSale ? '#15803d' : '#4b5563', fontWeight: row.isSale ? 600 : 400 }}>
            {row.name}
          </span>
          <span style={{
            fontVariantNumeric: 'tabular-nums', fontWeight: 500,
            color: row.isSale ? '#15803d' : '#111827',
            backgroundColor: row.isSale ? '#dcfce7' : '#f3f4f6',
            padding: '1px 8px', borderRadius: '9999px', fontSize: '12px',
          }}>
            {row.count.toLocaleString()}
          </span>
        </Link>
      ))}
    </div>
  )
}

export default function LabelCountsPanel({
  labelCounts,
  startDate,
  endDate,
}: {
  labelCounts: Record<string, number>
  startDate: string
  endDate: string
}) {
  if (Object.keys(labelCounts).length === 0) {
    return <p style={{ color: '#9ca3af', fontSize: '14px' }}>No label data for this period.</p>
  }

  const oppRows = buildGroup(labelCounts, OPPORTUNITY_LABELS)
  const oppTotal = oppRows.reduce((s, r) => s + r.count, 0)

  const noOppRows = buildGroup(labelCounts, NO_OPPORTUNITY_LABELS)
  const blankCount = labelCounts['(blank)'] ?? 0
  const blankRows: LabelRow[] = blankCount > 0 ? [{ name: '(blank)', count: blankCount, isSale: false }] : []
  const noOppTotal = noOppRows.reduce((s, r) => s + r.count, 0) + blankCount

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
      <LabelGroup
        title="Opportunity"
        color="#3b82f6"
        rows={oppRows}
        total={oppTotal}
        startDate={startDate}
        endDate={endDate}
      />
      <div>
        <LabelGroup
          title="No Opportunity"
          color="#f59e0b"
          rows={noOppRows}
          total={noOppTotal}
          startDate={startDate}
          endDate={endDate}
        />
        {blankRows.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <LabelGroup
              title="Blank"
              color="#d1d5db"
              rows={blankRows}
              total={blankCount}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
        )}
      </div>
    </div>
  )
}
