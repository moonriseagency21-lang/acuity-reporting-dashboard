export const dynamic = 'force-dynamic'

import KpiCard from '@/components/KpiCard'
import Panel from '@/components/Panel'
import LabelCountsPanel from '@/components/LabelCountsPanel'
import DateRangePicker from '@/components/DateRangePicker'
import MomBarChart from '@/components/MomBarChart'
import GoalMetricsPanel from '@/components/GoalMetricsPanel'
import { getConversionMetrics, getMonthlyMetrics } from '@/lib/queries/dashboard'
import { logout } from '@/app/login/actions'
import Link from 'next/link'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function defaultRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return {
    startDate: `${y}-${m}-01`,
    endDate: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>
}) {
  const params = await searchParams
  const defaults = defaultRange()
  const startDate = params.startDate ?? defaults.startDate
  const endDate = params.endDate ?? defaults.endDate

  const emptyConversion: Awaited<ReturnType<typeof getConversionMetrics>> = {
    labelCounts: {}, buckets: [], opportunityCount: 0, noOpportunityCount: 0,
    rescheduleCount: 0, blankCount: 0, unknownCount: 0, totalLabeled: 0,
    saleCount: 0, noShowCount: 0, showCount: 0, showRate: null,
    opportunityRate: null, noOpportunityRate: null, noShowRate: null,
    overallRate: null, closeRate: null,
  }

  const [conversion, monthlyMetrics] = await Promise.all([
    getConversionMetrics(startDate, endDate).catch(() => emptyConversion),
    getMonthlyMetrics('2024-01-01', '2026-12-31').catch(() => [] as Awaited<ReturnType<typeof getMonthlyMetrics>>),
  ])

  // Sales needed = goal (30% of shows) minus actual sales, floor 0
  const salesNeeded = Math.max(0, Math.round(conversion.opportunityCount * 0.3) - conversion.saleCount)

  const rangeLabel = formatRangeLabel(startDate, endDate)

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">

        <header className="dashboard-header">
          <div className="dashboard-header-row">
            <div>
              <h1>Acuity Reporting</h1>
              <p>Good Vacation Getaways · {rangeLabel}</p>
            </div>
            <div className="dashboard-controls">
              <DateRangePicker startDate={startDate} endDate={endDate} />
              <Link
                href="/today"
                style={{
                  padding: '8px 18px',
                  background: '#0047AB',
                  border: '1px solid #0047AB',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                }}
              >
                Today&apos;s Board →
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

        <section className="kpi-grid kpi-grid-5">
          <KpiCard
            title="Opportunity / Show"
            value={conversion.opportunityCount.toLocaleString()}
            rate={conversion.opportunityRate ?? undefined}
            subtitle="Spoke with customer"
          />
          <KpiCard
            title="No Opportunity"
            value={conversion.noOpportunityCount.toLocaleString()}
            rate={conversion.noOpportunityRate ?? undefined}
            subtitle="No opp ÷ all appts"
          />
          <KpiCard
            title="No Show"
            value={conversion.noShowCount.toLocaleString()}
            rate={conversion.noShowRate ?? undefined}
            subtitle="No SHOW ÷ all appts"
          />
          <KpiCard
            title="Overall Conv. Rate"
            value={conversion.overallRate !== null ? `${conversion.overallRate}%` : '—'}
            subtitle={`Sales ÷ all ${conversion.totalLabeled.toLocaleString()} appts`}
          />
          <KpiCard
            title="Sales Needed"
            value={salesNeeded.toLocaleString()}
            subtitle={`to hit goal (${Math.round(conversion.opportunityCount * 0.3).toLocaleString()} total)`}
            highlight={salesNeeded === 0 ? 'green' : 'red'}
          />
        </section>

        <GoalMetricsPanel
          opportunityRate={conversion.opportunityRate ?? null}
          opportunityCount={conversion.opportunityCount}
          closeRate={conversion.closeRate ?? null}
          saleCount={conversion.saleCount ?? 0}
          totalLabeled={conversion.totalLabeled}
        />

        <div style={{ marginBottom: 24 }}>
          <Panel title="Label Counts">
            <LabelCountsPanel
              labelCounts={conversion.labelCounts}
              startDate={startDate}
              endDate={endDate}
            />
          </Panel>
        </div>

        <section className="mom-chart-grid">
          <div className="mom-chart-grid-full">
            <Panel title="Total Appointments Booked">
              <MomBarChart data={monthlyMetrics} dataKey="booked" />
            </Panel>
          </div>
          <div className="mom-chart-grid-full">
            <Panel title="$ale (all sale labels)">
              <MomBarChart data={monthlyMetrics} dataKey="sale" />
            </Panel>
          </div>
          <div className="mom-chart-grid-full">
            <Panel title="Show Rate">
              <MomBarChart data={monthlyMetrics} dataKey="showRate" unit="%" />
            </Panel>
          </div>
          <Panel title="Opportunity">
            <MomBarChart data={monthlyMetrics} dataKey="opportunity" />
          </Panel>
          <Panel title="No Opportunity">
            <MomBarChart data={monthlyMetrics} dataKey="noOpportunity" />
          </Panel>
          <Panel title="Shows">
            <MomBarChart data={monthlyMetrics} dataKey="show" />
          </Panel>
          <Panel title="No Shows">
            <MomBarChart data={monthlyMetrics} dataKey="noShow" />
          </Panel>
          <div className="mom-chart-grid-full">
            <Panel title="Cancels">
              <MomBarChart data={monthlyMetrics} dataKey="cancel" />
            </Panel>
          </div>
        </section>

      </div>
    </main>
  )
}
