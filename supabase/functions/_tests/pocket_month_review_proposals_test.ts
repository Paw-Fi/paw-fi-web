/// <reference lib="deno.ns" />

import {
  overlayPocketReviewActuals,
  pocketReviewRegionalContext,
  validatePocketProposals,
} from "../generate-pocket-month-review/review-proposals.ts";

import { deriveKnownCashFlow } from "../generate-pocket-month-review/review-analysis.ts";
import { buildPocketReviewResponseSchema } from "../generate-pocket-month-review/review-generation.ts";

// Import production pure functions without opening the Edge HTTP listener.
const serve = Deno.serve;
let handler: (request: Request) => Response | Promise<Response> = () =>
  new Response();
let endpoint: typeof import("../generate-pocket-month-review/index.ts");
try {
  Deno.serve = ((callback: typeof handler) => {
    handler = callback;
    return {};
  }) as unknown as typeof Deno.serve;
  endpoint = await import("../generate-pocket-month-review/index.ts");
} finally {
  Deno.serve = serve;
}

function firstPlanContext() {
  const previous = endpoint.buildContext(
    overlayPocketReviewActuals(
      {},
      [
        { category: "سكن", amount_cents: 20000, date: "2026-08-31" },
        { category: "食料品", amount_cents: 10000, date: "2026-09-02" },
      ],
      "2026-08-31",
      "EUR",
    ),
    "previous",
  );
  const current = endpoint.buildContext(
    overlayPocketReviewActuals(
      {
        projected_recurring_expenses: [
          { category: "transport", amount_cents: 5000, date: "2026-10-04" },
        ],
        budget: { total_budget_cents: 40000 },
      },
      [{ category: "食料品", amount_cents: 2500, date: "2026-10-01" }],
      "2026-09-30",
      "EUR",
    ),
    "current",
  );
  return {
    ...endpoint.buildSuggestionContext(
      current,
      current,
      [previous],
      deriveKnownCashFlow({
        dataStatus: "complete",
        recordedIncomeCents: 50000,
        projectedRecurringIncomeCents: 0,
        actualExpenseCents: 2500,
        projectedRecurringExpenseCents: 5000,
        incomingCarryCents: 0,
      }),
      [],
      [],
    ),
    allowed_expense_categories: ["سكن", "食料品", "transport"],
  };
}

Deno.test(
  "existing budget is fully split even when AI proposes a higher or lower total",
  () => {
    for (const factor of [0.5, 2]) {
      const context = firstPlanContext();
      const result = endpoint.normalize(
        {
          headline: "計画 {{budget}}",
          summary: "記録に基づく配分 {{budget}}",
          insights: [],
          income_coverage_status: context.cash_flow.income_coverage_status,
          month_funding_status: context.cash_flow.month_funding_status,
          suggested_total_budget_cents: 35000 * factor + 1,
          suggestions: rows().map((row) => ({
            ...row,
            suggested_amount_cents: row.suggested_amount_cents * factor,
            reason: `配分 {{pocket:${row.envelope_id}}}`,
          })),
        },
        context,
        "zh",
      );
      assert(
        result !== null,
        "Over-budget model output must not reject the plan",
      );
      assert(result.suggested_total_budget_cents === 40000);
      assert(
        result.suggestions.reduce(
          (sum, row) => sum + row.suggested_amount_cents,
          0,
        ) === 40000,
      );
      assert(!result.summary.includes("{{"));
      assert(result.suggestions.every((row) => !row.reason.includes("{{")));
    }
  },
);

Deno.test(
  "without a saved budget the reviewed total comes from the evidence-based recommendation",
  () => {
    const context = { ...firstPlanContext(), total_budget_cents: 0 };
    const result = endpoint.normalize(
      {
        headline: "Plan",
        summary: "Based on recorded spending",
        insights: [],
        income_coverage_status: context.cash_flow.income_coverage_status,
        month_funding_status: context.cash_flow.month_funding_status,
        suggested_total_budget_cents: 35000,
        suggestions: rows().map((row) => ({
          ...row,
          reason: "Recorded activity",
        })),
      },
      context,
      "en",
    );
    assert(result?.suggested_total_budget_cents === 35000);
  },
);

Deno.test(
  "first-plan model schema requires the metadata enforced by validation",
  () => {
    const schema = buildPocketReviewResponseSchema(true);
    const suggestion = schema.properties.suggestions.items;
    assert(suggestion.required.includes("pocket_name"));
    assert(suggestion.required.includes("categories"));
    assert(!("enum" in suggestion.properties.categories.items));
    assert(!("enum" in suggestion.properties.envelope_id));
  },
);

Deno.test(
  "translated model statuses and invalid optional insight types preserve valid pocket allocations",
  () => {
    const context = firstPlanContext();
    const omitted: string[] = [];
    const result = endpoint.normalize(
      {
        headline: "本月计划",
        summary: "根据已记录的开支分配预算",
        income_coverage_status: "充裕",
        month_funding_status: "已覆盖",
        insights: [
          {
            type: "预算建议",
            title: "开支记录",
            summary: "根据实际开支制定计划",
          },
        ],
        suggested_total_budget_cents: 35000,
        suggestions: rows().map((row) => ({
          ...row,
          reason: "根据已有记录分配",
        })),
      },
      context,
      "zh",
      undefined,
      (paths) => omitted.push(...paths),
    );
    assert(result !== null);
    assert(
      result.financial_status === context.cash_flow.income_coverage_status,
    );
    assert(result.suggested_total_budget_cents === 40000);
    assert(result.insights.length === 0);
    assert(JSON.stringify(omitted) === '["insights.0.type"]');
  },
);

Deno.test(
  "proposal rejection logs identify constraints without exposing financial data",
  () => {
    const failures: string[] = [];
    const reject = (reason: string) => failures.push(reason);
    const suggestions = rows();
    suggestions[0].categories = ["not-in-evidence"];
    assert(
      validatePocketProposals(
        suggestions,
        [],
        ["سكن", "食料品", "transport"],
        35000,
        40000,
        reject,
      ) === null,
    );
    assert(JSON.stringify(failures) === '["category_not_in_catalog"]');
    failures.length = 0;
    assert(
      validatePocketProposals(
        rows(),
        [],
        ["سكن", "食料品", "transport"],
        35000,
        30000,
        reject,
      ) !== null,
    );
    assert(
      failures.length === 0,
      "The final allocator enforces the budget cap",
    );
    failures.length = 0;
    assert(
      validatePocketProposals(
        rows(),
        [],
        ["سكن", "食料品", "transport"],
        35001,
        0,
        reject,
      ) === null,
    );
    assert(JSON.stringify(failures) === '["suggested_total_mismatch"]');
  },
);

Deno.test(
  "production existing-pocket plans retain exact names, known IDs and complete coverage",
  () => {
    const current = endpoint.buildContext(
      {
        selected_currency: "EUR",
        period_month: "2026-09-30",
        budget: { total_budget_cents: 40000 },
        envelopes: [
          {
            id: "known-pocket",
            name: "既存の予算",
            icon: "house",
            color: "#123456",
            base_budget_amount_cents: 20000,
          },
        ],
      },
      "current",
    );
    const context = endpoint.buildSuggestionContext(
      current,
      current,
      [],
      firstPlanContext().cash_flow,
      [],
      [],
    );
    const review = {
      headline: "Plan",
      summary: "Recorded activity",
      insights: [],
      income_coverage_status: context.cash_flow.income_coverage_status,
      month_funding_status: context.cash_flow.month_funding_status,
      suggested_total_budget_cents: 20000,
      suggestions: [
        {
          envelope_id: "known-pocket",
          pocket_name: "Do not use this model name",
          suggested_amount_cents: 20000,
          reason: "Recorded activity",
        },
      ],
    };
    const result = endpoint.normalize(review, context, "ja");
    assert(result?.suggestions[0].pocket_name === "既存の予算");
    assert(
      result.suggestions[0].icon === "house" &&
        result.suggestions[0].new_pocket === undefined,
    );
    assert(
      endpoint.normalize({ ...review, suggestions: [] }, context, "ja") ===
        null,
    );
    assert(
      endpoint.normalize(
        {
          ...review,
          suggestions: [{ ...review.suggestions[0], envelope_id: "unknown" }],
        },
        context,
        "ja",
      ) === null,
    );
  },
);

Deno.test(
  "production context uses complete previous and current evidence before any pockets exist",
  () => {
    const context = firstPlanContext();
    assert(context.current_cycle.actual_spend_cents === 2500);
    assert(context.current_cycle.projected_recurring_cents === 5000);
    assert(context.previous_cycle?.actual_spend_cents === 30000);
    assert(context.previous_cycle?.period_start === "2026-08-31");
    assert(
      context.pockets.length === 0 &&
        context.cash_flow.incoming_carry_cents === 0,
    );
    assert(context.cash_flow.recorded_income_cents === 50000);
  },
);

Deno.test(
  "production normalization returns a complete review-only first plan and exact rounded budget",
  () => {
    const context = firstPlanContext();
    const result = endpoint.normalize(
      {
        headline: "خطة لهذا الشهر",
        summary: "مراجعة المصروفات المسجلة",
        insights: [],
        income_coverage_status: context.cash_flow.income_coverage_status,
        month_funding_status: context.cash_flow.month_funding_status,
        suggested_total_budget_cents: 35000,
        suggestions: rows().map((row) => ({
          ...row,
          reason: "استناداً إلى المصروفات المسجلة",
        })),
      },
      context,
      "ar",
    );
    assert(result?.suggestions.length === 3);
    assert(result.can_apply_with_existing_clients === false);
    assert(
      result.application_limitation?.includes("cannot apply brand-new pockets"),
    );
    assert(
      result.suggestions.every(
        (row) => row.new_pocket && row.icon && row.color,
      ),
    );
    assert(
      result.suggestions.every((row) => row.incoming_carry_cents === undefined),
    );
    assert(
      result.suggested_total_budget_cents ===
        result.suggestions.reduce(
          (sum, row) => sum + row.suggested_amount_cents,
          0,
        ),
    );
  },
);

Deno.test(
  "production normalization rejects unobserved categories and invented rollover metadata",
  () => {
    const context = firstPlanContext();
    const review = {
      headline: "Plan",
      summary: "Evidence-based plan",
      insights: [],
      income_coverage_status: context.cash_flow.income_coverage_status,
      month_funding_status: context.cash_flow.month_funding_status,
      suggested_total_budget_cents: 35000,
      suggestions: rows().map((row) => ({
        ...row,
        reason: "Observed activity",
      })),
    };
    assert(
      endpoint.normalize(
        {
          ...review,
          suggestions: review.suggestions.map((row) => ({
            ...row,
            incoming_carry_cents: 100,
          })),
        },
        context,
        "en",
      ) === null,
    );
    assert(
      endpoint.normalize(
        {
          ...review,
          suggestions: review.suggestions.map((row, index) =>
            index === 0 ? { ...row, categories: ["invented"] } : row,
          ),
        },
        context,
        "en",
      ) === null,
    );
  },
);

Deno.test(
  "configured day remains 31 across February and older-cycle traversal",
  () => {
    assert(endpoint.previousMonthKey("2026-03-31", 31) === "2026-02-28");
    assert(endpoint.previousMonthKey("2026-02-28", 31) === "2026-01-31");
  },
);

Deno.test(
  "HTTP generation returns first-plan drafts without writes for Personal, private and shared Spaces",
  async () => {
    const originalFetch = globalThis.fetch;
    const envNames = [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "GOOGLE_CLOUD_SERVICE_ACCOUNT",
    ];
    const priorEnv = envNames.map((name) => Deno.env.get(name));
    const key = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );
    const privateKey = new Uint8Array(
      await crypto.subtle.exportKey("pkcs8", key.privateKey),
    );
    Deno.env.set("SUPABASE_URL", "https://pocket-test.invalid");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-only-service-key");
    Deno.env.set(
      "GOOGLE_CLOUD_SERVICE_ACCOUNT",
      JSON.stringify({
        project_id: "pocket-test",
        client_email: "test@pocket.invalid",
        token_uri: "https://pocket-token.invalid",
        private_key: `-----BEGIN PRIVATE KEY-----\n${btoa(
          String.fromCharCode(...privateKey),
        )}\n-----END PRIVATE KEY-----`,
      }),
    );
    const actor = "00000000-0000-4000-8000-000000000001";
    const spaceId = "abcdefab-0000-4000-8000-000000000002";
    let scope = "personal";
    let plan = "new";
    let locale: string | undefined;
    let previousRpcFails = false;
    let suppliedPrompt = "";
    let noEvidence = false;
    let modelCalls = 0;
    let suppliedContext: Record<string, unknown> = {};
    const reply = (body: unknown, headers: Record<string, string> = {}) =>
      new Response(JSON.stringify(body), {
        headers: { "Content-Type": "application/json", ...headers },
      });
    globalThis.fetch = async (request, init) => {
      const url = new URL(
        request instanceof Request ? request.url : String(request),
      );
      const method =
        init?.method ?? (request instanceof Request ? request.method : "GET");
      const requestBody =
        init?.body ??
        (request instanceof Request ? await request.text() : undefined);
      if (url.hostname === "pocket-token.invalid") {
        return reply({ access_token: "test-access-token" });
      }
      if (url.hostname === "aiplatform.googleapis.com") {
        modelCalls++;
        const body = JSON.parse(String(requestBody));
        const prompt = body.contents
          .flatMap((content: { parts: { text?: string }[] }) =>
            content.parts.map((part) => part.text ?? ""),
          )
          .join("");
        suppliedPrompt = prompt;
        suppliedContext = JSON.parse(
          prompt.split("AUTHORITATIVE_CONTEXT:\n")[1],
        );
        const cashFlow = suppliedContext.cash_flow as Record<string, string>;
        return reply({
          candidates: [
            {
              content: {
                role: "model",
                parts: [
                  {
                    text: JSON.stringify({
                      headline: "خطة للشهر",
                      summary: "استناداً إلى المصروفات المسجلة",
                      insights: [],
                      income_coverage_status: cashFlow.income_coverage_status,
                      month_funding_status: cashFlow.month_funding_status,
                      suggested_total_budget_cents: 35000,
                      suggestions: (plan === "new"
                        ? rows()
                        : [
                            {
                              envelope_id: "known-pocket",
                              suggested_amount_cents: 35000,
                            },
                          ]
                      ).map((row) => ({
                        ...row,
                        reason: "مصروفات مسجلة",
                      })),
                    }),
                  },
                ],
              },
            },
          ],
        });
      }
      assert(
        url.hostname === "pocket-test.invalid",
        `Unexpected network request: ${url}`,
      );
      if (url.pathname === "/auth/v1/user") return reply({ id: actor });
      if (url.pathname.endsWith("/subscriptions")) {
        return reply({ plan: "lifetime", status: "active" });
      }
      if (url.pathname.endsWith("/user_contacts")) {
        assert(
          new Headers(
            init?.headers ??
              (request instanceof Request ? request.headers : undefined),
          ).get("authorization") === "Bearer test-user-jwt",
          "Contact read must be JWT-scoped",
        );
        return reply({
          preferred_language: "ar",
          preferred_timezone: "Europe/Paris",
          financial_month_start_day: 31,
        });
      }
      if (url.pathname.endsWith("/households")) {
        assert(
          url.searchParams.get("id") === `eq.${spaceId}`,
          "Space UUID must be canonical lowercase",
        );
        return reply({
          id: spaceId,
          name: "منزلنا",
          owner_id: actor,
          is_portfolio: scope === "portfolio",
        });
      }
      if (url.pathname.endsWith("/user_transaction_categories")) {
        return reply(
          ["سكن", "食料品", "transport"].map((name) => ({
            name,
            transaction_type: "expense",
          })),
        );
      }
      if (url.pathname.endsWith("/user_hidden_transaction_categories")) {
        return reply([]);
      }
      if (url.pathname.endsWith("/household_members")) {
        return method === "HEAD"
          ? new Response(null, { headers: { "content-range": "0-2/3" } })
          : reply({ household_id: spaceId });
      }
      if (url.pathname.endsWith("/expenses")) {
        assert(
          method === "GET",
          "Generation must never write transaction rows",
        );
        if (url.searchParams.has("id")) return reply([]);
        const previous = url.searchParams.get("date") === "gte.2026-08-31";
        const actuals = noEvidence
          ? []
          : previous
            ? [
                {
                  id: "1",
                  amount_cents: 20000,
                  category: "سكن",
                  date: "2026-09-01",
                  analytics_spending_multiplier: 1,
                },
                {
                  id: "2",
                  amount_cents: 10000,
                  category: "食料品",
                  date: "2026-09-02",
                  analytics_spending_multiplier: 1,
                },
              ]
            : [
                {
                  id: "3",
                  amount_cents: 50000,
                  category: "income",
                  date: "2026-10-01",
                  analytics_spending_multiplier: 0,
                  analytics_counts_toward_income: true,
                },
              ];
        return reply(
          actuals.map((row) => ({
            ...row,
            user_id: actor,
            privacy_scope: "full",
            currency: "EUR",
            analytics_is_final: true,
          })),
        );
      }
      if (url.pathname.endsWith("/rpc/get_pockets_month_v3")) {
        const body = JSON.parse(String(requestBody));
        if (body.p_budget_month === "2026-08-31" && previousRpcFails)
          return new Response(
            JSON.stringify({
              code: "08006",
              message: "Previous RPC unavailable",
            }),
            { status: 500 },
          );
        if (body.p_budget_month === "2026-08-31" && plan === "previous")
          return reply({
            envelopes: [
              {
                id: "known-pocket",
                name: "既存の予算",
                base_budget_amount_cents: 30000,
                remaining_cents: 5000,
                rollover_enabled: true,
              },
            ],
            category_links: [
              { envelope_id: "known-pocket", category: "食料品" },
            ],
          });
        if (body.p_budget_month !== "2026-09-30") return reply(null);
        return reply({
          budget: { total_budget_cents: 40000 },
          envelopes:
            plan === "current"
              ? [
                  {
                    id: "known-pocket",
                    name: "既存の予算",
                    base_budget_amount_cents: 30000,
                  },
                ]
              : [],
          actual_expenses: noEvidence
            ? []
            : [
                {
                  id: "rpc-hidden",
                  amount_cents: 1700,
                  category: null,
                  date: "2026-10-01",
                  raw_text: "hidden-rpc-description",
                  merchant: "hidden-rpc-merchant",
                  user_id: "hidden-rpc-member",
                },
              ],
          projected_recurring_expenses: noEvidence
            ? []
            : [
                {
                  category: "transport",
                  amount_cents: 5000,
                  date: "2026-10-04",
                },
              ],
        });
      }
      if (
        url.pathname.endsWith("/rpc/get_projected_scoped_recurring_expenses_v1")
      ) {
        const body = JSON.parse(String(requestBody));
        assert(
          body.p_range_end === "2026-10-30",
          "A September 30 clamped day-31 cycle ends October 30",
        );
        return reply([]);
      }
      throw new Error(
        `Unexpected read or forbidden write: ${method} ${url.pathname}`,
      );
    };
    const request = () =>
      new Request("https://pocket-test.invalid/review", {
        method: "POST",
        headers: { Authorization: "Bearer test-user-jwt" },
        body: JSON.stringify({
          scope,
          householdId: scope === "personal" ? null : spaceId.toUpperCase(),
          locale,
          currency: "EUR",
          cycleStart: "2026-09-30",
        }),
      });
    try {
      for (const kind of ["personal", "portfolio", "household"]) {
        scope = kind;
        const response = await handler(request());
        const body = await response.json();
        assert(response.status === 200, JSON.stringify(body));
        assert(body.suggestions.suggested_total_budget_cents === 40000);
        assert(
          (suppliedContext.budget_policy as { mode: string }).mode ===
            "split_fixed_budget",
        );
        assert(
          (suppliedContext.allowed_new_pocket_categories as string[]).includes(
            "groceries",
          ),
          "Use the app catalog, not invented or translated historical labels",
        );
        assert(
          body.suggestions.suggestions.every(
            (row: { new_pocket?: boolean }) => row.new_pocket,
          ),
        );
        assert(body.suggestions.can_apply_with_existing_clients === false);
        assert(body.usesPreviousMonthPockets === false);
        assert((suppliedContext.space as { kind: string }).kind === kind);
        if (kind === "household") {
          const cashFlow = suppliedContext.cash_flow as Record<string, unknown>;
          assert(cashFlow.data_status === "partial");
          assert(
            cashFlow.income_coverage_status === "unknown",
            "Shared privacy must not become a complete household income claim",
          );
        }
        assert(
          (suppliedContext.regional_context as { country: string }).country ===
            "unknown",
        );
        assert(
          (suppliedContext.cash_flow as { recorded_income_cents: number })
            .recorded_income_cents === 50000,
        );
        assert(!JSON.stringify(suppliedContext).includes("merchant" + "_name"));
        assert(
          (suppliedContext.current_cycle as { actual_spend_cents: number })
            .actual_spend_cents === 1700,
          "RPC-only balances-only spending must survive the direct evidence read",
        );
        assert(!JSON.stringify(suppliedContext).includes("hidden-rpc-"));
      }
      noEvidence = true;
      const response = await handler(request());
      assert(response.status === 409);
      assert((await response.json()).code === "POCKETS_REQUIRED");
      assert(modelCalls === 3, "Insufficient evidence must not call the model");
      noEvidence = false;
      locale = "ja";
      for (const source of ["current", "previous"]) {
        plan = source;
        const response = await handler(request());
        const body = await response.json();
        assert(response.status === 200, JSON.stringify(body));
        assert(body.usesPreviousMonthPockets === (source === "previous"));
        const suggestion = body.suggestions.suggestions[0];
        assert(
          suggestion.envelope_id === "known-pocket" &&
            suggestion.pocket_name === "既存の予算",
        );
        assert(suggestion.new_pocket === undefined);
        assert(
          suggestion.incoming_carry_cents ===
            (source === "previous" ? 5000 : 0),
        );
        assert(
          suppliedPrompt.includes("in ja only"),
          "Explicit locale must override stored Arabic",
        );
      }
      previousRpcFails = true;
      plan = "current";
      const failedHistory = await handler(request());
      assert(
        failedHistory.status === 500,
        "Shared previous RPC failures cannot silently omit hidden spending",
      );
      assert(
        Number(modelCalls) === 5,
        "Incomplete shared history must not reach the model",
      );
    } finally {
      globalThis.fetch = originalFetch;
      envNames.forEach((name, index) =>
        priorEnv[index] == null
          ? Deno.env.delete(name)
          : Deno.env.set(name, priorEnv[index]!),
      );
    }
  },
);

function assert(value: unknown, message = "Assertion failed"): asserts value {
  if (!value) throw new Error(message);
}

const rows = () => [
  {
    envelope_id: "draft-1",
    pocket_name: "المنزل",
    categories: ["سكن"],
    suggested_amount_cents: 20000,
  },
  {
    envelope_id: "draft-2",
    pocket_name: "食費",
    categories: ["食料品"],
    suggested_amount_cents: 10000,
  },
  {
    envelope_id: "draft-3",
    pocket_name: "Transports",
    categories: ["transport"],
    suggested_amount_cents: 5000,
  },
];
const validate = (suggestions = rows(), total = 35000, budget = 40000) =>
  validatePocketProposals(
    suggestions,
    [],
    ["سكن", "食料品", "transport"],
    total,
    budget,
  );

Deno.test(
  "first plan returns localized review-only draft metadata without carry",
  () => {
    const result = validate();
    assert(result?.length === 3);
    assert(result[0].new_pocket === true && result[0].pocket_name === "المنزل");
    assert(JSON.stringify(result[1].categories) === '["食料品"]');
    assert(!("incoming_carry_cents" in result[0]));
  },
);

Deno.test(
  "first plan rejects invented, duplicate, or empty category assignments",
  () => {
    for (const categories of [
      ["invented"],
      ["سكن"],
      [],
      ["transport", "transport"],
    ]) {
      const suggestions = rows();
      suggestions[2].categories = categories;
      assert(validate(suggestions) === null);
    }
  },
);

Deno.test(
  "first plan normalizes category identity without language heuristics",
  () => {
    const suggestions = rows();
    suggestions[2].categories = [" TRANSPORT "];
    assert(validate(suggestions)?.[2].categories?.[0] === "transport");
  },
);

Deno.test(
  "first plan rejects database IDs, duplicate drafts and invalid names",
  () => {
    for (const envelope_id of [
      "draft-1",
      "c9f02d77-0605-4c18-91d3-990224a7d1b4",
      "draft-",
      "draft-../3",
    ]) {
      const suggestions = rows();
      suggestions[2].envelope_id = envelope_id;
      assert(validate(suggestions) === null);
    }
    for (const pocket_name of [" ", "x".repeat(81)]) {
      const suggestions = rows();
      suggestions[0].pocket_name = pocket_name;
      assert(validate(suggestions) === null);
    }
  },
);

Deno.test(
  "first plan validates exact safe-cent totals before capped allocation",
  () => {
    assert(validate(rows(), 35001, 0) === null);
    assert(validate(rows(), 35000, 34999) !== null);
    assert(validate(rows(), 35000, Number.MAX_SAFE_INTEGER + 1) === null);
    for (const amount of [
      -1,
      0.1,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      const suggestions = rows();
      suggestions[0].suggested_amount_cents = amount;
      assert(validate(suggestions) === null);
    }
    assert(
      validate(
        rows().map((row) => ({ ...row, suggested_amount_cents: 0 })),
        0,
        0,
      ) === null,
    );
    assert(validate(rows(), 35000, 0) !== null);
  },
);

Deno.test(
  "first plan permits few categories but never more than eight draft pockets",
  () => {
    assert(validate(rows().slice(0, 1), 20000) !== null);
    assert(
      validatePocketProposals(rows().slice(0, 1), [], ["سكن"], 20000, 0) !==
        null,
    );
    const suggestions = Array.from({ length: 9 }, (_, index) => ({
      envelope_id: `draft-${index}`,
      pocket_name: `Pocket ${index}`,
      categories: [`category-${index}`],
      suggested_amount_cents: 100,
    }));
    assert(
      validatePocketProposals(
        suggestions,
        [],
        suggestions.flatMap((row) => row.categories),
        900,
        0,
      ) === null,
    );
    assert(validatePocketProposals([], [], [], 0, 0) === null);
  },
);

Deno.test("existing plans require the complete exact known ID set", () => {
  const suggestions = rows().map(({ envelope_id, suggested_amount_cents }) => ({
    envelope_id,
    suggested_amount_cents,
  }));
  assert(
    validatePocketProposals(
      suggestions,
      ["draft-1", "draft-2", "draft-3"],
      [],
      35000,
      0,
    ),
  );
  assert(
    validatePocketProposals(
      suggestions.slice(1),
      ["draft-1", "draft-2", "draft-3"],
      [],
      15000,
      0,
    ) === null,
  );
  assert(
    validatePocketProposals(
      suggestions,
      ["draft-1", "draft-2", "other"],
      [],
      35000,
      0,
    ) === null,
  );
});

Deno.test(
  "actual evidence merges RPC and direct rows even without envelopes",
  () => {
    const actuals = [
      { category: "食料品", amount_cents: 12345, date: "2026-09-30" },
    ];
    const original = {
      envelopes: [],
      actual_expenses: [{ id: "rpc-only", amount_cents: 1 }],
      projected_recurring_expenses: [{ amount_cents: 200 }],
    };
    const result = overlayPocketReviewActuals(
      original,
      actuals,
      "2026-09-30",
      "EUR",
    );
    assert((result.actual_expenses as unknown[]).length === 2);
    assert(
      result.period_month === "2026-09-30" &&
        result.selected_currency === "EUR",
    );
    assert(
      result.projected_recurring_expenses ===
        original.projected_recurring_expenses,
    );
    assert(original.actual_expenses[0].amount_cents === 1);
    const missingPreviousRpc = overlayPocketReviewActuals(
      {},
      actuals,
      "2026-08-31",
      "EUR",
    );
    assert(missingPreviousRpc.period_month === "2026-08-31");
    assert((missingPreviousRpc.actual_expenses as unknown[]).length === 1);
  },
);

Deno.test(
  "RPC actuals retain hidden spending and authoritative redaction when direct rows overlap",
  () => {
    const result = overlayPocketReviewActuals(
      {
        actual_expenses: [
          {
            id: "shared",
            amount_cents: 7000,
            category: null,
            date: "2026-10-01",
            raw_text: "secret-description",
          },
          {
            id: "hidden",
            amount_cents: 9000,
            category: null,
            date: "2026-10-02",
          },
          { id: "unsafe", amount_cents: Number.MAX_SAFE_INTEGER + 1 },
        ],
      },
      [
        {
          id: "shared",
          amount_cents: 8000,
          category: "private-category",
          merchant: "secret-merchant",
          user_id: "private-member",
        },
        {
          id: "supplement",
          amount_cents: 1000,
          category: "食料品",
          date: "2026-10-02",
        },
        { id: "income", amount_cents: 50000, type: "income" },
        ...[NaN, Infinity, 1.5, "1200", null].map((amount_cents) => ({
          amount_cents,
        })),
      ],
      "2026-09-30",
      "EUR",
    );
    const actuals = result.actual_expenses as Record<string, unknown>[];
    assert(actuals.length === 4);
    assert(actuals.find((row) => row.id === "shared")?.amount_cents === 7000);
    assert(actuals.find((row) => row.id === "shared")?.category === null);
    assert(
      !JSON.stringify(result).includes("secret-") &&
        !JSON.stringify(result).includes("private-"),
    );
    const context = endpoint.buildContext(result, "current");
    assert(context.actual_spend_cents === 17000);
    assert(!JSON.stringify(context).includes('"id":"shared"'));
  },
);

Deno.test(
  "regional context preserves timezone hints but never guesses country",
  () => {
    for (const timezone of [
      "Europe/Paris",
      "America/New_York",
      "Asia/Kolkata",
      "UTC",
      "UTC+05:30",
      null,
      "invalid",
    ]) {
      const result = pocketReviewRegionalContext(timezone);
      assert(result.country === "unknown");
      if (timezone === "Europe/Paris") assert(result.timezone === timezone);
      if (timezone === "invalid") assert(result.timezone === null);
    }
  },
);
