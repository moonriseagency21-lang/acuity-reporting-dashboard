import Link from 'next/link'
import { getAppointmentsByLabel } from '@/lib/queries/dashboard'

type Appointment = {
  appointment_id: number
  appt_date: string
  start_time: string
  first_name: string
  last_name: string
  email: string | null
  calendar: string | null
  appointment_type: string | null
  label_name: string | null
  notes: string | null
  paid: string | null
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// appt_date is "YYYY-MM-DD", start_time is "HH:MM:SS" (from Postgres time type)
function formatDateTime(apptDate: string, startTime: string) {
  try {
    const date = new Date(`${apptDate}T${startTime}`)
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  } catch {
    return `${apptDate} ${startTime}`
  }
}

function formatRangeLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const sy = start.getFullYear(), ey = end.getFullYear()
  const isFullMonth =
    start.getDate() === 1 &&
    start.getMonth() === end.getMonth() &&
    sy === ey &&
    end.getDate() === new Date(ey, end.getMonth() + 1, 0).getDate()
  if (isFullMonth) return `${MONTHS[start.getMonth()]} ${sy}`
  if (sy === ey) {
    return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${sy}`
  }
  return `${MONTHS[start.getMonth()]} ${start.getDate()}, ${sy} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${ey}`
}

function LabelPill({ label }: { label: string | null }) {
  if (!label || label === '(blank)') {
    return <span style={{ color: '#9ca3af', fontSize: '12px' }}>(blank)</span>
  }
  const isSale = label.startsWith('$ale')
  return (
    <span style={{
      fontSize: '11px', padding: '1px 7px', borderRadius: '9999px',
      backgroundColor: isSale ? '#dcfce7' : '#f3f4f6',
      color: isSale ? '#15803d' : '#374151',
      fontWeight: isSale ? 600 : 400,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string; label?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const startDate = params.startDate ?? `${y}-${m}-01`
  const endDate = params.endDate ?? `${y}-${m}-${String(lastDay).padStart(2, '0')}`
  const label = params.label ?? '(blank)'

  let appointments: Awaited<ReturnType<typeof getAppointmentsByLabel>> = []
  let fetchError: string | null = null
  try {
    appointments = await getAppointmentsByLabel(startDate, endDate, label)
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      fetchError = String((err as { message: unknown }).message)
    } else if (err instanceof Error) {
      fetchError = err.message
    } else {
      fetchError = JSON.stringify(err)
    }
  }
  const rangeLabel = formatRangeLabel(startDate, endDate)
  const isSale = label.startsWith('$ale')

  return (
    <main style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link
          href={`/?startDate=${startDate}&endDate=${endDate}`}
          style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none' }}
        >
          ← Back to {rangeLabel} dashboard
        </Link>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
          <span style={{
            display: 'inline-block', padding: '2px 12px', borderRadius: '6px',
            backgroundColor: isSale ? '#dcfce7' : '#f3f4f6',
            color: isSale ? '#15803d' : '#111827',
            marginRight: '12px',
          }}>
            {label}
          </span>
          {rangeLabel}
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '6px' }}>
          {appointments.length.toLocaleString()} appointment{appointments.length !== 1 ? 's' : ''}
        </p>
      </div>

      {fetchError ? (
        <p style={{ color: '#dc2626' }}>Error loading appointments: {fetchError}</p>
      ) : appointments.length === 0 ? (
        <p style={{ color: '#9ca3af' }}>No appointments found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            fontSize: '13px', backgroundColor: '#fff',
            border: '1px solid #e5e7eb', borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Date / Time', 'Name', 'Email', 'Calendar', 'Type', 'Label', 'Notes', 'Paid'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontWeight: 600, color: '#374151', whiteSpace: 'nowrap',
                    fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(appointments as Appointment[]).map((appt, i) => (
                <tr
                  key={appt.appointment_id}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa',
                  }}
                >
                  <td style={{ padding: '8px 14px', whiteSpace: 'nowrap', color: '#374151' }}>
                    {formatDateTime(appt.appt_date, appt.start_time)}
                  </td>
                  <td style={{ padding: '8px 14px', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {appt.first_name} {appt.last_name}
                  </td>
                  <td style={{ padding: '8px 14px', color: '#6b7280', fontSize: '12px' }}>
                    {appt.email ?? '—'}
                  </td>
                  <td style={{ padding: '8px 14px', whiteSpace: 'nowrap', color: '#6b7280' }}>
                    {appt.calendar ?? '—'}
                  </td>
                  <td style={{ padding: '8px 14px', color: '#6b7280' }}>
                    {appt.appointment_type ?? '—'}
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    <LabelPill label={appt.label_name} />
                  </td>
                  <td style={{ padding: '8px 14px', maxWidth: '240px', color: '#6b7280', fontSize: '12px' }}>
                    {appt.notes ? (
                      <span title={appt.notes} style={{
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {appt.notes}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                    {appt.paid === 'yes' ? (
                      <span style={{ color: '#15803d', fontWeight: 600, fontSize: '12px' }}>Yes</span>
                    ) : appt.paid === 'no' ? (
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>No</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
