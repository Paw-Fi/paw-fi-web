/**
 * Shared category resolution pipeline.
 *
 * Encapsulates the exact same category resolution order used by
 * `analyze-expense` (see shared/analyze-core.ts:4625-4707) so that
 * `save-wallet-transaction` produces identical category outcomes.
 *
 * Resolution order (from analyze-core.ts):
 *  1. Apply explicit remap on the initial guess → track if remap matched
 *  2. Apply learned preferences on the BASE guess (not remapped)
 *  3. Merge: use remap result if remap matched, else use preference result
 *  4. Apply remap AGAIN after preference application (for non-locked rows)
 *  5. Coerce final category to the user's allowed category set
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  type UserCategoryPreferenceRow,
  type UserCategoryRemapRow,
  fetchUserCustomCategories,
  fetchUserHiddenCategories,
  fetchUserCategoryPreferences,
  fetchUserCategoryRemaps,
  mergeAllowedCategories,
  applyCategoryRemap,
  applyPreferencesToItems,
  normalizeStoredUserCategory,
} from "./user-categories.ts";
import { coerceCategoryToAllowed } from "./category-colors.ts";

export interface CategoryContext {
  allowedExpenseSet: Set<string>;
  allowedIncomeSet: Set<string>;
  preferences: UserCategoryPreferenceRow[];
  remaps: UserCategoryRemapRow[];
}

/**
 * Load all user-specific category data needed for resolution.
 */
export async function loadCategoryContext(params: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<CategoryContext> {
  const [customCategories, hiddenCategories, preferences, remaps] =
    await Promise.all([
      fetchUserCustomCategories({
        supabase: params.supabase,
        userId: params.userId,
      }),
      fetchUserHiddenCategories({
        supabase: params.supabase,
        userId: params.userId,
      }),
      fetchUserCategoryPreferences({
        supabase: params.supabase,
        userId: params.userId,
        limit: 100,
      }),
      fetchUserCategoryRemaps({
        supabase: params.supabase,
        userId: params.userId,
        limit: 120,
      }),
    ]);

  const { allowedExpenseSet, allowedIncomeSet } = mergeAllowedCategories({
    customCategories,
    hiddenCategories,
  });

  return {
    allowedExpenseSet,
    allowedIncomeSet,
    preferences,
    remaps,
  };
}

/**
 * Resolve the final category for a single transaction item.
 *
 * Replicates the exact logic from analyze-core.ts lines 4625-4707
 * but operates on a single item instead of an array.
 *
 * @param initialGuess     - The raw category guess (e.g., from merchant map).
 * @param description      - The merchant/description text for preference matching.
 * @param transactionType  - "expense" or "income"
 * @param ctx              - Pre-loaded category context
 * @returns The resolved category name ready for storage.
 */
export function resolveCategory(params: {
  initialGuess: string;
  description: string | null;
  transactionType: "expense" | "income";
  ctx: CategoryContext;
}): string {
  const { initialGuess, description, transactionType, ctx } = params;
  const { allowedExpenseSet, allowedIncomeSet, preferences, remaps } = ctx;

  // ── Step 1: Apply explicit remap on the initial guess ─────────────────
  const normalizedSource = normalizeStoredUserCategory(initialGuess);
  const afterRemap = applyCategoryRemap({
    categoryName: initialGuess,
    transactionType,
    remaps,
    allowedExpenseCategories: allowedExpenseSet,
    allowedIncomeCategories: allowedIncomeSet,
  });
  const remapMatched = afterRemap !== normalizedSource;

  // ── Step 2: Apply preferences on the BASE (un-remapped) guess ─────────
  const baseItem = {
    type: transactionType,
    description: description ?? undefined,
    category: initialGuess,
  };
  const [preferredItem] = applyPreferencesToItems({
    items: [baseItem],
    preferences,
    allowedExpenseCategories: allowedExpenseSet,
    allowedIncomeCategories: allowedIncomeSet,
  });

  // ── Step 3: Merge — remap wins if it matched, otherwise preference ────
  const afterMerge = remapMatched
    ? afterRemap
    : preferredItem.category;

  // ── Step 4: Apply remap AGAIN after preferences (for non-locked rows) ─
  const afterSecondRemap = applyCategoryRemap({
    categoryName: afterMerge,
    transactionType,
    remaps,
    allowedExpenseCategories: allowedExpenseSet,
    allowedIncomeCategories: allowedIncomeSet,
  });

  // ── Step 5: Coerce to the user's allowed category set ─────────────────
  const allowed =
    transactionType === "income" ? allowedIncomeSet : allowedExpenseSet;
  const finalCategory = coerceCategoryToAllowed(afterSecondRemap, allowed);

  return finalCategory;
}
