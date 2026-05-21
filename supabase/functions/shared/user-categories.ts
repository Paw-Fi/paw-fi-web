import {
  getExpenseCategories,
  getIncomeCategories,
  normalizeCategoryForStorage,
  normalizePreferenceMatchKey,
  sanitizeCategoryName,
} from "./category-colors.ts";

type SupabaseClient = {
  from: (table: string) => any;
};

export type CategoryTransactionType = "expense" | "income";

export interface UserCategoryRow {
  name: string;
  transaction_type: CategoryTransactionType;
}

export interface UserCategoryPreferenceRow {
  transaction_type: "expense" | "income";
  match_key: string;
  category_name: string;
  use_count: number;
  last_used_at: string | null;
}

export interface UserCategoryRemapRow {
  transaction_type: "expense" | "income";
  from_category_name: string;
  to_category_name: string;
  use_count: number;
  last_used_at: string | null;
}

export interface UserHiddenCategoryRow {
  category_name: string;
  transaction_type: CategoryTransactionType;
}

export function normalizeStoredUserCategory(
  raw: string | null | undefined,
): string {
  const sanitized = sanitizeCategoryName(raw);
  if (sanitized) {
    if (sanitized === "default" || sanitized === "unknown") {
      return "other";
    }
    return sanitized;
  }

  return normalizeCategoryForStorage(raw ?? null);
}

export function mergeAllowedCategories(params: {
  customCategories: Array<UserCategoryRow>;
  hiddenCategories?: Array<UserHiddenCategoryRow>;
}): {
  expenseCategories: string[];
  incomeCategories: string[];
  allowedExpenseSet: Set<string>;
  allowedIncomeSet: Set<string>;
} {
  const baseExpense = getExpenseCategories();
  const baseIncome = getIncomeCategories();

  const expenseSet = new Set<string>(baseExpense);
  const incomeSet = new Set<string>(baseIncome);
  const customExpenseOrder: string[] = [];
  const customIncomeOrder: string[] = [];

  for (const row of params.customCategories) {
    const name = sanitizeCategoryName(row?.name ?? null) ??
      normalizeCategoryForStorage(row?.name ?? null);
    if (!name || RESERVED_CUSTOM_CATEGORY_NAMES.has(name)) {
      continue;
    }

    if (row.transaction_type === "expense") {
      expenseSet.add(name);
      customExpenseOrder.push(name);
      continue;
    }

    if (row.transaction_type === "income") {
      incomeSet.add(name);
      customIncomeOrder.push(name);
      continue;
    }
  }

  for (const row of params.hiddenCategories ?? []) {
    const name = sanitizeCategoryName(row?.category_name ?? null) ??
      normalizeCategoryForStorage(row?.category_name ?? null);
    if (!name || name === "other" || name === "uncategorized") {
      continue;
    }

    if (row.transaction_type === "expense") {
      expenseSet.delete(name);
      continue;
    }

    if (row.transaction_type === "income") {
      incomeSet.delete(name);
      continue;
    }
  }

  // Always keep safe fallbacks.
  expenseSet.add("other");
  expenseSet.add("uncategorized");
  incomeSet.add("other");

  const orderWithCustomPriority = (
    categorySet: Set<string>,
    customOrder: string[],
  ) => {
    const customSet = new Set(customOrder);
    const customCategories = Array.from(customSet)
      .filter((category) => categorySet.has(category))
      .sort();
    const baseCategories = Array.from(categorySet)
      .filter((category) => !customSet.has(category))
      .sort();
    return [...customCategories, ...baseCategories];
  };

  const expenseCategories = orderWithCustomPriority(
    expenseSet,
    customExpenseOrder,
  );
  const incomeCategories = orderWithCustomPriority(
    incomeSet,
    customIncomeOrder,
  );

  return {
    expenseCategories,
    incomeCategories,
    allowedExpenseSet: new Set(expenseCategories),
    allowedIncomeSet: new Set(incomeCategories),
  };
}

export async function fetchUserCustomCategories(params: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<UserCategoryRow[]> {
  const { data, error } = await params.supabase
    .from("user_transaction_categories")
    .select("name, transaction_type")
    .eq("user_id", params.userId)
    .order("updated_at", { ascending: false });

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data
    .map((row: any) => ({
      name: typeof row?.name === "string"
        ? (sanitizeCategoryName(row.name) ?? row.name)
        : "",
      transaction_type: row?.transaction_type === "income" ||
          row?.transaction_type === "expense"
        ? (row.transaction_type as CategoryTransactionType)
        : "expense",
    }))
    .filter((row: UserCategoryRow) => row.name.trim().length > 0);
}

export async function fetchUserHiddenCategories(params: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<UserHiddenCategoryRow[]> {
  const { data, error } = await params.supabase
    .from("user_hidden_transaction_categories")
    .select("category_name, transaction_type")
    .eq("user_id", params.userId)
    .order("updated_at", { ascending: false });

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data
    .map((row: any) => ({
      category_name: typeof row?.category_name === "string"
        ? (sanitizeCategoryName(row.category_name) ?? row.category_name)
        : "",
      transaction_type: row?.transaction_type === "income" ||
          row?.transaction_type === "expense"
        ? (row.transaction_type as CategoryTransactionType)
        : "expense",
    }))
    .filter(
      (row: UserHiddenCategoryRow) => row.category_name.trim().length > 0,
    );
}

export async function fetchUserCategoryPreferences(params: {
  supabase: SupabaseClient;
  userId: string;
  limit?: number;
}): Promise<UserCategoryPreferenceRow[]> {
  const limit = Math.max(0, Math.min(200, Math.trunc(params.limit ?? 50)));

  const { data, error } = await params.supabase
    .from("user_category_preferences")
    .select(
      "transaction_type, match_key, category_name, use_count, last_used_at",
    )
    .eq("user_id", params.userId)
    .order("use_count", { ascending: false })
    .order("last_used_at", { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data
    .map(
      (row: any): UserCategoryPreferenceRow => ({
        transaction_type: row?.transaction_type === "income"
          ? "income"
          : "expense",
        match_key: typeof row?.match_key === "string" ? row.match_key : "",
        category_name: typeof row?.category_name === "string"
          ? row.category_name
          : "other",
        use_count: typeof row?.use_count === "number" ? row.use_count : 0,
        last_used_at: typeof row?.last_used_at === "string"
          ? row.last_used_at
          : null,
      }),
    )
    .filter(
      (row) =>
        row.match_key.trim().length > 0 && row.category_name.trim().length > 0,
    );
}

export async function fetchUserCategoryRemaps(params: {
  supabase: SupabaseClient;
  userId: string;
  limit?: number;
}): Promise<UserCategoryRemapRow[]> {
  const limit = Math.max(0, Math.min(200, Math.trunc(params.limit ?? 80)));

  const { data, error } = await params.supabase
    .from("user_category_remaps")
    .select(
      "transaction_type, from_category_name, to_category_name, use_count, last_used_at",
    )
    .eq("user_id", params.userId)
    .order("use_count", { ascending: false })
    .order("last_used_at", { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data
    .map(
      (row: any): UserCategoryRemapRow => ({
        transaction_type: row?.transaction_type === "income"
          ? "income"
          : "expense",
        from_category_name: typeof row?.from_category_name === "string"
          ? row.from_category_name
          : "",
        to_category_name: typeof row?.to_category_name === "string"
          ? row.to_category_name
          : "",
        use_count: typeof row?.use_count === "number" ? row.use_count : 0,
        last_used_at: typeof row?.last_used_at === "string"
          ? row.last_used_at
          : null,
      }),
    )
    .filter(
      (row) =>
        row.from_category_name.trim().length > 0 &&
        row.to_category_name.trim().length > 0,
    );
}

export async function ensureUserCategory(params: {
  supabase: SupabaseClient;
  userId: string;
  categoryName: string;
  transactionType: "expense" | "income";
}): Promise<void> {
  const category = sanitizeCategoryName(params.categoryName) ??
    normalizeCategoryForStorage(params.categoryName);
  if (!category || category === "other") return;

  // Don't store canonical defaults as custom rows.
  // We consider a category to be canonical if it exists in either built-in list.
  const isCanonical = getExpenseCategories().includes(category) ||
    getIncomeCategories().includes(category);
  if (isCanonical) return;

  const transaction_type: CategoryTransactionType = params.transactionType;

  await params.supabase
    .from("user_transaction_categories")
    .upsert(
      {
        user_id: params.userId,
        name: category,
        transaction_type,
      },
      { onConflict: "user_id,name,transaction_type" },
    )
    .select("id")
    .maybeSingle();
}

const RESERVED_CUSTOM_CATEGORY_NAMES = new Set([
  "other",
  "uncategorized",
  "default",
  "unknown",
]);

export async function upsertUserCustomCategory(params: {
  supabase: SupabaseClient;
  userId: string;
  categoryName: string;
  transactionType: "expense" | "income";
  colorArgb?: number | null;
  iconKey?: string | null;
}): Promise<{ name: string; transactionType: "expense" | "income" }> {
  const name = sanitizeCategoryName(params.categoryName);
  const transactionType = params.transactionType === "income"
    ? "income"
    : "expense";

  if (!name || RESERVED_CUSTOM_CATEGORY_NAMES.has(name)) {
    throw new Error("Invalid category name");
  }

  const colorArgb = Number.isFinite(params.colorArgb)
    ? Math.trunc(Number(params.colorArgb))
    : null;
  const iconKey =
    typeof params.iconKey === "string" && params.iconKey.trim().length > 0
      ? params.iconKey.trim()
      : "tag";

  const { error } = await params.supabase
    .from("user_transaction_categories")
    .upsert(
      {
        user_id: params.userId,
        name,
        transaction_type: transactionType,
        color_argb: colorArgb,
        icon_key: iconKey,
      },
      { onConflict: "user_id,name,transaction_type" },
    );

  if (error) {
    throw error;
  }

  return { name, transactionType };
}

export async function learnUserCategoryPreference(params: {
  supabase: SupabaseClient;
  userId: string;
  transactionType: "expense" | "income";
  categoryName: string;
  sourceText?: string | null;
  descriptionText?: string | null;
}): Promise<void> {
  const category = sanitizeCategoryName(params.categoryName) ??
    normalizeCategoryForStorage(params.categoryName);
  if (!category || category === "other") return;

  const matchKey = normalizePreferenceMatchKey(
    params.sourceText || params.descriptionText || null,
  );
  if (!matchKey) return;

  const existing = await params.supabase
    .from("user_category_preferences")
    .select("use_count")
    .eq("user_id", params.userId)
    .eq("transaction_type", params.transactionType)
    .eq("match_key", matchKey)
    .maybeSingle();

  const nextCount = existing.error || !existing.data
    ? 1
    : Math.max(1, Number(existing.data.use_count || 0) + 1);

  const now = new Date().toISOString();

  await params.supabase
    .from("user_category_preferences")
    .upsert(
      {
        user_id: params.userId,
        transaction_type: params.transactionType,
        match_key: matchKey,
        category_name: category,
        use_count: nextCount,
        last_used_at: now,
      },
      { onConflict: "user_id,transaction_type,match_key" },
    )
    .select("id")
    .maybeSingle();
}

export function applyPreferencesToItems(params: {
  items: Array<{
    type: "expense" | "income";
    description?: string;
    category: string;
  }>;
  preferences: UserCategoryPreferenceRow[];
  allowedExpenseCategories: Set<string>;
  allowedIncomeCategories: Set<string>;
}): Array<{
  type: "expense" | "income";
  description?: string;
  category: string;
}> {
  if (!params.preferences.length) return params.items;

  const prefMapExpense = new Map<string, string>();
  const prefMapIncome = new Map<string, string>();

  for (const pref of params.preferences) {
    const key = pref.match_key.trim();
    if (!key) continue;
    const cat = normalizeStoredUserCategory(pref.category_name);
    if (pref.transaction_type === "income") {
      prefMapIncome.set(key, cat);
    } else {
      prefMapExpense.set(key, cat);
    }
  }

  return params.items.map((item) => {
    const key = normalizePreferenceMatchKey(item.description || null);
    if (!key) return item;

    if (item.type === "income") {
      const preferred = prefMapIncome.get(key);
      if (preferred && params.allowedIncomeCategories.has(preferred)) {
        return { ...item, category: preferred };
      }
      return item;
    }

    const preferred = prefMapExpense.get(key);
    if (preferred && params.allowedExpenseCategories.has(preferred)) {
      return { ...item, category: preferred };
    }
    return item;
  });
}

export function applyCategoryRemap(params: {
  categoryName: string;
  transactionType: "expense" | "income";
  remaps: UserCategoryRemapRow[];
  allowedExpenseCategories?: Set<string>;
  allowedIncomeCategories?: Set<string>;
}): string {
  if (!params.remaps.length) {
    return normalizeStoredUserCategory(params.categoryName);
  }

  const source = normalizeStoredUserCategory(params.categoryName);

  const targetRow = params.remaps.find((row) => {
    if (row.transaction_type !== params.transactionType) return false;
    const from = normalizeStoredUserCategory(row.from_category_name);
    return from === source;
  });

  if (!targetRow) {
    return source;
  }

  const remapped = normalizeStoredUserCategory(targetRow.to_category_name);

  if (params.transactionType === "income") {
    if (!params.allowedIncomeCategories) return remapped;
    return params.allowedIncomeCategories.has(remapped) ? remapped : source;
  }

  if (!params.allowedExpenseCategories) return remapped;
  return params.allowedExpenseCategories.has(remapped) ? remapped : source;
}
