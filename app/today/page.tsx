export const dynamic = 'force-dynamic'

import TodaysBoard from '@/components/TodaysBoard'
import TodayPacingPanel from '@/components/TodayPacingPanel'
import { getTodayAppointments, getTodayFutureAppointments, getTodayPacingData } from '@/lib/queries/pacing'
import { logout } from '@/app/login/actions'
import Link from 'next/link'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default async function TodayPage() {
  const now = new Date()
  const todayLabel = `${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`

  const [historical, future, pacing] = await Promise.all([
    getTodayAppointments().catch(() => []),
    getTodayFutureAppointments().catch(() => []),
    getTodayPacingData().catch(() => null),
  ])

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">

        <header className="dashboard-header">
          <div className="dashboard-header-row">
            <div>
              <h1>Today&apos;s Board</h1>
              <p>Good Vacation Getaways · {todayLabel}</p>
            </div>
            <div className="dashboard-controls">
              <Link
                href="/"
                style={{
                  padding: '8px 18px',
                  background: 'transparent',
                  border: '1px solid #0047AB',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#0047AB',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                }}
              >
                ← Dashboard
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    background: 'transparent',
                    border: '1px solid #0047AB',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#0047AB',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        {pacing && <TodayPacingPanel data={pacing} dateLabel={todayLabel} />}
        <TodaysBoard initialHistorical={historical} initialFuture={future} />

      </div>
    </main>
  )
}
