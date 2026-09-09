/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateUser } from "../shared/auth.ts";
import { corsHeaders } from "../shared/cors.ts";
import { GEMINI_MODEL_FALLBACKS } from "../shared/gemini-models.ts";
import {
  isRetryableGeminiError,
  sendGeminiMessageWithRetry,
} from "../shared/gemini-retry.ts";
import {
  buildCuratedPocketMonthReviewContext,
  buildPocketMonthReviewFallback,
  hashPocketMonthReviewInput,
  isPocketMonthReviewPermissionError,
  normalizePocketMonthReview,
} from "../shared/pocket-month-review.ts";
import {
  createVertexChatSession,
  getVertexAiConfigFromEnv,
} from "../shared/vertex-ai-chat.ts";
import {
  hasPlusEntitlement,
  jsonSubscriptionRequired,
  loadLatestSubscriptionForUser,
} from "../shared/plus-entitlement.ts";

const PROMPT_VERSION = "pocket-month-review-v1";
const MAX_REQUEST_BYTES = 2_000;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ReviewRequest {
  scope?: unknown;
  householdId?: unknown;
  currency?: unknown;
  cycleStart?: unknown;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function parseRequest(value: unknown): {
  scope: "personal" | "portfolio" | "household";
  householdId: string | null;
  currency: string;
  cycleStart: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as ReviewRequest;
  const scope = boundedString(body.scope, 20)?.toLowerCase();
  const currency = boundedString(body.currency, 3)?.toUpperCase();
  const cycleStart = boundedString(body.cycleStart, 10);
  const householdId = body.householdId == null
    ? null
    : boundedString(body.householdId, 36);
  if (
    (scope !== "personal" && scope !== "portfolio" && scope !== "household") ||
    !currency ||
    !/^[A-Z]{3}$/.test(currency) ||
    !cycleStart ||
    !/^\d{4}-\d{2}-\d{2}$/.test(cycleStart) ||
    (householdId != null && !UUID_REGEX.test(householdId)) ||
    (scope === "personal") !== (householdId == null)
  ) {
    return null;
  }
  return { scope, householdId, currency, cycleStart };
}

function reviewSchema() {
  const textItem = {
    type: "OBJECT",
    properties: {
      text: { type: "STRING" },
      fact_ids: { type: "ARRAY", items: { type: "STRING" } },
    },
    required: ["text", "fact_ids"],
  };
  return {
    type: "OBJECT",
    properties: {
      headline: textItem,
      celebration: textItem,
      previous_cycle_summary: textItem,
      attention_items: { type: "ARRAY", items: textItem, maxItems: 4 },
      recommendations: { type: "ARRAY", items: textItem, maxItems: 4 },
      pocket_explanations: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            pocket_lineage_id: { type: "STRING" },
            text: { type: "STRING" },
            fact_ids: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["pocket_lineage_id", "text", "fact_ids"],
        },
        maxItems: 4,
      },
    },
    required: [
      "headline",
      "celebration",
      "previous_cycle_summary",
      "attention_items",
      "recommendations",
      "pocket_explanations",
    ],
  };
}

function prompt(
  context: Record<string, unknown>,
  locale: string | null,
): string {
  return `Write a short, warm monthly pocket review in ${
    locale || "the user's preferred language"
  }.
Use only the supplied authoritative facts. Do not calculate, alter, or recommend allocations. Do not invent transactions, income, causes, or investment advice. Avoid shame and alarmist language. Every statement containing an amount must include the matching supplied fact ID in fact_ids. Return only the requested JSON schema.\n\nAUTHORITATIVE_CONTEXT:\n${
    JSON.stringify(
      context,
    )
  }`;
}

async function generateReview(
  context: Record<string, unknown>,
  locale: string | null,
) {
  const vertex = getVertexAiConfigFromEnv();
  let lastError: unknown;
  for (const model of GEMINI_MODEL_FALLBACKS) {
    try {
      const chat = createVertexChatSession({
        model,
        vertex,
        systemInstruction:
          "You provide factual, supportive budget-review wording only.",
      });
      const response = await sendGeminiMessageWithRetry(
        {
          sendMessage: (content) =>
            chat
              .sendMessage(content, {
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 1400,
                  responseMimeType: "application/json",
                  responseSchema: reviewSchema(),
                },
              })
              .then((result) => result.response),
        },
        prompt(context, locale),
        { logPrefix: "pocket-month-review" },
      );
      return { model, raw: JSON.parse(response.text()) };
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error)) throw error;
    }
  }
  throw lastError ?? new Error("GEMINI_REVIEW_UNAVAILABLE");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }
  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > MAX_REQUEST_BYTES) {
      return jsonResponse({ success: false, error: "Payload too large" }, 413);
    }
    const input = parseRequest(JSON.parse(rawBody));
    if (!input) {
      return jsonResponse(
        { success: false, error: "Invalid review request" },
        400,
      );
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
      return jsonResponse(
        { success: false, error: "Server configuration error" },
        500,
      );
    }
    const supabase = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const auth = await authenticateUser(req, supabase);
    if (!auth.success || !auth.userId) {
      return jsonResponse(
        { success: false, error: auth.error || "Unauthorized" },
        auth.statusCode || 401,
      );
    }

    const subscription = await loadLatestSubscriptionForUser(
      supabase,
      auth.userId,
    );
    if (!hasPlusEntitlement(subscription)) {
      return jsonResponse(
        jsonSubscriptionRequired("AI monthly budget review"),
        403,
      );
    }

    // The service client is limited to entitlement/cache work. The authoritative
    // financial read must preserve the caller JWT so the RPC enforces scope RLS.
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }
    const userScopedSupabase = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { Authorization: authorization } },
    });

    const { data: month, error: monthError } = await userScopedSupabase.rpc(
      "get_pockets_month_v4",
      {
        p_user_id: auth.userId,
        p_scope: input.scope,
        p_budget_month: input.cycleStart,
        p_household_id: input.householdId,
        p_currency: input.currency,
      },
    );
    if (isPocketMonthReviewPermissionError(monthError)) {
      return jsonResponse(
        { success: false, error: "Forbidden", code: "POCKET_SCOPE_FORBIDDEN" },
        403,
      );
    }
    if (
      monthError ||
      !month ||
      typeof month !== "object" ||
      Array.isArray(month)
    ) {
      throw monthError || new Error("INVALID_POCKETS_MONTH_CONTEXT");
    }
    const context = month as Record<string, unknown>;
    const reviewContext = buildCuratedPocketMonthReviewContext(context);
    if (!reviewContext || reviewContext.facts.length === 0) {
      throw new Error("MISSING_AUTHORITATIVE_REVIEW_FACTS");
    }
    const facts = reviewContext.facts;
    const factIds = facts
      .map((fact) =>
        fact && typeof fact === "object"
          ? (fact as Record<string, unknown>).id
          : null
      )
      .filter((id): id is string => typeof id === "string");
    const pockets = Array.isArray(context.envelopes) ? context.envelopes : [];
    const virtualPockets = Array.isArray(
        (context.pockets_v4 as Record<string, unknown> | undefined)
          ?.lifecycle_virtual_rows,
      )
      ? ((context.pockets_v4 as Record<string, unknown>)
        .lifecycle_virtual_rows as unknown[])
      : [];
    const lineageIds = [...pockets, ...virtualPockets]
      .map((pocket) =>
        pocket && typeof pocket === "object"
          ? ((pocket as Record<string, unknown>).pocket_lineage_id ??
            (pocket as Record<string, unknown>).rollover_group_id ??
            (pocket as Record<string, unknown>).id)
          : null
      )
      .filter((id): id is string => typeof id === "string");
    if (factIds.length === 0) {
      throw new Error("MISSING_AUTHORITATIVE_REVIEW_FACTS");
    }

    const { data: contact } = await supabase
      .from("user_contacts")
      .select("preferred_language")
      .eq("user_id", auth.userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const inputHash = await hashPocketMonthReviewInput(reviewContext);
    const scopeKey = `${input.scope}:${input.householdId || ""}`;
    const cacheQuery = supabase
      .from("pocket_month_review_ai_cache")
      .select("review_json, model_version")
      .eq("user_id", auth.userId)
      .eq("scope_key", scopeKey)
      .eq("currency", input.currency)
      .eq("cycle_start", input.cycleStart)
      .eq("input_hash", inputHash)
      .eq("prompt_version", PROMPT_VERSION)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: cached, error: cacheError } = await cacheQuery;
    if (cacheError) throw cacheError;
    if (cached?.review_json) {
      const review = normalizePocketMonthReview(
        cached.review_json,
        factIds,
        lineageIds,
      );
      if (review) {
        return jsonResponse({
          success: true,
          cached: true,
          review,
          modelVersion: cached.model_version,
        });
      }
    }

    let generated: { model: string; raw: unknown };
    try {
      generated = await generateReview(
        reviewContext,
        typeof contact?.preferred_language === "string"
          ? contact.preferred_language
          : null,
      );
    } catch (error) {
      if (!isRetryableGeminiError(error)) throw error;
      return jsonResponse({
        success: true,
        cached: false,
        deterministicFallback: true,
        review: buildPocketMonthReviewFallback(),
      });
    }
    const review = normalizePocketMonthReview(
      generated.raw,
      factIds,
      lineageIds,
    );
    if (!review) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid AI review response",
          code: "AI_REVIEW_SCHEMA_INVALID",
        },
        502,
      );
    }
    const { error: insertError } = await supabase
      .from("pocket_month_review_ai_cache")
      .insert({
        user_id: auth.userId,
        scope_key: scopeKey,
        currency: input.currency,
        cycle_start: input.cycleStart,
        input_hash: inputHash,
        prompt_version: PROMPT_VERSION,
        model_version: generated.model,
        review_json: review,
      });
    if (insertError) throw insertError;
    return jsonResponse({
      success: true,
      cached: false,
      review,
      modelVersion: generated.model,
    });
  } catch (error) {
    console.error(
      "[generate-pocket-month-review] failed",
      error instanceof Error ? error.message : String(error),
    );
    return jsonResponse(
      { success: false, error: "Unable to generate AI review" },
      500,
    );
  }
});
