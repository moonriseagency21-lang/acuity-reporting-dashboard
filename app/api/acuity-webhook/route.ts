import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
// Your Acuity API key — used by Acuity to sign webhook requests via HMAC-SHA256.
// Set ACUITY_API_KEY in Vercel env vars. If not set, signature verification is skipped.
const ACUITY_API_KEY = process.env.ACUITY_API_KEY

// Actions that can change labels or appointment state
const LABEL_EVENTS = new Set([
  'appointment.scheduled',
  'appointment.rescheduled',
  'appointment.canceled',
  'appointment.changed',
])

async function verifySignature(body: string, signature: string | null, apiKey: string): Promise<boolean> {
  if (!signature) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)))
  return expected === signature
}

export async function POST(req: NextRequest) {
  // Read the raw body first (needed for both signature verification and parsing)
  const rawBody = await req.text()

  // Verify Acuity's HMAC-SHA256 signature if we have the API key configured
  if (ACUITY_API_KEY) {
    const signature = req.headers.get('x-acuity-signature')
    const valid = await verifySignature(rawBody, signature, ACUITY_API_KEY)
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Acuity sends form-encoded bodies: action=changed&id=13&calendarID=1...
  let action: string | null = null
  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    action = new URLSearchParams(rawBody).get('action')
  } else {
    try { action = JSON.parse(rawBody).action ?? null } catch { /* ignore */ }
  }

  if (!action || !LABEL_EVENTS.has(action)) {
    return NextResponse.json({ ok: true, skipped: true, action })
  }

  const today = new Date().toISOString().split('T')[0]

  const res = await fetch(`${SUPABASE_URL}/functions/v1/acuity-sync-v2`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode: 'backfill', startDate: today, endDate: today }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[acuity-webhook] sync failed:', err)
    return NextResponse.json({ ok: false, error: err }, { status: 500 })
  }

  return NextResponse.json({ ok: true, action, syncedDate: today })
}
