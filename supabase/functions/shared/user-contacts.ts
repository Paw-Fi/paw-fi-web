import { reportEdgeFunctionError } from "./edge-error-alert.ts";

interface QueryResult<T> {
  data: T | null;
  error: unknown;
}

interface LatestUserContactQuery<T> {
  eq(column: string, value: string): LatestUserContactQuery<T>;
  order(
    column: string,
    options: { ascending: boolean; nullsFirst?: boolean },
  ): LatestUserContactQuery<T>;
  limit(count: number): LatestUserContactQuery<T>;
  maybeSingle(): PromiseLike<QueryResult<T>>;
}

interface SelectableUserContactsQuery {
  select(columns: string): unknown;
}

interface SupabaseUserContactsClient {
  from(table: string): SelectableUserContactsQuery;
}

export interface UserContactLookup {
  id: string;
  preferred_currency: string | null;
}

export async function fetchLatestUserContact<T = UserContactLookup>(
  supabase: SupabaseUserContactsClient,
  userId: string,
  columns = "id, preferred_currency",
): Promise<QueryResult<T>> {
  const query = supabase
    .from("user_contacts")
    .select(columns) as LatestUserContactQuery<T>;

  const result = await query
    .eq("user_id", userId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    await reportEdgeFunctionError({
      functionName: "shared/user-contacts",
      error: result.error,
      context: { operation: "user_contacts.fetch_latest", userId, columns },
    });
  }

  return result;
}
