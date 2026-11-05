import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export interface ExpenseNotificationAudience {
  hasSplit: boolean;
  involvedUserIds: string[];
  shareCentsByUser?: Record<string, number>;
  totalCents?: number;
  currency?: string;
}

interface ExpenseNotificationItem {
  id: string;
  data: Record<string, unknown>;
  previousAudience?: ExpenseNotificationAudience | null;
}

interface SplitGroupRow {
  id: string;
  expense_id: string;
  payer_user_id: string;
  total_amount_cents: number;
  currency: string;
}

interface SplitLineRow {
  split_group_id: string;
  user_id: string;
  amount_cents: number | null;
}

const pageSize = 200;

async function readAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0;; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Notification audience read returned no data");
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

// Capture before edits/deletes: split replacement and soft-delete cleanup can
// remove the only record of someone whose financial allocation changed.
export async function loadHouseholdExpenseNotificationAudiences(
  supabase: SupabaseClient,
  householdId: string,
  expenseIds: string[],
): Promise<Map<string, ExpenseNotificationAudience>> {
  const ids = [...new Set(expenseIds)];
  const audiences = new Map<string, ExpenseNotificationAudience>(
    ids.map((id) => [id, { hasSplit: false, involvedUserIds: [] }]),
  );
  for (let offset = 0; offset < ids.length; offset += 100) {
    const chunk = ids.slice(offset, offset + 100);
    const groups = await readAllRows<SplitGroupRow>((from, to) =>
      supabase.from("expense_split_groups")
        .select("id, expense_id, payer_user_id, total_amount_cents, currency")
        .eq("household_id", householdId)
        .in("expense_id", chunk)
        .order("id")
        .range(from, to)
    );
    if (groups.length === 0) continue;
    const lines = await readAllRows<SplitLineRow>((from, to) =>
      supabase.from("expense_split_lines")
        .select("split_group_id, user_id, amount_cents")
        .in("split_group_id", groups.map((group) => group.id))
        .order("id")
        .range(from, to)
    );
    for (const group of groups) {
      const groupLines = lines.filter((line) =>
        line.split_group_id === group.id
      );
      const total = Number(group.total_amount_cents);
      if (
        !group.payer_user_id || !Number.isSafeInteger(total) || total <= 0 ||
        groupLines.length === 0 ||
        groupLines.some((line) =>
          !line.user_id || line.amount_cents == null ||
          !Number.isSafeInteger(Number(line.amount_cents)) ||
          Number(line.amount_cents) < 0
        ) ||
        groupLines.reduce((sum, line) => sum + Number(line.amount_cents), 0) !==
          total
      ) {
        throw new Error(
          "Cannot determine notification audience from incomplete split",
        );
      }
      audiences.set(group.expense_id, {
        hasSplit: true,
        shareCentsByUser: Object.fromEntries(
          groupLines.map((line) => [line.user_id, Number(line.amount_cents)]),
        ),
        totalCents: total,
        currency: group.currency,
        involvedUserIds: [
          ...new Set([
            group.payer_user_id,
            ...groupLines.filter((line) => Number(line.amount_cents) > 0)
              .map((line) => line.user_id),
          ]),
        ],
      });
    }
  }
  return audiences;
}

export async function notifyHouseholdExpenseBatch({
  supabase,
  householdId,
  actorUserId,
  eventType,
  expenses,
}: {
  supabase: SupabaseClient;
  householdId: string;
  actorUserId: string;
  eventType: "expense_added" | "expense_edited" | "expense_deleted";
  expenses: ExpenseNotificationItem[];
}): Promise<{ error: unknown }> {
  try {
    if (expenses.length === 0) return { error: null };
    if (
      eventType !== "expense_added" &&
      expenses.some((expense) => expense.previousAudience == null)
    ) {
      throw new Error("Previous notification audience is unavailable");
    }
    const current = eventType === "expense_deleted"
      ? new Map<string, ExpenseNotificationAudience>()
      : await loadHouseholdExpenseNotificationAudiences(
        supabase,
        householdId,
        expenses.map((expense) => expense.id),
      );
    const audiences = new Map(expenses.map((expense) => {
      const before = expense.previousAudience;
      const after = current.get(expense.id);
      return [expense.id, {
        hasSplit: before?.hasSplit === true || after?.hasSplit === true,
        involvedUserIds: new Set([
          ...(before?.involvedUserIds ?? []),
          ...(after?.involvedUserIds ?? []),
        ]),
      }];
    }));
    if (eventType === "expense_added") {
      for (const expense of expenses) {
        const audience = current.get(expense.id)!;
        if (
          audience.hasSplit &&
          (audience.totalCents !== Number(expense.data.amount_cents) ||
            audience.currency !== expense.data.currency)
        ) {
          throw new Error(
            "Expense changed before its notification audience was captured",
          );
        }
      }
    }
    const members = await readAllRows<{ user_id: string }>((from, to) =>
      supabase.from("household_members").select("user_id")
        .eq("household_id", householdId)
        .order("user_id")
        .range(from, to)
    );
    const rows = [];
    for (const userId of new Set(members.map((member) => member.user_id))) {
      if (userId === actorUserId) continue;
      const included = expenses.filter((expense) => {
        const audience = audiences.get(expense.id)!;
        return !audience.hasSplit || audience.involvedUserIds.has(userId);
      });
      if (included.length === 0) continue;
      const addedAudience =
        eventType === "expense_added" && included.length === 1
          ? current.get(included[0].id)
          : undefined;
      // A recipient may be involved in only one row of a larger batch. Give
      // that event its real single-expense payload, never an amount-less count.
      const payload = included.length === 1
        ? {
          expense_id: included[0].id,
          actor_user_id: actorUserId,
          expense_data: included[0].data,
          ...(addedAudience
            ? {
              recipient_split: {
                version: 1,
                recipient_user_id: userId,
                has_split: addedAudience.hasSplit,
                share_cents: addedAudience.shareCentsByUser?.[userId] ?? 0,
                total_cents: addedAudience.totalCents ?? null,
                currency: addedAudience.currency ?? null,
              },
            }
            : {}),
        }
        : {
          actor_name: included[0].data.actor_name,
          actor_user_id: actorUserId,
          batch_count: included.length,
          recurring_count: included.filter((expense) =>
            expense.data.is_recurring === true
          ).length,
          household_id: householdId,
        };
      rows.push({
        household_id: householdId,
        user_id: userId,
        event_type: eventType,
        payload,
      });
    }
    for (let offset = 0; offset < rows.length; offset += pageSize) {
      const { error } = await supabase.from("notification_events")
        .insert(rows.slice(offset, offset + pageSize));
      if (error) return { error };
    }
    return { error: null };
  } catch (error) {
    // Notification failures must neither broadcast to an unknown audience nor
    // turn a successfully saved financial mutation into a client retry.
    return { error };
  }
}

// Preserve the established RPC input/payload contract at existing call sites.
// Income and acknowledgement events retain their current recipient policy.
export async function notifyHouseholdTransactionMembers(
  supabase: SupabaseClient,
  params: {
    p_household_id: string | null;
    p_expense_id: string;
    p_actor_user_id: string;
    p_event_type: string;
    p_expense_data: Record<string, unknown>;
  },
  previousAudience?: ExpenseNotificationAudience | null,
): Promise<{ error: unknown }> {
  if (
    params.p_event_type !== "expense_added" &&
    params.p_event_type !== "expense_edited" &&
    params.p_event_type !== "expense_deleted"
  ) {
    return await supabase.rpc("notify_household_members_expense", params);
  }
  if (!params.p_household_id) {
    return { error: new Error("Notification household is unavailable") };
  }
  return await notifyHouseholdExpenseBatch({
    supabase,
    householdId: params.p_household_id,
    actorUserId: params.p_actor_user_id,
    eventType: params.p_event_type,
    expenses: [{
      id: params.p_expense_id,
      data: params.p_expense_data,
      previousAudience,
    }],
  });
}
