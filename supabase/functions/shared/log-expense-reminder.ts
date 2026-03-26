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
    const isAt = labelType === "source";
    return isAt 
      ? `You recently spent ${amountText} at ${trimmedLabel}.`
      : `You recently spent ${amountText} on ${trimmedLabel}.`;
  }

  if (trimmedLabel) {
    const isAt = labelType === "source";
    return isAt
      ? `You recently added a purchase at ${trimmedLabel}.`
      : `You recently added a purchase for ${trimmedLabel}.`;
  }

  return `You recently logged an expense for ${amountText}.`;
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
   "🧾 Quick check-in",
    "📝 Add an expense?",
    "💸 A quick budget check",
    "📌 One small update",
    "🌿 Friendly reminder",
    "✨ Keep things up to date",
    "🔔 Just a reminder",
    "📒 Quick budget update",
    "🧭 Stay on top of things",
    "🪙 Log a purchase?",
    "☕ While it's still fresh...",
    "💡 A quick money check-in",
  ];

  const titlesLong = [
    "🧾 Just checking in",
    "🧘 A gentle nudge",
    "📌 Whenever you're ready",
    "🌙 Pick it back up anytime",
    "🧭 Ready to get back into it?",
    "✨ A fresh start is okay",
    "🤝 Ease back in",
    "📒 Time for a quick catch-up",
    "🔮 Start again anytime",
    "🧩 A few expenses to add?",
    "🕊️ No rush",
  ];

  const dailySet = [
    "Got a moment? Add today's spending to keep things up to date.",
    "It only takes a minute to add a recent expense.",
    "A quick update now makes your budget easier to follow.",
    "Add today's spending while it's still fresh.",
    "Just a quick check-in. Want to add an expense?",
    "A small update now can save you catching up later.",
    "Before the day ends, add any spending you remember.",
    "Keep things current with one quick expense.",
    "Made a purchase today? Add it in.",
    "One quick note can keep your budget clear.",
    "Fast and easy: add an expense and you're done.",
    "Even small purchases count. Add one if you haven't yet.",
    "Buy anything today? Take a second to add it.",
    "Got a second? Add a quick expense.",
    "A little reminder to record any recent spending.",
    "One quick entry is all it takes.",
    "Short and simple: add an expense and you're set.",
    "Want to keep things clear? Add a recent expense.",
    "A quick update now makes tomorrow easier.",
    "Keep it simple. Just add one recent purchase.",
    "Your budget is ready whenever you want to update it.",
    "Just one recent expense is enough for today.",
    "A quick tap now helps keep everything current.",
    "Add an expense now so you don't have to remember it later.",
  ];

  const longSet = [
    "No rush. Adding a recent expense can help you ease back in.",
    "A small update today can make budgeting feel easier.",
    "Whenever you're ready, you can pick things back up here.",
    "One small step is enough. Want to add a recent purchase?",
    "You don't have to catch up all at once. One expense is enough for today.",
    "Missing a few days is okay. You can start again with one entry.",
    "A quick update can help you get a clearer picture of your spending.",
    "If catching up feels like a lot, start with just one expense.",
    "Getting back into it can be as simple as logging one purchase.",
    "You don't need to do everything today. One quick entry is a good start.",
    "Don't remember everything? That's okay. Just add what you can.",
    "A gentle reset can start with one expense.",
    "Even one small update is progress.",
    "You can get back into the habit in just a few seconds.",
    "It doesn't have to be exact. A rough amount is okay too.",
    "Just checking in. A quick log today can help you get back on track.",
    "Been away for a bit? Start with the easiest purchase to remember.",
    "A calm restart is better than trying to do it all at once.",
    "You can restart anytime. One quick entry is enough.",
    "Busy day? Just log one purchase and leave the rest for later.",
    "Little by little works too. One expense today is a solid step.",
    "Need an easy place to start? Add your most recent expense.",
    "No need to fix everything. Just add something recent.",
    "A small step now can make the next one easier.",
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
