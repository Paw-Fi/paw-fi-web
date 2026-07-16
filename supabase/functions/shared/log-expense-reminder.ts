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

  const todayKey = String(
    payload.local_date ?? payload.day_key ?? getLocalDateKey(),
  );

  const titlesDaily = [
    "Anything to add?",
    "A quick money check-in",
    "Remember a recent purchase?",
    "Keep your spending in view",
    "One quick expense update",
  ];

  const titlesLong = [
    "Ready for a quick update?",
    "Anything recent to add?",
    "See where your money stands",
    "Pick up where you left off",
    "Start with your latest expense",
  ];

  const dailySet = [
    "Log a recent purchase while it’s still fresh.",
    "Got an expense in mind? Add it in just a few taps.",
    "Add any recent spending to keep your overview current.",
    "A quick expense update helps you see where your money is going.",
    "Remember something you bought recently? Log it now.",
    "Take a moment to add your latest expense.",
    "Add a recent purchase and keep your spending easy to follow.",
    "One quick entry can keep your budget up to date.",
  ];

  const longSet = [
    "Start with your latest expense and update the rest whenever you’re ready.",
    "Add a recent purchase to get a clearer view of your spending.",
    "Remember any recent spending? Start with just one expense.",
    "Pick up where you left off by logging your latest purchase.",
    "A quick expense update can help you see where your money stands.",
    "Add your most recent expense now and come back to the rest later.",
    "Log any recent spending you remember—one entry is a good start.",
    "Start with the easiest purchase to remember.",
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

  const baseBody = poolBody[bodyIndex];
  const body = baseBody;

  const data: Record<string, string> = {
    deep_link: "moneko://expenses/log",
    inactivity_days: String(inactivityDays),
    day_key: todayKey,
    chosen_body_index: String(bodyIndex),
    chosen_title_index: String(titleIndex),
  };

  if (payload.last_amount_cents != null)
    data.last_amount_cents = String(payload.last_amount_cents);
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
