const MAX_TEXT_LENGTH = 280;
const MAX_ITEMS = 4;
const MONEY_PATTERN =
  /(?:[$€£¥]|\b[A-Z]{3}\s?)[\d,.]+|\b\d[\d,.]*\s?(?:cents?|USD|EUR|GBP|CAD|AUD|JPY)\b/i;

export interface PocketMonthReviewText {
  text: string;
  fact_ids: string[];
}

export interface PocketMonthReviewExplanation extends PocketMonthReviewText {
  pocket_lineage_id: string;
}

export interface PocketMonthReview {
  headline: PocketMonthReviewText;
  celebration: PocketMonthReviewText;
  previous_cycle_summary: PocketMonthReviewText;
  attention_items: PocketMonthReviewText[];
  recommendations: PocketMonthReviewText[];
  pocket_explanations: PocketMonthReviewExplanation[];
}

export interface CuratedPocketMonthReviewContext {
  [key: string]: unknown;
  facts: unknown[];
  suggestions: unknown[];
}

export function buildCuratedPocketMonthReviewContext(
  month: Record<string, unknown>,
): CuratedPocketMonthReviewContext | null {
  const facts = month.normalized_calculation_facts;
  const pockets = month.pockets_v4;
  if (!Array.isArray(facts) || !pockets || typeof pockets !== "object") {
    return null;
  }
  const review = (pockets as Record<string, unknown>).review;
  const suggestions = review && typeof review === "object"
    ? (review as Record<string, unknown>).suggestions
    : null;
  if (!Array.isArray(suggestions)) return null;
  return { facts, suggestions };
}

export function isPocketMonthReviewPermissionError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    (error as Record<string, unknown>).code === "42501"
  );
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 && normalized.length <= MAX_TEXT_LENGTH
    ? normalized
    : null;
}

function normalizeFactIds(
  value: unknown,
  validFactIds: Set<string>,
): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) return null;
  const ids = value.filter(
    (id): id is string => typeof id === "string" && validFactIds.has(id),
  );
  return ids.length === value.length ? [...new Set(ids)] : null;
}

function normalizeTextItem(
  value: unknown,
  validFactIds: Set<string>,
): PocketMonthReviewText | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const text = normalizeText(item.text);
  const factIds = normalizeFactIds(item.fact_ids, validFactIds);
  if (!text || !factIds) return null;
  if (MONEY_PATTERN.test(text) && factIds.length === 0) return null;
  return { text, fact_ids: factIds };
}

export function normalizePocketMonthReview(
  value: unknown,
  factIds: Iterable<string>,
  validLineageIds: Iterable<string>,
): PocketMonthReview | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const review = value as Record<string, unknown>;
  const validFacts = new Set(factIds);
  const validLineages = new Set(validLineageIds);
  const headline = normalizeTextItem(review.headline, validFacts);
  const celebration = normalizeTextItem(review.celebration, validFacts);
  const previousCycleSummary = normalizeTextItem(
    review.previous_cycle_summary,
    validFacts,
  );
  const attentionItems = Array.isArray(review.attention_items)
    ? review.attention_items.map((item) => normalizeTextItem(item, validFacts))
    : [];
  const recommendations = Array.isArray(review.recommendations)
    ? review.recommendations.map((item) => normalizeTextItem(item, validFacts))
    : [];
  const explanations = Array.isArray(review.pocket_explanations)
    ? review.pocket_explanations.map((item) => {
      const normalized = normalizeTextItem(item, validFacts);
      const lineageId = item && typeof item === "object"
        ? (item as Record<string, unknown>).pocket_lineage_id
        : null;
      return normalized &&
          typeof lineageId === "string" &&
          validLineages.has(lineageId)
        ? { ...normalized, pocket_lineage_id: lineageId }
        : null;
    })
    : [];

  if (
    !headline ||
    !celebration ||
    !previousCycleSummary ||
    attentionItems.some((item) => item == null) ||
    recommendations.some((item) => item == null) ||
    explanations.some((item) => item == null) ||
    attentionItems.length > MAX_ITEMS ||
    recommendations.length > MAX_ITEMS ||
    explanations.length > MAX_ITEMS
  ) {
    return null;
  }

  return {
    headline,
    celebration,
    previous_cycle_summary: previousCycleSummary,
    attention_items: attentionItems as PocketMonthReviewText[],
    recommendations: recommendations as PocketMonthReviewText[],
    pocket_explanations: explanations as PocketMonthReviewExplanation[],
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)]),
  );
}

export async function hashPocketMonthReviewInput(
  value: unknown,
): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(canonicalize(value)));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function buildPocketMonthReviewFallback(): PocketMonthReview {
  return {
    headline: { text: "Your pocket plan is ready to review.", fact_ids: [] },
    celebration: {
      text: "You can adjust this cycle at your own pace.",
      fact_ids: [],
    },
    previous_cycle_summary: {
      text: "Your verified pocket details are shown below.",
      fact_ids: [],
    },
    attention_items: [],
    recommendations: [],
    pocket_explanations: [],
  };
}
