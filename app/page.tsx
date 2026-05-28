import KpiCard from '@/components/KpiCard'
import Panel from '@/components/Panel'
import BucketBarChart from '@/components/BucketBarChart'
import LabelCountsPanel from '@/components/LabelCountsPanel'
import DateRangePicker from '@/components/DateRangePicker'
import MomBarChart from '@/components/MomBarChart'
import GoalMetricsPanel from '@/components/GoalMetricsPanel'
import { getConversionMetrics, getMonthlyMetrics } from '@/lib/queries/dashboard'
import { logout } from '@/app/login/actions'

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

  const [conversion, monthlyMetrics] = await Promise.all([
    getConversionMetrics(startDate, endDate),
    getMonthlyMetrics('2025-01-01', '2026-12-31'),
  ])
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
              <form action={logout}>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    background: 'transparent',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#6b6b6b',
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

        <section className="kpi-grid kpi-grid-7">
          <KpiCard
            title="Opportunity"
            value={conversion.opportunityCount.toLocaleString()}
            rate={conversion.opportunityRate ?? undefined}
            subtitle="Spoke with customer"
          />
          <KpiCard
            title="No Opportunity"
            value={conversion.noOpportunityCount.toLocaleString()}
            rate={conversion.noOpportunityRate ?? undefined}
            subtitle="No chance to present"
          />
          <KpiCard
            title="Sales ($ale)"
            value={conversion.saleCount !== null ? conversion.saleCount.toLocaleString() : '—'}
            subtitle="Confirmed purchases"
          />
          <KpiCard
            title="No Show Rate"
            value={conversion.noShowCount.toLocaleString()}
            rate={conversion.noShowRate ?? undefined}
            subtitle="No SHOW ÷ all appts"
          />
          <KpiCard
            title="Show Rate"
            value={conversion.opportunityCount.toLocaleString()}
            rate={conversion.opportunityRate ?? undefined}
            subtitle="Showed ÷ all appts"
          />
          <KpiCard
            title="Overall Conv. Rate"
            value={conversion.overallRate !== null ? `${conversion.overallRate}%` : '—'}
            subtitle={`Sales ÷ all ${conversion.totalLabeled.toLocaleString()} appts`}
          />
          <KpiCard
            title="Close Rate"
            value={conversion.closeRate !== null ? `${conversion.closeRate}%` : '—'}
            subtitle={`Sales ÷ ${conversion.opportunityCount.toLocaleString()} opportunity`}
          />
        </section>

        <GoalMetricsPanel
          opportunityRate={conversion.opportunityRate ?? null}
          opportunityCount={conversion.opportunityCount}
          closeRate={conversion.closeRate ?? null}
          saleCount={conversion.saleCount ?? 0}
          totalLabeled={conversion.totalLabeled}
        />

        <section className="panel-grid panel-grid-two">
          <Panel title={`${rangeLabel} Bucket Distribution`}>
            <BucketBarChart data={conversion.buckets} />
          </Panel>
          <Panel title="Label Counts">
            <LabelCountsPanel
              labelCounts={conversion.labelCounts}
              startDate={startDate}
              endDate={endDate}
            />
          </Panel>
        </section>

        <section className="mom-chart-grid">
          <Panel title="No Shows — Month over Month">
            <MomBarChart data={monthlyMetrics} dataKey="noShow" />
          </Panel>
          <Panel title="Shows — Month over Month">
            <MomBarChart data={monthlyMetrics} dataKey="show" />
          </Panel>
          <Panel title="Show Rate — Month over Month">
            <MomBarChart data={monthlyMetrics} dataKey="showRate" unit="%" />
          </Panel>
          <Panel title="Opportunity — Month over Month">
            <MomBarChart data={monthlyMetrics} dataKey="opportunity" />
          </Panel>
          <Panel title="No Opportunity — Month over Month">
            <MomBarChart data={monthlyMetrics} dataKey="noOpportunity" />
          </Panel>
          <div className="mom-chart-grid-full">
            <Panel title="$ale (all sale labels) — Month over Month">
              <MomBarChart data={monthlyMetrics} dataKey="sale" />
            </Panel>
          </div>
        </section>

      </div>
    </main>
  )
}
