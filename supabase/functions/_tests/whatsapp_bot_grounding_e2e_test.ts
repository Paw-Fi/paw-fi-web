/// <reference lib="deno.ns" />

// Runs the real WhatsApp handler end to end on both of its chat paths: the
// in-app JSON chat and the Twilio webhook. See bot_e2e_harness.ts for what is
// faked (the network edge only).

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { botMessage } from "../shared/bot/bot-messages.ts";
import {
  e2e,
  groundingOf as grounding,
  loadWebhookHandler,
  operationsOf,
  type Outcome,
  postedTotalReply,
  SAVE_ARGS,
  SAVED_ID,
  type Scenario,
  totalReadScenario,
  USER_ID,
  type WebhookHandler,
  withBotBackend,
} from "./bot_e2e_harness.ts";

const SPANISH_SAVE_CLAIM =
  "¡Listo! He registrado 1,45 € en Baluard en la categoría de supermercado.";
const USER_TEXT = "Baluard, 1,45 €, 17/11/2026";

let handler: WebhookHandler | null = null;
let nextMessageSid = 5000;

interface ChatTurn extends Scenario {
  userText: string;
}

interface AppOutcome extends Outcome {
  status: number;
  reply: { text?: string; mediaUrl?: string };
}

async function loadHandler(): Promise<WebhookHandler> {
  handler ??= await loadWebhookHandler("../twilio-whatsapp-ai-bot/index.ts");
  return handler;
}

async function runAppTurn(turn: ChatTurn): Promise<AppOutcome> {
  let status = 0;
  let reply: AppOutcome["reply"] = {};
  const outcome = await withBotBackend(turn, async () => {
    const response = await (await loadHandler())(
      new Request("https://bot.test.invalid/twilio-whatsapp-ai-bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-user-jwt",
        },
        body: JSON.stringify({ message: turn.userText }),
      }),
    );
    status = response.status;
    reply = await response.json();
  });
  return { ...outcome, status, reply };
}

async function runWebhookTurn(turn: ChatTurn): Promise<Outcome> {
  return await withBotBackend(turn, async () => {
    const form = new URLSearchParams({
      From: "whatsapp:+34600000000",
      To: "whatsapp:+14150000000",
      Body: turn.userText,
      NumMedia: "0",
      MessageSid: `SM${(nextMessageSid++).toString(16).padStart(32, "0")}`,
    });
    const response = await (await loadHandler())(
      new Request("https://bot.test.invalid/twilio-whatsapp-ai-bot", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      }),
    );
    assertEquals(response.status, 200);
  });
}

// ------------------------------------------------------------ in-app chat

e2e(
  "app e2e: a real save is confirmed with a receipt from the stored row",
  async () => {
    const outcome = await runAppTurn({
      userText: USER_TEXT,
      model: [
        { calls: [{ name: "add_transaction", args: SAVE_ARGS }] },
        { text: SPANISH_SAVE_CLAIM },
      ],
      verifier: [{ action: true }],
    });
    assertEquals(outcome.status, 200);
    assertEquals(outcome.saveCalls.length, 1);
    assertEquals(outcome.saveCalls[0].userId, USER_ID);
    const text = String(outcome.reply.text);
    assert(text.startsWith(SPANISH_SAVE_CLAIM));
    assert(text.includes("🧾"));
    assert(text.includes("17 nov 2026"));
    const record = grounding(outcome.assistantRows[0]);
    assertEquals(record.verdict, "grounded");
    assertEquals(record.saved_transaction_ids, [SAVED_ID]);
    assertEquals(outcome.assistantRows[0].content, text);
  },
);

e2e(
  "app e2e: a save claim with no save behind it is never returned",
  async () => {
    const outcome = await runAppTurn({
      userText: USER_TEXT,
      model: [{ text: SPANISH_SAVE_CLAIM }, { text: SPANISH_SAVE_CLAIM }],
      verifier: [{ action: true }],
    });
    assertEquals(outcome.saveCalls.length, 0);
    assertEquals(outcome.reply.text, botMessage("actionNotCompleted", "es"));
    const record = grounding(outcome.assistantRows[0]);
    assertEquals(record.verdict, "ungrounded_action");
    assertEquals(record.replaced, true);
  },
);

e2e("app e2e: a claimed save is corrected into a real one", async () => {
  const outcome = await runAppTurn({
    userText: USER_TEXT,
    model: [
      { text: SPANISH_SAVE_CLAIM },
      { calls: [{ name: "add_transaction", args: SAVE_ARGS }] },
      { text: SPANISH_SAVE_CLAIM },
    ],
    verifier: [{ action: true }],
  });
  assertEquals(outcome.unusedModelTurns, 0);
  assertEquals(outcome.saveCalls.length, 1);
  assert(String(outcome.reply.text).includes("🧾"));
  assertEquals(operationsOf(outcome.assistantRows[0]), [
    "add_transaction:succeeded",
  ]);
});

e2e(
  "app e2e: with the verifier down, an unverified reply is withheld",
  async () => {
    const outcome = await runAppTurn({
      userText: "¿Guardaste mi gasto?",
      model: [{ text: "Sí, está guardado." }],
      verifier: [{ status: 503 }],
    });
    assertEquals(outcome.reply.text, botMessage("temporaryIssue", "es"));
    assertEquals(grounding(outcome.assistantRows[0]).assessor, "unavailable");
  },
);

// --------------------------------------------------------- Twilio webhook

e2e(
  "webhook e2e: a real save is confirmed with a receipt from the stored row",
  async () => {
    const outcome = await runWebhookTurn({
      userText: USER_TEXT,
      model: [
        { calls: [{ name: "add_transaction", args: SAVE_ARGS }] },
        { text: SPANISH_SAVE_CLAIM },
      ],
      verifier: [{ action: true }],
    });
    assertEquals(outcome.saveCalls.length, 1);
    assertEquals(outcome.whatsappMessages.length, 1);
    assert(outcome.whatsappMessages[0].startsWith(SPANISH_SAVE_CLAIM));
    assert(outcome.whatsappMessages[0].includes("🧾"));
    assertEquals(grounding(outcome.assistantRows[0]).saved_transaction_ids, [
      SAVED_ID,
    ]);
  },
);

e2e(
  "webhook e2e: a save claimed without a tool call is corrected into a real save",
  async () => {
    const outcome = await runWebhookTurn({
      userText: USER_TEXT,
      model: [
        { text: SPANISH_SAVE_CLAIM },
        { calls: [{ name: "add_transaction", args: SAVE_ARGS }] },
        { text: SPANISH_SAVE_CLAIM },
      ],
      verifier: [{ action: true }],
    });
    assertEquals(outcome.unusedModelTurns, 0);
    assert(outcome.modelPrompts[1].startsWith("SYSTEM CHECK."));
    assertEquals(outcome.saveCalls.length, 1);
    assertEquals(outcome.whatsappMessages.length, 1);
    assert(outcome.whatsappMessages[0].includes("🧾"));
  },
);

e2e(
  "webhook e2e: a save claim the model will not back up never reaches the user",
  async () => {
    const outcome = await runWebhookTurn({
      userText: USER_TEXT,
      model: [{ text: SPANISH_SAVE_CLAIM }, { text: SPANISH_SAVE_CLAIM }],
      verifier: [{ action: true }],
    });
    assertEquals(outcome.saveCalls.length, 0);
    assertEquals(outcome.whatsappMessages, [
      botMessage("actionNotCompleted", "es"),
    ]);
    assertEquals(grounding(outcome.assistantRows[0]).replaced, true);
  },
);

e2e(
  "webhook e2e: a failed save is reported as unconfirmed, never as saved",
  async () => {
    const outcome = await runWebhookTurn({
      userText: USER_TEXT,
      model: [
        { calls: [{ name: "add_transaction", args: SAVE_ARGS }] },
        { text: SPANISH_SAVE_CLAIM },
        { text: SPANISH_SAVE_CLAIM },
      ],
      verifier: [{ action: true }],
      saveExpense: {
        status: 500,
        body: { success: false, error: "Failed to save expense" },
      },
    });
    assertEquals(outcome.saveCalls.length, 1);
    assertEquals(outcome.whatsappMessages, [
      botMessage("outcomeUnconfirmed", "es"),
    ]);
    assertEquals(operationsOf(outcome.assistantRows[0]), [
      "add_transaction:failed",
    ]);
  },
);

e2e(
  "webhook e2e: 'did you save it?' is answered from a real lookup",
  async () => {
    const truthful =
      "No encuentro ningún gasto de Baluard de 1,45 € con fecha 17/11/2026.";
    const outcome = await runWebhookTurn({
      userText: "¿Guardaste el gasto de Baluard de 1,45 € del 17/11/2026?",
      model: [
        { text: "Sí, lo he comprobado y el gasto está guardado." },
        {
          calls: [{
            name: "list_expenses",
            args: { start_date: "2026-11-17", end_date: "2026-11-17" },
          }],
        },
        { text: truthful },
      ],
      verifier: [{ record: true }],
      expenses: [],
    });
    assertEquals(outcome.unusedModelTurns, 0);
    assertEquals(
      outcome.financeCalls.filter((c) => c.p_read === "transactions").length,
      1,
    );
    assertEquals(
      (outcome.financeCalls.find((c) => c.p_read === "transactions")!
        .p_args as any).start_date,
      "2026-11-17",
    );
    assertEquals(outcome.whatsappMessages, [truthful]);
    assertEquals(operationsOf(outcome.assistantRows[0]), [
      "list_expenses:succeeded",
    ]);
  },
);

e2e(
  "runAppTurn: Pocket lookup passes the verified actor and grounds the delivered reply",
  async () => {
    const text = "Quedan 37 € en Food.";
    const outcome = await runAppTurn({
      userText: "¿Cuánto me queda en Food?",
      model: [
        {
          calls: [{
            name: "read_finances",
            args: { view: "pockets", p_actor: "ignored" },
          }],
        },
        { text },
      ],
      verifier: [{ record: true }],
    });
    assertEquals(outcome.financeCalls.map((c) => [c.p_actor, c.p_read]), [[
      USER_ID,
      "spaces",
    ], [USER_ID, "pockets"]]);
    assertEquals(outcome.reply.text, text);
    assert(outcome.verifierPrompts.some((p) => p.includes("3700")));
  },
);
e2e(
  "runAppTurn: a failed financial lookup cannot support an invented balance",
  async () => {
    const text = "Quedan 900 € en Food.";
    const outcome = await runAppTurn({
      userText: "¿Cuánto me queda en Food?",
      financeFails: true,
      model: [
        { calls: [{ name: "read_finances", args: { view: "pockets" } }] },
        { text },
        { text },
      ],
      verifier: [{ record: true, consistent: false }],
    });
    assertEquals(outcome.reply.text, botMessage("recordsNotChecked", "es"));
  },
);

e2e(
  "runWebhookTurn: Pocket lookup passes the verified actor and grounds the delivered reply",
  async () => {
    const text = "Quedan 37 € en Food.";
    const outcome = await runWebhookTurn({
      userText: "¿Cuánto me queda en Food?",
      model: [
        {
          calls: [{
            name: "read_finances",
            args: { view: "pockets", p_actor: "ignored" },
          }],
        },
        { text },
      ],
      verifier: [{ record: true }],
    });
    assertEquals(outcome.financeCalls.map((c) => [c.p_actor, c.p_read]), [[
      USER_ID,
      "spaces",
    ], [USER_ID, "pockets"]]);
    assertEquals(outcome.whatsappMessages[0], text);
    assert(outcome.verifierPrompts.some((p) => p.includes("3700")));
  },
);
e2e(
  "runWebhookTurn: a failed financial lookup cannot support an invented balance",
  async () => {
    const text = "Quedan 900 € en Food.";
    const outcome = await runWebhookTurn({
      userText: "¿Cuánto me queda en Food?",
      financeFails: true,
      model: [
        { calls: [{ name: "read_finances", args: { view: "pockets" } }] },
        { text },
        { text },
      ],
      verifier: [{ record: true, consistent: false }],
    });
    assertEquals(
      outcome.whatsappMessages[0],
      botMessage("recordsNotChecked", "es"),
    );
  },
);

e2e(
  "runWebhookTurn: posted total and scheduled payment reach the verifier separately",
  async () => {
    const outcome = await runWebhookTurn(totalReadScenario(false));
    assert(outcome.advertisedTools[0].includes("read_finances"));
    assertEquals(outcome.whatsappMessages[0], postedTotalReply);
    assertEquals(
      outcome.financeCalls.filter((c) => c.p_read === "summary").map(
        (c) => [c.p_actor, c.p_space],
      ),
      [[USER_ID, null]],
    );
    assert(
      outcome.verifierPrompts.some((p) =>
        p.includes("100100") && p.includes("50000") && !p.includes("150100")
      ),
    );
  },
);
