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

interface LastExpenseRow {
  user_id: string;
  last_created_at: string | null;
  last_amount_cents: number | null;
  last_currency: string | null;
  last_category: string | null;
  last_source: string | null;
  last_raw_text: string | null;
}

interface ReminderStats {
  count: number;
  last_at: string;
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

function computeTargetHour(
  userId: string,
  tz: string,
  date: Date,
  allowed: number[],
  quietStart: number,
  quietEnd: number,
) {
  const localDate = fmtLocalDate(tz, date);
  const baseIdx =
    strHash(`${userId}:${localDate}`) % Math.max(1, allowed.length);
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
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { headers: { "X-Client-Info": "moneko-expense-daily-nudges" } },
  });

  // Best-effort single-runner guard to avoid overlapping cron invocations.
  // If the lock functions are missing (during rollout), we continue without the guard.
  const advisoryLockKey = 6020900001;
  let lockHeld = false;
  try {
    const { data: acquired, error: lockErr } = await supabase.rpc(
      "try_advisory_lock",
      { p_key: advisoryLockKey },
    );
    if (lockErr) {
      console.warn(
        "[expense-daily-nudges] advisory lock error (continuing)",
        lockErr,
      );
    } else if (acquired === false) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "already_running" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } else {
      lockHeld = true;
    }
  } catch (e) {
    console.warn("[expense-daily-nudges] advisory lock threw (continuing)", e);
  }

  try {
    let body: any = {};
    try {
      body = await req.json().catch(() => ({}));
    } catch {}

    const now = new Date();
    const allowedHours: number[] = Array.isArray(body.allowedHours)
      ? (body.allowedHours as any[])
          .map((x) => Number(x))
          .filter((h) => Number.isFinite(h) && h >= 0 && h <= 23)
      : [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const quietStart = Number.isFinite(Number(body.quietStart))
      ? Number(body.quietStart)
      : 22;
    const quietEnd = Number.isFinite(Number(body.quietEnd))
      ? Number(body.quietEnd)
      : 8;
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
      console.error(
        "[expense-daily-nudges] user_contacts select error",
        contactErr,
      );
      return new Response(
        JSON.stringify({ error: "Failed to load contacts" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Deduplicate by user_id, keep most recent
    const latestByUser = new Map<string, ContactRow>();
    for (const row of (contactRows || []) as ContactRow[]) {
      if (!row.user_id) continue;
      if (!latestByUser.has(row.user_id)) latestByUser.set(row.user_id, row);
    }

    const last24hIso = new Date(
      now.getTime() - minHoursBetween * 60 * 60 * 1000,
    ).toISOString();
    const userIds = Array.from(latestByUser.keys());
    const recentReminderUsers = new Set<string>();
    const lastExpenseByUser = new Map<string, LastExpenseRow>();
    const reminderStatsByUser = new Map<string, ReminderStats>();
    const statsLookbackDays = 30;
    const softPauseAfter = 4;
    const softPauseDays = 7;
    const statsSinceIso = new Date(
      now.getTime() - statsLookbackDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    const chunkSize = 500;
    let recentReminderGuardFailed = false;

    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize);

      const { data: reminderRows, error: reminderErr } = await supabase
        .from("notification_events")
        .select("user_id")
        .eq("event_type", "log_expense_reminder")
        .gte("created_at", last24hIso)
        .in("user_id", chunk);

      if (reminderErr) {
        // If this guard is incomplete, we can create duplicates on the next cron tick.
        // Fail the run so the next invocation can retry with complete data.
        console.error(
          "[expense-daily-nudges] recent reminder batch error",
          reminderErr,
        );
        recentReminderGuardFailed = true;
        break;
      }

      (reminderRows || []).forEach((row: { user_id: string | null }) => {
        if (row?.user_id) recentReminderUsers.add(row.user_id);
      });

      const { data: lastExpenseRows, error: lastExpenseErr } =
        await supabase.rpc("get_last_expense_per_user", { p_user_ids: chunk });

      if (lastExpenseErr) {
        console.warn(
          "[expense-daily-nudges] last expense batch error",
          lastExpenseErr,
        );
      }

      (lastExpenseRows || []).forEach((row: LastExpenseRow) => {
        if (row?.user_id) {
          lastExpenseByUser.set(row.user_id, row);
        }
      });

      const { data: reminderStatsRows, error: reminderStatsErr } =
        await supabase
          .from("notification_events")
          .select("user_id, created_at")
          .eq("event_type", "log_expense_reminder")
          .gte("created_at", statsSinceIso)
          .in("user_id", chunk);

      if (reminderStatsErr) {
        console.warn(
          "[expense-daily-nudges] reminder stats batch error",
          reminderStatsErr,
        );
      }

      (reminderStatsRows || []).forEach(
        (row: { user_id: string | null; created_at: string | null }) => {
          if (!row?.user_id || !row?.created_at) return;
          const existing = reminderStatsByUser.get(row.user_id) || {
            count: 0,
            last_at: row.created_at,
          };
          existing.count += 1;
          if (!existing.last_at || row.created_at > existing.last_at) {
            existing.last_at = row.created_at;
          }
          reminderStatsByUser.set(row.user_id, existing);
        },
      );
    }

    if (recentReminderGuardFailed) {
      return new Response(
        JSON.stringify({
          error:
            "Failed to load recent reminders; aborting to avoid duplicates",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let toInsert: any[] = [];
    let scanned = 0;
    let skippedHour = 0;
    let skippedRecentExpense = 0;
    let skippedRecentReminder = 0;
    let cadenceSkipped = 0;
    let softPauseSkipped = 0;

    for (const [userId, contact] of latestByUser.entries()) {
      scanned++;
      const tz = contact.preferred_timezone || "UTC";
      const { hour: localHour, minute: localMinute } = getLocalHM(tz, now);

      // Skip if a reminder was sent in last 24h
      if (recentReminderUsers.has(userId)) {
        skippedRecentReminder++;
        continue;
      }

      let inactivityDays = 9999;
      let recentWithin24h = false;
      let anchorHour: number | null = null;
      let anchorSlot: number = 0;
      const lastExpense = lastExpenseByUser.get(userId);
      const lastExpenseAt = lastExpense?.last_created_at || null;
      if (lastExpenseAt) {
        const lastTs = new Date(lastExpenseAt).getTime();
        inactivityDays = Math.max(
          1,
          Math.floor((now.getTime() - lastTs) / (1000 * 60 * 60 * 24)),
        );
        recentWithin24h =
          now.getTime() - lastTs < minHoursBetween * 60 * 60 * 1000;
        // derive local hour/min from last expense
        const lastHM = getLocalHM(tz, new Date(lastExpenseAt));
        anchorHour = findNearestAllowedHour(lastHM.hour, allowedHours);
        const baseSlot = Math.floor(lastHM.minute / slotMins);
        const jitterSlots =
          strHash(`${userId}:${fmtLocalDate(tz, now)}:slot`) % slotCount;
        anchorSlot = (baseSlot + jitterSlots) % slotCount;
      }

      if (recentWithin24h) {
        skippedRecentExpense++;
        continue;
      }

      const reminderStats = reminderStatsByUser.get(userId);
      if (
        reminderStats &&
        reminderStats.count >= softPauseAfter &&
        reminderStats.last_at
      ) {
        const lastReminderTs = new Date(reminderStats.last_at).getTime();
        const lastExpenseTs = lastExpenseAt
          ? new Date(lastExpenseAt).getTime()
          : null;
        const hasPostReminderExpense =
          lastExpenseTs !== null && lastExpenseTs > lastReminderTs;
        if (!hasPostReminderExpense) {
          const daysSinceLastReminder =
            (now.getTime() - lastReminderTs) / (1000 * 60 * 60 * 24);
          if (daysSinceLastReminder < softPauseDays) {
            softPauseSkipped++;
            continue;
          }
        }
      }

      // Determine today's target hour and slot
      let targetHour =
        anchorHour ??
        computeTargetHour(userId, tz, now, allowedHours, quietStart, quietEnd);
      // roll forward if target falls in quiet hours
      if (inQuiet(targetHour, quietStart, quietEnd)) {
        const startIdx = allowedHours.indexOf(targetHour);
        for (let i = 1; i <= allowedHours.length; i++) {
          const h = allowedHours[(startIdx + i) % allowedHours.length];
          if (!inQuiet(h, quietStart, quietEnd)) {
            targetHour = h;
            break;
          }
        }
      }
      const localSlot = Math.floor(localMinute / slotMins);
      const targetSlot =
        anchorHour != null
          ? anchorSlot
          : strHash(`${userId}:${fmtLocalDate(tz, now)}:slot`) % slotCount;
      // Accept target slot OR the next slot to create a 30-min effective window
      const slotMatch =
        localSlot === targetSlot || localSlot === (targetSlot + 1) % slotCount;
      if (localHour !== targetHour || !slotMatch) {
        skippedHour++;
        continue;
      }

      // Cadence: <=3 days daily; 4-14 days every 2nd day; >14 every 3rd day; never-logged every 3rd day
      let shouldSend = false;
      if (!lastExpenseAt) {
        // Never logged: every 3rd day (use day-of-month pivot)
        const dom = getLocalDayOfMonth(tz, now);
        shouldSend = dom % 3 === 0;
      } else if (inactivityDays <= 3) {
        shouldSend = true;
      } else if (inactivityDays <= 14) {
        shouldSend = inactivityDays % 2 === 0;
      } else {
        shouldSend = inactivityDays % 3 === 0;
      }

      if (!shouldSend) {
        cadenceSkipped++;
        continue;
      }

      const localDate = fmtLocalDate(tz, now);
      const payload: Record<string, any> = {
        user_id: userId,
        local_date: localDate,
        timezone: tz,
        inactivity_days: inactivityDays,
        quiet_start: quietStart,
        quiet_end: quietEnd,
      };

      if (lastExpense?.last_amount_cents != null)
        payload.last_amount_cents = lastExpense.last_amount_cents;
      if (lastExpense?.last_currency)
        payload.last_currency = lastExpense.last_currency;
      if (lastExpense?.last_category)
        payload.last_category = lastExpense.last_category;
      if (lastExpense?.last_source)
        payload.last_source = lastExpense.last_source;
      if (lastExpense?.last_raw_text)
        payload.last_raw_text = lastExpense.last_raw_text;

      toInsert.push({
        user_id: userId,
        event_type: "log_expense_reminder",
        // DB-backed idempotency key: at most one per user/event_type/local_date
        local_date: localDate,
        payload,
      });
    }

    let inserted = 0;
    if (toInsert.length) {
      const { data: insertedRows, error: insertErr } = await supabase
        .from("notification_events")
        .upsert(toInsert, {
          onConflict: "user_id,event_type,local_date",
          ignoreDuplicates: true,
        })
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
        skipped: {
          hour: skippedHour,
          recentExpense: skippedRecentExpense,
          recentReminder: skippedRecentReminder,
          cadence: cadenceSkipped,
          softPause: softPauseSkipped,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } finally {
    if (lockHeld) {
      try {
        await supabase.rpc("advisory_unlock", { p_key: advisoryLockKey });
      } catch (e) {
        console.warn("[expense-daily-nudges] advisory unlock threw", e);
      }
    }
  }
});
