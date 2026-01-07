// Supabase Edge Function: expense-daily-nudges
// Sends at-most-once-per-local-day encouragement to log an expense.
// Runs hourly via pg_cron and triggers only around a target local hour.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";

interface ContactRow {
  user_id: string;
  preferred_timezone: string | null;
  created_at?: string;
}

function fmtLocalDate(tz: string | null | undefined, date = new Date()) {
  const timezone = (tz || "UTC").trim();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const map = new Map(parts.map((p) => [p.type, p.value]));
    return `${map.get("year")}-${map.get("month")}-${map.get("day")}`;
  } catch {
    return new Date(date.getTime()).toISOString().slice(0, 10);
  }
}

function getLocalHour(tz: string | null | undefined, date = new Date()) {
  const timezone = (tz || "UTC").trim();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const map = new Map(parts.map((p) => [p.type, p.value]));
    return parseInt((map.get("hour") || "00") as string, 10);
  } catch {
    return date.getUTCHours();
  }
}

function getLocalDayOfMonth(tz: string | null | undefined, date = new Date()) {
  const timezone = (tz || "UTC").trim();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      day: "2-digit",
    }).formatToParts(date);
    const map = new Map(parts.map((p) => [p.type, p.value]));
    return parseInt((map.get("day") || "01") as string, 10);
  } catch {
    return date.getUTCDate();
  }
}

function getLocalHM(tz: string | null | undefined, date = new Date()) {
  const timezone = (tz || "UTC").trim();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const map = new Map(parts.map((p) => [p.type, p.value]));
    const hour = parseInt((map.get("hour") || "00") as string, 10);
    const minute = parseInt((map.get("minute") || "00") as string, 10);
    return { hour, minute };
  } catch {
    return { hour: date.getUTCHours(), minute: date.getUTCMinutes() };
  }
}

function strHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function inQuiet(hour: number, quietStart: number, quietEnd: number) {
  if (quietStart === quietEnd) return false;
  if (quietStart < quietEnd) {
    return hour >= quietStart && hour < quietEnd;
  }
  return hour >= quietStart || hour < quietEnd;
}

function computeTargetHour(userId: string, tz: string, date: Date, allowed: number[], quietStart: number, quietEnd: number) {
  const localDate = fmtLocalDate(tz, date);
  const baseIdx = strHash(`${userId}:${localDate}`) % Math.max(1, allowed.length);
  let idx = baseIdx;
  for (let i = 0; i < allowed.length; i++) {
    const hour = allowed[idx % allowed.length];
    if (!inQuiet(hour, quietStart, quietEnd)) return hour;
    idx++;
  }
  return allowed[baseIdx];
}

function findNearestAllowedHour(target: number, allowed: number[]) {
  if (!allowed.length) return target;
  let best = allowed[0];
  let bestDist = Math.abs(best - target);
  for (const h of allowed) {
    const d = Math.abs(h - target);
    if (d < bestDist) {
      best = h;
      bestDist = d;
    }
  }
  return best;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "moneko-expense-daily-nudges" } },
  });

  let body: any = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {}

  const now = new Date();
  const allowedHours: number[] = Array.isArray(body.allowedHours)
    ? (body.allowedHours as any[])
        .map((x) => Number(x))
        .filter((h) => Number.isFinite(h) && h >= 0 && h <= 23)
    : [9,10,11,12,13,14,15,16,17,18,19,20];
  const quietStart = Number.isFinite(Number(body.quietStart)) ? Number(body.quietStart) : 22;
  const quietEnd = Number.isFinite(Number(body.quietEnd)) ? Number(body.quietEnd) : 8;
  const minHoursBetween = Number(body.minHoursBetween ?? 24);
  const slotMins = Math.min(60, Math.max(1, Number(body.slotMins ?? 60))); // 60 = top-of-hour, set 15/30 if cron supports
  const slotCount = Math.max(1, Math.floor(60 / slotMins));

  // Fetch latest contact per user (to get timezone)
  const { data: contactRows, error: contactErr } = await supabase
    .from("user_contacts")
    .select("user_id, preferred_timezone, created_at")
    .not("user_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (contactErr) {
    console.error("[expense-daily-nudges] user_contacts select error", contactErr);
    return new Response(JSON.stringify({ error: "Failed to load contacts" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Deduplicate by user_id, keep most recent
  const latestByUser = new Map<string, ContactRow>();
  for (const row of (contactRows || []) as ContactRow[]) {
    if (!row.user_id) continue;
    if (!latestByUser.has(row.user_id)) latestByUser.set(row.user_id, row);
  }

  const last24hIso = new Date(now.getTime() - minHoursBetween * 60 * 60 * 1000).toISOString();
  let toInsert: any[] = [];
  let scanned = 0;
  let skippedHour = 0;
  let skippedRecentExpense = 0;
  let skippedRecentReminder = 0;
  let cadenceSkipped = 0;

  for (const [userId, contact] of latestByUser.entries()) {
    scanned++;
    const tz = contact.preferred_timezone || "UTC";
    const { hour: localHour, minute: localMinute } = getLocalHM(tz, now);

    // Skip if a reminder was sent in last 24h
    const { data: recentReminder, error: recentReminderErr } = await supabase
      .from("notification_events")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("event_type", "log_expense_reminder")
      .gte("created_at", last24hIso)
      .limit(1);
    if (recentReminderErr) {
      console.warn("[expense-daily-nudges] reminder recent query error", recentReminderErr);
    }
    if (recentReminder && recentReminder.length) {
      skippedRecentReminder++;
      continue;
    }

    // Determine inactivityDays based on last expense created_at
    const { data: lastExpenseRow, error: lastExpenseErr } = await supabase
      .from("expenses")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastExpenseErr) {
      console.warn("[expense-daily-nudges] last expense query error", lastExpenseErr);
    }

    let inactivityDays = 9999;
    let recentWithin24h = false;
    let anchorHour: number | null = null;
    let anchorSlot: number = 0;
    if (lastExpenseRow?.created_at) {
      const lastTs = new Date(lastExpenseRow.created_at).getTime();
      inactivityDays = Math.max(1, Math.floor((now.getTime() - lastTs) / (1000 * 60 * 60 * 24)));
      recentWithin24h = (now.getTime() - lastTs) < (minHoursBetween * 60 * 60 * 1000);
      // derive local hour/min from last expense
      const lastHM = getLocalHM(tz, new Date(lastExpenseRow.created_at));
      anchorHour = findNearestAllowedHour(lastHM.hour, allowedHours);
      const baseSlot = Math.floor(lastHM.minute / slotMins);
      const jitterSlots = strHash(`${userId}:${fmtLocalDate(tz, now)}:slot`) % slotCount;
      anchorSlot = (baseSlot + jitterSlots) % slotCount;
    }

    if (recentWithin24h) {
      skippedRecentExpense++;
      continue;
    }

    // Determine today's target hour and slot
    let targetHour = anchorHour ?? computeTargetHour(userId, tz, now, allowedHours, quietStart, quietEnd);
    // roll forward if target falls in quiet hours
    if (inQuiet(targetHour, quietStart, quietEnd)) {
      const startIdx = allowedHours.indexOf(targetHour);
      for (let i = 1; i <= allowedHours.length; i++) {
        const h = allowedHours[(startIdx + i) % allowedHours.length];
        if (!inQuiet(h, quietStart, quietEnd)) { targetHour = h; break; }
      }
    }
    const localSlot = Math.floor(localMinute / slotMins);
    const targetSlot = anchorHour != null ? anchorSlot : (strHash(`${userId}:${fmtLocalDate(tz, now)}:slot`) % slotCount);
    if (localHour !== targetHour || localSlot !== targetSlot) {
      skippedHour++;
      continue;
    }

    // Cadence: <=3 days daily; <=14 days every 3rd day; >14 weekly
    let shouldSend = false;
    if (!lastExpenseRow) {
      // Never logged: gentle weekly cadence (use day-of-month pivot)
      const dom = getLocalDayOfMonth(tz, now);
      shouldSend = dom % 7 === 0; // roughly weekly, varies by user/date
    } else if (inactivityDays <= 3) {
      shouldSend = true;
    } else if (inactivityDays <= 14) {
      shouldSend = inactivityDays % 3 === 0;
    } else {
      shouldSend = inactivityDays % 7 === 0;
    }

    if (!shouldSend) {
      cadenceSkipped++;
      continue;
    }

    const localDate = fmtLocalDate(tz, now);
    const variant = inactivityDays % 6; // choose one of 6 variants in push builder

    toInsert.push({
      user_id: userId,
      event_type: "log_expense_reminder",
      payload: {
        user_id: userId,
        local_date: localDate,
        timezone: tz,
        inactivity_days: inactivityDays,
        variant,
      },
    });
  }

  let inserted = 0;
  if (toInsert.length) {
    const { data: insertedRows, error: insertErr } = await supabase
      .from("notification_events")
      .insert(toInsert)
      .select("id");
    if (insertErr) {
      console.error("[expense-daily-nudges] insert error", insertErr);
    } else {
      inserted = insertedRows?.length || 0;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      scanned,
      inserted,
      skipped: { hour: skippedHour, recentExpense: skippedRecentExpense, recentReminder: skippedRecentReminder, cadence: cadenceSkipped },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
