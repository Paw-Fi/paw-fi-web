import { formatMoney } from "./currency-symbols.ts";

interface PickIndexOptions {
  recipientKey: string;
  dayKey: string;
  namespace: string;
  poolLength: number;
  forcedVariant: number | null;
}

function fnv1a32(str: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

function pickDeterministicIndex(opts: PickIndexOptions) {
  const { recipientKey, dayKey, namespace, poolLength, forcedVariant } = opts;
  if (poolLength <= 0) return 0;

  if (forcedVariant !== null && Number.isFinite(forcedVariant)) {
    return forcedVariant % poolLength;
  }

  const seedStr = `${recipientKey}|${dayKey}|${namespace}`;
  const h = fnv1a32(seedStr);
  return h % poolLength;
}

function getLocalDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function truncateLabel(value: string, maxLength = 36) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
}

function buildExpenseContext(payload: Record<string, any>) {
  const amountCents = Number(payload.last_amount_cents);
  const hasAmount = Number.isFinite(amountCents) && amountCents > 0;
  const currency = payload.last_currency as string | undefined;
  const source = payload.last_source as string | undefined;
  const category = payload.last_category as string | undefined;
  const rawText = payload.last_raw_text as string | undefined;

  let label = "";
  let labelType: "source" | "category" | "raw" | null = null;
  if (source) {
    label = source;
    labelType = "source";
  } else if (category) {
    label = category;
    labelType = "category";
  } else if (rawText) {
    label = rawText;
    labelType = "raw";
  }

  const trimmedLabel = label ? truncateLabel(label) : "";
  const amountText = hasAmount ? formatMoney(amountCents, currency) : "";

  if (!trimmedLabel && !amountText) return "";

  if (trimmedLabel && amountText) {
    const connector = labelType === "source" ? "at" : "for";
    return `Last time: ${amountText} ${connector} ${trimmedLabel}.`;
  }

  if (trimmedLabel) {
    const connector = labelType === "source" ? "at" : "for";
    return `Last time: ${connector} ${trimmedLabel}.`;
  }

  return `Last time: ${amountText}.`;
}

export function buildLogExpenseReminderMessage(payload: Record<string, any>) {
  const inactivityDays = Number(payload.inactivity_days ?? 0);

  const recipientKey = String(
    payload.user_id ?? payload.device_id ?? payload.installation_id ?? "anon",
  );

  const forcedVariantRaw = payload.variant;
  const forcedVariant =
    forcedVariantRaw === undefined || forcedVariantRaw === null
      ? null
      : Math.abs(Number(forcedVariantRaw));

  const todayKey = String(payload.local_date ?? payload.day_key ?? getLocalDateKey());

  const titlesDaily = [
    "🧾 Quick money check-in",
    "📝 Tiny expense note?",
    "💸 Keep your tracker warm",
    "📌 One-minute catch-up",
    "🌿 Gentle budget nudge",
    "🧠 Future-you will approve",
    "✨ Small step, big clarity",
    "🔔 Friendly reminder",
    "📒 Keep it simple today",
    "🧭 Stay on course",
    "🪙 Pocket log time",
    "☕ While it’s fresh…",
  ];

  const titlesLong = [
    "🧾 A calm check-in",
    "🧘 No pressure — just a nudge",
    "📌 Whenever you’re ready",
    "🌙 Picking it back up is progress",
    "🧭 Let’s get your overview back",
    "✨ A small restart",
    "🪴 Tiny habit, steady clarity",
    "🤝 We can ease back in",
    "📒 Your budget misses you",
    "🧠 Future-you says thanks",
    "🧩 Reconnect the dots",
    "🕊️ Gentle catch-up",
  ];

  const dailySet = [
    "Have you logged an expense today? A quick note keeps you on track.",
    "1 minute is all it takes — want to log today’s spending?",
    "Small habits, big wins — ready to add an expense?",
    "Capture today’s expense while it’s fresh — you’ll thank yourself later.",
    "Quick check-in: add one expense and your overview stays accurate.",
    "A tiny update now beats a big catch-up later — log one expense?",
    "Before the day slips away: jot down any spending you remember.",
    "Keeping it lightweight: just log one expense to stay in rhythm.",
    "Got any small purchases today? Pop one in and you’re done.",
    "A quick note = clearer totals. Want to log an expense now?",
    "Fast and painless: add one expense and close the loop for today.",
    "Even a coffee counts — record one item and you’re back in sync.",
    "If you bought anything today, tap once and keep your tracker tidy.",
    "Micro-moment: log one expense and keep your progress rolling.",
    "Tiny nudge: record a purchase so your numbers stay honest.",
    "Just one entry today keeps the streak alive — want to log it?",
    "Short and sweet: add an expense and you’re good for the day.",
    "Budget clarity in 60 seconds — log one expense?",
    "A small update now saves future confusion — add today’s expense.",
    "Keep it simple: pick one purchase and record it.",
    "Your tracker is ready when you are — add one expense?",
    "This is the “easy mode” reminder: log one thing, done.",
    "A quick tap today keeps your trends accurate.",
    "One expense logged = less mental load later.",
  ];

  const longSet = [
    "No rush — when you’re ready, logging one helps your overview.",
    "A tiny habit today can make next month easier.",
    "Pick it up when it feels right — your progress is waiting.",
    "One small step to get back on track, whenever you’re ready.",
    "You don’t have to catch up all at once — logging one is enough for today.",
    "It’s okay to fall off the routine. A single entry is a great restart.",
    "Your budget isn’t judging you — it just wants one little update.",
    "If it feels like a lot, start tiny: one expense, that’s it.",
    "Momentum comes back fast — log one expense and you’re moving again.",
    "No perfection needed. One quick entry gets you closer to clarity.",
    "Even if you don’t remember everything, one recent purchase is a great start.",
    "A gentle reset: log one expense and let the rest wait.",
    "Future-you will love having any data — one entry is already a win.",
    "You can rebuild the habit in seconds. Want to log one expense now?",
    "No pressure to be exact — approximate is better than missing.",
    "Just checking in: one small log today can make the overview feel “alive” again.",
    "If it’s been a while, start with the easiest thing you remember.",
    "A calm restart beats a perfect plan — add one expense when ready.",
    "You’re allowed to restart as many times as you want. One entry is enough.",
    "If you’re busy, keep it minimal: log one purchase and move on.",
    "Little by little is the whole game — one expense today is progress.",
    "A quick anchor point helps: log your most recent expense.",
    "No need to fix the past — just add something from today.",
    "One tiny step now makes the next step easier.",
  ];

  const poolBody = inactivityDays > 14 ? longSet : dailySet;
  const poolTitle = inactivityDays > 14 ? titlesLong : titlesDaily;

  const bodyIndex = pickDeterministicIndex({
    recipientKey,
    dayKey: todayKey,
    namespace: `log_expense_reminder:${inactivityDays > 14 ? "long" : "daily"}:body`,
    poolLength: poolBody.length,
    forcedVariant,
  });

  const titleIndex = pickDeterministicIndex({
    recipientKey,
    dayKey: todayKey,
    namespace: `log_expense_reminder:${inactivityDays > 14 ? "long" : "daily"}:title`,
    poolLength: poolTitle.length,
    forcedVariant: forcedVariant === null ? null : forcedVariant + 101,
  });

  const contextLine = buildExpenseContext(payload);
  const baseBody = poolBody[bodyIndex];
  const body = contextLine ? `${baseBody} ${contextLine}` : baseBody;

  const data: Record<string, string> = {
    deep_link: "moneko://expenses/log",
    inactivity_days: String(inactivityDays),
    day_key: todayKey,
    chosen_body_index: String(bodyIndex),
    chosen_title_index: String(titleIndex),
  };

  if (payload.last_amount_cents != null) data.last_amount_cents = String(payload.last_amount_cents);
  if (payload.last_currency) data.last_currency = String(payload.last_currency);
  if (payload.last_category) data.last_category = String(payload.last_category);
  if (payload.last_source) data.last_source = String(payload.last_source);
  if (payload.last_raw_text) data.last_raw_text = String(payload.last_raw_text);

  return {
    title: poolTitle[titleIndex],
    body,
    data,
  };
}
