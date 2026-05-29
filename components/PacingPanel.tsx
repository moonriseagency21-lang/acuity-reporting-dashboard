'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { PacingData } from '@/lib/queries/pacing'
import { SHOW_RATE_GOAL, CLOSE_RATE_GOAL } from '@/lib/goals'

// Lightweight client for Realtime subscription only (anon key, read-only).
function getRealtimeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

type Props = {
  initial: PacingData
  monthLabel: string  // e.g. "May 2026"
}

function StatusBadge({ onTrack, salesNeeded }: { onTrack: boolean; salesNeeded: number }) {
  if (salesNeeded === 0) {
    return (
      <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
        GOAL MET
      </span>
    )
  }
  return (
    <span style={{
      background: onTrack ? '#dcfce7' : '#fef3c7',
      color: onTrack ? '#15803d' : '#92400e',
      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em'
    }}>
      {onTrack ? 'ON TRACK' : 'NEEDS ATTENTION'}
    </span>
  )
}

function StatBlock({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
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

function ProgressBar({ value, goal, color }: { value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0
  return (
    <div style={{ background: '#f3f4f6', borderRadius: 6, height: 8, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.4s ease' }} />
    </div>
  )
}

export default function PacingPanel({ initial, monthLabel }: Props) {
  const [data, setData] = useState<PacingData>(initial)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    const client = getRealtimeClient()

    // Re-fetch pacing data via API route when future_appointments changes.
    const channel = client
      .channel('future-appts-pacing')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'future_appointments' }, async () => {
        try {
          const res = await fetch('/api/pacing')
          if (res.ok) {
            const fresh = await res.json()
            setData(fresh)
            setLastUpdated(new Date())
          }
        } catch {
          // silently ignore — stale data is fine
        }
      })
      .subscribe()

    return () => { client.removeChannel(channel) }
  }, [])

  const showGoalPct = Math.round(SHOW_RATE_GOAL * 100)
  const closeGoalPct = Math.round(CLOSE_RATE_GOAL * 100)
  const reqRate = data.requiredCloseRateOnRemaining

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e5e5',
      borderRadius: 18,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        borderBottom: '1px solid #ececec',
        background: '#fafafa',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111110', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Pace to Goal — {monthLabel}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            Goal: {showGoalPct}% show rate × {closeGoalPct}% close rate · Updates live
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <StatusBadge onTrack={data.onTrack} salesNeeded={data.salesNeeded} />
          <span style={{ fontSize: 11, color: '#c4c4c4' }}>
            synced {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Appointment pipeline row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        padding: '20px 28px',
        borderBottom: '1px solid #ececec',
        flexWrap: 'wrap',
      }}>
        <div style={{ minWidth: 160 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6b6b' }}>Appointments This Month</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Occurred + still booked</div>
        </div>
        <StatBlock label="Occurred MTD" value={data.mtdApptCount.toLocaleString()} />
        <Divider />
        <StatBlock label="Still Booked" value={data.futureApptCount.toLocaleString()} sub="future appointments" />
        <Divider />
        <StatBlock label="Total Month" value={data.totalMonthAppts.toLocaleString()} />
        <Divider />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
            Day {data.daysElapsed} of {data.daysInMonth} · {data.daysRemaining}d remaining
          </div>
          <ProgressBar value={data.daysElapsed} goal={data.daysInMonth} color="#0047AB" />
        </div>
      </div>

      {/* Shows row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        padding: '20px 28px',
        borderBottom: '1px solid #ececec',
        flexWrap: 'wrap',
      }}>
        <div style={{ minWidth: 160 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6b6b' }}>Show Rate</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Goal: {showGoalPct}% of total</div>
        </div>
        <StatBlock
          label="Shows MTD"
          value={data.mtdShowCount.toLocaleString()}
          sub="opportunity bucket"
        />
        <Divider />
        <StatBlock
          label="Goal"
          value={data.goalShows.toLocaleString()}
          sub={`${showGoalPct}% × ${data.totalMonthAppts.toLocaleString()} appts`}
        />
        <Divider />
        <StatBlock
          label="Still Needed"
          value={data.showsNeeded.toLocaleString()}
          accent={data.showsNeeded > 0 ? '#d97706' : '#15803d'}
        />
        <Divider />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
            {data.mtdShowCount} of {data.goalShows} goal shows
          </div>
          <ProgressBar value={data.mtdShowCount} goal={data.goalShows} color={data.showsNeeded === 0 ? '#00C9A7' : '#f59e0b'} />
        </div>
      </div>

      {/* Sales row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        padding: '20px 28px',
        flexWrap: 'wrap',
      }}>
        <div style={{ minWidth: 160 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6b6b' }}>Sales Pace</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Goal: {showGoalPct}% × {closeGoalPct}% = 9% of total</div>
        </div>
        <StatBlock
          label="Sales MTD"
          value={data.mtdSaleCount.toLocaleString()}
        />
        <Divider />
        <StatBlock
          label="Goal"
          value={data.goalSales.toLocaleString()}
          sub={`9% × ${data.totalMonthAppts.toLocaleString()} appts`}
        />
        <Divider />
        <StatBlock
          label="Still Needed"
          value={data.salesNeeded.toLocaleString()}
          accent={data.salesNeeded === 0 ? '#15803d' : data.onTrack ? '#111110' : '#dc2626'}
        />
        <Divider />
        <StatBlock
          label="Rate Needed"
          value={reqRate !== null ? `${reqRate.toFixed(1)}%` : '—'}
          sub={`on ${data.futureApptCount} remaining appts`}
          accent={
            reqRate === null ? '#9ca3af' :
            reqRate <= 30 ? '#15803d' :
            reqRate <= 45 ? '#d97706' : '#dc2626'
          }
        />
        <Divider />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
            {data.mtdSaleCount} of {data.goalSales} goal sales
          </div>
          <ProgressBar value={data.mtdSaleCount} goal={data.goalSales} color={data.salesNeeded === 0 ? '#00C9A7' : data.onTrack ? '#0047AB' : '#ef4444'} />
        </div>
      </div>
    </div>
  )
}
