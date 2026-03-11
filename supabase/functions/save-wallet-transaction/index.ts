/**
 * Supabase Edge Function: save-wallet-transaction
 *
 * Single backend for automatic transaction capture from:
 *   - iOS Apple Wallet (via Shortcuts + App Intents)
 *   - Android notification listener
 *
 * Responsibilities:
 *   1. Authenticate caller (JWT or internal secret)
 *   2. Validate + normalize payload
 *   3. Categorize via Gemini AI (same approach as analyze-expense)
 *   4. Resolve category using the SAME pipeline as analyze-expense
 *   5. Deduplicate (fingerprint-based, recent window)
 *   6. Save expense row
 *   7. Handle household splits when applicable
 *   8. Learn category preference for future captures
 *   9. Return saved row or duplicate result
 */

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { validateCurrency } from "../shared/currency-validator.ts";
import { normalizeCalendarDateString } from "../shared/date-normalization.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  ensureUserCategory,
  learnUserCategoryPreference,
} from "../shared/user-categories.ts";
import {
  loadCategoryContext,
  resolveCategory,
} from "../shared/category-resolution.ts";
import { normalizeCategoryForStorage } from "../shared/category-colors.ts";
import {
  buildWalletCaptureIdempotencyKey,
  normalizeWalletCaptureSource,
  resolveWalletCaptureScope,
  resolveWalletTransactionCurrency,
  resolveWalletTransactionDate,
  resolveWalletTransactionPackageName,
} from "../shared/wallet-capture.ts";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Constants ──────────────────────────────────────────────────────────────

const VALID_CAPTURE_SOURCES = new Set([
  "ios_wallet_shortcut",
  "android_notification_listener",
]);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CATEGORIZE_FUNCTION_CALLING_CONFIG = {
  mode: "ANY",
  allowedFunctionNames: ["categorize_transactions"],
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface TransactionPayload {
  merchantName?: string | null;
  rawMerchant?: string | null;
  amount: number;
  currency?: string | null;
  currencyCode?: string | null;
  date?: string | null;
  transactionDate?: string | null;
  cardLabel?: string | null;
  network?: string | null;
  note?: string | null;
  externalSourceId?: string | null;
  packageName?: string | null;
  sourcePackage?: string | null;
  locale?: string | null;
}

interface RequestBody {
  captureSource: string;
  userId?: string | null;
  householdId?: string | null;
  isPortfolio?: boolean;
  idempotencyKey?: string | null;
  clientCreatedAt?: string | null;
  transaction: TransactionPayload;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function errorResponse(message: string, status = 400, code?: string): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      code: code ?? "VALIDATION_ERROR",
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

function successResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Build a deterministic description string for the expense `raw_text` column.
 * Falls back through available text fields so we always store something useful.
 */
function buildDescription(tx: TransactionPayload): string {
  const parts: string[] = [];

  const merchant = (tx.merchantName ?? tx.rawMerchant ?? "").trim();
  if (merchant) parts.push(merchant);

  if (tx.note && tx.note.trim()) parts.push(tx.note.trim());

  if (parts.length === 0) return "Wallet auto capture";
  return parts.join(" – ");
}

async function storeWalletCaptureIdempotencyResult(
  supabase: any,
  key: string,
  result: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { error } = await supabase.from("idempotency_keys").insert({
    key,
    result,
    created_at: new Date().toISOString(),
  });

  if (error && error.code !== "23505") {
    console.error(
      "[save-wallet-transaction] Failed to persist idempotency result:",
      error,
    );
  }

  if (error?.code === "23505") {
    const { data: existing } = await supabase
      .from("idempotency_keys")
      .select("result")
      .eq("key", key)
      .maybeSingle();

    if (existing?.result) {
      const cached = existing.result as Record<string, unknown>;
      const cachedMeta = cached["meta"] && typeof cached["meta"] === "object"
        ? (cached["meta"] as Record<string, unknown>)
        : {};
      return {
        ...cached,
        success: true,
        duplicate: true,
        meta: {
          ...cachedMeta,
          deduplicatedAt: new Date().toISOString(),
        },
      };
    }
  }

  return result;
}

// ─── Gemini AI helpers (adapted from analyze-core.ts) ───────────────────────

/**
 * Extract function calls from a Gemini response.
 * Mirrors the getFunctionCalls pattern in analyze-core.ts (line 1489).
 */
function getFunctionCalls(response: any): any[] {
  const direct = response?.response?.functionCalls?.();
  const calls: any[] = Array.isArray(direct) ? [...direct] : [];
  const candidates = response?.response?.candidates;
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if (part?.functionCall) calls.push(part.functionCall);
      }
    }
  }

  if (calls.length <= 1) return calls;

  const deduped: any[] = [];
  const seen = new Set<string>();
  for (const call of calls) {
    const key = `${call?.name ?? ""}:${JSON.stringify(call?.args ?? {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(call);
  }
  return deduped;
}

/**
 * Use Gemini AI to categorize a single wallet transaction.
 * Adapted from `resolveCandidateCategories` in analyze-core.ts (line 1119).
 *
 * @returns The AI-suggested category (normalized for storage), or "other" on failure.
 */
async function categorizeWithAI(params: {
  genAI: GoogleGenerativeAI;
  merchantName: string;
  amount: number;
  currency: string;
  date: string;
  note?: string | null;
  expenseCategories: string[];
  incomeCategories: string[];
}): Promise<string> {
  const {
    genAI,
    merchantName,
    amount,
    currency,
    date,
    note,
    expenseCategories,
    incomeCategories,
  } = params;

  const tools: any = [
    {
      functionDeclarations: [
        {
          name: "categorize_transactions",
          description: "Return categories for each transaction in order.",
          parameters: {
            type: "object",
            properties: {
              categories: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["categories"],
          },
        },
      ],
    },
  ];

  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    tools: tools as any,
  });

  const descriptionParts = [merchantName];
  if (note) descriptionParts.push(note);
  const description = descriptionParts.join(" – ");

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a transaction categorization engine.
Return exactly 1 category for the transaction below.
Use only the allowed categories listed.

Expense categories: ${expenseCategories.join(", ")}
Income categories: ${incomeCategories.join(", ")}

Transactions:
1. EXPENSE | ${date} | ${description} | ${amount} ${currency}`,
          },
        ],
      },
    ],
    toolConfig: {
      functionCallingConfig: CATEGORIZE_FUNCTION_CALLING_CONFIG,
    },
    generationConfig: { maxOutputTokens: 256 },
  } as any);

  const toolCalls = getFunctionCalls(response).filter(
    (call: any) => call && call.name === "categorize_transactions",
  );

  if (toolCalls.length > 0) {
    for (const call of toolCalls) {
      const categories = Array.isArray(call.args?.categories)
        ? call.args.categories
        : [];
      if (categories.length >= 1) {
        return normalizeCategoryForStorage(categories[0]);
      }
    }
  }

  // Fallback: if AI didn't return structured output, try parsing text response
  const text = response?.response?.text?.();
  if (text) {
    const normalized = normalizeCategoryForStorage(text.trim());
    if (normalized !== "other") return normalized;
  }

  return "other";
}

// ─── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── CORS preflight ────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Method gate ───────────────────────────────────────────────────
    if (req.method !== "POST") {
      return errorResponse("Method not allowed. Use POST.", 405);
    }

    // ── Parse body ────────────────────────────────────────────────────
    const body: RequestBody = await req.json();

    // ── Validate captureSource ────────────────────────────────────────
    const captureSource = normalizeWalletCaptureSource(body.captureSource);
    if (!captureSource) {
      return errorResponse(
        `captureSource must be one of: ${
          [...VALID_CAPTURE_SOURCES].join(
            ", ",
          )
        }`,
        400,
      );
    }

    // ── Validate transaction object ───────────────────────────────────
    const tx = body.transaction;
    if (!tx || typeof tx !== "object") {
      return errorResponse("transaction object is required", 400);
    }

    // Amount
    if (
      typeof tx.amount !== "number" ||
      !Number.isFinite(tx.amount) ||
      tx.amount <= 0
    ) {
      return errorResponse("transaction.amount must be a positive number", 400);
    }

    // Currency
    const rawCurrency = resolveWalletTransactionCurrency(tx);
    if (!rawCurrency) {
      return errorResponse("transaction.currency is required", 400);
    }

    // Date
    const rawDate = resolveWalletTransactionDate(tx);
    if (!rawDate) {
      return errorResponse("transaction.date is required", 400);
    }
    const normalizedDate = normalizeCalendarDateString(rawDate);
    if (!normalizedDate) {
      return errorResponse(
        "transaction.date must be a valid calendar date",
        400,
      );
    }

    // Merchant — need at least one of merchantName or rawMerchant
    const merchantDisplay = (tx.merchantName ?? tx.rawMerchant ?? "").trim();
    if (!merchantDisplay) {
      return errorResponse(
        "At least one of transaction.merchantName or transaction.rawMerchant is required",
        400,
      );
    }

    // ── Environment ───────────────────────────────────────────────────
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return errorResponse("Server configuration error", 500, "SERVER_ERROR");
    }
    if (!GEMINI_API_KEY) {
      console.error("[save-wallet-transaction] GEMINI_API_KEY not configured");
      return errorResponse("Server configuration error", 500, "SERVER_ERROR");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "moneko-save-wallet-transaction" },
      },
    });

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // ── Authenticate ──────────────────────────────────────────────────
    const authResult = await authenticateUserOrInternalSecret(req, supabase);
    if (!authResult.success) {
      return errorResponse(
        authResult.error || "Unauthorized",
        authResult.statusCode ?? 401,
        "UNAUTHORIZED",
      );
    }

    let userId: string | null = null;

    if (authResult.isInternalService) {
      // Internal callers must provide userId in body
      userId = sanitizeUuid(body.userId);
      if (!userId) {
        return errorResponse(
          "userId is required for internal service calls",
          400,
        );
      }
    } else {
      // JWT-authenticated: use the user from the token, never trust body
      userId = authResult.userId ?? null;
    }

    if (!userId) {
      return errorResponse("Unable to resolve user identity", 400);
    }

    // ── Normalize inputs ──────────────────────────────────────────────
    const currency = validateCurrency(rawCurrency);
    const amountCents = Math.round(tx.amount * 100);
    const isPortfolio = body.isPortfolio === true;
    const householdId = sanitizeUuid(body.householdId);
    const description = buildDescription(tx);

    console.log("[save-wallet-transaction] Processing:", {
      userId,
      captureSource,
      merchant: merchantDisplay,
      amount: tx.amount,
      currency,
      date: normalizedDate,
      householdId,
      isPortfolio,
    });

    let householdMembers: Array<{ user_id: string }> = [];
    let requiresHouseholdSplit = false;
    if (householdId) {
      const { data: membership, error: membershipError } = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", householdId)
        .eq("user_id", userId)
        .maybeSingle();

      if (membershipError || !membership?.id) {
        return errorResponse(
          "Unauthorized household scope",
          403,
          "UNAUTHORIZED",
        );
      }

      if (!isPortfolio) {
        const { data: members, error: membersError } = await supabase
          .from("household_members")
          .select("user_id")
          .eq("household_id", householdId);

        householdMembers = membersError || !Array.isArray(members)
          ? []
          : members;
      }

      try {
        const scopeResolution = resolveWalletCaptureScope({
          requestedHouseholdId: householdId,
          isPortfolio,
          hasMembership: !!membership?.id,
          householdMemberCount: householdMembers.length,
        });
        requiresHouseholdSplit = scopeResolution.requiresHouseholdSplit;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "UNAUTHORIZED_HOUSEHOLD_SCOPE") {
          return errorResponse(
            "Unauthorized household scope",
            403,
            "UNAUTHORIZED",
          );
        }
        if (message === "NO_ACTIVE_HOUSEHOLD_MEMBERS") {
          return errorResponse("No active household members", 400);
        }
        throw error;
      }
    }

    // ── Resolve user contact ──────────────────────────────────────────
    let contactId: string | null = null;
    {
      const { data: contact, error: contactError } = await supabase
        .from("user_contacts")
        .select("id, preferred_currency")
        .eq("user_id", userId)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contactError) {
        console.error(
          "[save-wallet-transaction] Failed to look up user contact:",
          contactError,
        );
        return errorResponse(
          "Failed to resolve user contact",
          500,
          "SERVER_ERROR",
        );
      }

      if (contact) {
        contactId = contact.id;
        // Back-fill preferred currency if missing
        if (!contact.preferred_currency && currency) {
          await supabase
            .from("user_contacts")
            .update({ preferred_currency: currency })
            .eq("id", contact.id);
        }
      } else {
        console.log(
          "[save-wallet-transaction] No user_contact row found; proceeding with null contact_id.",
          { userId },
        );
      }
    }

    const requestIdempotencyKey = buildWalletCaptureIdempotencyKey({
      explicitKey: body.idempotencyKey,
      captureSource,
      userId,
      householdId,
      isPortfolio,
      merchantName: merchantDisplay,
      amountCents,
      currency,
      date: normalizedDate,
      cardLabel: tx.cardLabel,
      externalSourceId: tx.externalSourceId,
      packageName: resolveWalletTransactionPackageName(tx),
    });

    const { data: existingIdempotency } = await supabase
      .from("idempotency_keys")
      .select("result")
      .eq("key", requestIdempotencyKey)
      .maybeSingle();

    if (existingIdempotency?.result) {
      const cached = existingIdempotency.result as Record<string, unknown>;
      const cachedMeta = cached["meta"] && typeof cached["meta"] === "object"
        ? (cached["meta"] as Record<string, unknown>)
        : {};
      return successResponse({
        ...cached,
        success: true,
        duplicate: true,
        meta: {
          ...cachedMeta,
          captureSource,
          deduplicatedAt: new Date().toISOString(),
        },
      });
    }

    // ── Category resolution ───────────────────────────────────────────
    // Step 1: Load user category context (custom categories, preferences, remaps)
    let resolvedCategory = "other";
    try {
      const ctx = await loadCategoryContext({ supabase, userId });

      // Convert allowed category sets to sorted arrays for the AI prompt
      const expenseCategoryList = Array.from(ctx.allowedExpenseSet).sort();
      const incomeCategoryList = Array.from(ctx.allowedIncomeSet).sort();

      // Step 2: Call Gemini AI to categorize the transaction
      const aiCategory = await categorizeWithAI({
        genAI,
        merchantName: merchantDisplay,
        amount: tx.amount,
        currency,
        date: normalizedDate,
        note: tx.note,
        expenseCategories: expenseCategoryList,
        incomeCategories: incomeCategoryList,
      });

      console.log("[save-wallet-transaction] AI categorization result:", {
        merchant: merchantDisplay,
        aiCategory,
      });

      // Step 3: Run full resolution pipeline (remap → preference → remap → coerce)
      resolvedCategory = resolveCategory({
        initialGuess: aiCategory,
        description: merchantDisplay,
        transactionType: "expense",
        ctx,
      });

      console.log("[save-wallet-transaction] Category resolution:", {
        merchant: merchantDisplay,
        aiCategory,
        resolved: resolvedCategory,
      });
    } catch (catError) {
      console.error(
        "[save-wallet-transaction] Category resolution failed (using 'other'):",
        catError,
      );
      // Graceful degradation: proceed with "other"
    }

    // ── Save expense ──────────────────────────────────────────────────
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        contact_id: contactId,
        user_id: userId,
        amount_cents: amountCents,
        category: resolvedCategory,
        date: normalizedDate,
        raw_text: description,
        currency,
        breakdown: null,
        receipt_image_url: null,
        created_at: body.clientCreatedAt || new Date().toISOString(),
        is_recurring: false,
        recurrence_rule: null,
        household_id: isPortfolio ? householdId || null : null,
      })
      .select()
      .single();

    if (expenseError) {
      console.error(
        "[save-wallet-transaction] Error saving expense:",
        expenseError,
      );
      return errorResponse("Failed to save expense", 500, "SERVER_ERROR");
    }

    console.log("[save-wallet-transaction] Expense saved:", expense.id);

    // ── Learn category preference ─────────────────────────────────────
    try {
      await ensureUserCategory({
        supabase,
        userId,
        categoryName: resolvedCategory,
        transactionType: "expense",
      });
      await learnUserCategoryPreference({
        supabase,
        userId,
        transactionType: "expense",
        categoryName: resolvedCategory,
        descriptionText: merchantDisplay,
      });
    } catch (learnError) {
      console.error(
        "[save-wallet-transaction] Failed to learn category preference (non-blocking):",
        learnError,
      );
    }

    // ── Household split ───────────────────────────────────────────────
    let responseExpense = expense;

    if (householdId && isPortfolio) {
      // Portfolio: save with household_id but no split
      const responseBody = {
        success: true,
        duplicate: false,
        data: {
          id: expense.id,
          category: resolvedCategory,
          amount_cents: amountCents,
          currency,
        },
        meta: {
          captureSource,
          resolvedCategory,
        },
      };
      return successResponse(
        await storeWalletCaptureIdempotencyResult(
          supabase,
          requestIdempotencyKey,
          responseBody,
        ),
      );
    }

    if (householdId) {
      console.log(
        "[save-wallet-transaction] Creating household split for:",
        householdId,
      );

      // Equal split (wallet captures always use equal split)
      const { data: splitGroup, error: splitGroupError } = await supabase
        .from("expense_split_groups")
        .insert({
          household_id: householdId,
          expense_id: expense.id,
          payer_user_id: userId,
          split_type: "equal",
          currency,
          total_amount_cents: amountCents,
          description: description || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (splitGroupError) {
        console.error(
          "[save-wallet-transaction] Error creating split group:",
          splitGroupError,
        );
        const responseBody = {
          success: true,
          duplicate: false,
          data: {
            id: expense.id,
            category: resolvedCategory,
            amount_cents: amountCents,
            currency,
          },
          meta: {
            captureSource,
            resolvedCategory,
            warning: "Expense saved but split group creation failed",
          },
        };
        return successResponse(
          await storeWalletCaptureIdempotencyResult(
            supabase,
            requestIdempotencyKey,
            responseBody,
          ),
        );
      }

      // Create equal split lines
      const amountPerMember = Math.floor(amountCents / householdMembers.length);
      const remainder = amountCents - amountPerMember * householdMembers.length;
      const splitLines = householdMembers.map(
        (member: { user_id: string }, index: number) => ({
          split_group_id: splitGroup.id,
          user_id: member.user_id,
          amount_cents: amountPerMember + (index === 0 ? remainder : 0),
          is_settled: false,
          settled_at: null,
          created_at: new Date().toISOString(),
        }),
      );

      const { error: splitLinesError } = await supabase
        .from("expense_split_lines")
        .insert(splitLines);

      if (splitLinesError) {
        console.error(
          "[save-wallet-transaction] Error creating split lines:",
          splitLinesError,
        );
      } else {
        console.log(
          "[save-wallet-transaction] Split lines created for",
          householdMembers.length,
          "members",
        );
      }

      // Update expense with split_group_id and household_id
      await supabase
        .from("expenses")
        .update({
          split_group_id: splitGroup.id,
          household_id: householdId,
        })
        .eq("id", expense.id);

      // Refresh expense data
      const { data: refreshedExpense } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", expense.id)
        .single();

      if (refreshedExpense) {
        responseExpense = refreshedExpense;
      }

      // Notify household members
      let actorName = "Someone";
      try {
        const { data: appUser } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", userId)
          .maybeSingle();
        if (appUser?.full_name && String(appUser.full_name).trim().length > 0) {
          actorName = appUser.full_name as string;
        }
      } catch (_) {
        /* non-critical */
      }

      const { error: notifyError } = await supabase.rpc(
        "notify_household_members_expense",
        {
          p_household_id: householdId,
          p_expense_id: expense.id,
          p_actor_user_id: userId,
          p_event_type: "expense_added",
          p_expense_data: {
            actor_name: actorName,
            amount_cents: amountCents,
            currency,
            category: resolvedCategory,
            note: description,
            is_recurring: false,
          },
        },
      );

      if (notifyError) {
        console.error(
          "[save-wallet-transaction] Error notifying household:",
          notifyError,
        );
      }

      console.log(
        "[save-wallet-transaction] Household split created successfully",
      );
    }

    // ── Success response ──────────────────────────────────────────────
    const responseBody = {
      success: true,
      duplicate: false,
      data: {
        id: responseExpense.id,
        category: responseExpense.category ?? resolvedCategory,
        amount_cents: amountCents,
        currency,
      },
      meta: {
        captureSource,
        resolvedCategory,
      },
    };
    return successResponse(
      await storeWalletCaptureIdempotencyResult(
        supabase,
        requestIdempotencyKey,
        responseBody,
      ),
    );
  } catch (error) {
    console.error("[save-wallet-transaction] Unhandled error:", error);
    await reportEdgeFunctionError({
      functionName: "save-wallet-transaction",
      error,
      context: { step: "unhandled" },
    });
    return errorResponse(
      "Failed to save wallet transaction",
      500,
      "SERVER_ERROR",
    );
  }
});
