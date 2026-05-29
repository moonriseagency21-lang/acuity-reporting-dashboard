export const dynamic = 'force-dynamic'

import TodaysBoard from '@/components/TodaysBoard'
import { getTodayAppointments, getTodayFutureAppointments } from '@/lib/queries/pacing'
import { logout } from '@/app/login/actions'
import Link from 'next/link'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function todayLabel() {
  const now = new Date()
  return `${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`
}

export default async function TodayPage() {
  const [historical, future] = await Promise.all([
    getTodayAppointments().catch(() => []),
    getTodayFutureAppointments().catch(() => []),
  ])

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">

        <header className="dashboard-header">
          <div className="dashboard-header-row">
            <div>
              <h1>Today&apos;s Board</h1>
              <p>Good Vacation Getaways · {todayLabel()}</p>
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

        <TodaysBoard initialHistorical={historical} initialFuture={future} />

      </div>
    </main>
  )
}
