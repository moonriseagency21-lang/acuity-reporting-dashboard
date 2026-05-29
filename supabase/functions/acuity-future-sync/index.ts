import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ACUITY_USER_ID = Deno.env.get("ACUITY_USER_ID") ?? "";
const ACUITY_API_KEY = Deno.env.get("ACUITY_API_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase env vars");
if (!ACUITY_USER_ID || !ACUITY_API_KEY) throw new Error("Missing Acuity env vars");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type AcuityAppointment = Record<string, unknown>;

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return JSON.stringify(err);
}

async function acuityFetch(endpoint: string): Promise<unknown> {
  const res = await fetch(`https://acuityscheduling.com/api/v1${endpoint}`, {
    headers: { Authorization: `Basic ${btoa(`${ACUITY_USER_ID}:${ACUITY_API_KEY}`)}` },
  });
  if (!res.ok) throw new Error(`Acuity ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchAllPages(urlBase: string): Promise<AcuityAppointment[]> {
  const PAGE_SIZE = 5000;
  let offset = 0;
  const results: AcuityAppointment[] = [];
  while (true) {
    const page = await acuityFetch(`${urlBase}&max=${PAGE_SIZE}&offset=${offset}&direction=ASC`);
    if (!Array.isArray(page) || page.length === 0) break;
    results.push(...(page as AcuityAppointment[]));
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return results;
}

// Returns today's date in YYYY-MM-DD (UTC)
function todayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

// Returns last day of the current month in YYYY-MM-DD (UTC)
function endOfMonthUTC(): string {
  const now = new Date();
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return last.toISOString().split("T")[0];
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const today = todayUTC();
    const endOfMonth = endOfMonthUTC();

    // Fetch active appointments from today through end of month.
    // Future appointments won't have cancel/no-show status yet, so active-only is correct.
    const base = `/appointments?minDate=${today}&maxDate=${endOfMonth}`;
    const appts = await fetchAllPages(base);

    if (appts.length === 0) {
      return Response.json({ ok: true, fetched: 0, upserted: 0, deleted: 0 });
    }

    const now = new Date().toISOString();

    const rows = appts.map((a) => ({
      id:                  a.id,
      datetime:            a.datetime ?? null,
      first_name:          a.firstName ?? null,
      last_name:           a.lastName ?? null,
      email:               a.email ?? null,
      phone:               a.phone ?? null,
      calendar:            a.calendar ?? null,
      calendar_id:         a.calendarID ?? null,
      appointment_type:    a.type ?? null,
      appointment_type_id: a.appointmentTypeID ?? null,
      labels:              a.labels ?? null,
      canceled:            a.canceled === true,
      synced_at:           now,
    }));

    const CHUNK = 200;
    let upserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabase
        .from("future_appointments")
        .upsert(rows.slice(i, i + CHUNK), { onConflict: "id" });
      if (error) throw new Error(`upsert failed: ${error.message}`);
      upserted += Math.min(CHUNK, rows.length - i);
    }

    // Remove stale rows: appointments that were in the table but are no longer
    // in the future window (canceled, rescheduled out, or past their date).
    const freshIds = appts.map((a) => a.id);
    const { data: stale } = await supabase
      .from("future_appointments")
      .select("id")
      .lt("datetime", today + "T00:00:00Z");

    const staleIds = (stale ?? []).map((r: { id: unknown }) => r.id);

    // Also remove IDs that were previously synced but not returned (canceled/removed)
    const { data: allStored } = await supabase
      .from("future_appointments")
      .select("id");
    const storedIds = (allStored ?? []).map((r: { id: unknown }) => r.id);
    const removedIds = storedIds.filter((id: unknown) => !freshIds.includes(id));
    const idsToDelete = [...new Set([...staleIds, ...removedIds])];

    let deleted = 0;
    if (idsToDelete.length > 0) {
      const { error } = await supabase
        .from("future_appointments")
        .delete()
        .in("id", idsToDelete);
      if (error) console.error("delete stale failed:", error.message);
      else deleted = idsToDelete.length;
    }

    return Response.json({ ok: true, fetched: appts.length, upserted, deleted, today, endOfMonth });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, error: errMsg(err) }, { status: 500 });
  }
});
