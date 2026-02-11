import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildTelegramVerificationUrl,
  REQUIRED_TELEGRAM_TOOL_NAMES,
} from "../shared/telegram-parity.ts";

Deno.test("telegram verification URL uses verify-telegram route", () => {
  const url = buildTelegramVerificationUrl("https://moneko.io", "123456");
  assertEquals(url, "https://moneko.io/verify-telegram?otp=123456");
});

Deno.test("telegram tool surface includes whatsapp parity tools", () => {
  const required = [
    "add_transaction",
    "add_transactions_batch",
    "update_transaction",
    "delete_transaction",
    "list_expenses",
    "get_budget",
    "draft_budget",
    "confirm_budget",
    "set_budget",
    "set_pocket",
    "delete_pocket",
    "set_currency",
    "generate_chart_url",
    "financial_insight",
    "manage_recurring",
  ];

  for (const tool of required) {
    assert(
      REQUIRED_TELEGRAM_TOOL_NAMES.includes(tool),
      `missing tool in telegram parity list: ${tool}`,
    );
  }
});
