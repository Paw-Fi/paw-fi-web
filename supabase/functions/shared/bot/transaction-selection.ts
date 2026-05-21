import {
  type LastListedTransaction,
  resolveLastListedSelection,
} from "./session-state.ts";

type SupabaseLike = {
  from: (table: string) => any;
};

type SelectionArgs = {
  selection_index?: unknown;
  match?: unknown;
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

export async function resolveBotTransactionSelection(params: {
  supabase: SupabaseLike;
  userId: string;
  args: SelectionArgs;
  items: LastListedTransaction[];
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
  const listedSelection = resolveLastListedSelection(
    params.items,
    params.args,
    params.spaceNameByHouseholdId,
  );
  if (!("error" in listedSelection)) return listedSelection;

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
