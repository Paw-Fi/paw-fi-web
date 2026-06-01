// Supabase Edge Function: analyze-expense
// Analyzes text or image to extract transaction data (expense or income) WITHOUT saving to database
// Used by clients to extract structured transactions before logging
// Supports SSE streaming for real-time progress updates (opt-in via ?stream=true query param)

import { corsHeaders } from "../shared/cors.ts";
import {
  AnalyzeRequestBody,
  ProgressCallback,
  ProgressEvent,
  runAnalyzeExpense,
} from "../shared/analyze-core.ts";
import { reportVertexAiFailure } from "../shared/report-vertex-ai-failure.ts";
import {
  type CategoryContext,
  resolveCategory,
} from "../shared/category-resolution.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  fetchUserCategoryPreferences,
  fetchUserCategoryRemaps,
  fetchUserCustomCategories,
  fetchUserHiddenCategories,
  mergeAllowedCategories,
  normalizeStoredUserCategory,
  UserCategoryPreferenceRow,
  UserCategoryRemapRow,
} from "../shared/user-categories.ts";
import { loadLatestUserPreferredCurrency } from "../shared/user-preferred-currency.ts";

const CATEGORY_CACHE_TTL_MS = 2 * 60 * 1000;
const PREFERENCE_CACHE_TTL_MS = 60 * 1000;

const allowedCategoriesCache = new Map<
  string,
  {
    expenseCategories: string[];
    incomeCategories: string[];
    expiresAt: number;
  }
>();

const categoryPreferencesCache = new Map<
  string,
  {
    preferences: UserCategoryPreferenceRow[];
    expiresAt: number;
  }
>();

const categoryRemapsCache = new Map<
  string,
  {
    remaps: UserCategoryRemapRow[];
    expiresAt: number;
  }
>();

const ANALYZE_PRIMARY_MODEL_NAME = "gemini-3.1-flash-lite";
const ANALYZE_FALLBACK_MODEL_NAME = "gemini-2.5-flash";

/**
 * Formats an SSE event message
 */
function formatSSEEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function resolveProgressMessage(
  event: ProgressEvent,
  body: AnalyzeRequestBody,
): string {
  if (typeof event.message === "string" && event.message.trim().length > 0) {
    return event.message;
  }

  if (body.image) {
    switch (event.type) {
      case "started":
        return "Reading receipt image...";
      case "processing_vision":
        return "Analyzing receipt details...";
      default:
        return "Analyzing receipt...";
    }
  }

  switch (event.type) {
    case "started":
      return "Starting analysis...";
    case "extracting_text":
      return "Extracting text...";
    case "analyzing_chunk":
      return "Analyzing transactions...";
    case "processing_vision":
      return "Analyzing scanned document...";
    case "complete":
      return "Finalizing results...";
    default:
      return "Processing...";
  }
}

function mapProgressEvent(
  event: ProgressEvent,
  body: AnalyzeRequestBody,
): Record<string, unknown> {
  return {
    stage: event.type,
    message: resolveProgressMessage(event, body),
    currentItem: event.current,
    totalItems: event.total,
  };
}

function shouldCollapseReceipt(body: AnalyzeRequestBody): boolean {
  const hasImage = Boolean(body.image);
  const hasAttachments =
    Array.isArray(body.attachments) && body.attachments.length > 0;
  return hasImage && !hasAttachments;
}

function formatBreakdownAmount(item: any): string {
  const amount = Number(item?.amount);
  if (!Number.isFinite(amount)) return "";
  const formatted = amount.toFixed(2);
  const symbol =
    typeof item?.currencySymbol === "string" &&
    item.currencySymbol.trim().length > 0
      ? item.currencySymbol.trim()
      : "";
  const currency =
    typeof item?.currency === "string" && item.currency.trim().length > 0
      ? item.currency.trim()
      : "";
  if (symbol) return `${symbol}${formatted}`;
  if (currency) return `${formatted} ${currency}`;
  return formatted;
}

function buildReceiptBreakdown(items: any[]): string[] {
  return items
    .map((item) => {
      const desc =
        typeof item?.description === "string" ? item.description.trim() : "";
      const amountText = formatBreakdownAmount(item);
      if (!amountText && !desc) return "";
      if (!amountText) return desc;
      if (!desc) return `Item ${amountText}`;
      return `${desc} ${amountText}`;
    })
    .filter((line) => line.length > 0);
}

function pickReceiptDescription(items: any[]): string {
  const candidates = items
    .map((item) =>
      typeof item?.description === "string" ? item.description.trim() : "",
    )
    .filter((value) => value.length > 0);
  if (candidates.length === 0) return "Receipt";

  const withoutDigits = candidates.filter((value) => !/\d/.test(value));
  const ranked = withoutDigits.length > 0 ? withoutDigits : candidates;
  let best = ranked[0];
  for (let i = 1; i < ranked.length; i++) {
    const current = ranked[i];
    const bestWords = best.split(/\s+/).length;
    const currentWords = current.split(/\s+/).length;
    if (
      currentWords < bestWords ||
      (currentWords === bestWords && current.length < best.length)
    ) {
      best = current;
    }
  }
  return best;
}

function isTotalLike(description: unknown): boolean {
  if (typeof description !== "string") return false;
  return /(sub\s*total|subtotal|grand\s*total|total)/i.test(description);
}

/**
 * Identifies receipt-style output from OCR/LLM parsing.
 *
 * Why this exists:
 * - We only want to merge multiple parsed rows into one transaction for
 *   "single receipt" scenarios.
 * - Bank/payment app screenshots often contain many independent transactions,
 *   and those must remain separate rows for downstream logging.
 *
 * Current signal:
 * - Presence of explicit receipt summary rows like total/subtotal.
 *
 * If you expand this heuristic in the future, keep it conservative.
 * A false positive here will collapse legitimate multi-transaction lists.
 */
function hasExplicitReceiptSignals(items: any[]): boolean {
  return items.some((item) => isTotalLike(item?.description));
}

function resolveReceiptCategory(items: any[]): string | undefined {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (typeof item?.category !== "string") continue;
    const trimmed = item.category.trim();
    if (!trimmed) continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [category, count] of counts.entries()) {
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  }
  return best;
}

function collapseReceiptItems(
  items: any[] | undefined,
  body: AnalyzeRequestBody,
): any[] | undefined {
  if (!Array.isArray(items) || items.length <= 1) return items;

  // Collapse is only considered for plain image uploads (no attachments).
  // Text/audio/files should keep the parser's original granularity.
  if (!shouldCollapseReceipt(body)) return items;

  // Critical safety guard:
  // Do NOT collapse image results unless we have explicit receipt evidence.
  // This prevents regressions where bank/app history screenshots get merged
  // into a single expense instead of returning one item per transaction row.
  if (!hasExplicitReceiptSignals(items)) return items;

  const filteredItems =
    items.length > 1
      ? items.filter((item) => !isTotalLike(item?.description))
      : items;
  const workingItems = filteredItems.length > 0 ? filteredItems : items;

  const totalAmount = workingItems.reduce((sum, item) => {
    const amount = Number(item?.amount);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return items;

  const primary = workingItems[0] ?? {};
  const resolvedCurrencies = new Set(
    workingItems
      .map((item) =>
        typeof item?.currency === "string"
          ? item.currency.trim().toUpperCase()
          : "",
      )
      .filter((currency) => currency.length > 0),
  );
  if (resolvedCurrencies.size > 1) return items;

  const breakdown = buildReceiptBreakdown(workingItems);
  const category =
    resolveReceiptCategory(workingItems) || primary.category || "other";
  const description = pickReceiptDescription(workingItems);
  const merchant =
    typeof primary?.merchant === "string" && primary.merchant.trim().length > 0
      ? primary.merchant.trim()
      : undefined;
  const type = workingItems.some((item) => item?.type === "expense")
    ? "expense"
    : "income";
  const splitSource = workingItems.find(
    (item) => item?.payerUserId || item?.customSplits,
  );

  return [
    {
      type,
      amount: Number(totalAmount.toFixed(2)),
      category,
      currency:
        resolvedCurrencies.values().next().value || body.currency || "USD",
      currencySymbol: primary.currencySymbol || "$",
      date: primary.date || body.date || new Date().toISOString().split("T")[0],
      description,
      ...(merchant ? { merchant } : {}),
      breakdown,
      ...(splitSource?.payerUserId
        ? { payerUserId: splitSource.payerUserId }
        : {}),
      ...(splitSource?.customSplits
        ? { customSplits: splitSource.customSplits }
        : {}),
    },
  ];
}

function resolveErrorCode(status: number): string {
  if (status === 401 || status === 403) return "UNAUTHORIZED";
  if (status === 404) return "NOT_FOUND";
  if (status === 503) return "AI_TEMPORARILY_UNAVAILABLE";
  if (status >= 500) return "SERVER_ERROR";
  return "VALIDATION_ERROR";
}

function errorResponse(message: string, status = 400, code?: string): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      code: code ?? resolveErrorCode(status),
      status,
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

function statusForErrorCode(code?: string): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "NOT_FOUND":
      return 404;
    case "AI_TEMPORARILY_UNAVAILABLE":
      return 503;
    case "SERVER_ERROR":
      return 500;
    default:
      return 400;
  }
}

function resolveAnalyzeResultCode(result: AnalyzeRequestBody | any): string {
  if (typeof result?.code === "string" && result.code.trim().length > 0) {
    return result.code.trim().toUpperCase();
  }
  return resolveErrorCode(result?.status ?? 400);
}

function getElapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}

function logStage(stage: string, startedAt: number) {
  console.log(
    `[analyze-expense][timing] stage=${stage} elapsed_ms=${getElapsedMs(
      startedAt,
    )}`,
  );
}

async function awaitWithHardTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

async function getAllowedCategoriesCached(params: {
  supabase: any;
  userId: string;
}): Promise<{ expenseCategories: string[]; incomeCategories: string[] }> {
  const now = Date.now();
  const cached = allowedCategoriesCache.get(params.userId);
  if (cached && cached.expiresAt > now) {
    return {
      expenseCategories: [...cached.expenseCategories],
      incomeCategories: [...cached.incomeCategories],
    };
  }

  const [customCategories, hiddenCategories] = await Promise.all([
    fetchUserCustomCategories({
      supabase: params.supabase,
      userId: params.userId,
    }),
    fetchUserHiddenCategories({
      supabase: params.supabase,
      userId: params.userId,
    }),
  ]);
  const merged = mergeAllowedCategories({
    customCategories,
    hiddenCategories,
  });

  allowedCategoriesCache.set(params.userId, {
    expenseCategories: merged.expenseCategories,
    incomeCategories: merged.incomeCategories,
    expiresAt: now + CATEGORY_CACHE_TTL_MS,
  });

  return {
    expenseCategories: [...merged.expenseCategories],
    incomeCategories: [...merged.incomeCategories],
  };
}

async function getCategoryPreferencesCached(params: {
  supabase: any;
  userId: string;
}): Promise<UserCategoryPreferenceRow[]> {
  const now = Date.now();
  const cached = categoryPreferencesCache.get(params.userId);
  if (cached && cached.expiresAt > now) {
    return [...cached.preferences];
  }

  const preferences = await fetchUserCategoryPreferences({
    supabase: params.supabase,
    userId: params.userId,
    limit: 60,
  });

  categoryPreferencesCache.set(params.userId, {
    preferences,
    expiresAt: now + PREFERENCE_CACHE_TTL_MS,
  });

  return [...preferences];
}

async function getCategoryRemapsCached(params: {
  supabase: any;
  userId: string;
}): Promise<UserCategoryRemapRow[]> {
  const now = Date.now();
  const cached = categoryRemapsCache.get(params.userId);
  if (cached && cached.expiresAt > now) {
    return [...cached.remaps];
  }

  const remaps = await fetchUserCategoryRemaps({
    supabase: params.supabase,
    userId: params.userId,
    limit: 80,
  });

  categoryRemapsCache.set(params.userId, {
    remaps,
    expiresAt: now + PREFERENCE_CACHE_TTL_MS,
  });

  return [...remaps];
}

function applyFinalUserCategoryMapping(params: {
  items: any[];
  allowedExpenseCategories: string[];
  allowedIncomeCategories: string[];
  preferences: UserCategoryPreferenceRow[];
  remaps: UserCategoryRemapRow[];
}): any[] {
  if (!Array.isArray(params.items) || params.items.length === 0) {
    return params.items;
  }

  const ctx: CategoryContext = {
    allowedExpenseSet: new Set(
      params.allowedExpenseCategories.map((c) =>
        normalizeStoredUserCategory(c),
      ),
    ),
    allowedIncomeSet: new Set(
      params.allowedIncomeCategories.map((c) => normalizeStoredUserCategory(c)),
    ),
    preferences: params.preferences,
    remaps: params.remaps,
  };

  const sourceItems = params.items.map((item) => ({ ...item }));
  return sourceItems.map((item) => {
    const transactionType = item?.type === "income" ? "income" : "expense";
    const category = resolveCategory({
      initialGuess:
        typeof item?.category === "string" && item.category.trim().length > 0
          ? item.category
          : "other",
      description:
        typeof item?.description === "string" ? item.description : null,
      transactionType,
      ctx,
    });

    return {
      ...item,
      category,
      categoryReasonCodes: Array.from(
        new Set([
          ...(Array.isArray(item?.categoryReasonCodes)
            ? item.categoryReasonCodes.map((code: unknown) => String(code))
            : []),
          "final_user_category_mapping",
        ]),
      ),
    };
  });
}

/**
 * Creates a readable stream that sends SSE events during analysis
 */
function createSSEStream(
  body: AnalyzeRequestBody,
  geminiApiKey: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Create progress callback that sends SSE events
        const onProgress: ProgressCallback = (event: ProgressEvent) => {
          const payload = mapProgressEvent(event, body);
          const sseMessage = formatSSEEvent("progress", payload);
          controller.enqueue(encoder.encode(sseMessage));
        };

        // Run analysis with progress callback and a hard timeout.
        const result = await awaitWithHardTimeout(
          runAnalyzeExpense(body, geminiApiKey, onProgress),
          180000,
          "Analysis timed out after 180 seconds",
        );

        // Send final result as complete event
        if (result.success) {
          const finalItems = Array.isArray(result.items)
            ? applyFinalUserCategoryMapping({
                items: result.items,
                allowedExpenseCategories: body.allowedExpenseCategories ?? [],
                allowedIncomeCategories: body.allowedIncomeCategories ?? [],
                preferences: body.categoryPreferences ?? [],
                remaps: body.categoryRemaps ?? [],
              })
            : result.items;
          const collapsedItems = collapseReceiptItems(finalItems, body);
          const completeData = {
            success: true,
            data: {
              items: collapsedItems ?? finalItems,
              isAnalyzed: true,
              language: result.language,
              diagnostics: result.diagnostics,
            },
          };
          controller.enqueue(
            encoder.encode(formatSSEEvent("complete", completeData)),
          );
        } else {
          const code = resolveAnalyzeResultCode(result);
          controller.enqueue(
            encoder.encode(
              formatSSEEvent("error", {
                success: false,
                error: result.error,
                code,
                status: result.status ?? statusForErrorCode(code),
              }),
            ),
          );
        }

        controller.close();
      } catch (error) {
        await reportVertexAiFailure({
          functionName: "analyze-expense",
          error,
          phase: "streaming_analysis",
          modelName: ANALYZE_PRIMARY_MODEL_NAME,
          context: {
            fallbackModelName: ANALYZE_FALLBACK_MODEL_NAME,
            stream: true,
            hasImage: !!body.image,
            hasAudio: !!body.audio,
            hasAttachments:
              Array.isArray(body.attachments) && body.attachments.length > 0,
            hasText:
              typeof body.text === "string" && body.text.trim().length > 0,
          },
        });
        const message = error instanceof Error ? error.message : String(error);
        const code = resolveErrorCode(500);
        controller.enqueue(
          encoder.encode(
            formatSSEEvent("error", {
              success: false,
              error: message,
              code,
              status: statusForErrorCode(code),
            }),
          ),
        );
        controller.close();
      }
    },
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestStartedAt = Date.now();
    if (req.method !== "POST") {
      return errorResponse("Method not allowed. Use POST.", 405);
    }

    const url = new URL(req.url);
    const isStreamMode = url.searchParams.get("stream") === "true";

    let body: AnalyzeRequestBody;
    try {
      body = await req.json();
    } catch (_error) {
      return errorResponse("Invalid JSON body", 400);
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return errorResponse("Server configuration error", 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    // Verify the caller and enrich context safely under RLS.
    const supabaseAuthed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } =
      await supabaseAuthed.auth.getUser();
    logStage("auth_get_user", requestStartedAt);
    const callerId = userData?.user?.id;
    if (userErr || !callerId) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (body.userId && body.userId !== callerId) {
      return errorResponse("userId mismatch", 401, "UNAUTHORIZED");
    }
    body.userId = callerId;
    const preferredCurrencyReader = SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
          global: {
            headers: { "X-Client-Info": "moneko-analyze-expense" },
          },
        })
      : supabaseAuthed;
    body.currency = await loadLatestUserPreferredCurrency({
      supabase: preferredCurrencyReader,
      userId: callerId,
      fallbackCurrency: body.currency,
      onError: (error) =>
        console.warn(
          "[analyze-expense] Preferred currency lookup failed",
          error,
        ),
    });

    // Load per-user custom categories + learned preferences for category assignment
    try {
      const merged = await getAllowedCategoriesCached({
        supabase: supabaseAuthed,
        userId: callerId,
      });
      body.allowedExpenseCategories = merged.expenseCategories;
      body.allowedIncomeCategories = merged.incomeCategories;
      const [preferences, remaps] = await Promise.all([
        getCategoryPreferencesCached({
          supabase: supabaseAuthed,
          userId: callerId,
        }),
        getCategoryRemapsCached({
          supabase: supabaseAuthed,
          userId: callerId,
        }),
      ]);
      body.categoryPreferences = preferences;
      body.categoryRemaps = remaps;
      logStage("category_context_loading", requestStartedAt);
    } catch (e) {
      console.error(
        "[analyze-expense] Failed to load user categories/preferences:",
        e,
      );
    }

    if (
      !Array.isArray(body.allowedExpenseCategories) ||
      !Array.isArray(body.allowedIncomeCategories) ||
      !Array.isArray(body.categoryPreferences) ||
      !Array.isArray(body.categoryRemaps)
    ) {
      const [merged, preferences, remaps] = await Promise.all([
        getAllowedCategoriesCached({
          supabase: supabaseAuthed,
          userId: callerId,
        }),
        getCategoryPreferencesCached({
          supabase: supabaseAuthed,
          userId: callerId,
        }),
        getCategoryRemapsCached({
          supabase: supabaseAuthed,
          userId: callerId,
        }),
      ]);
      body.allowedExpenseCategories = merged.expenseCategories;
      body.allowedIncomeCategories = merged.incomeCategories;
      body.categoryPreferences = preferences;
      body.categoryRemaps = remaps;
      logStage("category_context_retry", requestStartedAt);
    }

    // In household mode, provide the household member list to the model so it can
    // reliably resolve payer/splits by userId (without exposing IDs to end users).
    if (
      body.householdId &&
      !body.isPortfolio &&
      (!Array.isArray(body.householdMembers) ||
        body.householdMembers.length === 0)
    ) {
      const { data: membership, error: membershipError } = await supabaseAuthed
        .from("household_members")
        .select("id")
        .eq("household_id", body.householdId)
        .eq("user_id", callerId)
        .maybeSingle();

      if (!membershipError && membership?.id) {
        const canAdminRead = !!SUPABASE_SERVICE_ROLE_KEY;
        const reader = canAdminRead
          ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!, {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
              },
              global: {
                headers: { "X-Client-Info": "moneko-analyze-expense" },
              },
            })
          : supabaseAuthed;

        const { data: members, error: membersError } = await reader
          .from("household_members")
          .select("user_id, users(full_name)")
          .eq("household_id", body.householdId);

        if (!membersError && Array.isArray(members) && members.length > 0) {
          body.householdMembers = members.map((m: any) => ({
            userId: m.user_id,
            userName: m.users?.full_name ?? null,
          }));
        }
        logStage("household_enrichment", requestStartedAt);
      }
    }

    if (isStreamMode) {
      console.log("[analyze-expense] Starting SSE streaming mode");

      const stream = createSSEStream(body, GEMINI_API_KEY);
      return new Response(stream, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    let result: any;
    try {
      result = await awaitWithHardTimeout(
        runAnalyzeExpense(body, GEMINI_API_KEY),
        140000,
        "Analysis timed out after 140 seconds",
      );
      logStage("analyze_core", requestStartedAt);

      if (
        result?.success &&
        Array.isArray(result?.items) &&
        result.items.length > 0
      ) {
        result.items = applyFinalUserCategoryMapping({
          items: result.items,
          allowedExpenseCategories: body.allowedExpenseCategories ?? [],
          allowedIncomeCategories: body.allowedIncomeCategories ?? [],
          preferences: body.categoryPreferences ?? [],
          remaps: body.categoryRemaps ?? [],
        });
        logStage("final_category_mapping", requestStartedAt);
      }
    } catch (error) {
      await reportVertexAiFailure({
        functionName: "analyze-expense",
        error,
        phase: "analysis_response",
        modelName: ANALYZE_PRIMARY_MODEL_NAME,
        context: {
          fallbackModelName: ANALYZE_FALLBACK_MODEL_NAME,
          stream: false,
          hasImage: !!body.image,
          hasAudio: !!body.audio,
          hasAttachments:
            Array.isArray(body.attachments) && body.attachments.length > 0,
          hasText: typeof body.text === "string" && body.text.trim().length > 0,
        },
      });
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes("timed out") ? 504 : 500;
      return errorResponse(message, status);
    }

    if (!result.success) {
      const status = result.status || 400;
      return errorResponse(
        result.error ?? "Failed to analyze expense",
        status,
        resolveAnalyzeResultCode(result),
      );
    }

    logStage("total", requestStartedAt);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          items: collapseReceiptItems(result.items, body) ?? result.items,
          isAnalyzed: true,
          language: result.language,
          diagnostics: result.diagnostics,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[analyze-expense] Error:", error);
    return errorResponse("Failed to analyze expense", 500, "SERVER_ERROR");
  }
});
