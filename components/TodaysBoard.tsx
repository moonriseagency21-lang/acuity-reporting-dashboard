'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { TodayAppointment, FutureAppointment } from '@/lib/queries/pacing'
import { OPPORTUNITY_LABELS } from '@/lib/labelBuckets'

function getRealtimeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

type Props = {
  initialHistorical: TodayAppointment[]
  initialFuture: FutureAppointment[]
}

type LabelStatus = 'sale' | 'opportunity' | 'no_opportunity' | 'no_show' | 'pending'

function classifyAppt(appt: TodayAppointment): LabelStatus {
  if (appt.no_show) return 'no_show'
  if (!appt.label_name) return 'pending'
  if (appt.label_name.startsWith('$ale')) return 'sale'
  if (OPPORTUNITY_LABELS.has(appt.label_name)) return 'opportunity'
  return 'no_opportunity'
}

const STATUS_CONFIG: Record<LabelStatus, { label: string; bg: string; color: string; dot: string }> = {
  sale:           { label: 'SALE',         bg: '#dcfce7', color: '#15803d', dot: '#16a34a' },
  opportunity:    { label: 'SHOWED',       bg: '#dbeafe', color: '#1d4ed8', dot: '#2563eb' },
  no_opportunity: { label: 'NO OPP',       bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' },
  no_show:        { label: 'NO SHOW',      bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' },
  pending:        { label: 'PENDING',      bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
}

function formatTime(datetime: string) {
  const d = new Date(datetime)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
}

function StatusChip({ status }: { status: LabelStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span style={{
      background: cfg.bg,
      color: cfg.color,
      padding: '3px 10px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

function TallyCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e5e5',
      borderRadius: 12,
      padding: '16px 20px',
      textAlign: 'center',
      minWidth: 100,
    }}>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}

export default function TodaysBoard({ initialHistorical, initialFuture }: Props) {
  const [historical, setHistorical] = useState<TodayAppointment[]>(initialHistorical)
  const [future, setFuture] = useState<FutureAppointment[]>(initialFuture)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/today')
      if (res.ok) {
        const { historical: h, future: f } = await res.json()
        setHistorical(h)
        setFuture(f)
        setLastUpdated(new Date())
      }
    } catch { /* silently ignore */ }
  }, [])

  useEffect(() => {
    const client = getRealtimeClient()

    // Watch label updates on historical appointments (reps labeling calls in real time)
    const histChannel = client
      .channel('todays-board-historical')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'acuity_appointments_v2',
      }, refresh)
      .subscribe()

    // Watch new bookings coming in for today
    const futChannel = client
      .channel('todays-board-future')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'future_appointments',
      }, refresh)
      .subscribe()

    return () => {
      client.removeChannel(histChannel)
      client.removeChannel(futChannel)
    }
  }, [refresh])

  // Tally from historical (labeled) appointments
  const sales = historical.filter(a => classifyAppt(a) === 'sale').length
  const showed = historical.filter(a => classifyAppt(a) === 'opportunity').length
  const noShows = historical.filter(a => classifyAppt(a) === 'no_show').length
  const noOpp = historical.filter(a => classifyAppt(a) === 'no_opportunity').length
  const pending = historical.filter(a => classifyAppt(a) === 'pending').length
  const totalToday = historical.length + future.filter(f => !historical.find(h => h.id === f.id)).length

  // Merge: historical appointments + future appointments not yet in historical
  const historicalIds = new Set(historical.map(a => a.id))
  const upcomingOnly = future.filter(f => !historicalIds.has(f.id))

  return (
    <div>
      {/* Tally strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <TallyCard label="Total Today" value={totalToday} color="#111110" />
        <TallyCard label="Sales" value={sales} color="#16a34a" />
        <TallyCard label="Showed" value={showed} color="#2563eb" />
        <TallyCard label="No Show" value={noShows} color="#ef4444" />
        <TallyCard label="No Opp" value={noOpp} color="#6b7280" />
        <TallyCard label="Pending" value={pending + upcomingOnly.length} color="#f59e0b" />
      </div>

      <div style={{ fontSize: 11, color: '#c4c4c4', marginBottom: 12 }}>
        Last updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · Updates in real time as reps label calls
      </div>

      {/* Appointment rows */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: 12, overflow: 'hidden' }}>
        {/* Historical (already occurred or labeled) */}
        {historical.map((appt, i) => {
          const status = classifyAppt(appt)
          return (
            <div key={appt.id} style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 160px 140px 120px',
              alignItems: 'center',
              gap: 16,
              padding: '12px 20px',
              borderBottom: i < historical.length - 1 || upcomingOnly.length > 0 ? '1px solid #f3f4f6' : 'none',
              background: status === 'sale' ? '#f0fdf4' : 'transparent',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#636466' }}>
                {formatTime(appt.datetime)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111110' }}>
                  {[appt.first_name, appt.last_name].filter(Boolean).join(' ') || '—'}
                </div>
                {appt.email && (
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{appt.email}</div>
                )}
                {appt.appointment_type && (
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{appt.appointment_type}</div>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#636466' }}>{appt.calendar ?? '—'}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                {appt.label_name ?? (appt.no_show ? 'No SHOW' : '—')}
              </div>
              <div><StatusChip status={status} /></div>
            </div>
          )
        })}

        {/* Upcoming (not yet occurred, from future_appointments) */}
        {upcomingOnly.map((appt, i) => (
          <div key={appt.id} style={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr 160px 140px 120px',
            alignItems: 'center',
            gap: 16,
            padding: '12px 20px',
            borderBottom: i < upcomingOnly.length - 1 ? '1px solid #f3f4f6' : 'none',
            opacity: 0.7,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#636466' }}>
              {formatTime(appt.datetime)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111110' }}>
                {[appt.first_name, appt.last_name].filter(Boolean).join(' ') || '—'}
              </div>
              {appt.appointment_type && (
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{appt.appointment_type}</div>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#636466' }}>{appt.calendar ?? '—'}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>—</div>
            <div><StatusChip status="pending" /></div>
          </div>
        ))}

        {historical.length === 0 && upcomingOnly.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            No appointments found for today.
          </div>
        )}
      </div>
    </div>
  )
}
