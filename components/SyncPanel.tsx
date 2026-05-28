'use client'

import { useActionState, startTransition } from 'react'
import { triggerSync, type SyncState } from '@/app/actions'

type Props = {
  year: number
  month: number
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export default function SyncPanel({ year, month }: Props) {
  const [state, action, pending] = useActionState<SyncState, FormData>(triggerSync, null)

  const startDate = `${year}-${pad(month)}-01`
  const endDate = `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`

  const totalUpserted = state?.results?.reduce((sum, r) => sum + r.upserted, 0) ?? 0
  const totalAppts = state?.results?.reduce((sum, r) => sum + r.apptCount, 0) ?? 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          startTransition(() => action(new FormData(e.currentTarget)))
        }}
        style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
      >
        <input type="hidden" name="mode" value="backfill" />
        <input type="hidden" name="startDate" value={startDate} />
        <input type="hidden" name="endDate" value={endDate} />

        <button
          type="submit"
          disabled={pending}
          style={{
            background: pending ? '#e5e5e5' : '#111110',
            color: pending ? '#999' : '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: pending ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {pending ? 'Syncing…' : 'Sync This Month'}
        </button>
      </form>

      {state !== null && (
        <span
          style={{
            fontSize: '13px',
            color: state.ok ? '#2d7d46' : '#c0392b',
          }}
        >
          {state.ok
            ? `✓ ${totalAppts} appointments found, ${totalUpserted} synced${state.labels?.newLabels ? ` · ${state.labels.newLabels} new label(s) added` : ''}`
            : `✗ ${state.error}`}
        </span>
      )}
    </div>
  )
}
