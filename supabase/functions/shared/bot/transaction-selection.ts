import {
  type LastListedTransaction,
  resolveLastListedSelection,
  type SessionState,
  readActiveTransactionContext,
} from "./session-state.ts";

type SupabaseLike = {
  from: (table: string) => any;
};

type SelectionArgs = {
  selection_index?: unknown;
  match?: unknown;
  transaction_id?: unknown;
  expense_id?: unknown;
};

function normalizeMatchString(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeRow(row: any): LastListedTransaction | null {
  const id = typeof row?.id === "string" ? row.id : "";
  if (!id) return null;
  const amountCents = Number(row?.amount_cents) || 0;
  return {
    id,
    amountMajor: amountCents / 100,
    currency: String(row?.currency || "USD").toUpperCase(),
    date: String(row?.date || "").slice(0, 10),
    category: String(row?.category || ""),
    description: String(row?.raw_text || row?.merchant || ""),
    type:
      String(row?.type || "expense").toLowerCase() === "income"
        ? "income"
        : "expense",
    household_id:
      typeof row?.household_id === "string" ? row.household_id : null,
  };
}

export async function validateActiveBotTransactionId(
  supabase: SupabaseLike,
  expenseId: string,
): Promise<{ candidate: LastListedTransaction } | { error: string }> {
  const { data, error } = await supabase
    .from("expenses")
    .select(
      "id, amount_cents, currency, date, category, raw_text, merchant, type, household_id",
    )
    .eq("id", expenseId)
    .is("deleted_at", null)
    .or("is_recurring.eq.false,is_recurring.is.null")
    .maybeSingle();
  if (error) {
    return { error: "Unable to verify the selected transaction." };
  }
  const candidate = normalizeRow(data);
  if (!candidate) {
    return {
      error:
        "That transaction is no longer available. List recent transactions and try again.",
    };
  }
  return { candidate };
}

export async function resolveBotTransactionSelection(params: {
  supabase: SupabaseLike;
  userId: string;
  args: SelectionArgs;
  items: LastListedTransaction[];
  sessionState?: SessionState | null;
  logPrefix?: string;
  spaceNameByHouseholdId?: (
    householdId: string | null | undefined,
  ) => string | null;
}): Promise<
  | { candidate: LastListedTransaction }
  | {
      needs_disambiguation: true;
      choices: Array<{ index: number; summary: string }>;
    }
  | { error: string }
> {
  // Check for direct transaction ID first
  const directId = [params.args.transaction_id, params.args.expense_id]
    .find((value) => typeof value === "string" && value.trim())
    ?.toString()
    .trim();
  
  if (directId) {
    return await validateActiveBotTransactionId(params.supabase, directId);
  }

  const listedSelection = resolveLastListedSelection(
    params.items,
    params.args,
    params.spaceNameByHouseholdId,
  );
  if (!("error" in listedSelection)) {
    if (!("candidate" in listedSelection)) return listedSelection;
    return await validateActiveBotTransactionId(
      params.supabase,
      listedSelection.candidate.id,
    );
  }

  // Fallback 1: Check active transaction context from session state
  if (params.sessionState) {
    const activeTransaction = readActiveTransactionContext(params.sessionState);
    if (activeTransaction?.transaction_id) {
      return await validateActiveBotTransactionId(
        params.supabase,
        activeTransaction.transaction_id,
      );
    }

    // Fallback 2: If there's exactly one item in lastListedTransactions, use it
    if (params.items.length === 1) {
      return await validateActiveBotTransactionId(params.supabase, params.items[0].id);
    }
  }

  // Fallback 3: Database search by description_contains
  const match =
    params.args.match &&
    typeof params.args.match === "object" &&
    !Array.isArray(params.args.match)
      ? (params.args.match as Record<string, unknown>)
      : {};
  const needle = normalizeMatchString(match.description_contains);
  if (!needle) return listedSelection;

  let query = params.supabase
    .from("expenses")
    .select(
      "id, amount_cents, currency, date, category, raw_text, merchant, type, household_id",
    )
    .eq("user_id", params.userId)
    .is("deleted_at", null)
    .or("is_recurring.eq.false,is_recurring.is.null")
    .limit(10);

  if (match.type) {
    query = query.eq(
      "type",
      String(match.type).toLowerCase() === "income" ? "income" : "expense",
    );
  }

  const { data, error } = await query;
  if (error || !Array.isArray(data)) return listedSelection;

  const matches = data
    .map(normalizeRow)
    .filter((row): row is LastListedTransaction => !!row)
    .filter((row) => normalizeMatchString(row.description).includes(needle));

  if (matches.length === 1) return { candidate: matches[0] };
  if (matches.length > 1) {
    return {
      needs_disambiguation: true,
      choices: matches.slice(0, 10).map((item, index) => ({
        index: index + 1,
        summary: [
          item.date,
          `${item.amountMajor} ${item.currency}`,
          item.category,
          item.description,
        ]
          .filter((part) => String(part || "").trim().length > 0)
          .join(" - "),
      })),
    };
  }

  return listedSelection;
}
