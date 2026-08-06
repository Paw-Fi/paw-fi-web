import { formatAmount } from "../formatting-helpers.ts";
import { formatInvokeError } from "../formatting-helpers.ts";

type SupabaseLike = {
  from: (table: string) => any;
};

export type PendingBudgetDraft = {
  amount: number;
  currency: string;
  date: string;
  period_month: string;
  household_id: string | null;
  household_name?: string;
  is_portfolio?: boolean;
  pockets?: Array<{
    name: string;
    percentage: number;
    categories: string[];
    color?: string;
    icon?: string;
  }>;
  created_at: string;
};

export type LastListedTransaction = {
  id: string;
  amountMajor: number;
  currency: string;
  date: string;
  category: string;
  description: string;
  type?: "expense" | "income";
  household_id?: string | null;
};

export type LastListedTransactionsMemory = {
  items: LastListedTransaction[];
  saved_at: string;
};

/**
 * Stores the currently active recurring transaction context.
 * Used when the user is working with pending occurrences for a specific recurring.
 */
export type ActiveRecurringContext = {
  recurring_id: string;
  description?: string;
  category?: string;
  amount?: number;
  currency?: string;
  saved_at: string;
};

/**
 * Stores the currently active transaction context for multi-turn conversations.
 * Used when the AI is discussing a specific transaction (e.g., asking user to confirm deletion).
 */
export type ActiveTransactionContext = {
  transaction_id: string;
  description?: string;
  category?: string;
  amount?: number;
  currency?: string;
  date?: string;
  type?: "expense" | "income";
  household_id?: string | null;
  saved_at: string;
};

export type SessionState = {
  moneko_state?: {
    pending_budget?: PendingBudgetDraft;
    last_listed_transactions?: LastListedTransactionsMemory;
    active_recurring?: ActiveRecurringContext;
    active_transaction?: ActiveTransactionContext;
  };
};

export type TransactionMatch = {
  amount?: number;
  date?: string;
  description_contains?: string;
  category?: string;
  currency?: string;
  type?: "expense" | "income";
};

const LAST_LISTED_TTL_MS = 2 * 60 * 60 * 1000;

type SessionStatePersistenceOptions =
  | boolean
  | { debugEnabled?: boolean; logPrefix?: string };

function normalizePersistenceOptions(
  options: SessionStatePersistenceOptions = {},
): { debugEnabled: boolean; logPrefix?: string } {
  if (typeof options === "boolean") {
    return { debugEnabled: options };
  }
  return {
    debugEnabled: options.debugEnabled ?? true,
    logPrefix: options.logPrefix,
  };
}

export function normalizeSessionState(raw: unknown): SessionState {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as SessionState;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as SessionState;
      }
    } catch {
      // ignore parse errors
    }
  }
  return {};
}

export async function loadSessionState(
  supabase: SupabaseLike,
  sessionId: string,
  debugNotes: string[],
  options: SessionStatePersistenceOptions = {},
): Promise<SessionState> {
  const persistenceOptions = normalizePersistenceOptions(options);
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("system_prompt")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) {
    const formatted = formatInvokeError(error);
    if (persistenceOptions.debugEnabled) {
      debugNotes.push(`chat_sessions load state error: ${formatted}`);
    }
    if (persistenceOptions.logPrefix) {
      console.error(
        `[${persistenceOptions.logPrefix}] chat_sessions state load error`,
        {
          error,
          formatted,
        },
      );
    }
    return {};
  }
  return normalizeSessionState((data as any)?.system_prompt);
}

export async function saveSessionState(
  supabase: SupabaseLike,
  sessionId: string,
  state: SessionState,
  debugNotes: string[],
  options: SessionStatePersistenceOptions = {},
): Promise<void> {
  const persistenceOptions = normalizePersistenceOptions(options);
  const { error } = await supabase
    .from("chat_sessions")
    .update({
      system_prompt: state,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (error) {
    const formatted = formatInvokeError(error);
    if (persistenceOptions.debugEnabled) {
      debugNotes.push(`chat_sessions save state error: ${formatted}`);
    }
    if (persistenceOptions.logPrefix) {
      console.error(
        `[${persistenceOptions.logPrefix}] chat_sessions state save error`,
        {
          error,
          formatted,
        },
      );
    }
  }
}

export function normalizeLastListedTransactionFromRow(
  row: any,
): LastListedTransaction | null {
  if (!row || typeof row !== "object") return null;
  const idRaw = (row as any).id;
  const id = typeof idRaw === "string" ? idRaw : String(idRaw || "");
  if (!id) return null;

  const cents = (row as any).amount_cents;
  const amountMajor =
    typeof cents === "number" && Number.isFinite(cents)
      ? cents / 100
      : Number((row as any).amount) || 0;

  const currency = String((row as any).currency || "").toUpperCase();
  const date = String((row as any).date || "").slice(0, 10);
  const category = String((row as any).category || "").trim();
  const description = String(
    (row as any).raw_text ?? (row as any).description ?? "",
  ).trim();
  const typeRaw = String((row as any).type || "expense").toLowerCase();
  const type = typeRaw === "income" ? "income" : "expense";
  const householdIdRaw = (row as any).household_id;
  const household_id =
    householdIdRaw == null ? null : String(householdIdRaw || "") || null;

  return {
    id,
    amountMajor,
    currency,
    date,
    category,
    description,
    type,
    household_id,
  };
}

export function readLastListedTransactions(state: SessionState | null): {
  items: LastListedTransaction[] | null;
  expired: boolean;
} {
  const memory = state?.moneko_state?.last_listed_transactions;
  if (!memory || typeof memory !== "object") {
    return { items: null, expired: false };
  }
  const savedAt = (memory as any).saved_at;
  const savedAtMs = typeof savedAt === "string" ? Date.parse(savedAt) : NaN;
  if (!Number.isFinite(savedAtMs)) {
    return { items: null, expired: true };
  }
  if (Date.now() - savedAtMs > LAST_LISTED_TTL_MS) {
    return { items: null, expired: true };
  }
  const rawItems = Array.isArray((memory as any).items)
    ? ((memory as any).items as any[])
    : [];
  const items = rawItems
    .map((item) => (item && typeof item === "object" ? item : null))
    .filter(Boolean) as LastListedTransaction[];
  return { items: items.slice(0, 25), expired: false };
}

export function setLastListedTransactions(
  state: SessionState | null,
  items: LastListedTransaction[],
): SessionState {
  const base = normalizeSessionState(state);
  return {
    ...base,
    moneko_state: {
      ...(base.moneko_state || {}),
      last_listed_transactions: {
        items: (items || []).slice(0, 25),
        saved_at: new Date().toISOString(),
      },
    },
  };
}

export function clearLastListedTransactions(
  state: SessionState | null,
): SessionState {
  const base = normalizeSessionState(state);
  if (!base.moneko_state?.last_listed_transactions) return base;
  const { last_listed_transactions: _last, ...rest } = base.moneko_state;
  if (Object.keys(rest).length === 0) {
    const { moneko_state: _state, ...withoutState } = base;
    return withoutState;
  }
  return { ...base, moneko_state: rest };
}

const ACTIVE_RECURRING_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Reads the active recurring context from session state.
 * Returns null if not set or expired.
 */
export function readActiveRecurringContext(
  state: SessionState | null,
): ActiveRecurringContext | null {
  const context = state?.moneko_state?.active_recurring;
  if (!context || typeof context !== "object") return null;

  const savedAt = (context as any).saved_at;
  const savedAtMs = typeof savedAt === "string" ? Date.parse(savedAt) : NaN;
  if (!Number.isFinite(savedAtMs)) return null;
  if (Date.now() - savedAtMs > ACTIVE_RECURRING_TTL_MS) return null;

  const recurringId = (context as any).recurring_id;
  if (typeof recurringId !== "string" || !recurringId.trim()) return null;

  return {
    recurring_id: recurringId.trim(),
    description: typeof (context as any).description === "string"
      ? (context as any).description
      : undefined,
    category: typeof (context as any).category === "string"
      ? (context as any).category
      : undefined,
    amount: typeof (context as any).amount === "number"
      ? (context as any).amount
      : undefined,
    currency: typeof (context as any).currency === "string"
      ? (context as any).currency
      : undefined,
    saved_at: savedAt,
  };
}

/**
 * Sets the active recurring context in session state.
 * Call this when showing pending occurrences for a recurring transaction.
 */
export function setActiveRecurringContext(
  state: SessionState | null,
  context: Omit<ActiveRecurringContext, "saved_at">,
): SessionState {
  const base = normalizeSessionState(state);
  return {
    ...base,
    moneko_state: {
      ...(base.moneko_state || {}),
      active_recurring: {
        ...context,
        saved_at: new Date().toISOString(),
      },
    },
  };
}

/**
 * Clears the active recurring context from session state.
 */
export function clearActiveRecurringContext(
  state: SessionState | null,
): SessionState {
  const base = normalizeSessionState(state);
  if (!base.moneko_state?.active_recurring) return base;
  const { active_recurring: _active, ...rest } = base.moneko_state;
  if (Object.keys(rest).length === 0) {
    const { moneko_state: _state, ...withoutState } = base;
    return withoutState;
  }
  return { ...base, moneko_state: rest };
}

const ACTIVE_TRANSACTION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Reads the active transaction context from session state.
 * Returns null if not set or expired.
 */
export function readActiveTransactionContext(
  state: SessionState | null,
): ActiveTransactionContext | null {
  const context = state?.moneko_state?.active_transaction;
  if (!context || typeof context !== "object") return null;

  const savedAt = (context as any).saved_at;
  const savedAtMs = typeof savedAt === "string" ? Date.parse(savedAt) : NaN;
  if (!Number.isFinite(savedAtMs)) return null;
  if (Date.now() - savedAtMs > ACTIVE_TRANSACTION_TTL_MS) return null;

  const transactionId = (context as any).transaction_id;
  if (typeof transactionId !== "string" || !transactionId.trim()) return null;

  return {
    transaction_id: transactionId.trim(),
    description: typeof (context as any).description === "string"
      ? (context as any).description
      : undefined,
    category: typeof (context as any).category === "string"
      ? (context as any).category
      : undefined,
    amount: typeof (context as any).amount === "number"
      ? (context as any).amount
      : undefined,
    currency: typeof (context as any).currency === "string"
      ? (context as any).currency
      : undefined,
    date: typeof (context as any).date === "string"
      ? (context as any).date
      : undefined,
    type: (context as any).type === "income" ? "income" : 
          (context as any).type === "expense" ? "expense" : undefined,
    household_id: typeof (context as any).household_id === "string"
      ? (context as any).household_id
      : (context as any).household_id === null ? null : undefined,
    saved_at: savedAt,
  };
}

/**
 * Sets the active transaction context in session state.
 * Call this when discussing a specific transaction for potential update/delete.
 */
export function setActiveTransactionContext(
  state: SessionState | null,
  context: Omit<ActiveTransactionContext, "saved_at">,
): SessionState {
  const base = normalizeSessionState(state);
  return {
    ...base,
    moneko_state: {
      ...(base.moneko_state || {}),
      active_transaction: {
        ...context,
        saved_at: new Date().toISOString(),
      },
    },
  };
}

/**
 * Clears the active transaction context from session state.
 */
export function clearActiveTransactionContext(
  state: SessionState | null,
): SessionState {
  const base = normalizeSessionState(state);
  if (!base.moneko_state?.active_transaction) return base;
  const { active_transaction: _active, ...rest } = base.moneko_state;
  if (Object.keys(rest).length === 0) {
    const { moneko_state: _state, ...withoutState } = base;
    return withoutState;
  }
  return { ...base, moneko_state: rest };
}

export function normalizeMatchString(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function matchesTransaction(
  item: LastListedTransaction,
  match: TransactionMatch,
): boolean {
  if (match.amount != null) {
    const amt = Number(match.amount);
    if (!Number.isFinite(amt)) return false;
    if (Math.abs((item.amountMajor || 0) - amt) > 0.009) return false;
  }
  if (match.date) {
    const d = String(match.date || "").slice(0, 10);
    if (d && item.date !== d) return false;
  }
  if (match.currency) {
    const cur = String(match.currency || "")
      .trim()
      .toUpperCase();
    if (cur && item.currency.toUpperCase() !== cur) return false;
  }
  if (match.type) {
    const t =
      String(match.type).toLowerCase() === "income" ? "income" : "expense";
    if ((item.type || "expense") !== t) return false;
  }
  if (match.category) {
    const cat = normalizeMatchString(match.category);
    if (cat && normalizeMatchString(item.category) !== cat) return false;
  }
  if (match.description_contains) {
    const needle = normalizeMatchString(match.description_contains);
    if (needle && !normalizeMatchString(item.description).includes(needle)) {
      return false;
    }
  }
  return true;
}

export function buildChoiceSummary(
  item: LastListedTransaction,
  spaceName?: string | null,
): string {
  const amountText = formatAmount(
    item.amountMajor || 0,
    item.currency || "USD",
  );
  const pieces = [
    item.date,
    amountText,
    item.category || "",
    item.description || "",
    spaceName ? `(${spaceName})` : "",
  ].filter((p) => String(p || "").trim().length > 0);
  return pieces.join(" - ");
}

export function resolveLastListedSelection(
  items: LastListedTransaction[],
  args: {
    selection_index?: unknown;
    match?: unknown;
  },
  spaceNameByHouseholdId?: (
    householdId: string | null | undefined,
  ) => string | null,
):
  | { candidate: LastListedTransaction }
  | {
      needs_disambiguation: true;
      choices: Array<{ index: number; summary: string }>;
    }
  | { error: string } {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    return {
      error:
        "No matching transaction found. Ask user to list recent transactions first or provide more details.",
    };
  }

  const rawIndex = Number(args.selection_index);
  if (Number.isFinite(rawIndex)) {
    const idx = Math.trunc(rawIndex);
    if (idx >= 1 && idx <= list.length) {
      return { candidate: list[idx - 1] };
    }
    return {
      error: `Invalid selection_index. Ask the user to reply with a number from the last list (1..${list.length}).`,
    };
  }

  const matchRaw = args.match;
  const match: TransactionMatch =
    matchRaw && typeof matchRaw === "object" && !Array.isArray(matchRaw)
      ? (matchRaw as TransactionMatch)
      : {};

  const filtered = Object.keys(match).length
    ? list.filter((item) => matchesTransaction(item, match))
    : [];

  if (filtered.length === 1) {
    return { candidate: filtered[0] };
  }

  const choicesSource = filtered.length ? filtered : list;
  const choices = choicesSource
    .slice(0, 10)
    .map((item) => {
      const index = list.findIndex((x) => x.id === item.id) + 1;
      const spaceName = spaceNameByHouseholdId
        ? spaceNameByHouseholdId(item.household_id)
        : null;
      return {
        index: index > 0 ? index : 0,
        summary: buildChoiceSummary(item, spaceName),
      };
    })
    .filter((c) => c.index > 0);

  if (choices.length === 1) {
    const only = list[choices[0].index - 1];
    if (only) return { candidate: only };
  }

  if (choices.length > 1) {
    return { needs_disambiguation: true, choices };
  }

  return {
    error:
      "No matching transaction found. Ask user to list recent transactions first or provide more details.",
  };
}
