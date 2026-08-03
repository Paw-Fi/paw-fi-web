import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { mergePlaidRecurringTemplatePayload } from "../shared/bank-sync.ts";

const templateFields = {
  account_id: "00000000-0000-4000-8000-000000000001",
  amount_cents: 1299,
  currency: "USD",
  category: "subscriptions",
  date: "2026-09-01",
  raw_text: "Example subscription",
  merchant: "Example",
  source: "Example",
  type: "expense",
  is_recurring: true,
  recurrence_rule: {
    frequency: "monthly",
    anchor_date: "2026-09-01",
  },
  household_id: null,
};

const providerFields = {
  source: "plaid_recurring_template",
  provider: "plaid",
  bank_account_id: "00000000-0000-4000-8000-000000000002",
  account_id: templateFields.account_id,
  template_identity: "stream-1",
  recurring_source: "plaid",
  transaction_ids: ["transaction-1"],
  projection_enabled: true,
  template_fields: templateFields,
};

const existing = {
  id: "00000000-0000-4000-8000-000000000003",
  user_id: "00000000-0000-4000-8000-000000000004",
  contact_id: null,
  provider: null,
  bank_account_id: null,
  provider_transaction_id: null,
  idempotency_key: "bank-recurring:v1:plaid:account:stream-1",
  deleted_at: null,
  deleted_reason: null,
  provider_fields: providerFields,
  user_overrides: {},
  ...templateFields,
};

const payload = {
  user_id: existing.user_id,
  contact_id: null,
  provider: null,
  bank_account_id: null,
  provider_transaction_id: null,
  idempotency_key: existing.idempotency_key,
  deleted_at: null,
  deleted_reason: null,
  provider_fields: {
    ...providerFields,
    optional_provider_value: undefined,
    template_fields: {
      recurrence_rule: templateFields.recurrence_rule,
      ...templateFields,
    },
  },
  ...templateFields,
  updated_at: "2026-08-02T20:00:00.000Z",
};

Deno.test("unchanged Plaid recurring templates skip expense updates", () => {
  assertEquals(mergePlaidRecurringTemplatePayload(existing, payload), null);
});

Deno.test("changed Plaid recurring templates still persist", () => {
  const changed = mergePlaidRecurringTemplatePayload(existing, {
    ...payload,
    amount_cents: 1499,
    provider_fields: {
      ...providerFields,
      template_fields: {
        ...templateFields,
        amount_cents: 1499,
      },
    },
  });
  assertEquals(changed?.amount_cents, 1499);
});
