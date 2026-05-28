import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ACUITY_USER_ID = Deno.env.get("ACUITY_USER_ID") ?? "";
const ACUITY_API_KEY = Deno.env.get("ACUITY_API_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}
if (!ACUITY_USER_ID || !ACUITY_API_KEY) {
  throw new Error("Missing ACUITY_USER_ID or ACUITY_API_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type RequestBody = {
  mode?: "daily" | "backfill" | "single_day" | "labels_only";
  startDate?: string;
  endDate?: string;
  date?: string;
  dryRun?: boolean;
};

type AcuityLabel = {
  id: number;
  name: string;
  color: string;
};

type AcuityAppointment = Record<string, unknown>;

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return JSON.stringify(err);
}

function getAuthHeader(): string {
  return `Basic ${btoa(`${ACUITY_USER_ID}:${ACUITY_API_KEY}`)}`;
}

async function acuityFetch(endpoint: string): Promise<unknown> {
  const res = await fetch(`https://acuityscheduling.com/api/v1${endpoint}`, {
    method: "GET",
    headers: { Authorization: getAuthHeader() },
  });
  if (!res.ok) {
    throw new Error(`Acuity API ${res.status}: ${endpoint}`);
  }
  return res.json();
}

// Non-fatal — logs errors but never throws so a label schema mismatch
// doesn't block appointment pulls.
async function syncLabels(
  dryRun: boolean
): Promise<{ synced: number; newLabels: number; labelErrors: string[] }> {
  const labelErrors: string[] = [];

  let raw: unknown;
  try {
    raw = await acuityFetch("/labels");
  } catch (err) {
    return { synced: 0, newLabels: 0, labelErrors: [errMsg(err)] };
  }

  if (!Array.isArray(raw)) return { synced: 0, newLabels: 0, labelErrors: ["Unexpected /labels response"] };
  const labels = raw as AcuityLabel[];

  if (!dryRun) {
    const { error: upsertErr } = await supabase
      .from("acuity_labels")
      .upsert(
        labels.map((l) => ({ id: l.id, name: l.name, color: l.color ?? null })),
        { onConflict: "id" }
      );
    if (upsertErr) {
      console.error("acuity_labels upsert:", upsertErr.message);
      labelErrors.push(`acuity_labels: ${upsertErr.message}`);
    }

    const { data: existingMappings, error: mapErr } = await supabase
      .from("acuity_label_bucket_map")
      .select("label");

    if (mapErr) {
      console.error("acuity_label_bucket_map select:", mapErr.message);
      labelErrors.push(`bucket_map select: ${mapErr.message}`);
    } else {
      const mapped = new Set(
        (existingMappings ?? []).map((r: { label: string }) => r.label)
      );
      const unmapped = labels.filter((l) => !mapped.has(l.name));
      if (unmapped.length > 0) {
        const { error: insertErr } = await supabase
          .from("acuity_label_bucket_map")
          .insert(unmapped.map((l) => ({ label: l.name, reporting_bucket: null })));
        if (insertErr) {
          console.error("acuity_label_bucket_map insert:", insertErr.message);
          labelErrors.push(`bucket_map insert: ${insertErr.message}`);
        } else {
          return { synced: labels.length, newLabels: unmapped.length, labelErrors };
        }
      }
    }
  }

  return { synced: labels.length, newLabels: 0, labelErrors };
}

async function fetchApptPage(
  startDate: string,
  endDate: string,
  canceled: boolean
): Promise<AcuityAppointment[]> {
  const PAGE_SIZE = 500;
  let offset = 0;
  const results: AcuityAppointment[] = [];
  const extra = canceled ? "&canceled=true" : "";

  while (true) {
    const page = await acuityFetch(
      `/appointments?minDate=${startDate}&maxDate=${endDate}&max=${PAGE_SIZE}&offset=${offset}&direction=ASC${extra}`
    );
    if (!Array.isArray(page) || page.length === 0) break;
    results.push(...(page as AcuityAppointment[]));
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return results;
}

async function pullDateRange(
  startDate: string,
  endDate: string,
  dryRun: boolean
): Promise<{ apptCount: number; upserted: number }> {
  // Fetch active AND cancelled appointments — Acuity excludes cancelled by default,
  // so labels applied to rescheduled/cancelled appointments would otherwise be lost.
  const [active, cancelled] = await Promise.all([
    fetchApptPage(startDate, endDate, false),
    fetchApptPage(startDate, endDate, true),
  ]);

  // Merge, deduplicating by id. Active record wins on conflict.
  const apptMap = new Map<unknown, AcuityAppointment>();
  for (const a of cancelled) apptMap.set(a.id, a);
  for (const a of active) apptMap.set(a.id, a);
  const allAppts = Array.from(apptMap.values());

  if (dryRun || allAppts.length === 0) {
    return { apptCount: allAppts.length, upserted: 0 };
  }

  const rows = allAppts.map((a) => ({
    id: a.id,
    acuity_calendar_id: a.calendarID,
    acuity_appointment_type_id: a.typeID ?? a.appointmentTypeID,
    appointment_type: a.type,
    calendar: a.calendar,
    first_name: a.firstName,
    last_name: a.lastName,
    email: a.email,
    phone: a.phone,
    datetime: a.datetime,
    end_time: a.endTime,
    duration: a.duration ? Number(a.duration) : null,
    timezone: a.timezone ?? a.calendarTimezone,
    labels: a.labels ?? [],
    notes: a.notes ?? null,
    paid: a.paid ?? null,
    price: a.price ? Number(a.price) : null,
  }));

  const CHUNK = 200;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase
      .from("acuity_appointments")
      .upsert(rows.slice(i, i + CHUNK), { onConflict: "id" });
    if (error) throw new Error(`appointments upsert: ${error.message}`);
    upserted += Math.min(CHUNK, rows.length - i);
  }

  return { apptCount: allAppts.length, upserted };
}

function weekRanges(startDate: string, endDate: string): Array<[string, string]> {
  const ranges: Array<[string, string]> = [];
  let cursor = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T23:59:59Z");

  while (cursor <= end) {
    const weekEnd = new Date(cursor);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    if (weekEnd > end) weekEnd.setTime(end.getTime());
    ranges.push([
      cursor.toISOString().split("T")[0],
      weekEnd.toISOString().split("T")[0],
    ]);
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
    const { mode = "daily", startDate, endDate, date, dryRun = false } = body;

    const labelResult = await syncLabels(dryRun);
    const results = [];

    if (mode === "labels_only") {
      const raw = await acuityFetch("/labels");
      return Response.json({ ok: true, mode, rawLabels: raw });
    } else if (mode === "daily") {
      // Re-sync from the 1st of the current month so label changes applied to
      // older appointments (common — team often labels days or weeks later) are captured.
      const day = yesterday();
      const [yr, mo] = day.split("-");
      const monthStart = `${yr}-${mo}-01`;
      for (const [wStart, wEnd] of weekRanges(monthStart, day)) {
        const r = await pullDateRange(wStart, wEnd, dryRun);
        results.push({ startDate: wStart, endDate: wEnd, ...r });
      }
    } else if (mode === "single_day") {
      if (!date) throw new Error("date required for single_day mode");
      const r = await pullDateRange(date, date, dryRun);
      results.push({ date, ...r });
    } else if (mode === "backfill") {
      if (!startDate) throw new Error("startDate required for backfill mode");
      const end = endDate ?? yesterday();
      for (const [wStart, wEnd] of weekRanges(startDate, end)) {
        const r = await pullDateRange(wStart, wEnd, dryRun);
        results.push({ startDate: wStart, endDate: wEnd, ...r });
      }
    }

    return Response.json({ ok: true, mode, dryRun, labels: labelResult, results });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, error: errMsg(err) }, { status: 500 });
  }
});
