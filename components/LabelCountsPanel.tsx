import Link from 'next/link'
import { OPPORTUNITY_LABELS, NO_OPPORTUNITY_LABELS, RESCHEDULE_LABELS } from '@/lib/labelBuckets'

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

function buildOther(labelCounts: Record<string, number>): LabelRow[] {
  const known = new Set([...OPPORTUNITY_LABELS, ...NO_OPPORTUNITY_LABELS, ...RESCHEDULE_LABELS, '(blank)'])
  return Object.entries(labelCounts)
    .filter(([name]) => !known.has(name))
    .map(([name, count]) => ({ name, count, isSale: name.startsWith('$ale') }))
    .sort((a, b) => {
      if (a.isSale !== b.isSale) return a.isSale ? -1 : 1
      return b.count - a.count
    })
}

function LabelGroup({
  title, color, rows, startDate, endDate,
}: {
  title: string; color: string; rows: LabelRow[]; startDate: string; endDate: string
}) {
  if (rows.length === 0) return null
  return (
    <div style={{ marginBottom: '20px' }}>
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
          {rows.reduce((s, r) => s + r.count, 0).toLocaleString()} total
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

  const blankCount = labelCounts['(blank)'] ?? 0
  const blankRows: LabelRow[] = blankCount > 0 ? [{ name: '(blank)', count: blankCount, isSale: false }] : []

  return (
    <div>
      <LabelGroup title="Opportunity" color="#3b82f6" rows={buildGroup(labelCounts, OPPORTUNITY_LABELS)} startDate={startDate} endDate={endDate} />
      <LabelGroup title="No Opportunity" color="#f59e0b" rows={buildGroup(labelCounts, NO_OPPORTUNITY_LABELS)} startDate={startDate} endDate={endDate} />
      <LabelGroup title="Reschedule" color="#8b5cf6" rows={buildGroup(labelCounts, RESCHEDULE_LABELS)} startDate={startDate} endDate={endDate} />
      {blankRows.length > 0 && <LabelGroup title="Blank" color="#d1d5db" rows={blankRows} startDate={startDate} endDate={endDate} />}
      <LabelGroup title="Unclassified (new labels)" color="#ef4444" rows={buildOther(labelCounts)} startDate={startDate} endDate={endDate} />
    </div>
  )
}
