interface Proposal {
  envelope_id: string;
  suggested_amount_cents: number;
  pocket_name?: string;
  categories?: string[];
  new_pocket?: boolean;
}

// Category identity normalization is not natural-language classification.
const categoryKey = (value: string) => value.trim().toLowerCase();

export function validatePocketProposals<T extends Proposal>(
  suggestions: T[],
  knownIds: string[],
  evidenceCategories: string[],
  total: number,
  selectedBudget: number,
  onReject?: (reason: string, details?: Record<string, unknown>) => void,
): Array<T & { new_pocket?: boolean }> | null {
  const firstPlan = knownIds.length === 0;
  const reject = (reason: string, details: Record<string, unknown> = {}) => {
    onReject?.(reason, details);
    return null;
  };
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    !Number.isSafeInteger(selectedBudget) ||
    selectedBudget < 0 ||
    (firstPlan && total === 0)
  ) {
    return reject("invalid_plan_total");
  }
  if (selectedBudget > 0 && total > selectedBudget) {
    return reject("total_exceeds_selected_budget");
  }
  if (
    suggestions.length === 0 ||
    suggestions.length > 30 ||
    (firstPlan
      ? suggestions.length > 8
      : suggestions.length !== knownIds.length)
  ) {
    return reject("suggestion_count_invalid", {
      returned_count: suggestions.length,
      known_pocket_count: knownIds.length,
      first_plan: firstPlan,
    });
  }
  const allowedCategories = new Set(evidenceCategories.map(categoryKey));
  if (firstPlan && suggestions.length < Math.min(3, allowedCategories.size)) {
    return reject("too_few_proposed_pockets", {
      returned_count: suggestions.length,
      minimum_count: Math.min(3, allowedCategories.size),
    });
  }
  const assigned = new Set<string>();
  const seenIds = new Set<string>();
  let sum = 0;
  const result: Array<T & { new_pocket?: boolean }> = [];
  for (const row of suggestions) {
    if (
      !Number.isSafeInteger(row.suggested_amount_cents) ||
      row.suggested_amount_cents < 0
    ) {
      return reject("invalid_suggested_amount");
    }
    if (seenIds.has(row.envelope_id)) return reject("duplicate_proposal_id");
    if (
      firstPlan
        ? !/^draft-[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(row.envelope_id)
        : !knownIds.includes(row.envelope_id)
    ) {
      return reject("invalid_proposal_id", { first_plan: firstPlan });
    }
    seenIds.add(row.envelope_id);
    sum += row.suggested_amount_cents;
    if (!Number.isSafeInteger(sum)) return reject("unsafe_suggested_total");
    if (!firstPlan) {
      result.push(row);
      continue;
    }
    const name = row.pocket_name?.trim();
    if (!name || name.length > 80)
      return reject("invalid_proposed_pocket_name");
    if (!row.categories?.length) return reject("proposed_categories_missing");
    const categories = row.categories.map(categoryKey);
    for (const category of categories) {
      if (!allowedCategories.has(category))
        return reject("category_not_in_evidence");
      if (assigned.has(category))
        return reject("category_assigned_more_than_once");
      assigned.add(category);
    }
    result.push({ ...row, pocket_name: name, categories, new_pocket: true });
  }
  return sum === total ? result : reject("suggested_total_mismatch");
}

export function overlayPocketReviewActuals(
  month: Record<string, unknown>,
  actuals: unknown[],
  cycleStart: string,
  currency: string,
): Record<string, unknown> {
  const rpcActuals = Array.isArray(month.actual_expenses)
    ? month.actual_expenses
    : [];
  const merged: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  // RPC rows come first: both their economic effect and privacy redaction win.
  for (const value of [...rpcActuals, ...actuals]) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    const id = typeof row.id === "string" && row.id ? row.id : undefined;
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    if (!Number.isSafeInteger(row.amount_cents)) continue;
    merged.push({
      ...(id ? { id } : {}),
      type: row.type === "income" ? "income" : "expense",
      amount_cents: row.amount_cents,
      category: typeof row.category === "string" ? row.category : null,
      date: typeof row.date === "string" ? row.date : undefined,
      currency,
    });
  }
  return {
    ...month,
    period_month: cycleStart,
    selected_currency: currency,
    actual_expenses: merged,
  };
}

export function pocketReviewRegionalContext(timezone: unknown) {
  let resolved: string | null = null;
  if (typeof timezone === "string" && timezone.trim()) {
    try {
      resolved = new Intl.DateTimeFormat("en", {
        timeZone: timezone.trim(),
      }).resolvedOptions().timeZone;
    } catch {
      // Fixed offsets and ambiguous zones cannot establish a country.
      if (/^UTC[+-](?:0\d|1[0-4]):[0-5]\d$/.test(timezone.trim())) {
        resolved = timezone.trim();
      }
    }
  }
  return {
    timezone: resolved,
    regional_hint: resolved,
    country: "unknown" as const,
  };
}
