// Label names are exact strings from the Acuity API / acuity_appointments_v2.
// Z_Test_Data is excluded from all counts.
// (blank) = appointment with no label selected — counted in totals.

// Opportunity / Show labels (Bucket 1 = Opportunity, Bucket 3 = Show — same set)
export const OPPORTUNITY_LABELS = new Set([
  '$ale', '$ale BNPL CIG', '$ale BNPL LTP', '$ale CIG', '$ale CIG Kim',
  'Declined BNPL', 'Declined BNPL PD', 'Declined BNPLCIG', 'Declined II PD',
  'GO', 'NO SALE', 'No Sale CIG', 'No Sale CIG Kim',
])

// $ale bucket (Bucket 2) — subset of OPPORTUNITY_LABELS
export const SALE_LABELS = new Set([
  '$ale', '$ale BNPL CIG', '$ale BNPL LTP', '$ale CIG', '$ale CIG Kim',
])

// No Opportunity labels (Bucket 1 = No Opportunity)
export const NO_OPPORTUNITY_LABELS = new Set([
  'CALL BACK PEND', 'Cancel', 'Customer Service', 'F Requirements',
  'Incomplete', 'Left Message', 'No SHOW', 'No VM - No LM',
  'Not confirmed', 'Re-schedule',
])

export const RESCHEDULE_LABELS = new Set<string>()

export type LabelBucket = 'opportunity' | 'no_opportunity' | 'sale' | 'blank' | 'unknown'

export function classifyLabel(name: string): LabelBucket {
  if (name === '(blank)') return 'blank'
  if (name === 'Z_Test_Data') return 'unknown'
  if (SALE_LABELS.has(name)) return 'sale'
  if (OPPORTUNITY_LABELS.has(name)) return 'opportunity'
  if (NO_OPPORTUNITY_LABELS.has(name)) return 'no_opportunity'
  return 'unknown'
}
