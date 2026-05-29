import { getTodayAppointments, getTodayFutureAppointments } from '@/lib/queries/pacing'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [historical, future] = await Promise.all([
      getTodayAppointments(),
      getTodayFutureAppointments(),
    ])
    return NextResponse.json({ historical, future })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
