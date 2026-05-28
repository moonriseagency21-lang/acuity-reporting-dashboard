export const OPPORTUNITY_LABELS = new Set([
  '$ale', '$ale CIG', '$ale CIG Kim', '$ale BNPL CIG', '$ale BNPL LTP',
  'GO', 'NO SALE', 'No Sale CIG', 'No Sale CIG Kim',
  'Declined II PD', 'Declined BNPL', 'DECLINED BNPL PD', 'Declined BNPLCIG',
])

export const NO_OPPORTUNITY_LABELS = new Set([
  'CALL BACK PEND', 'Cancel', 'Customer Service', 'F Requirements',
  'Incomplete', 'Left Message', 'No SHOW', 'No VM - No LM',
  'Not confirmed', 'Z_Test_Data',
])

export const RESCHEDULE_LABELS = new Set(['Re-schedule'])

export type LabelBucket = 'opportunity' | 'no_opportunity' | 'reschedule' | 'blank' | 'unknown'

export function classifyLabel(name: string): LabelBucket {
  if (OPPORTUNITY_LABELS.has(name)) return 'opportunity'
  if (NO_OPPORTUNITY_LABELS.has(name)) return 'no_opportunity'
  if (RESCHEDULE_LABELS.has(name)) return 'reschedule'
  if (name === '(blank)') return 'blank'
  return 'unknown'
}
