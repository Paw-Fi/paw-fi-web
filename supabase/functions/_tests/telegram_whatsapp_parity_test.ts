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

Deno.test("telegram and whatsapp route recurring mutations through one shared executor", async () => {
  const testsUrl = new URL(".", import.meta.url);
  const telegramSource = await Deno.readTextFile(
    new URL("../telegram-ai-bot/index.ts", testsUrl),
  );
  const whatsappSource = await Deno.readTextFile(
    new URL("../twilio-whatsapp-ai-bot/index.ts", testsUrl),
  );

  for (
    const [channel, source] of [
      ["Telegram", telegramSource],
      ["WhatsApp", whatsappSource],
    ] as const
  ) {
    assert(
      source.includes("executeManageRecurringTool({"),
      `${channel} must use the shared recurring executor`,
    );
    assertEquals(
      source.match(/executeManageRecurringTool\(\{/g)?.length,
      1,
      `${channel} should have exactly one recurring execution path`,
    );
  }
});

Deno.test("telegram tool surface includes whatsapp parity tools", () => {
  const required = [
    "create_custom_category",
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
