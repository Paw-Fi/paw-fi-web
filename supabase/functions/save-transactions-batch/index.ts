// Supabase Edge Function: save-transactions-batch
// Saves multiple transactions (expenses/income) in a single database transaction
// Designed for AI-extracted bulk imports (PDFs, bank statements, etc.)
// Significantly reduces latency by using batch insert instead of N individual calls

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { validateCurrency } from "../shared/currency-validator.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizePercentage(value: unknown): number {
  if (!isFiniteNumber(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function normalizeShares(value: unknown): number | undefined {
  if (!isFiniteNumber(value)) return undefined;
  const shares = Math.trunc(value);
  return shares > 0 ? shares : undefined;
}

function normalizeAmount(value: unknown): number {
  if (!isFiniteNumber(value)) return 0;
  return value < 0 ? 0 : value;
}

function allocateCentsByWeights(
  totalCents: number,
  weights: number[],
): number[] {
  const safeTotal = Number.isFinite(totalCents)
    ? Math.max(0, Math.trunc(totalCents))
    : 0;
  const safeWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const totalWeight = safeWeights.reduce((sum, w) => sum + w, 0);

  if (safeTotal === 0 || totalWeight <= 0 || safeWeights.length === 0) {
    return safeWeights.map(() => 0);
  }

  const floors: number[] = [];
  const fracs: { idx: number; frac: number }[] = [];
  let sumFloors = 0;

  for (let i = 0; i < safeWeights.length; i++) {
    const weight = safeWeights[i];
    if (weight <= 0) {
      floors.push(0);
      continue;
    }
    const raw = safeTotal * (weight / totalWeight);
    const floored = Math.floor(raw);
    const frac = raw - floored;
    floors.push(floored);
    sumFloors += floored;
    fracs.push({ idx: i, frac });
  }

  let remainder = safeTotal - sumFloors;
  if (remainder <= 0) return floors;

  fracs.sort((a, b) => b.frac - a.frac);
  if (fracs.length === 0) return floors;

  let cursor = 0;
  while (remainder > 0) {
    const target = fracs[cursor % fracs.length].idx;
    floors[target] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return floors;
}

interface MemberSplit {
  userId: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

interface CustomSplits {
  splitType: "equal" | "amount" | "percentage" | "shares";
  memberSplits: MemberSplit[];
}

interface TransactionItem {
  type: "expense" | "income";
  amount: number;
  category: string;
  currency: string;
  date: string;
  clientCreatedAt?: string;
  description?: string;
  breakdown?: string[];
  receiptImageUrl?: string;
  customSplits?: CustomSplits;
  payerUserId?: string;
  // Income-specific fields
  source?: string;
  ownerType?: "me" | "partner" | "household";
  privacyScope?: "private" | "balances_only" | "full";
}

interface RequestBody {
  userId?: string;
  householdId?: string;
  isPortfolio?: boolean;
  transactions: TransactionItem[];
}

interface SavedTransaction {
  id: string;
  index: number;
  type: "expense" | "income";
  success: boolean;
  error?: string;
  data?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: RequestBody = await req.json();

    console.log("[save-transactions-batch] Incoming request:", {
      transactionCount: body.transactions?.length || 0,
      householdId: body.householdId,
      isPortfolio: body.isPortfolio,
    });

    if (!Array.isArray(body.transactions) || body.transactions.length === 0) {
      return new Response(
        JSON.stringify({
          error: "transactions array is required and must not be empty",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Limit batch size to prevent abuse
    const MAX_BATCH_SIZE = 500;
    if (body.transactions.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({
          error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} transactions`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "moneko-save-transactions-batch" },
      },
    });

    // Authenticate
    const authResult = await authenticateUserOrInternalSecret(req, supabase);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        {
          status: authResult.statusCode ?? 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userId = authResult.isInternalService
      ? sanitizeUuid(body.userId)
      : authResult.userId;

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    } catch (_) {}

    // Resolve user contact
    let contactId: string | null = null;
    const { data: contact } = await supabase
      .from("user_contacts")
      .select("id, preferred_currency")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contact) {
      contactId = contact.id;
    }

    const isPortfolio = body.isPortfolio === true;
    const requestedHouseholdId = sanitizeUuid(body.householdId ?? null);

    // Verify household membership if household mode
    let resolvedHouseholdId: string | null = null;
    let householdMembers: { user_id: string }[] = [];

    if (requestedHouseholdId && !isPortfolio) {
      const { data: membership } = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", requestedHouseholdId)
        .eq("user_id", userId)
        .maybeSingle();

      if (membership) {
        resolvedHouseholdId = requestedHouseholdId;

        const { data: members } = await supabase
          .from("household_members")
          .select("user_id")
          .eq("household_id", requestedHouseholdId);

        if (members && members.length > 0) {
          householdMembers = members;
        }
      }
    }

    // Prepare batch inserts
    const expenseRecords: any[] = [];
    const expenseIndices: number[] = [];
    const incomeRecords: any[] = [];
    const incomeIndices: number[] = [];
    const validationErrors: { index: number; error: string }[] = [];

    for (let i = 0; i < body.transactions.length; i++) {
      const tx = body.transactions[i];

      // Basic validation
      if (!tx.type || !["expense", "income"].includes(tx.type)) {
        validationErrors.push({ index: i, error: "Invalid or missing type" });
        continue;
      }

      if (!tx.amount || tx.amount <= 0) {
        validationErrors.push({ index: i, error: "Invalid amount" });
        continue;
      }

      if (!tx.category) {
        validationErrors.push({ index: i, error: "Missing category" });
        continue;
      }

      if (!tx.date) {
        validationErrors.push({ index: i, error: "Missing date" });
        continue;
      }

      const currency = validateCurrency(tx.currency || "USD");
      const amountCents = Math.round(tx.amount * 100);

      const baseRecord = {
        contact_id: contactId,
        user_id: userId,
        amount_cents: amountCents,
        category: tx.category,
        date: tx.date,
        raw_text: tx.description || "",
        currency: currency,
        breakdown: tx.breakdown ?? null,
        receipt_image_url: tx.receiptImageUrl || null,
        created_at: tx.clientCreatedAt || new Date().toISOString(),
        household_id: isPortfolio ? requestedHouseholdId : null,
      };

      if (tx.type === "income") {
        const incomeRecord = {
          ...baseRecord,
          type: "income",
          source: tx.source || null,
          owner_type: tx.ownerType || "me",
          privacy_scope: tx.privacyScope || "full",
          household_id:
            resolvedHouseholdId || (isPortfolio ? requestedHouseholdId : null),
        };
        incomeRecords.push(incomeRecord);
        incomeIndices.push(i);
      } else {
        expenseRecords.push({
          ...baseRecord,
          _index: i,
          _customSplits: tx.customSplits,
          _payerUserId: tx.payerUserId,
        });
        expenseIndices.push(i);
      }
    }

    const results: SavedTransaction[] = [];

    // Add validation errors to results
    for (const err of validationErrors) {
      results.push({
        id: "",
        index: err.index,
        type: body.transactions[err.index]?.type || "expense",
        success: false,
        error: err.error,
      });
    }

    // Batch insert income (simple - no splits)
    if (incomeRecords.length > 0) {
      console.log(
        `[save-transactions-batch] Inserting ${incomeRecords.length} income records`,
      );

      const { data: insertedIncome, error: incomeError } = await supabase
        .from("expenses")
        .insert(incomeRecords)
        .select();

      if (incomeError) {
        console.error(
          "[save-transactions-batch] Income batch insert error:",
          incomeError,
        );
        for (let i = 0; i < incomeRecords.length; i++) {
          results.push({
            id: "",
            index: incomeIndices[i],
            type: "income",
            success: false,
            error: incomeError.message,
          });
        }
      } else if (insertedIncome) {
        for (let i = 0; i < insertedIncome.length; i++) {
          results.push({
            id: insertedIncome[i].id,
            index: incomeIndices[i],
            type: "income",
            success: true,
            data: insertedIncome[i],
          });
        }

        if (resolvedHouseholdId && !isPortfolio) {
          if (insertedIncome.length === 1) {
            const income = insertedIncome[0];
            const { error: notifyError } = await supabase.rpc(
              "notify_household_members_expense",
              {
                p_household_id: resolvedHouseholdId,
                p_expense_id: income.id,
                p_actor_user_id: userId,
                p_event_type: "income_added",
                p_expense_data: {
                  actor_name: actorName,
                  amount_cents: income.amount_cents,
                  currency: income.currency,
                  category: income.category,
                  source: income.source || "",
                  note: income.raw_text || "",
                  privacy_scope: income.privacy_scope,
                  owner_type: income.owner_type,
                },
              },
            );

            if (notifyError) {
              console.error(
                "[save-transactions-batch] Error creating income notifications:",
                notifyError,
              );
            }
          } else if (insertedIncome.length > 1) {
            const recipients = householdMembers
              .map((member) => member.user_id)
              .filter((memberId) => memberId !== userId);
            if (recipients.length > 0) {
              const now = new Date().toISOString();
              const payload = {
                actor_name: actorName,
                actor_user_id: userId,
                batch_count: insertedIncome.length,
                household_id: resolvedHouseholdId,
              };
              const notifications = recipients.map((recipientId) => ({
                household_id: resolvedHouseholdId,
                user_id: recipientId,
                event_type: "income_added",
                payload,
                created_at: now,
              }));

              const { error: notifyError } = await supabase
                .from("notification_events")
                .insert(notifications);

              if (notifyError) {
                console.error(
                  "[save-transactions-batch] Error creating bulk income notifications:",
                  notifyError,
                );
              }
            }
          }
        }
      }
    }

    // Batch insert expenses (more complex due to potential splits)
    if (expenseRecords.length > 0) {
      console.log(
        `[save-transactions-batch] Inserting ${expenseRecords.length} expense records`,
      );

      // Extract metadata before insert
      const expenseMeta = expenseRecords.map((r) => ({
        index: r._index,
        customSplits: r._customSplits,
        payerUserId: r._payerUserId,
      }));

      // Clean records for insert
      const cleanExpenseRecords = expenseRecords.map((r) => {
        const { _index, _customSplits, _payerUserId, ...clean } = r;
        return clean;
      });

      const { data: insertedExpenses, error: expenseError } = await supabase
        .from("expenses")
        .insert(cleanExpenseRecords)
        .select();

      if (expenseError) {
        console.error(
          "[save-transactions-batch] Expense batch insert error:",
          expenseError,
        );
        for (let i = 0; i < expenseRecords.length; i++) {
          results.push({
            id: "",
            index: expenseMeta[i].index,
            type: "expense",
            success: false,
            error: expenseError.message,
          });
        }
      } else if (insertedExpenses) {
        // Handle household splits if applicable
        if (resolvedHouseholdId && householdMembers.length > 0) {
          console.log(
            `[save-transactions-batch] Creating splits for ${insertedExpenses.length} expenses`,
          );

          const splitGroups: any[] = [];
          const splitLines: any[] = [];
          const expenseUpdates: {
            id: string;
            split_group_id: string;
            household_id: string;
          }[] = [];

          for (let i = 0; i < insertedExpenses.length; i++) {
            const expense = insertedExpenses[i];
            const meta = expenseMeta[i];
            const amountCents = expense.amount_cents;

            // Determine split type
            const rawSplitType =
              typeof meta.customSplits?.splitType === "string"
                ? meta.customSplits.splitType.trim().toLowerCase()
                : "equal";
            const normalizedSplitType = [
              "equal",
              "amount",
              "percentage",
              "shares",
            ].includes(rawSplitType)
              ? rawSplitType
              : "equal";
            const hasMemberSplits =
              Array.isArray(meta.customSplits?.memberSplits) &&
              meta.customSplits!.memberSplits.length > 0;
            const customSplits =
              hasMemberSplits && normalizedSplitType !== "equal"
                ? meta.customSplits
                : null;
            const splitType = customSplits ? normalizedSplitType : "equal";

            // Resolve payer
            let payerUserId = sanitizeUuid(meta.payerUserId ?? null) || userId;
            const isValidPayer = householdMembers.some(
              (m) => m.user_id === payerUserId,
            );
            if (!isValidPayer) payerUserId = userId;

            // Create split group (will be inserted in batch)
            const splitGroupId = crypto.randomUUID();
            splitGroups.push({
              id: splitGroupId,
              household_id: resolvedHouseholdId,
              expense_id: expense.id,
              payer_user_id: payerUserId,
              split_type: splitType,
              currency: expense.currency,
              total_amount_cents: amountCents,
              description: expense.raw_text || null,
              created_at: new Date().toISOString(),
            });

            expenseUpdates.push({
              id: expense.id,
              split_group_id: splitGroupId,
              household_id: resolvedHouseholdId!,
            });

            // Create split lines
            let lines: {
              user_id: string;
              amount_cents: number;
              percentage?: number;
              shares?: number;
            }[];

            if (splitType === "equal") {
              const amountPerMember = Math.floor(
                amountCents / householdMembers.length,
              );
              const remainder =
                amountCents - amountPerMember * householdMembers.length;
              lines = householdMembers.map((member, idx) => ({
                user_id: member.user_id,
                amount_cents: amountPerMember + (idx === 0 ? remainder : 0),
              }));
            } else if (splitType === "amount" && customSplits) {
              const memberSplits = customSplits.memberSplits as MemberSplit[];
              const cents = memberSplits.map((s) =>
                Math.max(0, Math.round((normalizeAmount(s.amount) || 0) * 100)),
              );
              const sumCents = cents.reduce(
                (sum: number, v: number) => sum + v,
                0,
              );
              const diff = amountCents - sumCents;
              if (diff !== 0 && cents.length > 0) {
                cents[cents.length - 1] = Math.max(
                  0,
                  cents[cents.length - 1] + diff,
                );
              }
              lines = memberSplits.map((s, idx) => ({
                user_id: s.userId,
                amount_cents: cents[idx] ?? 0,
              }));
            } else if (splitType === "percentage" && customSplits) {
              const memberSplits = customSplits.memberSplits as MemberSplit[];
              const weights = memberSplits.map(
                (s) => normalizePercentage(s.percentage) || 0,
              );
              const allocatedCents = allocateCentsByWeights(
                amountCents,
                weights,
              );
              lines = memberSplits.map((s, idx) => ({
                user_id: s.userId,
                amount_cents: allocatedCents[idx] ?? 0,
                percentage: normalizePercentage(s.percentage),
              }));
            } else if (splitType === "shares" && customSplits) {
              const memberSplits = customSplits.memberSplits as MemberSplit[];
              const weights = memberSplits.map(
                (s) => normalizeShares(s.shares) || 0,
              );
              const allocatedCents = allocateCentsByWeights(
                amountCents,
                weights,
              );
              lines = memberSplits.map((s, idx) => ({
                user_id: s.userId,
                amount_cents: allocatedCents[idx] ?? 0,
                shares: normalizeShares(s.shares),
              }));
            } else {
              // Fallback to equal
              const amountPerMember = Math.floor(
                amountCents / householdMembers.length,
              );
              const remainder =
                amountCents - amountPerMember * householdMembers.length;
              lines = householdMembers.map((member, idx) => ({
                user_id: member.user_id,
                amount_cents: amountPerMember + (idx === 0 ? remainder : 0),
              }));
            }

            for (const line of lines) {
              splitLines.push({
                split_group_id: splitGroupId,
                user_id: line.user_id,
                amount_cents: line.amount_cents,
                percentage: (line as any).percentage ?? null,
                shares: (line as any).shares ?? null,
                is_settled: false,
                settled_at: null,
                created_at: new Date().toISOString(),
              });
            }
          }

          // Batch insert split groups
          if (splitGroups.length > 0) {
            const { error: splitGroupError } = await supabase
              .from("expense_split_groups")
              .insert(splitGroups);

            if (splitGroupError) {
              console.error(
                "[save-transactions-batch] Split groups insert error:",
                splitGroupError,
              );
            } else {
              // Batch insert split lines
              if (splitLines.length > 0) {
                const { error: splitLinesError } = await supabase
                  .from("expense_split_lines")
                  .insert(splitLines);

                if (splitLinesError) {
                  console.error(
                    "[save-transactions-batch] Split lines insert error:",
                    splitLinesError,
                  );
                }
              }

              // Update expenses with split_group_id and household_id
              for (const update of expenseUpdates) {
                await supabase
                  .from("expenses")
                  .update({
                    split_group_id: update.split_group_id,
                    household_id: update.household_id,
                  })
                  .eq("id", update.id);
              }
            }
          }
        }

        // Refetch updated expenses
        const expenseIds = insertedExpenses.map((e) => e.id);
        const { data: refreshedExpenses } = await supabase
          .from("expenses")
          .select("*")
          .in("id", expenseIds);

        const refreshedMap = new Map(
          (refreshedExpenses || []).map((e) => [e.id, e]),
        );

        for (let i = 0; i < insertedExpenses.length; i++) {
          const expense = insertedExpenses[i];
          const refreshed = refreshedMap.get(expense.id) || expense;
          results.push({
            id: expense.id,
            index: expenseMeta[i].index,
            type: "expense",
            success: true,
            data: refreshed,
          });
        }

        if (resolvedHouseholdId && !isPortfolio) {
          if (insertedExpenses.length === 1) {
            const expense = insertedExpenses[0];
            const { error: notifyError } = await supabase.rpc(
              "notify_household_members_expense",
              {
                p_household_id: resolvedHouseholdId,
                p_expense_id: expense.id,
                p_actor_user_id: userId,
                p_event_type: "expense_added",
                p_expense_data: {
                  actor_name: actorName,
                  amount_cents: expense.amount_cents,
                  currency: expense.currency,
                  category: expense.category,
                  note: expense.raw_text || "",
                },
              },
            );

            if (notifyError) {
              console.error(
                "[save-transactions-batch] Error creating expense notifications:",
                notifyError,
              );
            }
          } else if (insertedExpenses.length > 1) {
            const recipients = householdMembers
              .map((member) => member.user_id)
              .filter((memberId) => memberId !== userId);
            if (recipients.length > 0) {
              const now = new Date().toISOString();
              const payload = {
                actor_name: actorName,
                actor_user_id: userId,
                batch_count: insertedExpenses.length,
                household_id: resolvedHouseholdId,
              };
              const notifications = recipients.map((recipientId) => ({
                household_id: resolvedHouseholdId,
                user_id: recipientId,
                event_type: "expense_added",
                payload,
                created_at: now,
              }));

              const { error: notifyError } = await supabase
                .from("notification_events")
                .insert(notifications);

              if (notifyError) {
                console.error(
                  "[save-transactions-batch] Error creating bulk expense notifications:",
                  notifyError,
                );
              }
            }
          }
        }
      }
    }

    // Sort results by original index
    results.sort((a, b) => a.index - b.index);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `[save-transactions-batch] Complete: ${successCount} succeeded, ${failureCount} failed`,
    );

    return new Response(
      JSON.stringify({
        success: failureCount === 0,
        data: results.map((r) => r.data).filter(Boolean),
        results: results,
        summary: {
          total: body.transactions.length,
          succeeded: successCount,
          failed: failureCount,
        },
        shared: !!resolvedHouseholdId,
        resolvedUserId: userId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[save-transactions-batch] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to save transactions batch",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
