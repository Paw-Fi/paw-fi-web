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
): Array<T & { new_pocket?: boolean }> | null {
  const firstPlan = knownIds.length === 0;
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    !Number.isSafeInteger(selectedBudget) ||
    selectedBudget < 0 ||
    (selectedBudget > 0 && total > selectedBudget) ||
    suggestions.length === 0 ||
    suggestions.length > 30 ||
    (firstPlan
      ? suggestions.length > 8 || total === 0
      : suggestions.length !== knownIds.length)
  ) {
    return null;
  }
  const allowedCategories = new Set(evidenceCategories.map(categoryKey));
  if (firstPlan && suggestions.length < Math.min(3, allowedCategories.size)) {
    return null;
  }
  const assigned = new Set<string>();
  const seenIds = new Set<string>();
  let sum = 0;
  const result: Array<T & { new_pocket?: boolean }> = [];
  for (const row of suggestions) {
    if (
      !Number.isSafeInteger(row.suggested_amount_cents) ||
      row.suggested_amount_cents < 0 ||
      seenIds.has(row.envelope_id) ||
      (firstPlan
        ? !/^draft-[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(row.envelope_id)
        : !knownIds.includes(row.envelope_id))
    ) {
      return null;
    }
    seenIds.add(row.envelope_id);
    sum += row.suggested_amount_cents;
    if (!Number.isSafeInteger(sum)) return null;
    if (!firstPlan) {
      result.push(row);
      continue;
    }
    const name = row.pocket_name?.trim();
    if (!name || name.length > 80 || !row.categories?.length) return null;
    const categories = row.categories.map(categoryKey);
    for (const category of categories) {
      if (!allowedCategories.has(category) || assigned.has(category)) {
        return null;
      }
      assigned.add(category);
    }
    result.push({ ...row, pocket_name: name, categories, new_pocket: true });
  }
  return sum === total ? result : null;
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
