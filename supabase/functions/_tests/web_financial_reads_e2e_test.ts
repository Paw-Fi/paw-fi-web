import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  e2e,
  loadWebhookHandler,
  postedTotalReply,
  type Scenario,
  SESSION_ID,
  totalReadScenario,
  USER_ID,
  type WebhookHandler,
  withBotBackend,
} from "./bot_e2e_harness.ts";
import { botMessage } from "../shared/bot/bot-messages.ts";

let handler: WebhookHandler;
async function web(
  scenario: Scenario & { userText?: string },
  userId: string | null = USER_ID,
  bearer: string | null = "test-user-jwt",
) {
  let status = 0, reply = "";
  const outcome = await withBotBackend(scenario, async () => {
    handler ??= await loadWebhookHandler("../chat_stream/index.ts");
    const response = await handler(
      new Request("https://bot.test.invalid/chat_stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(bearer ? { Authorization: "Bearer " + bearer } : {}),
        },
        body: JSON.stringify({
          conversationId: SESSION_ID,
          userId,
          message: scenario.userText ?? "¿Cuánto me queda en Food?",
        }),
      }),
    );
    status = response.status;
    reply = (await response.json()).response;
  });
  return { ...outcome, status, reply };
}
e2e(
  "web chat can read a Pocket without an assessment and stores the grounded answer",
  async () => {
    const text = "Quedan 37 € en Food.";
    const outcome = await web({
      model: [{
        calls: [{
          name: "read_finances",
          args: { view: "pockets", p_actor: "ignored" },
        }],
      }, { text }],
      verifier: [{ record: true }],
    });
    assertEquals(outcome.status, 200);
    assertEquals(outcome.reply, text);
    assertEquals(outcome.assistantRows[0]?.content, text);
    assertEquals(outcome.financeCalls.map((c) => [c.p_actor, c.p_read]), [[
      USER_ID,
      "spaces",
    ], [USER_ID, "pockets"]]);
    assert(outcome.verifierPrompts.some((p) => p.includes("3700")));
  },
);
e2e(
  "web chat replaces an unsupported balance after a failed read",
  async () => {
    const outcome = await web({
      model: [
        { calls: [{ name: "read_finances", args: { view: "pockets" } }] },
        { text: "Quedan 900 €." },
      ],
      financeFails: true,
      verifier: [{ record: true, consistent: false }],
    });
    assertEquals(outcome.reply, botMessage("recordsNotChecked", "es"));
    assertEquals(outcome.assistantRows[0]?.content, outcome.reply);
  },
);
e2e(
  "web financial reads require account and conversation ownership",
  async () => {
    const scenario = { model: [], verifier: [] };
    for (
      const outcome of [
        await web(scenario, "another-user"),
        await web(scenario, USER_ID, null),
        await web({ ...scenario, denySession: true }),
      ]
    ) {
      assert([401, 403, 404].includes(outcome.status));
      assertEquals(outcome.financeCalls, []);
      assertEquals(outcome.modelPrompts, []);
    }
  },
);

e2e(
  "web general coaching continues without reading financial records and still verifies the reply",
  async () => {
    const outcome = await web({
      model: [{ calls: [{ name: "continue_coaching", args: {} }] }],
      verifier: [{}],
    });
    assertEquals(outcome.status, 200);
    assert(
      outcome.reply.includes("assessment") ||
        outcome.reply.includes("learning") ||
        outcome.reply.includes("QUESTIONNAIRE"),
    );
    assertEquals(outcome.financeCalls, []);
    assertEquals(outcome.verifierPrompts.length, 1);
  },
);

e2e(
  "web: posted total and scheduled payment reach the verifier separately",
  async () => {
    const outcome = await web(totalReadScenario(true));
    assert(outcome.advertisedTools[0].includes("read_finances"));
    assertEquals(outcome.reply, postedTotalReply);
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
