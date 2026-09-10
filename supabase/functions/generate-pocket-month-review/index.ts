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
  createVertexChatSession,
  getVertexAiConfigFromEnv,
} from "../shared/vertex-ai-chat.ts";
import {
  hasPlusEntitlement,
  jsonSubscriptionRequired,
  loadLatestSubscriptionForUser,
} from "../shared/plus-entitlement.ts";

const MAX_REQUEST_BYTES = 2_000;
const MAX_SUGGESTIONS = 30;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PocketScope = "personal" | "portfolio" | "household";

interface Suggestion {
  envelope_id: string;
  suggested_amount_cents: number;
  reason: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseRequest(value: unknown): {
  scope: PocketScope;
  householdId: string | null;
  currency: string;
  cycleStart: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const scope = typeof body.scope === "string" ? body.scope.toLowerCase() : "";
  const currency = typeof body.currency === "string"
    ? body.currency.toUpperCase().trim()
    : "";
  const cycleStart = typeof body.cycleStart === "string"
    ? body.cycleStart.trim()
    : "";
  const householdId = body.householdId == null
    ? null
    : typeof body.householdId === "string"
    ? body.householdId.trim()
    : "";
  if (
    (scope !== "personal" && scope !== "portfolio" && scope !== "household") ||
    !/^[A-Z]{3}$/.test(currency) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(cycleStart) ||
    (householdId !== null && !UUID_REGEX.test(householdId)) ||
    (scope === "personal" && householdId !== null) ||
    (scope === "household" && householdId === null)
  ) return null;
  return { scope, householdId, currency, cycleStart };
}

function schema() {
  return {
    type: "OBJECT",
    properties: {
      summary: { type: "STRING" },
      suggestions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            envelope_id: { type: "STRING" },
            suggested_amount_cents: { type: "INTEGER" },
            reason: { type: "STRING" },
          },
          required: ["envelope_id", "suggested_amount_cents", "reason"],
        },
      },
    },
    required: ["summary", "suggestions"],
  };
}

function buildContext(month: Record<string, unknown>) {
  const envelopes = Array.isArray(month.envelopes) ? month.envelopes : [];
  const pockets = envelopes.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.name !== "string") return [];
    return [{
      id: row.id,
      name: row.name,
      current_added_cents: Number(row.base_budget_amount_cents ?? 0),
      incoming_carry_cents: Number(row.rollover_from_previous_cents ?? 0) +
        Number(row.opening_rollover_cents ?? 0),
      available_cents: Number(row.available_budget_cents ?? 0),
      spent_cents: Number(row.spent_cents ?? 0),
      remaining_cents: Number(row.remaining_cents ?? 0),
      rollover_enabled: row.rollover_enabled === true,
    }];
  });
  const budget = month.budget && typeof month.budget === "object"
    ? month.budget as Record<string, unknown>
    : {};
  return {
    total_budget_cents: Number(budget.total_budget_cents ?? 0),
    total_spend_cents: Number(month.total_spend_cents ?? 0),
    pockets,
  };
}

function fallback(context: ReturnType<typeof buildContext>) {
  return {
    summary:
      "Here are your current pocket amounts to review. You can change any of them before saving your plan.",
    suggestions: context.pockets.map((pocket) => ({
      envelope_id: pocket.id,
      suggested_amount_cents: Math.max(
        0,
        Math.round(pocket.current_added_cents),
      ),
      reason: "Keeps this pocket at the amount you already set for this month.",
    })),
  };
}

function normalize(value: unknown, context: ReturnType<typeof buildContext>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const validIds = new Set(context.pockets.map((pocket) => pocket.id));
  const rawSuggestions = Array.isArray(raw.suggestions) ? raw.suggestions : [];
  if (rawSuggestions.length > Math.min(MAX_SUGGESTIONS, validIds.size)) {
    return null;
  }
  const seen = new Set<string>();
  const suggestions: Suggestion[] = [];
  for (const item of rawSuggestions) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    const id = typeof row.envelope_id === "string" ? row.envelope_id : "";
    const amount = row.suggested_amount_cents;
    const reason = typeof row.reason === "string"
      ? row.reason.trim().replace(/\s+/g, " ")
      : "";
    if (
      !validIds.has(id) ||
      seen.has(id) ||
      typeof amount !== "number" ||
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      amount > 100000000000 ||
      !reason ||
      reason.length > 280
    ) return null;
    seen.add(id);
    suggestions.push({
      envelope_id: id,
      suggested_amount_cents: amount,
      reason,
    });
  }
  const total = suggestions.reduce(
    (sum, item) => sum + item.suggested_amount_cents,
    0,
  );
  if (total > Math.max(0, Math.round(context.total_budget_cents))) return null;
  const summary = typeof raw.summary === "string"
    ? raw.summary.trim().replace(/\s+/g, " ")
    : "";
  if (!summary || summary.length > 280) return null;
  return { summary, suggestions };
}

async function generate(
  context: ReturnType<typeof buildContext>,
  locale: string | null,
) {
  const prompt = `Suggest a current-month amount for each supplied pocket in ${
    locale || "the user's preferred language"
  }. These are suggestions only: never claim you changed anything, never create a pocket, and never include a pocket ID that was not supplied. The sum of suggested_amount_cents must not exceed total_budget_cents. Use only the supplied data. Be warm, practical, and brief. Return only JSON matching the schema.\n\nAUTHORITATIVE_CONTEXT:\n${
    JSON.stringify(context)
  }`;
  const vertex = getVertexAiConfigFromEnv();
  let lastError: unknown;
  for (const model of GEMINI_MODEL_FALLBACKS) {
    try {
      const chat = createVertexChatSession({
        model,
        vertex,
        systemInstruction:
          "You provide factual, supportive monthly budget suggestions.",
      });
      const response = await sendGeminiMessageWithRetry(
        {
          sendMessage: (content) =>
            chat.sendMessage(content, {
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1200,
                responseMimeType: "application/json",
                responseSchema: schema(),
              },
            }).then((result) => result.response),
        },
        prompt,
        { logPrefix: "pocket-month-suggestions" },
      );
      return { model, value: JSON.parse(response.text()) };
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error)) throw error;
    }
  }
  throw lastError ?? new Error("GEMINI_UNAVAILABLE");
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
      return jsonResponse({
        success: false,
        error: "Invalid suggestion request",
      }, 400);
    }
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");
    if (!url || !serviceKey) {
      return jsonResponse({
        success: false,
        error: "Server configuration error",
      }, 500);
    }
    if (!authorization) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
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
      return jsonResponse({
        success: false,
        error: auth.error || "Unauthorized",
      }, auth.statusCode || 401);
    }
    if (
      !hasPlusEntitlement(
        await loadLatestSubscriptionForUser(supabase, auth.userId),
      )
    ) {
      return jsonResponse(
        jsonSubscriptionRequired("AI pocket budget suggestions"),
        403,
      );
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
      "get_pockets_month_v3",
      {
        p_user_id: auth.userId,
        p_scope: input.scope,
        p_budget_month: input.cycleStart,
        p_household_id: input.householdId,
        p_currency: input.currency,
        p_include_projected_recurring: true,
        p_allow_currency_fallback: false,
      },
    );
    if (monthError?.code === "42501") {
      return jsonResponse({
        success: false,
        error: "Forbidden",
        code: "POCKET_SCOPE_FORBIDDEN",
      }, 403);
    }
    if (
      monthError || !month || typeof month !== "object" || Array.isArray(month)
    ) throw monthError || new Error("INVALID_POCKETS_MONTH_CONTEXT");
    const context = buildContext(month as Record<string, unknown>);
    if (context.pockets.length === 0) {
      return jsonResponse({
        success: false,
        error: "Create or copy your pockets before asking for suggestions.",
        code: "CURRENT_POCKETS_REQUIRED",
      }, 409);
    }
    const { data: contact } = await supabase.from("user_contacts").select(
      "preferred_language",
    ).eq("user_id", auth.userId).order("updated_at", { ascending: false })
      .limit(1).maybeSingle();
    try {
      const generated = await generate(
        context,
        typeof contact?.preferred_language === "string"
          ? contact.preferred_language
          : null,
      );
      const suggestions = normalize(generated.value, context);
      if (!suggestions) {
        return jsonResponse({
          success: false,
          error: "Invalid AI suggestion response",
          code: "AI_SUGGESTION_SCHEMA_INVALID",
        }, 502);
      }
      return jsonResponse({
        success: true,
        deterministicFallback: false,
        modelVersion: generated.model,
        suggestions,
      });
    } catch (error) {
      if (!isRetryableGeminiError(error)) throw error;
      return jsonResponse({
        success: true,
        deterministicFallback: true,
        suggestions: fallback(context),
      });
    }
  } catch (error) {
    console.error(
      "[generate-pocket-month-review] failed",
      error instanceof Error ? error.message : String(error),
    );
    return jsonResponse({
      success: false,
      error: "Unable to generate AI suggestions",
    }, 500);
  }
});
