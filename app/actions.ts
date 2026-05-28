'use server'

export type SyncState = {
  ok: boolean
  error?: string
  mode?: string
  results?: Array<{ date?: string; startDate?: string; endDate?: string; apptCount: number; upserted: number }>
  labels?: { synced: number; newLabels: number }
} | null

export async function triggerSync(
  _prevState: SyncState,
  formData: FormData
): Promise<SyncState> {
  const mode = formData.get('mode') as string
  const startDate = formData.get('startDate') as string | null
  const endDate = formData.get('endDate') as string | null
  const date = formData.get('date') as string | null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    return { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not set — add it to .env.local' }
  }

  const body: Record<string, string> = { mode }
  if (startDate) body.startDate = startDate
  if (endDate) body.endDate = endDate
  if (date) body.date = date

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/acuity-sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return data
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
