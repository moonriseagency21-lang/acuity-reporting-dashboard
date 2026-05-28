'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type TrendRow = Record<string, string | number>

type Props = {
  data: TrendRow[]
  xKey: string
  yKey: string
}

export default function MonthlyTrendChart({ data, xKey, yKey }: Props) {
  return (
    <div style={{ width: '100%', height: 420 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d6d6d6" />
          <XAxis
            dataKey={xKey}
            tick={{ fill: '#111110', fontSize: 13 }}
            axisLine={{ stroke: '#cfcfcf' }}
            tickLine={{ stroke: '#cfcfcf' }}
          />
          <YAxis
            tick={{ fill: '#111110', fontSize: 13 }}
            axisLine={{ stroke: '#cfcfcf' }}
            tickLine={{ stroke: '#cfcfcf' }}
          />
          <Tooltip />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke="#111110"
            strokeWidth={2}
            dot={{ r: 4, fill: '#111110' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}