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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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
  const hasAttachments = Array.isArray(body.attachments) &&
    body.attachments.length > 0;
  return hasImage && !hasAttachments;
}

function formatBreakdownAmount(item: any): string {
  const amount = Number(item?.amount);
  if (!Number.isFinite(amount)) return "";
  const formatted = amount.toFixed(2);
  const symbol = typeof item?.currencySymbol === "string" &&
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
      const desc = typeof item?.description === "string"
        ? item.description.trim()
        : "";
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
      typeof item?.description === "string" ? item.description.trim() : ""
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
  if (!shouldCollapseReceipt(body)) return items;

  const filteredItems = items.length > 1
    ? items.filter((item) => !isTotalLike(item?.description))
    : items;
  const workingItems = filteredItems.length > 0 ? filteredItems : items;

  const totalAmount = workingItems.reduce((sum, item) => {
    const amount = Number(item?.amount);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return items;

  const primary = workingItems[0] ?? {};
  const breakdown = buildReceiptBreakdown(workingItems);
  const category = resolveReceiptCategory(workingItems) || primary.category ||
    "other";
  const description = pickReceiptDescription(workingItems);
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
      currency: primary.currency || body.currency || "USD",
      currencySymbol: primary.currencySymbol || "$",
      date: primary.date || body.date || new Date().toISOString().split("T")[0],
      description,
      breakdown,
      ...(splitSource?.payerUserId
        ? { payerUserId: splitSource.payerUserId }
        : {}),
    },
  ];
}

function resolveErrorCode(status: number): string {
  if (status === 401 || status === 403) return "UNAUTHORIZED";
  if (status === 404) return "NOT_FOUND";
  if (status >= 500) return "SERVER_ERROR";
  return "VALIDATION_ERROR";
}

function errorResponse(message: string, status = 400, code?: string): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      code: code ?? resolveErrorCode(status),
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
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

        // Run analysis with progress callback
        const analysisPromise = runAnalyzeExpense(
          body,
          geminiApiKey,
          onProgress,
        );

        // Timeout for the entire analysis (3 minutes)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Analysis timed out after 180 seconds")),
            180000,
          )
        );

        const result = await Promise.race([analysisPromise, timeoutPromise]);

        // Send final result as complete event
        if (result.success) {
          const collapsedItems = collapseReceiptItems(result.items, body);
          const completeData = {
            success: true,
            data: {
              items: collapsedItems ?? result.items,
              isAnalyzed: true,
              language: result.language,
            },
          };
          controller.enqueue(
            encoder.encode(formatSSEEvent("complete", completeData)),
          );
        } else {
          controller.enqueue(
            encoder.encode(
              formatSSEEvent("error", {
                success: false,
                error: result.error,
              }),
            ),
          );
        }

        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.enqueue(
          encoder.encode(
            formatSSEEvent("error", {
              success: false,
              error: message,
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
    // Validate request method
    if (req.method !== "POST") {
      return errorResponse("Method not allowed. Use POST.", 405);
    }

    // Check for SSE streaming mode via query parameter
    const url = new URL(req.url);
    const isStreamMode = url.searchParams.get("stream") === "true";

    // Parse request body
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

    if (!GEMINI_API_KEY) {
      return errorResponse("Server configuration error", 500);
    }

    // If we have an auth header, verify the caller and enrich household context safely under RLS.
    const authHeader = req.headers.get("Authorization") || "";
    if (SUPABASE_URL && SUPABASE_ANON_KEY && authHeader) {
      try {
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
        const callerId = userData?.user?.id;
        if (userErr || !callerId) {
          return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
        }

        if (body.userId && body.userId !== callerId) {
          return errorResponse("userId mismatch", 401, "UNAUTHORIZED");
        }
        body.userId = callerId;

        // In household mode, provide the household member list to the model so it can
        // reliably resolve payer/splits by userId (without exposing IDs to end users).
        if (
          body.householdId &&
          !body.isPortfolio &&
          !Array.isArray(body.householdMembers)
        ) {
          const { data: membership, error: membershipError } =
            await supabaseAuthed
              .from("household_members")
              .select("id")
              .eq("household_id", body.householdId)
              .eq("user_id", callerId)
              .maybeSingle();

          if (!membershipError && membership?.id) {
            // Prefer admin read for full member profile fields (RLS-safe because we
            // already verified the caller is a member via the authed client).
            const canAdminRead = !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
            const reader = canAdminRead
              ? createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
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
              .select("user_id, users(full_name, email)")
              .eq("household_id", body.householdId);

            if (!membersError && Array.isArray(members) && members.length > 0) {
              body.householdMembers = members.map((m: any) => ({
                userId: m.user_id,
                userName: m.users?.full_name ?? null,
                userEmail: m.users?.email ?? null,
              }));
            }
          }
        }
      } catch (e) {
        console.error("[analyze-expense] auth/context enrichment failed:", e);
      }
    }

    // SSE Streaming Mode - returns text/event-stream with progress events
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

    // Standard JSON Mode (default, backward compatible)
    let result: any;
    try {
      const analysisPromise = runAnalyzeExpense(body, GEMINI_API_KEY);
      // Keep below Supabase Edge request idle timeout to return a structured
      // JSON error instead of an upstream 504 gateway timeout.
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Analysis timed out after 140 seconds")),
          140000,
        )
      );
      result = await Promise.race([analysisPromise, timeoutPromise]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes("timed out") ? 504 : 500;
      return errorResponse(message, status);
    }
    if (!result.success) {
      const status = result.status || 400;
      return errorResponse(result.error ?? "Failed to analyze expense", status);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          items: collapseReceiptItems(result.items, body) ?? result.items,
          isAnalyzed: true,
          language: result.language,
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
