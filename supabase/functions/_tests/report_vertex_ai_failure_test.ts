/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { reportVertexAiFailure } from "../shared/report-vertex-ai-failure.ts";

Deno.test("reportVertexAiFailure forwards provider and phase metadata", async () => {
  let captured:
    | {
      functionName: string;
      error: unknown;
      context?: Record<string, unknown>;
    }
    | undefined;

  await reportVertexAiFailure({
    functionName: "twilio-whatsapp-ai-bot",
    error: new Error("Vertex timed out"),
    phase: "final_ai_response",
    modelName: "gemini-3.1-flash-lite",
    context: {
      toolIterations: 2,
      lastToolCalls: 1,
    },
    reportImpl: async (input: {
      functionName: string;
      error: unknown;
      context?: Record<string, unknown>;
    }) => {
      captured = input;
    },
  });

  assertEquals(captured?.functionName, "twilio-whatsapp-ai-bot");
  assertEquals((captured?.error as Error).message, "Vertex timed out");
  assertEquals(captured?.context, {
    provider: "vertex-ai",
    phase: "final_ai_response",
    modelName: "gemini-3.1-flash-lite",
    toolIterations: 2,
    lastToolCalls: 1,
  });
});

Deno.test("reportVertexAiFailure swallows reporter failures and logs them", async () => {
  const logs: unknown[][] = [];

  await reportVertexAiFailure({
    functionName: "telegram-ai-bot",
    error: new Error("Vertex 503"),
    phase: "initial_ai_response",
    modelName: "gemini-3.1-flash-lite",
    reportImpl: async () => {
      throw new Error("reporting unavailable");
    },
    logImpl: (...args: unknown[]) => {
      logs.push(args);
    },
  });

  assertEquals(logs.length, 1);
  assertEquals(logs[0][0], "[telegram-ai-bot] reportEdgeFunctionError failed");
});
