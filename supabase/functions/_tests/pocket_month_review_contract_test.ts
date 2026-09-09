/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  buildCuratedPocketMonthReviewContext,
  hashPocketMonthReviewInput,
  isPocketMonthReviewPermissionError,
  normalizePocketMonthReview,
} from "../shared/pocket-month-review.ts";

Deno.test(
  "pocket month review rejects amounts without authoritative fact IDs",
  () => {
    assertEquals(
      normalizePocketMonthReview(
        {
          headline: { text: "You have $10 left.", fact_ids: [] },
          celebration: { text: "Nice work.", fact_ids: [] },
          previous_cycle_summary: { text: "Here is your plan.", fact_ids: [] },
          attention_items: [],
          recommendations: [],
          pocket_explanations: [],
        },
        ["remaining"],
        [],
      ),
      null,
    );
  },
);

Deno.test("pocket month review accepts only known fact and lineage IDs", () => {
  const review = normalizePocketMonthReview(
    {
      headline: { text: "You have $10 left.", fact_ids: ["remaining"] },
      celebration: { text: "Nice work.", fact_ids: [] },
      previous_cycle_summary: { text: "Here is your plan.", fact_ids: [] },
      attention_items: [],
      recommendations: [],
      pocket_explanations: [
        {
          pocket_lineage_id: "lineage-1",
          text: "This pocket is ready.",
          fact_ids: [],
        },
      ],
    },
    ["remaining"],
    ["lineage-1"],
  );
  assertEquals(review?.headline.fact_ids, ["remaining"]);
  assertEquals(review?.pocket_explanations[0].pocket_lineage_id, "lineage-1");
});

Deno.test(
  "pocket month review hashes equivalent authoritative objects identically",
  async () => {
    assertEquals(
      await hashPocketMonthReviewInput({ b: 2, a: { z: 1, y: 2 } }),
      await hashPocketMonthReviewInput({ a: { y: 2, z: 1 }, b: 2 }),
    );
  },
);

Deno.test(
  "pockets review migration schedules the authenticated hourly producer",
  async () => {
    const migration = await Deno.readTextFile(
      new URL(
        "../../migrations/20260908170000_pockets_month_review_ai_and_notifications.sql",
        import.meta.url,
      ),
    );
    assertEquals(migration.includes("'pockets_month_review'"), true);
    assertEquals(migration.includes("'0 * * * *'"), true);
    assertEquals(
      migration.includes("pockets-month-review-notifications"),
      true,
    );
    assertEquals(migration.includes("notification_internal_secret_key"), true);
    assertEquals(
      migration.includes("enqueue_pockets_month_review_notifications_v1"),
      true,
    );
    assertEquals(
      migration.includes("uniq_pockets_month_review_notification_cycle"),
      true,
    );
    assertEquals(migration.includes("next_financial_cycle_start"), true);
  },
);

Deno.test(
  "pockets review delivery keeps lock-screen copy private",
  async () => {
    const sender = await Deno.readTextFile(
      new URL("../households-send-push-notification/index.ts", import.meta.url),
    );
    assertEquals(sender.includes('case "pockets_month_review"'), true);
    assertEquals(sender.includes('type: "openPocketsPage"'), true);
    assertEquals(
      sender.includes(
        "Your pockets are ready. Review this cycle’s amounts and anything carried over.",
      ),
      true,
    );
  },
);

Deno.test("pocket month review passes Gemini only curated facts", () => {
  assertEquals(
    buildCuratedPocketMonthReviewContext({
      normalized_calculation_facts: [
        { id: "fact:monthly_budget_cents", value_cents: 10000 },
      ],
      pockets_v4: {
        review: {
          suggestions: [{ lineage_id: "lineage-1", amount_cents: 5000 }],
        },
      },
      raw_expenses: [{ merchant: "Private merchant" }],
    }),
    {
      facts: [{ id: "fact:monthly_budget_cents", value_cents: 10000 }],
      suggestions: [{ lineage_id: "lineage-1", amount_cents: 5000 }],
    },
  );
});

Deno.test(
  "pocket month review maps database permission failures to forbidden",
  () => {
    assertEquals(isPocketMonthReviewPermissionError({ code: "42501" }), true);
    assertEquals(isPocketMonthReviewPermissionError({ code: "22023" }), false);
  },
);

Deno.test(
  "pockets lifecycle migration protects review and lifecycle invariants",
  async () => {
    const migration = await Deno.readTextFile(
      new URL(
        "../../migrations/20260908120000_pockets_lifecycle_v4_foundation.sql",
        import.meta.url,
      ),
    );
    assertEquals(
      migration.includes("analytics_spending_multiplier <> 0"),
      true,
    );
    assertEquals(migration.includes("update public.pocket_lineages"), true);
    assertEquals(migration.includes("p_disposition text"), true);
    assertEquals(
      migration.includes("update_pocket_lineage_funding_policy_v1"),
      true,
    );
    assertEquals(migration.includes("normalized_calculation_facts"), true);
    assertEquals(
      migration.includes("v_scope in ('household', 'portfolio')"),
      true,
    );
    assertEquals(migration.includes("v_month is distinct from"), true);
    assertEquals(migration.includes("zero-budget review"), true);
    const getPocketsMonth = migration.slice(
      migration.indexOf(
        "create or replace function public.get_pockets_month_v4",
      ),
      migration.indexOf(
        "create or replace function public.calculate_pocket_cycle_carry_v3",
      ),
    );
    assertEquals(
      getPocketsMonth.includes("insert into public.pocket_month_reviews"),
      false,
    );
    assertEquals(getPocketsMonth.includes("'can_edit', v_can_edit"), true);
    assertEquals(
      getPocketsMonth.includes("'is_current_period', v_is_current_period"),
      true,
    );
  },
);

Deno.test(
  "final pockets lifecycle migration keeps its logo backfill executable",
  async () => {
    const migration = await Deno.readTextFile(
      new URL(
        "../../migrations/20260908210000_finalize_pockets_lifecycle_v4_contract.sql",
        import.meta.url,
      ),
    );
    assertEquals(migration.includes("from lateral ("), false);
    assertEquals(migration.includes("with latest_logo as ("), true);
    assertEquals(
      migration.includes(
        "logo_url = coalesce(\n          nullif(trim(new.logo_url), ''),\n          v_lineage.logo_url",
      ),
      true,
    );
  },
);
