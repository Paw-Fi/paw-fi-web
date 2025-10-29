// Supabase Edge Function: expenses-summary
// Aggregates expenses for chart-ready breakdowns by category and currency.
// Now renders a REAL PNG chart via QuickChart (Chart.js) and uploads it to Storage.
// - For GPT callers: returns ONLY a Markdown image so the chat renders the chart.
// - For non-GPT callers: returns JSON payload with `data.chartImageUrl`.

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { detectGptRequest, ensureGuestIdentity } from "../shared/gpt-guests.ts";
import { validateCurrency } from "../shared/currency-validator.ts";
import { ALLOWED_CATEGORIES, resolveCategoryColor } from "../shared/category-colors.ts";
import { getDaysInMonth } from "../shared/date-utils.ts";

// ---------- Types ----------
interface RequestBody {
  userId?: string;
  startDate?: string;
  endDate?: string;
  currency?: string;
  maxRows?: number;
}

interface ExpenseRecord {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  category: string | null;
  date: string;
}

// ---------- Constants ----------
const MAX_ROWS_DEFAULT = 5000;
const MAX_ROWS_HARD_LIMIT = 20000;

const USE_MOCK_CHART = false; // TODO: set to false when ready to serve live summaries

// ---------- Utils ----------
function normalizeDateInput(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

function normalizeCategory(raw: string | null): string {
  if (!raw) return "other";
  const normalized = raw.trim().toLowerCase();
  return ALLOWED_CATEGORIES.has(normalized) ? normalized : "other";
}

function centsToMajor(cents: number): number {
  return Math.round(cents) / 100;
}

function encodeBase64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function errorResponse(message: string, status = 400, details?: unknown): Response {
  return new Response(
    JSON.stringify({ error: message, details }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// ---------- QuickChart rendering ----------
async function renderChartPNG(chartConfig: unknown, opts?: {
  width?: number;
  height?: number;
  backgroundColor?: string;
  version?: string;        // Chart.js version
  format?: "png" | "webp";
  devicePixelRatio?: number;
}): Promise<Uint8Array> {
  const payload = {
    chart: chartConfig,
    width: opts?.width ?? 720,
    height: opts?.height ?? 480,
    backgroundColor: opts?.backgroundColor ?? "white",
    format: opts?.format ?? "png",
    version: opts?.version ?? "4.4.0",
    devicePixelRatio: opts?.devicePixelRatio ?? 2,
  };

  const res = await fetch("https://quickchart.io/chart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`QuickChart error ${res.status}: ${text}`);
  }

  const ab = await res.arrayBuffer();
  return new Uint8Array(ab);
}

// ---------- Supabase Storage ----------
async function uploadPngToBucket(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  key: string,
  bytes: Uint8Array,
): Promise<string | null> {
  const { error } = await supabase.storage.from(bucket).upload(key, bytes, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) {
    console.error("[expenses-summary] upload error:", error);
    return null;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  return data?.publicUrl ?? null;
}

// ---------- Chart config from breakdown (Chart.js) ----------
function buildDoughnutConfigFromBreakdown(breakdown: {
  currency: string;
  totals: Array<{ category: string; amountMajor: number }>;
}) {
  const labels = breakdown.totals.map((t) => {
    const friendly = t.category.replace(/[_]+/g, " ");
    return friendly.split(" ").map((word) => {
      if (!word) return "";
      return word.slice(0, 1).toUpperCase() + word.slice(1);
    }).join(" ");
  });
  const values = breakdown.totals.map((t) => t.amountMajor);
  const colors = breakdown.totals.map((t) => resolveCategoryColor(t.category));

  const chartConfig = {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: "#FFFFFF",
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#111827" },
        },
        title: {
          display: true,
          text: `Spending Breakdown (${breakdown.currency})`,
          color: "#111827",
          font: { size: 18 },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const v = ctx.parsed;
              const total = values.reduce((a, b) => a + b, 0);
              const pct = total ? ((v / total) * 100).toFixed(1) : "0.0";
              return `${ctx.label}: ${v.toFixed(2)} (${pct}%)`;
            },
          },
        },
        datalabels: {
          color: "#FFFFFF",
          font: {
            weight: "bold",
          },
          formatter: (value: number) => (value > 0 ? value.toFixed(1) : ""),
        },
      },
      cutout: "65%",
      layout: { padding: 16 },
      animation: false,
    },
  };

  return chartConfig;
}

type BreakdownEntry = {
  currency: string;
  totalAmountMajor: number;
  totals: Array<{ category: string; amountMajor: number; share: number }>;
};

interface RespondWithChartOptions {
  breakdown: BreakdownEntry[];
  detection: ReturnType<typeof detectGptRequest>;
  supabase: ReturnType<typeof createClient>;
  chartBucket: string;
  resolvedUserId: string;
  conversationId: string | null;
  identityMeta: Record<string, unknown>;
  startDateIso: string;
  endDateIso: string;
  currencyFilter: string | null;
  sampleSize: number;
  mocked: boolean;
}

async function respondWithChart({
  breakdown,
  detection,
  supabase,
  chartBucket,
  resolvedUserId,
  conversationId,
  identityMeta,
  startDateIso,
  endDateIso,
  currencyFilter,
  sampleSize,
  mocked,
}: RespondWithChartOptions): Promise<Response> {
  const startDate = new Date(startDateIso);
  const endDate = new Date(endDateIso);
  const windowDays = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1,
  );

  const meaningfulEntry = breakdown.find((entry) =>
    entry.totals.some((t) => t.amountMajor > 0)
  ) ?? breakdown[0];

  let chartImageUrl: string | null = null;

  if (meaningfulEntry && meaningfulEntry.totals.length > 0) {
    const chartConfig = buildDoughnutConfigFromBreakdown({
      currency: meaningfulEntry.currency,
      totals: meaningfulEntry.totals.map((t) => ({
        category: t.category,
        amountMajor: t.amountMajor,
      })),
    });

    const pngBytes = await renderChartPNG(chartConfig, {
      width: 720,
      height: 480,
      backgroundColor: "white",
      version: "4.4.0",
      format: "png",
      devicePixelRatio: 2,
    });

    const key = `${mocked ? "mock" : "summary"}/${resolvedUserId || conversationId || crypto.randomUUID()}-${Date.now()}.png`;
    chartImageUrl =
      (await uploadPngToBucket(supabase, chartBucket, key, pngBytes)) ??
      `data:image/png;base64,${encodeBase64(pngBytes)}`;
  }

  if (detection.isGpt) {
    const markdown = chartImageUrl
      ? `![Spending breakdown](${chartImageUrl})`
      : "No expenses found for the requested period.";
    return new Response(markdown, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const filters = {
    currency: currencyFilter,
  };

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        breakdown,
        totalsByCurrency: breakdown.map((entry) => ({
          currency: entry.currency,
          amountMajor: entry.totalAmountMajor,
        })),
        timeWindow: { startDate: startDateIso, endDate: endDateIso },
        filters,
        sampleSize,
        chartImageUrl,
      },
      resolvedUserId,
      meta: {
        ...identityMeta,
        windowDays,
        mocked,
        chartImageUrl,
      },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// ---------- Server ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: RequestBody = await req.json();

    const detection = detectGptRequest(req);
    const conversationId = detection.conversationId ?? null;

    const suppliedUserId = body.userId?.trim() || null;
    const userId = suppliedUserId && /^[0-9a-f-]{36}$/i.test(suppliedUserId)
      ? suppliedUserId
      : null;

    if (suppliedUserId && !userId) {
      return new Response(JSON.stringify({ error: "Invalid userId format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currencyFilter = body.currency ? validateCurrency(body.currency) : null;

    const maxRowsInput = body.maxRows ?? MAX_ROWS_DEFAULT;
    const maxRows = Math.min(Math.max(1, maxRowsInput), MAX_ROWS_HARD_LIMIT);

    let endDate: Date;
    if (body.endDate) {
      const parsedEnd = new Date(body.endDate);
      if (Number.isNaN(parsedEnd.getTime())) {
        return errorResponse("Invalid endDate");
      }
      endDate = parsedEnd;
    } else {
      if (detection.isGpt) {
        return errorResponse("'endDate' is required for GPT calls");
      }
      endDate = new Date();
    }

    const daysInCurrentMonth = getDaysInMonth(endDate);
    const maxWindowDays = daysInCurrentMonth;
    const defaultStart = new Date(endDate);
    defaultStart.setUTCDate(1);

    let startDate = normalizeDateInput(body.startDate, defaultStart);

    if (startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    const windowMs = endDate.getTime() - startDate.getTime();
    if (windowMs > maxWindowDays * 86400000) {
      startDate = new Date(endDate.getTime() - (maxWindowDays - 1) * 86400000);
    }

    const startDateIso = startDate.toISOString().slice(0, 10);
    const endDateIso = endDate.toISOString().slice(0, 10);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { "X-Client-Info": "moneko-expenses-summary" } },
    });

    let resolvedUserId = userId;
    const identityMeta: Record<string, unknown> = {};

    if (!resolvedUserId && detection.isGpt) {
      if (!conversationId) {
        return new Response(
          JSON.stringify({ error: "Unable to resolve identity from GPT headers." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      try {
        const identity = await ensureGuestIdentity({
          supabase,
          conversationId,
          currency: currencyFilter,
        });
        resolvedUserId = identity.userId;
        identityMeta.conversationId = conversationId;
        if (detection.ephemeralUserId) identityMeta.ephemeralUserId = detection.ephemeralUserId;
        identityMeta.guest = {
          contactId: identity.contactId,
          createdUser: identity.createdUser,
          createdContact: identity.createdContact,
        };
      } catch (identityError) {
        console.error("[expenses-summary] Guest identity error:", identityError);
        return new Response(
          JSON.stringify({ error: "Failed to prepare GPT guest user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (!resolvedUserId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[expenses-summary] Summary request", {
      userId: resolvedUserId,
      startDateIso,
      endDateIso,
      currencyFilter,
      maxRows,
    });

    const chartBucket = "GPT-charts";
    const finalUserId = resolvedUserId;

    if (USE_MOCK_CHART) {
      const breakdown: BreakdownEntry[] = [
        {
          currency: "USD",
          totalAmountMajor: 156.12,
          totals: [
            { category: "food", amountMajor: 82.4, share: 0.528 },
            { category: "transport", amountMajor: 31.3, share: 0.2003 },
            { category: "groceries", amountMajor: 28.5, share: 0.1825 },
            { category: "entertainment", amountMajor: 13.92, share: 0.0892 },
          ],
        },
      ];

      return await respondWithChart({
        breakdown,
        detection,
        supabase,
        chartBucket,
        resolvedUserId: finalUserId,
        conversationId,
        identityMeta,
        startDateIso,
        endDateIso,
        currencyFilter,
        sampleSize: 128,
        mocked: true,
      });
    }

    // ---------- Real aggregation path (disabled while USE_MOCK_CHART === true) ----------
    const expenseMap = new Map<string, ExpenseRecord>();

    let qb = supabase
      .from("expenses")
      .select("id, user_id, amount_cents, currency, category, date")
      .eq("user_id", finalUserId)
      .gte("date", startDateIso)
      .lte("date", endDateIso);

    if (currencyFilter) qb = qb.eq("currency", currencyFilter);

    const { data, error } = await qb.order("date", { ascending: false }).limit(maxRows);

    if (error) {
      throw new Error(`[expenses-summary] Failed to fetch expenses: ${error.message}`);
    }

    for (const record of data as ExpenseRecord[]) {
      expenseMap.set(record.id, record);
    }

    const expenses = Array.from(expenseMap.values());

    const totalsByCurrency = new Map<string, number>();
    const categoryMapByCurrency = new Map<string, Map<string, number>>();

    for (const exp of expenses) {
      const currency = validateCurrency(exp.currency || "USD");
      const category = normalizeCategory(exp.category);
      totalsByCurrency.set(
        currency,
        (totalsByCurrency.get(currency) ?? 0) + exp.amount_cents,
      );

      const categoryMap = categoryMapByCurrency.get(currency) ?? new Map<string, number>();
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + exp.amount_cents);
      categoryMapByCurrency.set(currency, categoryMap);
    }

    if (categoryMapByCurrency.size === 0) {
      return await respondWithChart({
        breakdown: [],
        detection,
        supabase,
        chartBucket,
        resolvedUserId: finalUserId,
        conversationId,
        identityMeta,
        startDateIso,
        endDateIso,
        currencyFilter,
        sampleSize: 0,
        mocked: false,
      });
    }

    const breakdown: BreakdownEntry[] = Array.from(categoryMapByCurrency.entries())
      .map(([currency, map]) => {
        const totalCents = totalsByCurrency.get(currency) ?? 0;
        const totals = Array.from(map.entries())
          .map(([category, cents]) => ({
            category,
            amountMajor: centsToMajor(cents),
            share: totalCents ? cents / totalCents : 0,
          }))
          .sort((a, b) => b.amountMajor - a.amountMajor);

        return {
          currency,
          totalAmountMajor: centsToMajor(totalCents),
          totals,
        };
      })
      .sort((a, b) => b.totalAmountMajor - a.totalAmountMajor);

    return await respondWithChart({
      breakdown,
      detection,
      supabase,
      chartBucket,
      resolvedUserId: finalUserId,
      conversationId,
      identityMeta,
      startDateIso,
      endDateIso,
      currencyFilter,
      sampleSize: expenses.length,
      mocked: false,
    });
  } catch (error) {
    console.error("[expenses-summary] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to compute expense summary",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
