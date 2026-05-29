'use client'

import type { TodayPacingData } from '@/lib/queries/pacing'
import { SHOW_RATE_GOAL, CLOSE_RATE_GOAL } from '@/lib/goals'

const showGoalPct  = Math.round(SHOW_RATE_GOAL * 100)
const closeGoalPct = Math.round(CLOSE_RATE_GOAL * 100)

function StatBlock({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div style={{ textAlign: 'center', minWidth: 88 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent ?? '#111110', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 52, background: '#e5e5e5', flexShrink: 0 }} />
}

function Row({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 32,
      padding: '20px 28px', borderBottom: '1px solid #ececec', flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 160 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6b6b' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>
      </div>
      {children}
    </div>
  )
}

export default function TodayPacingPanel({ data, dateLabel }: { data: TodayPacingData; dateLabel: string }) {
  const goalMet = data.salesNeeded === 0

  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e5e5e5',
      borderRadius: 18, overflow: 'hidden', marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderBottom: '1px solid #ececec', background: '#fafafa',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111110', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Pace to Goal — {dateLabel}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            Goal: {showGoalPct}% show rate × {closeGoalPct}% close rate
          </div>
        </div>
        <span style={{
          background: goalMet ? '#dcfce7' : data.showsNeeded === 0 ? '#dbeafe' : '#fef3c7',
          color: goalMet ? '#15803d' : data.showsNeeded === 0 ? '#1d4ed8' : '#92400e',
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
        }}>
          {goalMet ? 'GOAL MET' : data.showsNeeded === 0 ? 'SHOWS DONE' : 'IN PROGRESS'}
        </span>
      </div>

      {/* Appointments today */}
      <Row label="Appointments Today" sub="Occurred + still booked">
        <StatBlock label="Occurred" value={data.occurredCount.toLocaleString()} sub="past appointments" />
        <Divider />
        <StatBlock label="Still Booked" value={data.futureCount.toLocaleString()} sub="upcoming today" />
        <Divider />
        <StatBlock label="Total Today" value={data.totalCount.toLocaleString()} />
      </Row>

      {/* Show rate today */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 32,
        padding: '20px 28px', borderBottom: '1px solid #ececec', flexWrap: 'wrap',
      }}>
        <div style={{ minWidth: 160 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6b6b' }}>Show Rate</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Goal: {showGoalPct}% of total</div>
        </div>
        <StatBlock label="Shows" value={data.showCount.toLocaleString()} sub="opportunity bucket" />
        <Divider />
        <StatBlock
          label="Goal"
          value={data.showGoal.toLocaleString()}
          sub={`${showGoalPct}% × ${data.totalCount.toLocaleString()} appts`}
        />
        <Divider />
        <StatBlock
          label="Still Needed"
          value={data.showsNeeded.toLocaleString()}
          accent={data.showsNeeded === 0 ? '#15803d' : '#d97706'}
        />
      </div>

      {/* Sales pace today */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 32,
        padding: '20px 28px', flexWrap: 'wrap',
      }}>
        <div style={{ minWidth: 160 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6b6b' }}>Sales Pace</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Goal: {showGoalPct}% × {closeGoalPct}% = 9% of total</div>
        </div>
        <StatBlock label="Sales" value={data.saleCount.toLocaleString()} />
        <Divider />
        <StatBlock
          label="Goal"
          value={data.salesGoal.toLocaleString()}
          sub={`9% × ${data.totalCount.toLocaleString()} appts`}
        />
        <Divider />
        <StatBlock
          label="Still Needed"
          value={data.salesNeeded.toLocaleString()}
          accent={data.salesNeeded === 0 ? '#15803d' : '#dc2626'}
        />
      </div>
    </div>
  )
}
