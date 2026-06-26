// Supabase Edge Function: delete-expense
// Deletes an expense for personal budgeting (GPT-supported)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import {
  authenticateUserOrInternalSecret,
  verifyUserMatch,
} from "../shared/auth.ts";
import { detectGptRequest, ensureGuestIdentity } from "../shared/gpt-guests.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";

interface DeleteExpenseRequest {
  expenseIds?: string;
  expense_ids?: string;
  expenseId?: string;
  expense_id?: string;
  userId?: string;
  user_id?: string;
  clientRecordId?: string;
  clientMutationId?: string;
  idempotencyKey?: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function parseExpenseIds(body: DeleteExpenseRequest): string[] {
  const raw =
    body.expenseIds ?? body.expense_ids ?? body.expenseId ?? body.expense_id;
  if (!raw) return [];
  const rawString = Array.isArray(raw) ? raw.join(",") : String(raw);
  const parts = rawString
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const unique = new Set<string>();
  for (const part of parts) {
    const sanitized = sanitizeUuid(part);
    if (sanitized) unique.add(sanitized);
  }
  return Array.from(unique);
}

function resolveErrorCode(status: number): string {
  if (status === 401 || status === 403) return "UNAUTHORIZED";
  if (status === 404) return "NOT_FOUND";
  if (status >= 500) return "SERVER_ERROR";
  return "VALIDATION_ERROR";
}

function errorResponse(message: string, status = 400, code?: string) {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed. Use POST.", 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse("Server configuration error", 500);
  }

  try {
    const body: DeleteExpenseRequest = await req.json();
    const expenseIds = parseExpenseIds(body);
    if (expenseIds.length === 0) {
      return errorResponse("expenseIds or expenseId is required");
    }
    const clientRecordId = body.clientRecordId?.trim() || null;
    const clientMutationId =
      body.clientMutationId?.trim() || body.idempotencyKey?.trim() || null;

    const detection = detectGptRequest(req);
    const conversationId = detection.conversationId ?? null;

    let userId: string | null = null;
    let requestedUserId: string | null = null;

    let resolvedIdentityMeta: Record<string, unknown> | undefined;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "X-Client-Info": "moneko-delete-expense" } },
    });

    if (detection.isGpt) {
      if (!conversationId) {
        return errorResponse("conversationId is required for GPT requests");
      }

      try {
        const guestIdentity = await ensureGuestIdentity({
          supabase,
          conversationId,
        });

        userId = guestIdentity.userId;
        resolvedIdentityMeta = {
          conversationId,
          guest: {
            contactId: guestIdentity.contactId,
            createdUser: guestIdentity.createdUser,
            createdContact: guestIdentity.createdContact,
          },
        };
        if (detection.ephemeralUserId) {
          resolvedIdentityMeta.ephemeralUserId = detection.ephemeralUserId;
        }

        console.log("[delete-expense] Resolved GPT guest identity", {
          conversationId,
          userId,
          contactId: guestIdentity.contactId,
        });
      } catch (guestError) {
        console.error(
          "[delete-expense] Failed to resolve GPT guest identity:",
          guestError,
        );
        return errorResponse("Failed to prepare GPT guest user", 500);
      }
    } else {
      const authResult = await authenticateUserOrInternalSecret(req, supabase);
      if (!authResult.success) {
        return errorResponse(
          authResult.error ?? "Authentication required",
          authResult.statusCode ?? 401,
        );
      }

      // For internal service callers, allow body.userId. For JWT callers, never trust body.userId.
      const requestedUserIdRaw = body.userId ?? body.user_id;
      if (authResult.isInternalService) {
        if (requestedUserIdRaw) {
          requestedUserId = sanitizeUuid(requestedUserIdRaw);
        }
        userId = requestedUserId;
        if (!userId) {
          return errorResponse("Valid userId is required", 400);
        }
      } else {
        userId = authResult.userId ? authResult.userId : null;

        // Legacy support: if the client still sends userId, verify it matches.
        if (requestedUserIdRaw) {
          requestedUserId = sanitizeUuid(requestedUserIdRaw);
          if (!requestedUserId) {
            return errorResponse("Invalid userId format");
          }
          if (!userId || !verifyUserMatch(userId, requestedUserId as string)) {
            return errorResponse(
              "You do not have permission to delete this expense",
              403,
            );
          }
        }
      }
    }

    if (!userId) {
      return errorResponse("Authentication required", 401);
    }

    // Fetch expenses to verify ownership and obtain household info
    const { data: expenses, error } = await supabase
      .from("expenses")
      .select(
        "id, user_id, contact_id, household_id, amount_cents, currency, raw_text, category, date, type, is_recurring, provider, provider_transaction_id, deleted_at",
      )
      .in("id", expenseIds);

    if (error || !expenses) {
      return errorResponse("Expense not found", 404);
    }

    const expenseById = new Map(
      expenses.map((expense) => [expense.id, expense]),
    );
    const missingIds = expenseIds.filter((id) => !expenseById.has(id));

    const householdIds = Array.from(
      new Set(
        expenses
          .map((expense) => expense.household_id as string | null | undefined)
          .filter((id): id is string => !!id),
      ),
    );

    // Some legacy rows are contact-owned (contact_id set) but missing user_id.
    // Only in that case do we resolve owner user_id via user_contacts.
    const shouldResolveOwnersViaContacts = expenses.some((expense) => {
      const hasUserId = !!(expense as any)?.user_id;
      const hasContactId = !!(expense as any)?.contact_id;
      return !hasUserId && hasContactId;
    });

    const expenseContactIds = shouldResolveOwnersViaContacts
      ? Array.from(
          new Set(
            expenses
              .map((expense) => expense.contact_id as string | null | undefined)
              .filter((id): id is string => !!id),
          ),
        )
      : [];

    const { data: contactOwnerRows, error: contactOwnerError } =
      expenseContactIds.length
        ? await supabase
            .from("user_contacts")
            .select("id, user_id")
            .in("id", expenseContactIds)
        : { data: [] as { id: string; user_id: string | null }[] };

    if (contactOwnerError) {
      await reportEdgeFunctionError({
        functionName: "delete-expense",
        error: contactOwnerError,
        context: {
          operation: "user_contacts.select_contact_owners",
          expenseContactIds,
        },
      });
      return errorResponse("Failed to resolve expense owners", 500);
    }

    const ownerByContactId = new Map(
      (contactOwnerRows || [])
        .filter((row) => typeof row?.id === "string" && !!row.user_id)
        .map((row) => [row.id, row.user_id as string]),
    );

    const { data: householdRows } = householdIds.length
      ? await supabase
          .from("households")
          .select("id, is_portfolio")
          .in("id", householdIds)
      : { data: [] as { id: string; is_portfolio: boolean | null }[] };

    const householdPortfolioMap = new Map(
      (householdRows || []).map((row) => [row.id, row.is_portfolio === true]),
    );

    const nonPortfolioHouseholdIds = householdIds.filter(
      (id) => householdPortfolioMap.get(id) !== true,
    );

    const { data: membershipRows } =
      nonPortfolioHouseholdIds.length > 0
        ? await supabase
            .from("household_members")
            .select("household_id")
            .eq("user_id", userId)
            .in("household_id", nonPortfolioHouseholdIds)
        : { data: [] as { household_id: string }[] };

    const membershipSet = new Set(
      (membershipRows || []).map((row) => row.household_id),
    );

    const failedIds: { id: string; reason: string }[] = [];
    for (const id of missingIds) {
      failedIds.push({ id, reason: "not_found" });
    }

    const allowedExpenseIds: string[] = [];
    const alreadyDeletedIds: string[] = [];
    for (const id of expenseIds) {
      const expense = expenseById.get(id);
      if (!expense) continue;

      const rawExpenseUserId = (expense as any)?.user_id as
        | string
        | null
        | undefined;
      const expenseContactId = (expense as any)?.contact_id as
        | string
        | null
        | undefined;
      const expenseUserId =
        rawExpenseUserId ||
        (expenseContactId ? ownerByContactId.get(expenseContactId) : undefined);

      if (!expenseUserId) {
        failedIds.push({ id, reason: "missing_owner" });
        continue;
      }

      const householdId = (expense as any)?.household_id as
        | string
        | null
        | undefined;
      const isPortfolioHousehold = householdId
        ? householdPortfolioMap.get(householdId) === true
        : false;

      let allowed = false;
      if (detection.isGpt) {
        if (!householdId && expenseUserId === userId) {
          allowed = true;
        } else {
          failedIds.push({ id, reason: "gpt_forbidden_household" });
        }
      } else {
        if (!householdId) {
          allowed = expenseUserId === userId;
        } else if (isPortfolioHousehold) {
          allowed = expenseUserId === userId;
        } else {
          allowed = membershipSet.has(householdId);
        }
        if (!allowed) {
          failedIds.push({ id, reason: "forbidden" });
        }
      }

      if (allowed) {
        if ((expense as any)?.deleted_at) {
          alreadyDeletedIds.push(id);
        } else {
          allowedExpenseIds.push(id);
        }
      }
    }

    if (allowedExpenseIds.length === 0) {
      if (alreadyDeletedIds.length > 0 && failedIds.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            deletedCount: 0,
            alreadyDeletedCount: alreadyDeletedIds.length,
            failedCount: 0,
            failedIds,
            resolvedUserId: userId,
            meta: {
              ...(resolvedIdentityMeta ?? {}),
              clientRecordId,
              clientMutationId,
            },
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (expenseIds.length === 1) {
        const reason = failedIds[0]?.reason ?? "unknown";
        if (reason === "not_found") {
          return errorResponse("Expense not found", 404);
        }
        if (
          reason === "missing_owner" ||
          reason === "forbidden" ||
          reason === "gpt_forbidden_household"
        ) {
          return errorResponse(
            "You do not have permission to delete this expense",
            403,
          );
        }
      }
      return new Response(
        JSON.stringify({
          success: false,
          deletedCount: 0,
          failedCount: failedIds.length,
          failedIds,
          resolvedUserId: userId,
          meta: {
            ...(resolvedIdentityMeta ?? {}),
            clientRecordId,
            clientMutationId,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: softDeleteError } = await supabase
      .from("expenses")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_reason: "user_deleted",
        updated_at: new Date().toISOString(),
      })
      .in("id", allowedExpenseIds);

    if (softDeleteError) {
      return errorResponse("Failed to delete expense", 500);
    }

    console.log("[delete-expense] Successfully deleted expenses", {
      expenseIds: allowedExpenseIds,
      userId,
    });

    // For non-GPT requests, notify household members if this was a shared expense
    if (!detection.isGpt) {
      const deletedExpenses = allowedExpenseIds
        .map((id) => expenseById.get(id))
        .filter(Boolean) as any[];
      const notificationExpenses = deletedExpenses;

      const sharedCounts = new Map<string, number>();
      for (const expense of notificationExpenses) {
        const householdId = expense.household_id as string | null | undefined;
        if (!householdId) continue;
        if (householdPortfolioMap.get(householdId) === true) continue;
        sharedCounts.set(householdId, (sharedCounts.get(householdId) ?? 0) + 1);
      }

      if (sharedCounts.size > 0) {
        // Resolve actor display name
        let actorName = "Someone";
        try {
          const { data: appUser } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", userId)
            .maybeSingle();
          if (
            appUser?.full_name &&
            String(appUser.full_name).trim().length > 0
          ) {
            actorName = appUser.full_name as string;
          }
        } catch (_) {}

        if (
          allowedExpenseIds.length === 1 &&
          notificationExpenses.length === 1
        ) {
          const expense = notificationExpenses[0];
          const householdId = expense.household_id as string | null | undefined;
          if (householdId && householdPortfolioMap.get(householdId) !== true) {
            console.log(
              "[delete-expense] Notifying household members about deletion for household:",
              householdId,
            );
            const { error: notifyError } = await supabase.rpc(
              "notify_household_members_expense",
              {
                p_household_id: householdId,
                p_expense_id: expense.id,
                p_actor_user_id: userId,
                p_event_type: "expense_deleted",
                p_expense_data: {
                  actor_name: actorName,
                  amount_cents: expense.amount_cents,
                  currency: expense.currency,
                  raw_text: expense.raw_text,
                  category: expense.category,
                  date: expense.date,
                  is_recurring: expense.is_recurring === true,
                },
              },
            );

            if (notifyError) {
              console.error(
                "[delete-expense] Error creating notifications:",
                notifyError,
              );
            }
          }
        } else {
          const now = new Date().toISOString();
          for (const [householdId, count] of sharedCounts.entries()) {
            const { data: members } = await supabase
              .from("household_members")
              .select("user_id")
              .eq("household_id", householdId)
              .neq("user_id", userId);

            if (!members || members.length === 0) continue;

            const notificationPayload = {
              actor_name: actorName,
              actor_user_id: userId,
              batch_count: count,
              recurring_count: deletedExpenses.filter(
                (expense) =>
                  expense.household_id === householdId &&
                  expense.is_recurring === true,
              ).length,
              household_id: householdId,
            };

            const notifications = members.map((member) => ({
              household_id: householdId,
              user_id: member.user_id,
              event_type: "expense_deleted",
              payload: notificationPayload,
              created_at: now,
            }));

            const { error: insertError } = await supabase
              .from("notification_events")
              .insert(notifications);

            if (insertError) {
              console.error(
                "[delete-expense] Error creating bulk delete notifications:",
                insertError,
              );
            }
          }
        }
      }
    }

    const responseData: any = {
      success: failedIds.length === 0,
      deletedCount: allowedExpenseIds.length,
      alreadyDeletedCount: alreadyDeletedIds.length,
      failedCount: failedIds.length,
      failedIds,
      resolvedUserId: userId,
      meta: {
        ...(resolvedIdentityMeta ?? {}),
        clientRecordId,
        clientMutationId,
      },
    };

    // For non-GPT requests, include shared flag
    if (!detection.isGpt) {
      const hasShared = Array.from(expenseById.values()).some((expense) => {
        const householdId = expense.household_id as string | null | undefined;
        if (!householdId) return false;
        return householdPortfolioMap.get(householdId) !== true;
      });
      responseData.shared = hasShared;
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return errorResponse(
      e instanceof Error ? e.message : "Unexpected error",
      500,
    );
  }
});
