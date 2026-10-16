// Keep user-dependent catalogs and constraints out of Vertex's schema compiler.
// The prompt supplies those facts; Zod and plan validation remain authoritative.
export function buildPocketReviewResponseSchema(firstPlan: boolean) {
  return {
    type: "OBJECT",
    properties: {
      headline: { type: "STRING" },
      summary: { type: "STRING" },
      income_coverage_status: { type: "STRING" },
      month_funding_status: { type: "STRING" },
      insights: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING" },
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
      "income_coverage_status",
      "month_funding_status",
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
}: {
  prompt: string;
  firstPlan: boolean;
  maxOutputTokens: number;
  send: (
    content: string,
    generationConfig: Record<string, unknown>,
  ) => Promise<T>;
  onSchemaRejected?: () => void;
}): Promise<T> {
  const responseSchema = buildPocketReviewResponseSchema(firstPlan);
  const config = {
    temperature: 0.2,
    maxOutputTokens,
    responseMimeType: "application/json",
  };
  try {
    return await send(prompt, { ...config, responseSchema });
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
    return await send(
      `Return only a JSON object in this format. RESPONSE_FORMAT:\n${JSON.stringify(responseSchema)}\n\n${prompt}`,
      config,
    );
  }
}
