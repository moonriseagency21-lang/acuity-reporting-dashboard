import { supabase } from '@/lib/supabase'
import { OPPORTUNITY_LABELS } from '@/lib/labelBuckets'
import { OVERALL_SALES_RATE_GOAL, SHOW_RATE_GOAL, CLOSE_RATE_GOAL } from '@/lib/goals'

export type FutureAppointment = {
  id: number
  datetime: string
  first_name: string | null
  last_name: string | null
  calendar: string | null
  appointment_type: string | null
  labels: Array<{ id: number; name: string; color: string }> | null
  canceled: boolean
}

export type TodayAppointment = {
  id: number
  datetime: string
  first_name: string | null
  last_name: string | null
  calendar: string | null
  appointment_type: string | null
  label_name: string | null
  canceled: boolean
  no_show: boolean
}

export type PacingData = {
  // Month totals
  mtdApptCount: number          // historical appointments this month (occurred)
  futureApptCount: number       // booked but not yet occurred
  totalMonthAppts: number       // mtd + future
  // Sales
  mtdSaleCount: number          // sales closed so far this month
  goalSales: number             // total month appts × 9%
  salesNeeded: number           // goalSales - mtdSaleCount (floor 0)
  // Show rate
  mtdShowCount: number          // opportunity bucket so far this month
  goalShows: number             // total month appts × 30%
  showsNeeded: number           // goalShows - mtdShowCount (floor 0)
  // Pacing
  daysInMonth: number
  daysElapsed: number
  daysRemaining: number
  requiredCloseRateOnRemaining: number | null  // salesNeeded / futureApptCount
  // Status
  onTrack: boolean
}

// Returns future appointments for today through end of month.
export async function getFutureAppointments(): Promise<FutureAppointment[]> {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const endOfMonth = `${todayStr.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('future_appointments')
    .select('id, datetime, first_name, last_name, calendar, appointment_type, labels, canceled')
    .gte('datetime', todayStr + 'T00:00:00')
    .lte('datetime', endOfMonth + 'T23:59:59')
    .eq('canceled', false)
    .order('datetime', { ascending: true })

  if (error) throw error
  return (data ?? []) as FutureAppointment[]
}

// Returns all appointments today (historical table — has labels).
export async function getTodayAppointments(): Promise<TodayAppointment[]> {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('vw_v2_labels')
    .select('appointment_id, datetime, first_name, last_name, calendar, appointment_type, label_name, canceled, no_show')
    .gte('appt_date', todayStr)
    .lte('appt_date', todayStr)
    .order('datetime', { ascending: true })

  if (error) throw error

  // vw_v2_labels has one row per label; deduplicate to one row per appointment
  // keeping the most significant label (sale > opportunity > no-opp > blank).
  const map = new Map<number, TodayAppointment>()
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const id = row.appointment_id as number
    if (!map.has(id)) {
      map.set(id, {
        id,
        datetime: row.datetime as string,
        first_name: row.first_name as string | null,
        last_name: row.last_name as string | null,
        calendar: row.calendar as string | null,
        appointment_type: row.appointment_type as string | null,
        label_name: row.label_name as string | null,
        canceled: row.canceled as boolean,
        no_show: row.no_show as boolean,
      })
    }
  }
  return Array.from(map.values())
}

// Returns future appointments for today only (unlabeled bookings not yet in historical table).
export async function getTodayFutureAppointments(): Promise<FutureAppointment[]> {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('future_appointments')
    .select('id, datetime, first_name, last_name, calendar, appointment_type, labels, canceled')
    .gte('datetime', todayStr + 'T00:00:00')
    .lte('datetime', todayStr + 'T23:59:59')
    .eq('canceled', false)
    .order('datetime', { ascending: true })

  if (error) throw error
  return (data ?? []) as FutureAppointment[]
}

// Core pacing calculation — call server-side, pass result as props to PacingPanel.
export async function getPacingData(): Promise<PacingData> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const todayStr = now.toISOString().split('T')[0]
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysElapsed = now.getDate()
  const daysRemaining = daysInMonth - daysElapsed

  // Historical: count appointments this month up to today (head:true = no rows fetched)
  const { count: mtdCount, error: histErr } = await supabase
    .from('acuity_appointments_v2')
    .select('id', { count: 'exact', head: true })
    .gte('datetime', monthStart + 'T00:00:00')
    .lte('datetime', todayStr + 'T23:59:59')
    .eq('canceled', false)

  if (histErr) throw histErr
  const mtdApptCount = mtdCount ?? 0

  // MTD label counts for shows and sales
  const { data: labelData, error: labelErr } = await supabase.rpc('get_label_counts', {
    p_start: monthStart,
    p_end: todayStr,
  })
  if (labelErr) throw labelErr

  let mtdSaleCount = 0
  let mtdShowCount = 0
  for (const row of (labelData ?? []) as Array<{ label_name: string; cnt: number }>) {
    const n = Number(row.cnt)
    if (row.label_name.startsWith('$ale')) mtdSaleCount += n
    if (OPPORTUNITY_LABELS.has(row.label_name)) mtdShowCount += n
  }

  // Future: appointments from tomorrow through end of month
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  const lastDay = new Date(year, month + 1, 0).getDate()
  const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { count: futCount, error: futErr } = await supabase
    .from('future_appointments')
    .select('id', { count: 'exact', head: true })
    .gte('datetime', tomorrowStr + 'T00:00:00')
    .lte('datetime', endOfMonth + 'T23:59:59')
    .eq('canceled', false)

  if (futErr) throw futErr
  const futureApptCount = futCount ?? 0

  const totalMonthAppts = mtdApptCount + futureApptCount
  const goalSales = Math.round(totalMonthAppts * OVERALL_SALES_RATE_GOAL)
  const goalShows = Math.round(totalMonthAppts * SHOW_RATE_GOAL)
  const salesNeeded = Math.max(0, goalSales - mtdSaleCount)
  const showsNeeded = Math.max(0, goalShows - mtdShowCount)

  const requiredCloseRateOnRemaining =
    futureApptCount > 0 ? (salesNeeded / futureApptCount) * 100 : null

  // On track = current close rate would cover needed sales, or we've already hit goal
  const onTrack = salesNeeded === 0 || (requiredCloseRateOnRemaining !== null && requiredCloseRateOnRemaining <= CLOSE_RATE_GOAL * 100)

  return {
    mtdApptCount,
    futureApptCount,
    totalMonthAppts,
    mtdSaleCount,
    goalSales,
    salesNeeded,
    mtdShowCount,
    goalShows,
    showsNeeded,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    requiredCloseRateOnRemaining,
    onTrack,
  }
}
