import { supabase } from '@/lib/supabase'
import { OPPORTUNITY_LABELS, NO_OPPORTUNITY_LABELS, RESCHEDULE_LABELS } from '@/lib/labelBuckets'

const MONTH_ABBREVS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export type MonthMetric = {
  month: string
  yearMonth: string
  total: number
  noShow: number
  show: number
  showRate: number
  opportunity: number
  noOpportunity: number
  sale: number
}

export async function getLabelCounts(
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  let from = 0
  const PAGE = 1000

  while (true) {
    const { data, error } = await supabase
      .from('vw_v2_labels')
      .select('label_name')
      .gte('appt_date', startDate)
      .lte('appt_date', endDate)
      .range(from, from + PAGE - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    for (const row of data) {
      const name = row.label_name as string
      counts[name] = (counts[name] ?? 0) + 1
    }

    if (data.length < PAGE) break
    from += PAGE
  }

  return counts
}

export async function getConversionMetrics(startDate: string, endDate: string) {
  const labelCounts = await getLabelCounts(startDate, endDate)

  let opportunityCount = 0
  let noOpportunityCount = 0
  let rescheduleCount = 0
  let blankCount = 0
  let unknownCount = 0

  for (const [name, count] of Object.entries(labelCounts)) {
    if (OPPORTUNITY_LABELS.has(name)) opportunityCount += count
    else if (NO_OPPORTUNITY_LABELS.has(name)) noOpportunityCount += count
    else if (RESCHEDULE_LABELS.has(name)) rescheduleCount += count
    else if (name === '(blank)') blankCount += count
    else unknownCount += count
  }

  const saleCount = Object.entries(labelCounts)
    .filter(([name]) => name.startsWith('$ale'))
    .reduce((sum, [, n]) => sum + n, 0)

  const noShowCount = labelCounts['No SHOW'] ?? 0

  const totalLabeled = opportunityCount + noOpportunityCount + rescheduleCount + blankCount + unknownCount
  const showCount = totalLabeled - noShowCount

  const opportunityRate =
    totalLabeled > 0 ? ((opportunityCount / totalLabeled) * 100).toFixed(1) : null

  const noOpportunityRate =
    totalLabeled > 0 ? ((noOpportunityCount / totalLabeled) * 100).toFixed(1) : null

  const noShowRate =
    totalLabeled > 0 ? ((noShowCount / totalLabeled) * 100).toFixed(1) : null
  const showRate =
    totalLabeled > 0 ? ((showCount / totalLabeled) * 100).toFixed(1) : null

  const overallRate =
    totalLabeled > 0 ? ((saleCount / totalLabeled) * 100).toFixed(1) : null

  const closeRate =
    opportunityCount > 0
      ? ((saleCount / opportunityCount) * 100).toFixed(1)
      : null

  const buckets = [
    { reporting_bucket: 'Opportunity', total_customers: opportunityCount },
    { reporting_bucket: 'No Opportunity', total_customers: noOpportunityCount },
    { reporting_bucket: 'Reschedule', total_customers: rescheduleCount },
    { reporting_bucket: 'Blank', total_customers: blankCount },
    ...(unknownCount > 0
      ? [{ reporting_bucket: 'Unclassified', total_customers: unknownCount }]
      : []),
  ]

  return {
    labelCounts,
    buckets,
    opportunityCount,
    noOpportunityCount,
    rescheduleCount,
    blankCount,
    unknownCount,
    totalLabeled,
    saleCount,
    noShowCount,
    showCount,
    showRate,
    opportunityRate,
    noOpportunityRate,
    noShowRate,
    overallRate,
    closeRate,
  }
}

export async function getMonthlyMetrics(startDate: string, endDate: string): Promise<MonthMetric[]> {
  const byMonth: Record<string, Record<string, number>> = {}
  let from = 0
  const PAGE = 1000

  while (true) {
    const { data, error } = await supabase
      .from('vw_v2_labels')
      .select('appt_date, label_name')
      .gte('appt_date', startDate)
      .lte('appt_date', endDate)
      .range(from, from + PAGE - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    for (const row of data) {
      const ym = (row.appt_date as string).slice(0, 7)
      if (!byMonth[ym]) byMonth[ym] = {}
      const label = row.label_name as string
      byMonth[ym][label] = (byMonth[ym][label] ?? 0) + 1
    }

    if (data.length < PAGE) break
    from += PAGE
  }

  return Object.keys(byMonth).sort().map(ym => {
    const labels = byMonth[ym]
    const total = Object.values(labels).reduce((s, n) => s + n, 0)
    const noShow = labels['No SHOW'] ?? 0
    const show = total - noShow
    const sale = Object.entries(labels)
      .filter(([name]) => name.startsWith('$ale'))
      .reduce((s, [, n]) => s + n, 0)
    let opportunity = 0, noOpportunity = 0
    for (const [name, count] of Object.entries(labels)) {
      if (OPPORTUNITY_LABELS.has(name)) opportunity += count
      else if (NO_OPPORTUNITY_LABELS.has(name)) noOpportunity += count
    }
    const [yr, mo] = ym.split('-')
    const showRate = total > 0 ? parseFloat(((opportunity / total) * 100).toFixed(1)) : 0
    return {
      month: `${MONTH_ABBREVS[parseInt(mo) - 1]} ${yr}`,
      yearMonth: ym,
      total,
      noShow,
      show,
      showRate,
      opportunity,
      noOpportunity,
      sale,
    }
  })
}

export async function getAppointmentsByLabel(
  startDate: string,
  endDate: string,
  labelName: string
) {
  const { data, error } = await supabase
    .from('vw_v2_labels')
    .select('appointment_id, appt_date, start_time, first_name, last_name, email, calendar, appointment_type, label_name, notes, paid')
    .gte('appt_date', startDate)
    .lte('appt_date', endDate)
    .eq('label_name', labelName)
    .order('appt_date', { ascending: true })
    .limit(5000)

  if (error) throw error
  return data ?? []
}
