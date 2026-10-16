export const POCKET_REVIEW_INSIGHT_TYPES = [
  "cash_flow",
  "upcoming_commitment",
  "budget_adjustment",
  "spending_pattern",
  "reallocation",
  "positive_progress",
  "rollover",
] as const;

export const POCKET_REVIEW_GENERATION_BUDGET_MS = 45_000;
export const POCKET_REVIEW_ATTEMPT_TIMEOUT_MS = 15_000;

export function preparePocketReviewResponse(
  value: unknown,
  cashFlow: { income_coverage_status: string; month_funding_status: string },
  onDiscardedInsights?: (paths: string[]) => void,
): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const response = value as Record<string, unknown>;
  const discardedPaths: string[] = [];
  const allowedTypes = new Set<string>(POCKET_REVIEW_INSIGHT_TYPES);
  const insights = Array.isArray(response.insights)
    ? response.insights.filter((item, index) => {
        if (
          item &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          !allowedTypes.has(item.type)
        ) {
          discardedPaths.push(`insights.${index}.type`);
          return false;
        }
        return true;
      })
    : response.insights;
  if (discardedPaths.length > 0) onDiscardedInsights?.(discardedPaths);
  return {
    ...response,
    income_coverage_status: cashFlow.income_coverage_status,
    month_funding_status: cashFlow.month_funding_status,
    insights,
  };
}

// Keep user-dependent catalogs and constraints out of Vertex's schema compiler.
// The prompt supplies those facts; Zod and plan validation remain authoritative.
export function buildPocketReviewResponseSchema(firstPlan: boolean) {
  return {
    type: "OBJECT",
    properties: {
      headline: { type: "STRING" },
      summary: { type: "STRING" },
      insights: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: [...POCKET_REVIEW_INSIGHT_TYPES] },
            title: { type: "STRING" },
            summary: { type: "STRING" },
            action: { type: "STRING" },
            estimated_impact_cents: { type: "INTEGER" },
            envelope_id: { type: "STRING" },
          },
          required: ["type", "title", "summary"],
        },
      },
      suggested_total_budget_cents: { type: "INTEGER" },
      suggestions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            envelope_id: { type: "STRING" },
            suggested_amount_cents: { type: "INTEGER" },
            pocket_name: { type: "STRING" },
            categories: { type: "ARRAY", items: { type: "STRING" } },
            reason: { type: "STRING" },
            tip: { type: "STRING" },
          },
          required: [
            "envelope_id",
            "suggested_amount_cents",
            "reason",
            ...(firstPlan ? ["pocket_name", "categories"] : []),
          ],
        },
      },
    },
    required: [
      "headline",
      "summary",
      "insights",
      "suggested_total_budget_cents",
      "suggestions",
    ],
  };
}

export async function sendPocketReviewMessage<T>({
  prompt,
  firstPlan,
  maxOutputTokens,
  send,
  onSchemaRejected,
  deadlineAt = Date.now() + POCKET_REVIEW_GENERATION_BUDGET_MS,
  now = Date.now,
}: {
  prompt: string;
  firstPlan: boolean;
  maxOutputTokens: number;
  send: (
    content: string,
    generationConfig: Record<string, unknown>,
    timeoutMs: number,
  ) => Promise<T>;
  onSchemaRejected?: () => void;
  deadlineAt?: number;
  now?: () => number;
}): Promise<T> {
  const responseSchema = buildPocketReviewResponseSchema(firstPlan);
  const config = {
    temperature: 0.2,
    maxOutputTokens,
    responseMimeType: "application/json",
  };
  const request = (
    content: string,
    generationConfig: Record<string, unknown>,
  ) => {
    const remainingMs = deadlineAt - now();
    if (remainingMs <= 0)
      throw new DOMException("AI review deadline exceeded", "TimeoutError");
    return send(
      content,
      generationConfig,
      Math.min(POCKET_REVIEW_ATTEMPT_TIMEOUT_MS, remainingMs),
    );
  };
  try {
    return await request(prompt, { ...config, responseSchema });
  } catch (error) {
    const failure = error as {
      status?: number;
      response?: { data?: { error?: { status?: string } } };
    } | null;
    if (
      failure?.status !== 400 ||
      failure.response?.data?.error?.status !== "INVALID_ARGUMENT"
    ) {
      throw error;
    }
    onSchemaRejected?.();
    // Retry once without provider schema compilation. The response still passes
    // the exact same local shape, category, scope and financial validation.
    return await request(
      `Return only a JSON object in this format. RESPONSE_FORMAT:\n${JSON.stringify(responseSchema)}\n\n${prompt}`,
      config,
    );
  }
}
