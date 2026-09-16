import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateUser } from "../shared/auth.ts";
import { corsHeaders } from "../shared/cors.ts";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function enrichMerchantDomains(
  supabase: any,
  rows: unknown,
): Promise<unknown[]> {
  const transactions = Array.isArray(rows) ? rows : [];
  const merchantIds = [
    ...new Set(
      transactions
        .map((row) =>
          row && typeof row === "object" && "merchant_id" in row
            ? (row as Record<string, unknown>).merchant_id
            : null
        )
        .filter((id): id is string => typeof id === "string" && UUID.test(id)),
    ),
  ];
  if (merchantIds.length === 0) return transactions;

  const { data, error } = await supabase
    .from("merchants")
    .select("id, domain")
    .in("id", merchantIds);
  if (error) throw error;
  const domainsById = new Map(
    (data ?? []).map((merchant) => [merchant.id, merchant.domain ?? null]),
  );

  return transactions.map((row) => {
    if (!row || typeof row !== "object") return row;
    const transaction = row as Record<string, unknown>;
    const merchantId = transaction.merchant_id;
    return {
      ...transaction,
      merchant_domain:
        typeof merchantId === "string" ? domainsById.get(merchantId) ?? null : null,
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Server configuration error" }, 500);
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateUser(req, supabase);
  if (!auth.success || !auth.userId)
    return json({ error: "Unauthorized" }, 401);
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const ids = Array.isArray(body?.transactionIds)
    ? [
        ...new Set(
          body!.transactionIds.filter(
            (id): id is string => typeof id === "string" && UUID.test(id),
          ),
        ),
      ]
    : [];
  if (ids.length === 0 || ids.length > 500)
    return json({ error: "transactionIds must contain 1 to 500 UUIDs" }, 400);
  const householdId =
    typeof body?.householdId === "string" && UUID.test(body.householdId)
      ? body.householdId
      : null;
  const currencies = Array.isArray(body?.currencies)
    ? body!.currencies
        .filter((currency): currency is string => typeof currency === "string")
        .map((currency) => currency.trim().toUpperCase())
        .filter(Boolean)
    : [];
  if (
    !body?.updates ||
    typeof body.updates !== "object" ||
    Array.isArray(body.updates) ||
    Object.keys(body.updates).length === 0
  ) {
    return json({ error: "updates must contain at least one field" }, 400);
  }
  const updates = { ...body.updates } as Record<string, unknown>;
  if (updates.householdId !== undefined && updates.household_id === undefined) {
    updates.household_id = updates.householdId;
  }
  if (updates.accountId !== undefined && updates.account_id === undefined) {
    updates.account_id = updates.accountId;
  }
  delete updates.householdId;
  delete updates.accountId;
  const descriptors =
    body?.descriptorsById && typeof body.descriptorsById === "object"
      ? body.descriptorsById
      : {};
  const { data, error } = await supabase.rpc(
    "bulk_update_transactions",
    {
      p_actor_user_id: auth.userId,
      p_transaction_ids: ids,
      p_household_id: householdId,
      p_currencies: currencies,
      p_updates: updates,
      p_descriptors_by_id: descriptors,
    },
  );
  if (error) return json({ error: error.message }, 400);
  try {
    return json({
      success: true,
      data: await enrichMerchantDomains(supabase, data),
    });
  } catch (enrichmentError) {
    console.error("[update-transactions-batch] Merchant enrichment failed", enrichmentError);
    return json({ success: true, data: data ?? [] });
  }
});
