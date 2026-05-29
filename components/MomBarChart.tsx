'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { MonthMetric } from '@/lib/queries/dashboard'

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const YEAR_COLORS: Record<string, string> = {
  '2023': '#636466',
  '2024': '#003153',
  '2025': '#0047AB',
  '2026': '#FF6F61',
}
const FALLBACK_COLORS = ['#6366f1','#059669','#d97706','#7c3aed']

type PivotRow = { month: string } & Record<string, number | null | string>

function pivot(data: MonthMetric[], dataKey: keyof MonthMetric) {
  const years = [...new Set(data.map(m => m.yearMonth.slice(0, 4)))].sort()
  const lookup: Record<string, Record<string, number>> = {}

  for (const m of data) {
    const yr = m.yearMonth.slice(0, 4)
    const mo = parseInt(m.yearMonth.slice(5, 7)) - 1
    const key = MONTH_LABELS[mo]
    if (!lookup[key]) lookup[key] = {}
    lookup[key][yr] = m[dataKey] as number
  }

  const rows: PivotRow[] = MONTH_LABELS.map(month => {
    const row: PivotRow = { month }
    for (const yr of years) row[yr] = lookup[month]?.[yr] ?? null
    return row
  })

  return { rows, years }
}

function colorFor(year: string, idx: number) {
  return YEAR_COLORS[year] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
}

function ValueLabel({
  x, y, value, fill, unit,
}: {
  x?: number; y?: number; value?: number | null; fill?: string; unit?: string
}) {
  if (value == null || x == null || y == null) return null
  return (
    <text x={x} y={y - 10} textAnchor="middle" fontSize={11} fontWeight={700} fill={fill ?? '#111110'}>
      {value.toLocaleString()}{unit ?? ''}
    </text>
  )
}

type Props = {
  data: MonthMetric[]
  dataKey: keyof MonthMetric
  unit?: string
}

export default function MomBarChart({ data, dataKey, unit }: Props) {
  const { rows, years } = pivot(data, dataKey)

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 28, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#6b6b6b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b6b6b', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={48}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
          {years.map((year, i) => {
            const color = colorFor(year, i)
            return (
              <Line
                key={year}
                type="natural"
                dataKey={year}
                name={year}
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 4, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
                label={<ValueLabel fill={color} unit={unit} />}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
