// Supabase Edge Function: analyze-expense
// Analyzes text or image to extract transaction data (expense or income) WITHOUT saving to database
// Used by clients to extract structured transactions before logging
// Supports SSE streaming for real-time progress updates (opt-in via ?stream=true query param)

import {
  type AnalysisExecutionOptions,
  runWithTimeout,
} from "../shared/async-timeout.ts";
import {
  createVertexGenerativeAI,
  getVertexAiConfigFromEnv,
} from "../shared/vertex-ai-chat.ts";
import { corsHeaders, withCors } from "../shared/cors.ts";
import type {
  AnalyzeRequestBody,
  ProgressCallback,
  ProgressEvent,
} from "../shared/analyze-core.ts";
import { normalizePreferredTimezone } from "../shared/merchant-regional-selection.ts";
import type { MerchantAnalysisContext } from "../shared/merchant-analysis.ts";
import { reportVertexAiFailure } from "../shared/report-vertex-ai-failure.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  fetchConfirmedCategoryPreferences,
  fetchUserCategoryPreferences,
  fetchUserCategoryRemaps,
  fetchUserCustomCategories,
  fetchUserHiddenCategories,
  mergeAllowedCategories,
  UserCategoryPreferenceRow,
  UserCategoryRemapRow,
} from "../shared/user-categories.ts";
import { loadLatestUserPreferredCurrency } from "../shared/user-preferred-currency.ts";
import {
  type InteractiveRequest,
  parseInteractiveRequest,
  parseInteractiveSource,
} from "../shared/interactive-transaction-contract.ts";
import { loadInteractiveTransactionContext } from "../shared/interactive-transaction-context.ts";
import {
  createInteractiveCompletion,
  enrichVerifiedInteractiveItems,
  interactiveAnalysisFailure,
  runInteractiveTransactionAnalysis,
} from "../shared/interactive-transaction-analysis.ts";
import { enrichSourceVerifiedMerchantItems } from "../shared/merchant-source-verification.ts";
import { VALID_CURRENCIES } from "../shared/currency-validator.ts";
import { resolveAiResponseLanguage } from "../shared/ai-response-language.ts";
import { formatDateInTimeZone } from "../shared/bot/date-utils.ts";

import {
  type AiCaptureDefaults,
  applyAiCaptureDefaults,
  parseAiCaptureDefaults,
} from "../shared/ai-capture-defaults.ts";

// Voice/text/image requests do not initialize PDF/OCR/spreadsheet runtimes.
async function runEnrichedTransactionAnalysis(
  params: Parameters<
    typeof import("../shared/analyzed-merchant-enrichment.ts").runEnrichedTransactionAnalysis
  >[0],
) {
  const legacy = await import("../shared/analyzed-merchant-enrichment.ts");
  return legacy.runEnrichedTransactionAnalysis(params);
}

interface InteractiveAnalyzeBody extends AnalyzeRequestBody {
  captureContext?: unknown;
  interactive?: unknown;
  accountId?: string;
}

async function interactiveAnalysisResponse(
  body: InteractiveAnalyzeBody,
  request: InteractiveRequest,
  supabaseAuthed: Parameters<
    typeof loadInteractiveTransactionContext
  >[0]["supabase"],
  merchantContext: MerchantAnalysisContext,
  defaultCurrency: string | undefined,
  stream: boolean,
  execution: AnalysisExecutionOptions & { deadlineAt: number },
): Promise<Response> {
  const streamAbort = new AbortController();
  const parentSignal = execution.signal
    ? AbortSignal.any([execution.signal, streamAbort.signal])
    : streamAbort.signal;
  let closed = false;
  const requestId = crypto.randomUUID();
  const run = async (signal: AbortSignal) => {
    const startedAt = Date.now();
    const context = await loadInteractiveTransactionContext({
      supabase: supabaseAuthed,
      userId: merchantContext.userId,
      defaultSpaceId: body.householdId || "personal",
      defaultWalletId: body.accountId || null,
      currency: defaultCurrency && VALID_CURRENCIES.includes(defaultCurrency)
        ? defaultCurrency
        : body.currency || "USD",
      date: body.date || formatDateInTimeZone(body.preferredTimezone),
      language: body.language || "en",
      preferredTimezone: body.preferredTimezone,
      expenseCategories: body.allowedExpenseCategories!,
      incomeCategories: body.allowedIncomeCategories!,
    });
    console.log("[analyze-expense][interactive]", {
      requestId,
      stage: "context",
      elapsedMs: Date.now() - startedAt,
    });
    signal.throwIfAborted();
    const source = parseInteractiveSource(body);
    const result = await runInteractiveTransactionAnalysis({
      source,
      includeMerchantVerification: true,
      complete: createInteractiveCompletion(
        source,
        createVertexGenerativeAI({
          ...getVertexAiConfigFromEnv(),
          signal,
          deadlineAt: execution.deadlineAt,
          requestTimeoutMs: 45000,
        }),
        {
          signal,
          deadlineAt: execution.deadlineAt,
          onAttempt: (diagnostic) =>
            console.log("[analyze-expense][interactive]", {
              requestId,
              source: source.audio ? "audio" : source.image ? "image" : "text",
              ...diagnostic,
            }),
        },
      ),
      request,
      context,
      categoryContext: {
        allowedExpenseSet: new Set(body.allowedExpenseCategories),
        allowedIncomeSet: new Set(body.allowedIncomeCategories),
        preferences: [],
        confirmedPreferences: body.confirmedCategoryPreferences ?? [],
        remaps: body.categoryRemaps ?? [],
      },
    });
    const { merchantVerdicts, ...publicResult } = {
      merchantVerdicts: [],
      ...result,
    };
    const merchantStartedAt = Date.now();
    const items = result.requireCorrection
      ? []
      : await enrichVerifiedInteractiveItems(
        result.items,
        (items) =>
          enrichSourceVerifiedMerchantItems({
            body,
            items,
            answers: request.answers,
            merchantContext,
            // The financial verifier already checked the original merchant source.
            // Reuse that verdict through the same evidence validator; no third model call.
            complete: async () => ({ verdicts: merchantVerdicts }),
            deadlineAt: Math.min(
              execution.deadlineAt - 1000,
              Date.now() + 3000,
            ),
            signal,
          }),
        true,
      );
    console.log("[analyze-expense][interactive]", {
      requestId,
      stage: "complete",
      elapsedMs: Date.now() - startedAt,
      merchantElapsedMs: Date.now() - merchantStartedAt,
      itemCount: items.length,
      correction: result.requireCorrection,
    });
    return {
      success: true,
      data: { ...publicResult, items, isAnalyzed: !result.requireCorrection },
    };
  };
  if (!stream) {
    try {
      return new Response(
        JSON.stringify(
          await awaitWithHardTimeout(
            run,
            execution.deadlineAt - Date.now(),
            "Analysis timed out",
            parentSignal,
          ),
        ),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("[analyze-expense] Interactive analysis failed:", error);
      const failure = interactiveAnalysisFailure(error);
      return errorResponse(failure.error, failure.status, failure.code);
    }
  }
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              formatSSEEvent("progress", {
                stage: "started",
                message: "Checking transaction details...",
              }),
            ),
          );
          const result = await awaitWithHardTimeout(
            run,
            execution.deadlineAt - Date.now(),
            "Analysis timed out",
            parentSignal,
          );
          if (closed) return;
          controller.enqueue(
            encoder.encode(formatSSEEvent("complete", result)),
          );
        } catch (error) {
          if (closed) return;
          console.error(
            "[analyze-expense] Interactive streaming analysis failed:",
            error,
          );
          controller.enqueue(
            encoder.encode(
              formatSSEEvent("error", interactiveAnalysisFailure(error)),
            ),
          );
        } finally {
          if (!closed) {
            closed = true;
            controller.close();
          }
        }
      },
      cancel() {
        closed = true;
        streamAbort.abort(new DOMException("Stream cancelled", "AbortError"));
      },
    }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    },
  );
}

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

function collapseReceiptItems(
  items: any[] | undefined,
  _body: AnalyzeRequestBody,
): any[] | undefined {
  // Source extraction establishes single-receipt versus distinct-payment rows.
  // Description words and arithmetic cannot authorize merging financial rows.
  return items;
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
    `[analyze-expense][timing] stage=${stage} elapsed_ms=${
      getElapsedMs(
        startedAt,
      )
    }`,
  );
}

async function awaitWithHardTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
  signal?: AbortSignal,
): Promise<T> {
  return await runWithTimeout({ operation, timeoutMs, timeoutMessage, signal });
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

async function getCategoryRemaps(params: {
  supabase: any;
  userId: string;
}): Promise<UserCategoryRemapRow[]> {
  return fetchUserCategoryRemaps({
    supabase: params.supabase,
    userId: params.userId,
    limit: 80,
  });
}

/**
 * Creates a readable stream that sends SSE events during analysis
 */
function createSSEStream(
  body: AnalyzeRequestBody,
  geminiApiKey: string,
  merchantContext: MerchantAnalysisContext,
  execution: AnalysisExecutionOptions & { deadlineAt: number },
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const streamAbort = new AbortController();
  const parentSignal = execution.signal
    ? AbortSignal.any([execution.signal, streamAbort.signal])
    : streamAbort.signal;
  let closed = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Create progress callback that sends SSE events
        const onProgress: ProgressCallback = (event: ProgressEvent) => {
          if (closed) return;
          const payload = mapProgressEvent(event, body);
          const sseMessage = formatSSEEvent("progress", payload);
          controller.enqueue(encoder.encode(sseMessage));
        };

        // Run analysis with progress callback and a hard timeout.
        const result = await awaitWithHardTimeout(
          (signal) =>
            runEnrichedTransactionAnalysis({
              execution: { deadlineAt: execution.deadlineAt, signal },
              body,
              apiKey: geminiApiKey,
              merchantContext,
              merchantDeadlineAt: execution.deadlineAt - 1000,
              onProgress,
              transformItems: (items) => {
                return collapseReceiptItems(items, body) ?? items;
              },
            }),
          execution.deadlineAt - Date.now(),
          "Analysis timed out after 180 seconds",
          parentSignal,
        );

        if (closed) return;
        // Send final result as complete event
        if (result.success) {
          const completeData = {
            success: true,
            data: {
              items: result.items,
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

        closed = true;
        controller.close();
      } catch (error) {
        if (closed) return;
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
            hasAttachments: Array.isArray(body.attachments) &&
              body.attachments.length > 0,
            hasText: typeof body.text === "string" &&
              body.text.trim().length > 0,
          },
        });
        if (closed) return;
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
        closed = true;
        controller.close();
      }
    },
    cancel() {
      closed = true;
      streamAbort.abort(new DOMException("Stream cancelled", "AbortError"));
    },
  });
}

Deno.serve(withCors(async (req: Request) => {
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
    const analysisDeadlineAt = requestStartedAt +
      (isStreamMode ? 180000 : 140000);

    let body: InteractiveAnalyzeBody;
    let interactive: InteractiveRequest | null;
    let captureDefaults: AiCaptureDefaults | null;
    try {
      body = await req.json();
      captureDefaults = parseAiCaptureDefaults(body.captureContext);
      interactive = parseInteractiveRequest(body.interactive);
      if (interactive) parseInteractiveSource(body);
    } catch (_error) {
      return errorResponse("Invalid analysis request", 400);
    }
    const interactiveDefaultCurrency = captureDefaults?.currency ??
      body.currency?.trim().toUpperCase();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (
      (!interactive && !GEMINI_API_KEY) ||
      !SUPABASE_URL ||
      !SUPABASE_ANON_KEY
    ) {
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

    const { data: userData, error: userErr } = await supabaseAuthed.auth
      .getUser();
    logStage("auth_get_user", requestStartedAt);
    const callerId = userData?.user?.id;
    if (userErr || !callerId) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (body.userId && body.userId !== callerId) {
      return errorResponse("userId mismatch", 401, "UNAUTHORIZED");
    }
    body.userId = callerId;
    body.preferredTimezone = undefined;
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
    const logoDevSecretKey = Deno.env.get("LOGO_DEV_SECRET_KEY") ?? "";
    // These reads are independent after authentication. Do not load automatic
    // category history for the source-verified path, which never uses it.
    const [currencyRead, preferenceRead, categoryRead] = await runWithTimeout(
      {
        timeoutMs: Math.min(15000, analysisDeadlineAt - Date.now()),
        timeoutMessage: "Analysis context timed out",
        signal: req.signal,
        operation: () =>
          Promise.allSettled(
            [
              loadLatestUserPreferredCurrency({
                supabase: preferredCurrencyReader,
                userId: callerId,
                fallbackCurrency: body.currency,
                onError: (error) =>
                  console.warn(
                    "[analyze-expense] Preferred currency lookup failed",
                    error,
                  ),
              }),
              preferredCurrencyReader
                .from("user_contacts")
                .select("preferred_timezone, preferred_language")
                .eq("user_id", callerId)
                .order("id", { ascending: false })
                .limit(1)
                .maybeSingle(),
              Promise.all([
                getAllowedCategoriesCached({
                  supabase: supabaseAuthed,
                  userId: callerId,
                }),
                interactive
                  ? Promise.resolve([])
                  : getCategoryPreferencesCached({
                    supabase: supabaseAuthed,
                    userId: callerId,
                  }),
                getCategoryRemaps({
                  supabase: supabaseAuthed,
                  userId: callerId,
                }),
                fetchConfirmedCategoryPreferences({
                  supabase: supabaseAuthed,
                  userId: callerId,
                }),
              ]),
            ] as const,
          ),
      },
    );
    if (currencyRead.status === "rejected") throw currencyRead.reason;
    body.currency = currencyRead.value;
    const preferenceError = preferenceRead.status === "rejected"
      ? preferenceRead.reason
      : preferenceRead.value.error;
    const contact = preferenceRead.status === "fulfilled"
      ? preferenceRead.value.data
      : null;
    if (preferenceError) {
      console.warn(
        "[analyze-expense] Language/timezone preference lookup failed",
        preferenceError,
      );
      if (interactive) {
        return errorResponse(
          "Unable to load analysis language preference",
          503,
          "AI_TEMPORARILY_UNAVAILABLE",
        );
      }
    } else {
      body.language = resolveAiResponseLanguage(
        contact?.preferred_language,
        body.language,
      );
      body.preferredTimezone = normalizePreferredTimezone(
        contact?.preferred_timezone,
      );
    }
    body = applyAiCaptureDefaults(body, captureDefaults);
    if (categoryRead.status === "rejected") {
      console.error(
        "[analyze-expense] Failed to load user categories/preferences:",
        categoryRead.reason,
      );
      return errorResponse(
        "Category context is temporarily unavailable. Please retry.",
        503,
        "CATEGORY_CONTEXT_UNAVAILABLE",
      );
    }
    const [merged, preferences, remaps, confirmedPreferences] =
      categoryRead.value;
    body.allowedExpenseCategories = merged.expenseCategories;
    body.allowedIncomeCategories = merged.incomeCategories;
    body.categoryPreferences = preferences;
    body.categoryRemaps = remaps;
    body.confirmedCategoryPreferences = confirmedPreferences;
    logStage("category_context_loading", requestStartedAt);

    if (interactive) {
      return await interactiveAnalysisResponse(
        body,
        interactive,
        supabaseAuthed,
        {
          supabase: preferredCurrencyReader,
          userId: callerId,
          logoDevSecretKey,
          preferredTimezone: body.preferredTimezone,
        },
        interactiveDefaultCurrency,
        isStreamMode,
        { deadlineAt: requestStartedAt + 140000, signal: req.signal },
      );
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

      const stream = createSSEStream(
        body,
        GEMINI_API_KEY!,
        {
          supabase: preferredCurrencyReader,
          userId: callerId,
          logoDevSecretKey,
          preferredTimezone: body.preferredTimezone,
        },
        { deadlineAt: analysisDeadlineAt, signal: req.signal },
      );
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
        (signal) =>
          runEnrichedTransactionAnalysis({
            body,
            apiKey: GEMINI_API_KEY!,
            execution: { deadlineAt: analysisDeadlineAt, signal },
            merchantDeadlineAt: analysisDeadlineAt - 1000,
            merchantContext: {
              supabase: preferredCurrencyReader,
              userId: callerId,
              logoDevSecretKey,
              preferredTimezone: body.preferredTimezone,
            },
            transformItems: (items) => {
              logStage("final_category_mapping", requestStartedAt);
              return collapseReceiptItems(items, body) ?? items;
            },
          }),
        analysisDeadlineAt - Date.now(),
        "Analysis timed out after 140 seconds",
        req.signal,
      );
      logStage("analyze_core", requestStartedAt);
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
          hasAttachments: Array.isArray(body.attachments) &&
            body.attachments.length > 0,
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
          items: result.items,
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
}));
