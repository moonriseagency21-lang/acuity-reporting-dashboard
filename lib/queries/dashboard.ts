import { supabase } from '@/lib/supabase'
import { unstable_cache } from 'next/cache'
import { OPPORTUNITY_LABELS, NO_OPPORTUNITY_LABELS, RESCHEDULE_LABELS } from '@/lib/labelBuckets'

const MONTH_ABBREVS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export type MonthMetric = {
  month: string
  yearMonth: string
  total: number
  booked: number
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
  const { data, error } = await supabase.rpc('get_label_counts', {
    p_start: startDate,
    p_end: endDate,
  })
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of data as Array<{ label_name: string; cnt: number }>) {
    counts[row.label_name] = Number(row.cnt)
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

async function _getMonthlyMetrics(startDate: string, endDate: string): Promise<MonthMetric[]> {
  const { data, error } = await supabase.rpc('get_monthly_metrics', {
    p_start: startDate,
    p_end: endDate,
  })
  if (error) throw error
  return (data as Array<{
    year_month: string
    total: number
    booked: number
    no_show: number
    show: number
    opportunity: number
    no_opportunity: number
    sale: number
  }>).map(row => {
    const [yr, mo] = row.year_month.split('-')
    const showRate = row.total > 0
      ? parseFloat(((row.opportunity / row.total) * 100).toFixed(1))
      : 0
    return {
      month: `${MONTH_ABBREVS[parseInt(mo) - 1]} ${yr}`,
      yearMonth: row.year_month,
      total: Number(row.total),
      booked: Number(row.booked ?? 0),
      noShow: Number(row.no_show),
      show: Number(row.show),
      showRate,
      opportunity: Number(row.opportunity),
      noOpportunity: Number(row.no_opportunity),
      sale: Number(row.sale),
    }
  })
}

// Cached for 6 hours — monthly metrics only change after the nightly sync.
// Revalidates automatically on next request after the TTL expires.
export const getMonthlyMetrics = unstable_cache(
  _getMonthlyMetrics,
  ['monthly-metrics'],
  { revalidate: 6 * 60 * 60 }
)

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
