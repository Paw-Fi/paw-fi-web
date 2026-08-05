/// <reference lib="deno.ns" />

import { buildBotSystemInstruction } from "./system-instruction.ts";
import { WALLET_LIST_PROMPT_RULE } from "./wallet-intent.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function assertIncludes(value: string, expected: string) {
  assert(
    value.includes(expected),
    `Expected value to include ${JSON.stringify(expected)}`,
  );
}

function assertNotIncludes(value: string, unexpected: string) {
  assert(
    !value.includes(unexpected),
    `Expected value not to include ${JSON.stringify(unexpected)}`,
  );
}

Deno.test("golden shared bot prompt keeps common rules in one builder", () => {
  const instruction = buildBotSystemInstruction("Telegram");

  assertIncludes(instruction, "You are Moneko");
  assertIncludes(instruction, WALLET_LIST_PROMPT_RULE);
  assertIncludes(instruction, "{{DATE}}");
  assertIncludes(instruction, "{{WALLETS}}");
  assertNotIncludes(instruction, "household_id + is_portfolio");
  assertNotIncludes(instruction, "portfolio");
});

Deno.test("golden shared bot prompt limits channel differences to formatting", () => {
  const instruction = buildBotSystemInstruction("WhatsApp");

  assertIncludes(instruction, "COMMON USER INTENTS");
  assertIncludes(instruction, "MESSAGE FORMATTING (WhatsApp-specific)");
  assertIncludes(instruction, 'call "draft_budget"');
});
