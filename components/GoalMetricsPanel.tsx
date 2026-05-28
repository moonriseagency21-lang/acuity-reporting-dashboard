type MetricGroup = {
  label: string
  goal: string
  actual: string | null
  delta: number | null
  deltaDisplay?: string
  isCount?: boolean
}

type Row = {
  category: string
  groups: MetricGroup[]
}

function MetricCell({ group }: { group: MetricGroup }) {
  const deltaColor =
    group.delta === null ? '#6b6b6b' : group.delta >= 0 ? '#2d7d46' : '#c0392b'
  const deltaText =
    group.delta === null
      ? '—'
      : group.deltaDisplay ??
        (group.delta >= 0
          ? `+${group.isCount ? group.delta.toLocaleString() : group.delta.toFixed(1) + '%'}`
          : `${group.isCount ? `(${Math.abs(group.delta).toLocaleString()})` : group.delta.toFixed(1) + '%'}`)

  return (
    <div style={{ display: 'flex', gap: '32px' }}>
      <div style={{ textAlign: 'center', minWidth: 72 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Goal
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111110' }}>
          {group.goal}
        </div>
        {group.label ? (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{group.label}</div>
        ) : null}
      </div>

      <div style={{ textAlign: 'center', minWidth: 72 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Actual
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111110' }}>
          {group.actual ?? '—'}
        </div>
      </div>

      <div style={{ textAlign: 'center', minWidth: 72 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Delta
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: deltaColor }}>
          {deltaText}
        </div>
      </div>
    </div>
  )
}

function KpiRow({ row, isLast }: { row: Row; isLast: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 40,
        padding: '20px 28px',
        borderBottom: isLast ? 'none' : '1px solid #ececec',
      }}
    >
      <div style={{ minWidth: 180 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#6b6b6b', marginBottom: 2 }}>
          {row.category}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111110', lineHeight: 1 }}>
          KPIs
        </div>
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
        {row.groups.map((group, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {i > 0 && (
              <div style={{ width: 1, height: 48, background: '#e5e5e5', flexShrink: 0 }} />
            )}
            <MetricCell group={group} />
          </div>
        ))}
      </div>
    </div>
  )
}

type Props = {
  opportunityRate: string | null
  opportunityCount: number
  closeRate: string | null
  saleCount: number
  totalLabeled: number
  goalPct?: number
}

export default function GoalMetricsPanel({
  opportunityRate,
  opportunityCount,
  closeRate,
  saleCount,
  totalLabeled,
  goalPct = 30,
}: Props) {
  const goalStr = `${goalPct}%`

  function rateGroup(label: string, actual: string | null): MetricGroup {
    const delta =
      actual !== null ? parseFloat(actual) - goalPct : null
    return {
      label,
      goal: goalStr,
      actual: actual !== null ? `${actual}%` : null,
      delta,
    }
  }

  // Show = Opportunity appointments; count goal = 30% of total labeled
  const opportunityCountGoal = Math.round(totalLabeled * (goalPct / 100))
  const opportunityCountDelta = opportunityCount - opportunityCountGoal

  // Sales count goal = 30% of shows (= opportunity count)
  const salesCountGoal = Math.round(opportunityCount * (goalPct / 100))
  const salesCountDelta = saleCount - salesCountGoal

  const rows: Row[] = [
    {
      category: 'Show',
      groups: [
        rateGroup('Rate', opportunityRate),
        {
          label: 'Count',
          goal: opportunityCountGoal.toLocaleString(),
          actual: opportunityCount.toLocaleString(),
          delta: opportunityCountDelta,
          isCount: true,
        },
      ],
    },
    {
      category: 'Sales Bucket',
      groups: [
        rateGroup('Close Rate', closeRate),
        {
          label: 'Count',
          goal: salesCountGoal.toLocaleString(),
          actual: saleCount.toLocaleString(),
          delta: salesCountDelta,
          isCount: true,
        },
      ],
    },
  ]

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e5e5',
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 24,
      }}
    >
      {rows.map((row, i) => (
        <KpiRow key={row.category} row={row} isLast={i === rows.length - 1} />
      ))}
    </div>
  )
}
