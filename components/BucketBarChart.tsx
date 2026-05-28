'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type Props = {
  data: { reporting_bucket: string; total_customers: number }[]
}

export default function BucketBarChart({ data }: Props) {
  return (
    <div style={{ width: '100%', height: 420 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d6d6d6" />
          <XAxis
            dataKey="reporting_bucket"
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
          <Bar dataKey="total_customers" fill="#111110" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}