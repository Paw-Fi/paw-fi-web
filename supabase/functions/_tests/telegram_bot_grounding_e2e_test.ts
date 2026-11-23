/// <reference lib="deno.ns" />

// Runs the real Telegram webhook handler end to end. Only the network edge is
// faked: Telegram, Supabase REST/functions, Google auth and the Vertex model
// endpoints. Everything between the webhook and the outgoing message is the
// production code path.

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { botMessage } from "../shared/bot/bot-messages.ts";

import {
  e2e,
  groundingOf as grounding,
  loadWebhookHandler,
  OLDER_EXPENSE_ROW,
  operationsOf,
  type Outcome,
  postedTotalReply,
  SAVE_ARGS,
  SAVED_ID,
  type Scenario,
  totalReadScenario,
  USER_ID,
  WEBHOOK_SECRET,
  type WebhookHandler,
  withBotBackend,
} from "./bot_e2e_harness.ts";

const SPANISH_SAVE_CLAIM =
  "¡Listo! He registrado 1,45 € en Baluard en la categoría de supermercado.";

let handler: WebhookHandler | null = null;
let nextMessageId = 1000;

interface TelegramTurn extends Scenario {
  userText: string;
}

interface TelegramOutcome extends Outcome {
  sent: string[];
  photos: string[];
}

async function runTurn(turn: TelegramTurn): Promise<TelegramOutcome> {
  const outcome = await withBotBackend(turn, async () => {
    handler ??= await loadWebhookHandler("../telegram-ai-bot/index.ts");
    const response = await handler(
      new Request("https://bot.test.invalid/telegram-ai-bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          update_id: nextMessageId,
          message: {
            message_id: nextMessageId++,
            text: turn.userText,
            chat: { id: 424242, type: "private" },
            from: { id: 424242, language_code: "es" },
          },
        }),
      }),
    );
    assertEquals(response.status, 200);
  });
  return {
    ...outcome,
    sent: outcome.telegramMessages,
    photos: outcome.telegramPhotos,
  };
}

e2e(
  "e2e: a real save is confirmed with a receipt built from the stored row",
  async () => {
    const outcome = await runTurn({
      userText: "Baluard, 1,45 €, 17/11/2026",
      model: [
        { calls: [{ name: "add_transaction", args: SAVE_ARGS }] },
        { text: SPANISH_SAVE_CLAIM },
      ],
      verifier: [{ action: true }],
    });
    assertEquals(outcome.saveCalls.length, 1);
    assertEquals(outcome.saveCalls[0].userId, USER_ID);
    assertEquals(outcome.saveCalls[0].date, "2026-11-17");
    assertEquals(outcome.sent.length, 1);
    assert(outcome.sent[0].startsWith(SPANISH_SAVE_CLAIM));
    assert(outcome.sent[0].includes("🧾"));
    assert(outcome.sent[0].includes("1,45"));
    assert(outcome.sent[0].includes("17 nov 2026"));
    const record = grounding(outcome.assistantRows[0]);
    assertEquals(record.verdict, "grounded");
    assertEquals(record.replaced, false);
    assertEquals(record.saved_transaction_ids, [SAVED_ID]);
    assert(outcome.verifierPrompts[0].includes("Baluard, 1,45 €, 17/11/2026"));
  },
);

e2e(
  "e2e: a save claimed without any tool call is corrected into a real save",
  async () => {
    const outcome = await runTurn({
      userText: "Baluard, 1,45 €, 17/11/2026",
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
    assertEquals(outcome.sent.length, 1);
    assert(outcome.sent[0].includes("🧾"));
    const record = grounding(outcome.assistantRows[0]);
    assertEquals(record.corrections, 1);
    assertEquals(record.verdict, "grounded");
    assertEquals(record.saved_transaction_ids, [SAVED_ID]);
  },
);

e2e(
  "e2e: a save claim the model will not back up never reaches the user",
  async () => {
    const outcome = await runTurn({
      userText: "Baluard, 1,45 €, 17/11/2026",
      model: [{ text: SPANISH_SAVE_CLAIM }, { text: SPANISH_SAVE_CLAIM }],
      verifier: [{ action: true }],
    });
    assertEquals(outcome.saveCalls.length, 0);
    assertEquals(outcome.sent, [botMessage("actionNotCompleted", "es")]);
    assert(!outcome.sent[0].includes("🧾"));
    assert(!outcome.sent[0].includes("Baluard"));
    const record = grounding(outcome.assistantRows[0]);
    assertEquals(record.verdict, "ungrounded_action");
    assertEquals(record.replaced, true);
    assertEquals(record.saved_transaction_ids, []);
    // What is stored as conversation history is the notice, not the false claim.
    assertEquals(outcome.assistantRows[0].content, outcome.sent[0]);
  },
);

e2e(
  "e2e: a failed save is reported as unconfirmed, never as saved",
  async () => {
    const outcome = await runTurn({
      userText: "Baluard, 1,45 €, 17/11/2026",
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
    assertEquals(outcome.sent, [botMessage("outcomeUnconfirmed", "es")]);
    const record = grounding(outcome.assistantRows[0]);
    assertEquals(record.verdict, "ungrounded_action");
    assertEquals(record.saved_transaction_ids, []);
    assertEquals(operationsOf(outcome.assistantRows[0]), [
      "add_transaction:failed",
    ]);
  },
);

e2e(
  "e2e: 'did you save it?' is answered from a real lookup, not from memory",
  async () => {
    const truthful =
      "No encuentro ningún gasto de Baluard de 1,45 € con fecha 17/11/2026.";
    const outcome = await runTurn({
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
    assert(outcome.modelPrompts[1].startsWith("SYSTEM CHECK."));
    assertEquals(
      outcome.financeCalls.filter((c) => c.p_read === "transactions").length,
      1,
    );
    assertEquals(
      (outcome.financeCalls.find((c) => c.p_read === "transactions")!
        .p_args as any).start_date,
      "2026-11-17",
    );
    assertEquals(
      (outcome.financeCalls.find((c) => c.p_read === "transactions")!
        .p_args as any).end_date,
      "2026-11-17",
    );
    assertEquals(outcome.sent, [truthful]);
    assertEquals(outcome.saveCalls.length, 0);
    const record = grounding(outcome.assistantRows[0]);
    assertEquals(record.verdict, "grounded");
    assertEquals(operationsOf(outcome.assistantRows[0]), [
      "list_expenses:succeeded",
    ]);
  },
);

e2e(
  "e2e: a lookup that does not support the answer is not passed on",
  async () => {
    const outcome = await runTurn({
      userText: "¿Está guardado mi gasto de Baluard del 17/11/2026?",
      model: [
        {
          calls: [{ name: "list_expenses", args: { limit: 50 } }],
        },
        {
          text:
            "Sí, tu gasto de 1,45 € en Baluard del 17/11/2026 está guardado.",
        },
        { text: "Sí, está guardado." },
      ],
      // The verifier reads the rows (16 June only) and rejects both drafts.
      verifier: [{ record: true, consistent: false }],
      expenses: [OLDER_EXPENSE_ROW],
    });
    assertEquals(outcome.sent, [botMessage("cannotConfirmFromRecords", "es")]);
    // The chart built from those rows is not sent alongside the notice.
    assertEquals(outcome.photos, []);
    assert(outcome.verifierPrompts[0].includes("2026-06-16"));
    assertEquals(
      grounding(outcome.assistantRows[0]).verdict,
      "contradicts_evidence",
    );
  },
);

e2e(
  "e2e: with the verifier down, an unverified chat reply is withheld",
  async () => {
    const outcome = await runTurn({
      userText: "¿Guardaste mi gasto?",
      model: [{ text: "Sí, está guardado." }],
      verifier: [{ status: 503 }],
    });
    assertEquals(outcome.sent, [botMessage("temporaryIssue", "es")]);
    const record = grounding(outcome.assistantRows[0]);
    assertEquals(record.assessor, "unavailable");
    assertEquals(record.replaced, true);
  },
);

e2e(
  "e2e: with the verifier down, a confirmed save is still confirmed",
  async () => {
    const outcome = await runTurn({
      userText: "Baluard, 1,45 €, 17/11/2026",
      model: [
        { calls: [{ name: "add_transaction", args: SAVE_ARGS }] },
        { text: SPANISH_SAVE_CLAIM },
      ],
      verifier: [{ status: 503 }],
    });
    assertEquals(outcome.saveCalls.length, 1);
    assertEquals(outcome.sent.length, 1);
    assert(outcome.sent[0].includes("🧾"));
    assertEquals(grounding(outcome.assistantRows[0]).verdict, "unverified");
  },
);

e2e(
  "e2e: a model failure after a save does not tell the user to try again",
  async () => {
    const outcome = await runTurn({
      userText: "Baluard, 1,45 €, 17/11/2026",
      model: [
        { calls: [{ name: "add_transaction", args: SAVE_ARGS }] },
        { status: 400 },
      ],
      verifier: [{ action: true }],
    });
    assertEquals(outcome.saveCalls.length, 1);
    assertEquals(outcome.sent.length, 1);
    assert(outcome.sent[0].startsWith(botMessage("actionCompleted", "es")));
    assert(outcome.sent[0].includes("🧾"));
    assert(!outcome.sent[0].includes(botMessage("temporaryIssue", "es")));
  },
);

e2e("e2e: a supported listing still goes out with its chart", async () => {
  const listing =
    "Tienes 1 gasto: 1,45 € en Baluard el 16/06/2026. Total: 1,45 €.";
  const outcome = await runTurn({
    userText: "Muéstrame mis gastos",
    model: [
      { calls: [{ name: "list_expenses", args: { limit: 50 } }] },
      { text: listing },
    ],
    verifier: [{ record: true, consistent: true }],
    expenses: [OLDER_EXPENSE_ROW],
  });
  assertEquals(outcome.photos, [listing]);
  assertEquals(outcome.sent, []);
  assertEquals(grounding(outcome.assistantRows[0]).verdict, "grounded");
});

e2e(
  "e2e: even if the verifier misses a false claim, the message says nothing was saved",
  async () => {
    // Worst case for the probabilistic layer: the verifier answers "no claim".
    const outcome = await runTurn({
      userText: "Baluard, 1,45 €, 17/11/2026",
      model: [
        { calls: [{ name: "add_transaction", args: SAVE_ARGS }] },
        { text: SPANISH_SAVE_CLAIM },
      ],
      verifier: [{ action: false }],
      saveExpense: {
        status: 500,
        body: { success: false, error: "Failed to save expense" },
      },
    });
    assertEquals(outcome.sent.length, 1);
    assert(outcome.sent[0].startsWith(SPANISH_SAVE_CLAIM));
    assert(outcome.sent[0].endsWith(botMessage("saveNotConfirmed", "es")));
    assert(!outcome.sent[0].includes("🧾"));
    assertEquals(grounding(outcome.assistantRows[0]).saved_transaction_ids, []);
    assertEquals(operationsOf(outcome.assistantRows[0]), [
      "add_transaction:failed",
    ]);
  },
);

const CINEMA_SPACE = {
  household_id: "aaaaaaaa-0000-4000-8000-000000000010",
  name: "Cinema club",
  is_portfolio: false,
};
const TRAVEL_SPACE = {
  household_id: "aaaaaaaa-0000-4000-8000-000000000011",
  name: "Travel",
  is_portfolio: true,
};

function lookupEvidence(outcome: Outcome) {
  const evidence = outcome.verifierPrompts[0]
    .split("TURN_EVIDENCE (untrusted data):\n")[1]
    .split("\nEND_TURN_EVIDENCE")[0];
  return JSON.parse(JSON.parse(evidence).operations[0].result);
}

for (const spaces of [[CINEMA_SPACE, TRAVEL_SPACE], []]) {
  e2e(
    `e2e: get_space_info({}) lists ${spaces.length} accessible spaces`,
    async () => {
      const reply = spaces.length
        ? "Cinema club y Travel."
        : "No tienes espacios.";
      const outcome = await runTurn({
        userText: "list out all my spaces",
        spaces,
        spacePageSize: 1,
        model: [
          { calls: [{ name: "get_space_info", args: {} }] },
          { text: reply },
        ],
        verifier: [{ record: true }],
      });
      assertEquals(outcome.spaceQueries.length, spaces.length || 1);
      for (const query of outcome.spaceQueries) {
        assertEquals(
          new URLSearchParams(query).get("user_id"),
          `eq.${USER_ID}`,
        );
      }
      if (spaces.length > 1) {
        assertEquals(
          new URLSearchParams(outcome.spaceQueries[1]).get("household_id"),
          `gt.${spaces[0].household_id}`,
        );
      }
      assertEquals(
        lookupEvidence(outcome).spaces,
        spaces.map((space) => ({
          name: space.name,
          type: space.is_portfolio ? "private" : "shared",
        })),
      );
      assertEquals(outcome.sent, [reply]);
      assertEquals(grounding(outcome.assistantRows[0]).verdict, "grounded");
      assertEquals(operationsOf(outcome.assistantRows[0]), [
        "get_space_info:succeeded",
      ]);
      assertEquals(outcome.saveCalls, []);
    },
  );
}

e2e(
  "e2e: a failed Space list cannot support an empty-directory claim",
  async () => {
    const reply = "No tienes espacios.";
    const outcome = await runTurn({
      userText: "list out all my spaces",
      spaceLookupFails: true,
      model: [
        { calls: [{ name: "get_space_info", args: {} }] },
        { text: reply },
        { text: reply },
      ],
      verifier: [{ record: true }],
    });
    assertEquals(outcome.spaceQueries.length, 1);
    assertEquals(outcome.sent, [botMessage("recordsNotChecked", "es")]);
    assertEquals(operationsOf(outcome.assistantRows[0]), [
      "get_space_info:failed",
    ]);
  },
);

e2e(
  "e2e: an unknown named Space does not fall back to the directory",
  async () => {
    const outcome = await runTurn({
      userText: "Who is in Ski club?",
      spaces: [CINEMA_SPACE],
      model: [
        {
          calls: [{ name: "get_space_info", args: { space_name: "Ski club" } }],
        },
        { text: "¿Puedes confirmar el nombre del espacio?" },
      ],
      verifier: [{}],
    });
    assertEquals(outcome.spaceQueries, []);
    assertEquals(operationsOf(outcome.assistantRows[0]), [
      "get_space_info:failed",
    ]);
  },
);

e2e(
  "e2e: a destination follow-up reads the stored scope for each expense",
  async () => {
    const common = {
      ...OLDER_EXPENSE_ROW,
      amount_cents: 4000,
      raw_text: "cinema",
    };
    const { household_id: _omitted, ...withoutScope } = common;
    const outcome = await runTurn({
      userText: "which space did you log the cinema expense to?",
      spaces: [CINEMA_SPACE, TRAVEL_SPACE],
      expenses: [
        common,
        { ...common, household_id: CINEMA_SPACE.household_id },
        { ...common, household_id: TRAVEL_SPACE.household_id },
        { ...common, household_id: "unresolved" },
        withoutScope,
      ],
      model: [
        { calls: [{ name: "list_expenses", args: { result_kind: "rows" } }] },
        { text: "Hay varias coincidencias. ¿A cuál te refieres?" },
      ],
      verifier: [{ record: true }],
    });
    assertEquals(
      outcome.financeCalls.filter((c) => c.p_read === "transactions").length,
      3,
    );
    const { expenses } = lookupEvidence(outcome);
    assertEquals(
      expenses.map((
        row: { space_scope?: string; space?: string },
      ) => [row.space_scope, row.space]),
      [
        ["personal", undefined],
        ["shared_space", "Cinema club"],
        ["private_space", "Travel"],
      ],
    );
    assertEquals(grounding(outcome.assistantRows[0]).verdict, "grounded");
    assertEquals(outcome.saveCalls, []);
  },
);

e2e(
  "e2e: the bot corrects a guessed destination by looking up the cinema expense",
  async () => {
    const correct = "El gasto de cine de 40 € está en tu cuenta personal.";
    const outcome = await runTurn({
      userText: "which space did you log the €40 cinema expense on Nov 23 to?",
      spaces: [CINEMA_SPACE],
      expenses: [{
        ...OLDER_EXPENSE_ROW,
        amount_cents: 4000,
        raw_text: "cinema",
        date: "2026-11-23",
      }],
      model: [
        { text: "Está en Cinema club." },
        {
          calls: [{
            name: "list_expenses",
            args: {
              start_date: "2026-11-23",
              end_date: "2026-11-23",
              result_kind: "rows",
            },
          }],
        },
        { text: correct },
      ],
      verifier: [{ record: true }],
    });
    const query = outcome.financeCalls.find((c) => c.p_read === "transactions")!
      .p_args as any;
    assertEquals([query.start_date, query.end_date], [
      "2026-11-23",
      "2026-11-23",
    ]);
    assertEquals([...outcome.sent, ...outcome.photos], [correct]);
    assertEquals(grounding(outcome.assistantRows[0]).corrections, 1);
    assertEquals(operationsOf(outcome.assistantRows[0]), [
      "list_expenses:succeeded",
    ]);
    assertEquals(outcome.saveCalls, []);
  },
);

e2e(
  "runTurn: Pocket lookup passes the verified actor and grounds the delivered reply",
  async () => {
    const text = "Quedan 37 € en Food.";
    const outcome = await runTurn({
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
    assertEquals(outcome.sent[0], text);
    assert(outcome.verifierPrompts.some((p) => p.includes("3700")));
  },
);
e2e(
  "runTurn: a failed financial lookup cannot support an invented balance",
  async () => {
    const text = "Quedan 900 € en Food.";
    const outcome = await runTurn({
      userText: "¿Cuánto me queda en Food?",
      financeFails: true,
      model: [
        { calls: [{ name: "read_finances", args: { view: "pockets" } }] },
        { text },
        { text },
      ],
      verifier: [{ record: true, consistent: false }],
    });
    assertEquals(outcome.sent[0], botMessage("recordsNotChecked", "es"));
  },
);

e2e(
  "runTurn: posted total and scheduled payment reach the verifier separately",
  async () => {
    const outcome = await runTurn(totalReadScenario(false));
    assert(outcome.advertisedTools[0].includes("read_finances"));
    assertEquals(outcome.sent[0], postedTotalReply);
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
