import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ACUITY_USER_ID = Deno.env.get("ACUITY_USER_ID") ?? "";
const ACUITY_API_KEY = Deno.env.get("ACUITY_API_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase env vars");
if (!ACUITY_USER_ID || !ACUITY_API_KEY) throw new Error("Missing Acuity env vars");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type RequestBody = {
  mode?: "daily" | "backfill" | "diagnose";
  startDate?: string;
  endDate?: string;
  dryRun?: boolean;
};

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

async function syncDateRange(
  startDate: string,
  endDate: string,
  dryRun: boolean
): Promise<{ apptCount: number; upserted: number }> {
  const base = `/appointments?minDate=${startDate}&maxDate=${endDate}`;

  // Two-pass: active (default) + canceled separately, merged by id.
  // showall=true is NOT equivalent — it matches active-only in practice.
  // canceled=true captures explicitly canceled/no-show appointments the default misses.
  const [active, canceled] = await Promise.all([
    fetchAllPages(base),
    fetchAllPages(`${base}&canceled=true`),
  ]);

  const apptMap = new Map<unknown, AcuityAppointment>();
  for (const a of canceled) apptMap.set(a.id, a);
  for (const a of active) apptMap.set(a.id, a);
  const allAppts = Array.from(apptMap.values());

  if (dryRun || allAppts.length === 0) return { apptCount: allAppts.length, upserted: 0 };

  const now = new Date().toISOString();

  const rows = allAppts.map((a) => ({
    id:                   a.id,
    datetime:             a.datetime ?? null,
    end_time:             a.endTime ?? null,
    timezone:             a.timezone ?? a.calendarTimezone ?? null,
    first_name:           a.firstName ?? null,
    last_name:            a.lastName ?? null,
    email:                a.email ?? null,
    phone:                a.phone ?? null,
    calendar:             a.calendar ?? null,
    calendar_id:          a.calendarID ?? null,
    appointment_type:     a.type ?? null,
    appointment_type_id:  a.appointmentTypeID ?? null,
    duration:             a.duration ? Number(a.duration) : null,
    notes:                a.notes ?? null,
    labels:               a.labels ?? null,
    canceled:             a.canceled === true,
    no_show:              a.noShow === true,
    paid:                 a.paid ?? null,
    price:                a.price != null ? Number(a.price) : null,
    raw:                  a,
    synced_at:            now,
  }));

  const CHUNK = 200;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase
      .from("acuity_appointments_v2")
      .upsert(rows.slice(i, i + CHUNK), { onConflict: "id" });
    if (error) throw new Error(`upsert failed: ${error.message}`);
    upserted += Math.min(CHUNK, rows.length - i);
  }

  return { apptCount: allAppts.length, upserted };
}

// Diagnose mode: compare showall=true vs two-pass for a date range (no upsert)
async function diagnoseRange(startDate: string, endDate: string) {
  const base = `/appointments?minDate=${startDate}&maxDate=${endDate}`;

  const [showall, active, canceled] = await Promise.all([
    fetchAllPages(`${base}&showall=true`),
    fetchAllPages(base),
    fetchAllPages(`${base}&canceled=true`),
  ]);

  const merged = new Map<unknown, AcuityAppointment>();
  for (const a of canceled) merged.set(a.id, a);
  for (const a of active) merged.set(a.id, a);

  // Sample first appointment from each set for inspection
  const showallSample = showall[0] ? { id: showall[0].id, canceled: showall[0].canceled, labels: showall[0].labels } : null;
  const activeSample  = active[0]  ? { id: active[0].id,  canceled: active[0].canceled,  labels: active[0].labels  } : null;

  return {
    startDate,
    endDate,
    showall_count:    showall.length,
    active_count:     active.length,
    canceled_count:   canceled.length,
    two_pass_merged:  merged.size,
    showall_sample:   showallSample,
    active_sample:    activeSample,
  };
}

function weekRanges(startDate: string, endDate: string): Array<[string, string]> {
  const ranges: Array<[string, string]> = [];
  let cursor = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T23:59:59Z");
  while (cursor <= end) {
    const weekEnd = new Date(cursor);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    if (weekEnd > end) weekEnd.setTime(end.getTime());
    ranges.push([cursor.toISOString().split("T")[0], weekEnd.toISOString().split("T")[0]]);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return ranges;
}

function yesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
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
    const body: RequestBody = req.method === "POST" ? await req.json() : {};
    const { mode = "daily", startDate, endDate, dryRun = false } = body;

    const results = [];

    if (mode === "count") {
      if (!startDate) throw new Error("startDate required for count mode");
      const end = endDate ?? startDate;

      // Must chunk by week — Acuity silently caps results for date ranges > ~7 days.
      const merged = new Map<unknown, AcuityAppointment>();
      for (const [wStart, wEnd] of weekRanges(startDate, end)) {
        const base = `/appointments?minDate=${wStart}&maxDate=${wEnd}`;
        const [active, canceled] = await Promise.all([
          fetchAllPages(base),
          fetchAllPages(`${base}&canceled=true`),
        ]);
        for (const a of canceled) merged.set(a.id, a);
        for (const a of active) merged.set(a.id, a);
      }
      const all = Array.from(merged.values());

      const byType: Record<string, number> = {};
      const byCalendar: Record<string, number> = {};
      for (const a of all) {
        const t = String(a.type ?? "(none)");
        const c = String(a.calendar ?? "(none)");
        byType[t] = (byType[t] ?? 0) + 1;
        byCalendar[c] = (byCalendar[c] ?? 0) + 1;
      }

      return Response.json({
        ok: true,
        mode,
        startDate,
        endDate: end,
        total: all.length,
        byType,
        byCalendar,
      });
    } else if (mode === "inspect") {
      const [apptTypes, calendars] = await Promise.all([
        acuityFetch("/appointment-types"),
        acuityFetch("/calendars"),
      ]);
      return Response.json({ ok: true, mode, apptTypes, calendars });
    } else if (mode === "diagnose") {
      // Run diagnose on each week of the given range (or a single week if no range)
      const start = startDate ?? "2026-03-01";
      const end   = endDate   ?? "2026-03-31";
      for (const [wStart, wEnd] of weekRanges(start, end)) {
        const r = await diagnoseRange(wStart, wEnd);
        results.push(r);
      }
      return Response.json({ ok: true, mode, results });
    } else if (mode === "daily") {
      const day = yesterday();
      const [yr, mo] = day.split("-");
      const monthStart = `${yr}-${mo}-01`;
      for (const [wStart, wEnd] of weekRanges(monthStart, day)) {
        const r = await syncDateRange(wStart, wEnd, dryRun);
        results.push({ startDate: wStart, endDate: wEnd, ...r });
      }
    } else if (mode === "backfill") {
      if (!startDate) throw new Error("startDate required for backfill mode");
      const end = endDate ?? yesterday();
      for (const [wStart, wEnd] of weekRanges(startDate, end)) {
        const r = await syncDateRange(wStart, wEnd, dryRun);
        results.push({ startDate: wStart, endDate: wEnd, ...r });
      }
    }

    return Response.json({ ok: true, mode, dryRun, results });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, error: errMsg(err) }, { status: 500 });
  }
});
