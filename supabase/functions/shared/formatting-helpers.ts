import {
  CATEGORY_COLOR_MAP,
  normalizeCategoryForStorage,
  resolveCategoryColor,
} from "./category-colors.ts";
import { getCurrencySymbol } from "./currency-symbols.ts";

export function debugLog(enabled: boolean, note: string, data?: unknown) {
  if (!enabled) return;
  if (data !== undefined) {
    console.log(`[whatsapp-ai-bot][debug] ${note}`, data);
  } else {
    console.log(`[whatsapp-ai-bot][debug] ${note}`);
  }
}

export function formatInvokeError(err: unknown): string {
  if (!err) return "unknown error";
  try {
    const e = err as Record<string, any>;
    const parts: string[] = [];
    if (e.name) parts.push(`name=${e.name}`);
    if (e.message) parts.push(`message=${e.message}`);
    if (e.context) {
      const ctx = e.context as Record<string, any>;
      const ctxParts: string[] = [];
      if (ctx.status) ctxParts.push(`status=${ctx.status}`);
      if (ctx.body) ctxParts.push(`body=${JSON.stringify(ctx.body)}`);
      if (ctx.response) {
        const resp = ctx.response as Record<string, any>;
        if (resp.status) ctxParts.push(`respStatus=${resp.status}`);
        if (resp.statusText) ctxParts.push(`respStatusText=${resp.statusText}`);
      }
      if (ctxParts.length > 0) parts.push(`context(${ctxParts.join(",")})`);
    }
    if (parts.length === 0) return JSON.stringify(err);
    return parts.join(" | ");
  } catch {
    return String(err);
  }
}

export function asCurrencySymbol(iso?: string | null): string {
  if (!iso) return "";
  return getCurrencySymbol(iso) || iso;
}

export function formatAmount(amount: number, currency: string): string {
  const sym = asCurrencySymbol(currency);
  return `${sym}${amount.toFixed(2)}`;
}

export function sanitizeText(str?: string | null): string {
  if (!str) return "";
  return str.replace(/\*/g, "").trim();
}

export type NormalizedExpense = {
  id?: string;
  date?: string;
  category?: string | null;
  description?: string | null;
  amountMajor: number;
  currency: string;
  currency_symbol: string;
  formatted_amount: string;
};

export function normalizeExpensesForTool(
  raw: any[] | undefined,
  defaultCurrency: string,
): NormalizedExpense[] {
  if (!raw) return [];
  return raw.map((e) => {
    const currency = e.currency || defaultCurrency;
    const amountMajor =
      e.amountMajor ??
      (typeof e.amount_cents === "number"
        ? e.amount_cents / 100
        : Number(e.amount) || 0);
    const currencySymbol = asCurrencySymbol(currency);
    return {
      id: e.id,
      date: e.date,
      category: e.category,
      description: e.description ?? e.raw_text ?? null,
      amountMajor,
      currency,
      currency_symbol: currencySymbol,
      formatted_amount: formatAmount(amountMajor, currency),
    };
  });
}

export function buildCategoryChart(expenses: NormalizedExpense[]) {
  if (!expenses.length) return undefined;
  const totals = new Map<string, number>();
  expenses.forEach((e) => {
    const cat = (e.category || "uncategorized").toString().toLowerCase();
    totals.set(cat, (totals.get(cat) || 0) + (e.amountMajor || 0));
  });
  const labels = Array.from(totals.keys());
  const data = Array.from(totals.values());
  if (!data.some((v) => v > 0)) return undefined;
  const chartConfig = {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
          ],
        },
      ],
    },
    options: {
      plugins: {
        title: { display: true, text: "Spending by Category" },
        legend: { position: "bottom" },
      },
    },
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
}

export function formatExpensesSummary(
  expenses: NormalizedExpense[],
  includeChartNote: boolean,
  opts?: { limit?: number; startDate?: string; endDate?: string },
): string {
  if (!expenses.length) return "I couldn't find any expenses for that range.";
  const lines: string[] = [];
  const limit = opts?.limit || expenses.length;
  const header =
    opts?.startDate || opts?.endDate
      ? `Here are transactions${opts?.startDate ? ` from ${opts.startDate}` : ""}${opts?.endDate ? ` to ${opts.endDate}` : ""}:`
      : `Here are your ${Math.min(expenses.length, limit)} most recent transactions:`;
  lines.push(header);

  let total = 0;
  expenses.slice(0, limit).forEach((e, idx) => {
    const cat = sanitizeText(e.category || "other");
    const amount = e.amountMajor ?? 0;
    total += amount;
    const amountText = e.formatted_amount;
    const date = e.date ? ` (${e.date})` : "";
    const note = sanitizeText(e.description || "");
    const notePart = note ? ` - ${note}` : "";
    lines.push(`${idx + 1}. *${cat}*: ${amountText}${date}${notePart}`);
  });

  const currency = expenses[0]?.currency || "";
  lines.push(
    "",
    `Total shown (${Math.min(expenses.length, limit)} items): ${formatAmount(total, currency)}`,
  );
  if (includeChartNote) {
    lines.push("Chart attached. 🔍");
  }
  lines.push(
    "Need a monthly total, budget, or recurring setup? I can help! 🎯",
  );
  return lines.join("\n");
}

export function buildCategoryGuide(categories?: string[] | null): string {
  const source = Array.isArray(categories)
    ? categories
    : Object.keys(CATEGORY_COLOR_MAP);

  const set = new Set<string>();
  for (const entry of source) {
    const raw = typeof entry === "string" ? entry : null;
    const normalized = normalizeCategoryForGuide(raw);
    if (!normalized) continue;
    set.add(normalized);
  }

  return Array.from(set)
    .sort()
    .map((name) => `${name} (${resolveCategoryColor(name)})`)
    .join("; ");
}

function normalizeCategoryForGuide(raw: string | null): string {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const firstArg = args[0];
    const firstText = typeof firstArg === "string" ? firstArg : "";
    if (firstText.includes("[normalizeCategory] Unknown category")) {
      return;
    }
    originalWarn(...args);
  };

  try {
    return normalizeCategoryForStorage(raw);
  } finally {
    console.warn = originalWarn;
  }
}

export const CATEGORY_GUIDE = buildCategoryGuide();
