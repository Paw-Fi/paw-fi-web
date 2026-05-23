import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { assertScopeAccess, sanitizeUuid } from "../shared/accounts.ts";

interface RequestBody {
  householdId?: string;
  userId?: string;
  includeArchived?: boolean;
  currency?: string;
  currencies?: string[];
  monthStart?: string;
  currentMonthStart?: string;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toMap(rows: Array<{ account_id: string; amount_cents: number }>) {
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.account_id] = Number(row.amount_cents || 0);
  }
  return result;
}

function normalizeCurrency(value?: string | null): string | null {
  const normalized = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function normalizeCurrencies(values?: string[] | null): string[] | null {
  if (values == null) return null;
  if (values.length > 20) return null;

  const currencies = values.map((value) => normalizeCurrency(value));
  if (currencies.some((value) => value == null)) return null;

  const normalized = Array.from(
    new Set(currencies.filter((value): value is string => value != null)),
  ).sort();
  return normalized.length > 0 ? normalized : null;
}

function normalizeDate(value?: string | null): string | null {
  const trimmed = (value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return trimmed;
}

function walletBalancesFromSnapshot(payload: unknown): Record<string, number> {
  const balances: Record<string, number> = {};
  const rows = (payload as { wallet_balances?: unknown })?.wallet_balances;
  if (!Array.isArray(rows)) return balances;

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const walletId = String((row as { wallet_id?: unknown }).wallet_id ?? "");
    if (!walletId) continue;
    balances[walletId] = Number(
      (row as { balance_cents?: unknown }).balance_cents ?? 0,
    );
  }

  return balances;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed", code: "VALIDATION_ERROR" },
      405,
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      {
        success: false,
        error: "Server configuration error",
        code: "SERVER_ERROR",
      },
      500,
    );
  }

  try {
    const body = (await req.json()) as RequestBody;
    if (body.currencies != null && !Array.isArray(body.currencies)) {
      return jsonResponse(
        {
          success: false,
          error: "currencies must be an array",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }
    const householdId = sanitizeUuid(body.householdId ?? null);
    if (body.householdId && !householdId) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid householdId",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }
    const selectedCurrency = normalizeCurrency(body.currency);
    const selectedCurrencies =
      normalizeCurrencies(body.currencies) ??
      (selectedCurrency ? [selectedCurrency] : null);
    if (body.currency && !selectedCurrency) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid currency",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }
    if (body.currencies != null && selectedCurrencies == null) {
      return jsonResponse(
        {
          success: false,
          error:
            body.currencies.length > 20
              ? "Too many currencies"
              : "Invalid currencies",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }
    const snapshotMonthStart = normalizeDate(
      body.monthStart ?? body.currentMonthStart,
    );
    if ((body.monthStart || body.currentMonthStart) && !snapshotMonthStart) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid monthStart",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "X-Client-Info": "moneko-list-accounts" } },
    });

    const auth = await authenticateUserOrInternalSecret(req, supabase);
    if (!auth.success) {
      return jsonResponse(
        {
          success: false,
          error: auth.error ?? "Unauthorized",
          code: auth.statusCode === 401 ? "UNAUTHORIZED" : "VALIDATION_ERROR",
        },
        auth.statusCode ?? 401,
      );
    }

    const userId = auth.isInternalService
      ? sanitizeUuid(body.userId ?? null)
      : auth.userId;
    if (!userId) {
      return jsonResponse(
        {
          success: false,
          error: "Valid userId is required",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }

    const canAccess = await assertScopeAccess(supabase, userId, householdId);
    if (!canAccess) {
      return jsonResponse(
        { success: false, error: "Forbidden scope", code: "UNAUTHORIZED" },
        403,
      );
    }

    const includeArchived = body.includeArchived === true;

    let accountsQuery = supabase
      .from("accounts")
      .select(
        "id, user_id, household_id, name, icon, color, currency, opening_balance_cents, goal_amount_cents, is_default, is_system, is_archived, linked_bank_account_id, created_at, updated_at",
      )
      .order("is_default", { ascending: false })
      .order("is_system", { ascending: false })
      .order("name", { ascending: true });

    if (!includeArchived) {
      accountsQuery = accountsQuery.eq("is_archived", false);
    }

    if (householdId) {
      accountsQuery = accountsQuery.eq("household_id", householdId);
    } else {
      accountsQuery = accountsQuery
        .eq("user_id", userId)
        .is("household_id", null);
    }

    if (selectedCurrencies != null) {
      accountsQuery = accountsQuery.in("currency", selectedCurrencies);
    }

    const { data: accounts, error: accountsError } = await accountsQuery;
    if (accountsError) {
      return jsonResponse(
        {
          success: false,
          error: "Failed to list accounts",
          code: "SERVER_ERROR",
        },
        500,
      );
    }

    const accountIds = (accounts ?? []).map((row: any) => row.id as string);
    const accountCurrencyById = new Map<string, string>();
    for (const row of (accounts ?? []) as any[]) {
      accountCurrencyById.set(
        row.id as string,
        String(row.currency ?? selectedCurrency ?? "USD")
          .trim()
          .toUpperCase(),
      );
    }
    if (accountIds.length === 0) {
      return jsonResponse({ success: true, data: [] });
    }

    let snapshotBalances: Record<string, number> = {};
    const authHeader = req.headers.get("Authorization");
    if (
      snapshotMonthStart &&
      selectedCurrency &&
      (selectedCurrencies?.length ?? 0) <= 1 &&
      !auth.isInternalService &&
      authHeader?.startsWith("Bearer ")
    ) {
      const rpcSupabase = createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
          global: {
            headers: {
              Authorization: authHeader,
              "X-Client-Info": "moneko-list-accounts-snapshot",
            },
          },
        },
      );
      const { data: snapshotPayload, error: snapshotError } =
        await rpcSupabase.rpc("get_wallets_month_snapshot_v2", {
          p_user_id: userId,
          p_household_id: householdId,
          p_currency: selectedCurrency,
          p_month_start: snapshotMonthStart,
          p_include_archived: includeArchived,
        });

      if (snapshotError) {
        console.warn("[list-accounts] snapshot balance fallback", {
          error: snapshotError.message,
          userId,
          householdId,
          selectedCurrency,
          snapshotMonthStart,
        });
      } else {
        snapshotBalances = walletBalancesFromSnapshot(snapshotPayload);
      }
    }

    const { data: expenseRows } = await supabase
      .from("expenses")
      .select("account_id, amount_cents, type, is_recurring, currency")
      .in("account_id", accountIds)
      .is("deleted_at", null);

    const expenseOut: Record<string, number> = {};
    const incomeIn: Record<string, number> = {};
    for (const row of (expenseRows ?? []) as any[]) {
      if (row.is_recurring === true) continue;
      const accountId = row.account_id as string;
      const walletCurrency = accountCurrencyById.get(accountId);
      const rowCurrency = String(row.currency ?? "")
        .trim()
        .toUpperCase();
      if (walletCurrency && rowCurrency !== walletCurrency) continue;
      const amount = Number(row.amount_cents || 0);
      const type = String(row.type ?? "expense").toLowerCase();
      if (type === "income") {
        incomeIn[accountId] = (incomeIn[accountId] ?? 0) + amount;
      } else {
        expenseOut[accountId] = (expenseOut[accountId] ?? 0) + amount;
      }
    }

    const { data: transferOutRows } = await supabase
      .from("account_transfers")
      .select("from_account_id, amount_cents, currency")
      .in("from_account_id", accountIds);
    const { data: transferInRows } = await supabase
      .from("account_transfers")
      .select("to_account_id, amount_cents, currency")
      .in("to_account_id", accountIds);

    const transferOut: Record<string, number> = {};
    for (const row of (transferOutRows ?? []) as any[]) {
      const key = row.from_account_id as string;
      const walletCurrency = accountCurrencyById.get(key);
      const rowCurrency = String(row.currency ?? "")
        .trim()
        .toUpperCase();
      if (walletCurrency && rowCurrency !== walletCurrency) continue;
      transferOut[key] =
        (transferOut[key] ?? 0) + Number(row.amount_cents || 0);
    }

    const transferIn: Record<string, number> = {};
    for (const row of (transferInRows ?? []) as any[]) {
      const key = row.to_account_id as string;
      const walletCurrency = accountCurrencyById.get(key);
      const rowCurrency = String(row.currency ?? "")
        .trim()
        .toUpperCase();
      if (walletCurrency && rowCurrency !== walletCurrency) continue;
      transferIn[key] = (transferIn[key] ?? 0) + Number(row.amount_cents || 0);
    }

    const payload = (accounts ?? []).map((row: any) => {
      const accountId = row.id as string;
      const opening = Number(row.opening_balance_cents || 0);
      const fallbackBalanceCents =
        opening +
        (incomeIn[accountId] ?? 0) -
        (expenseOut[accountId] ?? 0) +
        (transferIn[accountId] ?? 0) -
        (transferOut[accountId] ?? 0);
      const currentBalanceCents =
        snapshotBalances[accountId] ?? fallbackBalanceCents;

      return {
        ...row,
        current_balance_cents: currentBalanceCents,
        transfer_summary: {
          total_in_cents: transferIn[accountId] ?? 0,
          total_out_cents: transferOut[accountId] ?? 0,
        },
      };
    });

    return jsonResponse({ success: true, data: payload });
  } catch (error) {
    console.error("[list-accounts]", error);
    return jsonResponse(
      {
        success: false,
        error: "Failed to list accounts",
        code: "SERVER_ERROR",
      },
      500,
    );
  }
});
