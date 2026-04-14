/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  createVertexBotChatSession,
  createVertexChatSession,
  createVertexGenerativeAI,
  getVertexAiConfigFromEnv,
} from "../shared/vertex-ai-chat.ts";

function restoreEnv(key: string, value: string | undefined) {
  if (value == null) {
    Deno.env.delete(key);
    return;
  }
  Deno.env.set(key, value);
}

Deno.test("getVertexAiConfigFromEnv falls back to service account project and global location", () => {
  const originalServiceAccount = Deno.env.get("GOOGLE_CLOUD_SERVICE_ACCOUNT");
  const originalProject = Deno.env.get("GOOGLE_CLOUD_PROJECT");
  const originalLocation = Deno.env.get("GOOGLE_CLOUD_LOCATION");

  try {
    Deno.env.set(
      "GOOGLE_CLOUD_SERVICE_ACCOUNT",
      JSON.stringify({
        project_id: "moneko-prod",
        client_email: "bot@example.com",
        private_key:
          "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
      }),
    );
    Deno.env.delete("GOOGLE_CLOUD_PROJECT");
    Deno.env.delete("GOOGLE_CLOUD_LOCATION");

    const config = getVertexAiConfigFromEnv();

    assertEquals(config.project, "moneko-prod");
    assertEquals(config.location, "global");
    assertEquals(config.serviceAccountJson.includes("moneko-prod"), true);
  } finally {
    restoreEnv("GOOGLE_CLOUD_SERVICE_ACCOUNT", originalServiceAccount);
    restoreEnv("GOOGLE_CLOUD_PROJECT", originalProject);
    restoreEnv("GOOGLE_CLOUD_LOCATION", originalLocation);
  }
});

Deno.test("createVertexChatSession sends Vertex request and parses text plus function calls", async () => {
  const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];

  const chat = createVertexChatSession({
    model: "gemini-2.5-flash",
    systemInstruction: "You are helpful.",
    history: [{ role: "user", parts: [{ text: "Earlier question" }] }],
    tools: [
      {
        functionDeclarations: [
          {
            name: "list_expenses",
            description: "List expenses",
            parameters: {
              type: "OBJECT",
              properties: {
                limit: { type: "NUMBER" },
              },
            },
          },
        ],
      },
    ],
    vertex: {
      project: "moneko-prod",
      location: "global",
      accessToken: "access-token",
    },
    fetchImpl: async (input: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ input: String(input), init });
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                role: "model",
                parts: [
                  {
                    functionCall: {
                      name: "list_expenses",
                      args: { limit: 5 },
                    },
                  },
                  { text: "Here are the latest expenses." },
                ],
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    },
  });

  const result = await chat.sendMessage("Show my recent spending");
  const response = await result.response;

  assertEquals(fetchCalls.length, 1);
  assertEquals(
    fetchCalls[0].input,
    "https://aiplatform.googleapis.com/v1/projects/moneko-prod/locations/global/publishers/google/models/gemini-2.5-flash:generateContent",
  );
  assertEquals(
    fetchCalls[0].init?.headers,
    {
      Authorization: "Bearer access-token",
      "Content-Type": "application/json",
    },
  );

  const body = JSON.parse(String(fetchCalls[0].init?.body));
  assertEquals(body.systemInstruction, {
    role: "system",
    parts: [{ text: "You are helpful." }],
  });
  assertEquals(body.contents, [
    { role: "user", parts: [{ text: "Earlier question" }] },
    { role: "user", parts: [{ text: "Show my recent spending" }] },
  ]);
  assertEquals(body.tools, [
    {
      functionDeclarations: [
        {
          name: "list_expenses",
          description: "List expenses",
          parameters: {
            type: "OBJECT",
            properties: {
              limit: { type: "NUMBER" },
            },
          },
        },
      ],
    },
  ]);

  assertEquals(response.text(), "Here are the latest expenses.");
  assertEquals(response.functionCalls(), [
    {
      name: "list_expenses",
      args: { limit: 5 },
    },
  ]);
  assertEquals(chat.getHistory(), [
    { role: "user", parts: [{ text: "Earlier question" }] },
    { role: "user", parts: [{ text: "Show my recent spending" }] },
    {
      role: "model",
      parts: [
        {
          functionCall: {
            name: "list_expenses",
            args: { limit: 5 },
          },
        },
        { text: "Here are the latest expenses." },
      ],
    },
  ]);
});

Deno.test("createVertexChatSession converts tool responses into a tool role content", async () => {
  const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];

  const chat = createVertexChatSession({
    model: "gemini-2.5-flash",
    history: [
      { role: "user", parts: [{ text: "List expenses" }] },
      {
        role: "model",
        parts: [
          {
            functionCall: {
              name: "list_expenses",
              args: { limit: 3 },
            },
          },
        ],
      },
    ],
    vertex: {
      project: "moneko-prod",
      location: "global",
      accessToken: "access-token",
    },
    fetchImpl: async (input: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ input: String(input), init });
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                role: "model",
                parts: [{ text: "You spent $48 in the last 3 expenses." }],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  await chat.sendMessage([
    {
      functionResponse: {
        name: "list_expenses",
        response: { total: 48, count: 3 },
      },
    },
  ]);

  const body = JSON.parse(String(fetchCalls[0].init?.body));
  assertEquals(body.contents.at(-1), {
    role: "tool",
    parts: [
      {
        functionResponse: {
          name: "list_expenses",
          response: { total: 48, count: 3 },
        },
      },
    ],
  });
});

Deno.test("createVertexChatSession preserves thoughtSignature on function-call history", async () => {
  const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];
  let requestCount = 0;

  const chat = createVertexChatSession({
    model: "gemini-3.1-flash-lite-preview",
    vertex: {
      project: "moneko-prod",
      location: "global",
      accessToken: "access-token",
    },
    fetchImpl: async (input: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ input: String(input), init });
      requestCount += 1;

      if (requestCount === 1) {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  role: "model",
                  parts: [
                    {
                      functionCall: {
                        name: "list_expenses",
                        args: { limit: 3 },
                      },
                      thoughtSignature: "signature-123",
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                role: "model",
                parts: [{ text: "done" }],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  await chat.sendMessage("List expenses");
  await chat.sendMessage([
    {
      functionResponse: {
        name: "list_expenses",
        response: { total: 48, count: 3 },
      },
    },
  ]);

  const body = JSON.parse(String(fetchCalls[1].init?.body));
  assertEquals(body.contents, [
    { role: "user", parts: [{ text: "List expenses" }] },
    {
      role: "model",
      parts: [
        {
          functionCall: {
            name: "list_expenses",
            args: { limit: 3 },
          },
          thoughtSignature: "signature-123",
        },
      ],
    },
    {
      role: "tool",
      parts: [
        {
          functionResponse: {
            name: "list_expenses",
            response: { total: 48, count: 3 },
          },
        },
      ],
    },
  ]);
});

Deno.test("createVertexBotChatSession defaults request timeout to 60 seconds", async () => {
  const originalTimeout = AbortSignal.timeout;
  let capturedTimeoutMs: number | null = null;

  try {
    (AbortSignal as any).timeout = (delay: number) => {
      capturedTimeoutMs = delay;
      return originalTimeout.call(AbortSignal, 1);
    };

    const chat = createVertexBotChatSession({
      modelName: "gemini-3.1-flash-lite-preview",
      systemInstruction: "Bot system prompt",
      history: [],
      tools: [],
      vertexConfig: {
        project: "moneko-prod",
        location: "global",
        accessToken: "access-token",
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  role: "model",
                  parts: [{ text: "ok" }],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    });

    await chat.sendMessage("hello");
    assertEquals(capturedTimeoutMs, 60000);
  } finally {
    (AbortSignal as any).timeout = originalTimeout;
  }
});

Deno.test("createVertexChatSession throws status-rich errors for retry logic", async () => {
  const chat = createVertexChatSession({
    model: "gemini-2.5-flash",
    vertex: {
      project: "moneko-prod",
      location: "global",
      accessToken: "access-token",
    },
    fetchImpl: async () =>
      new Response(
        JSON.stringify({ error: { message: "service unavailable" } }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      ),
  });

  await assertRejects(
    async () => {
      await chat.sendMessage("hello");
    },
    Error,
    "service unavailable",
  );
});

Deno.test("createVertexBotChatSession maps bot-style inputs onto the shared adapter", async () => {
  const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];

  const chat = createVertexBotChatSession({
    modelName: "gemini-3.1-flash-lite-preview",
    systemInstruction: "Bot system prompt",
    history: [{ role: "user", parts: [{ text: "Previous turn" }] }],
    tools: [{ function_declarations: [{ name: "noop" }] }],
    vertexConfig: {
      project: "moneko-prod",
      location: "global",
      accessToken: "access-token",
    },
    timeoutMs: 1234,
    fetchImpl: async (input: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ input: String(input), init });
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                role: "model",
                parts: [{ text: "ok" }],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const result = await chat.sendMessage("Next turn");
  const response = await result.response;
  const body = JSON.parse(String(fetchCalls[0].init?.body));

  assertEquals(body.tools, [{ functionDeclarations: [{ name: "noop" }] }]);
  assertEquals(response.text(), "ok");
});

Deno.test("createVertexGenerativeAI maps generateContent onto Vertex generateContent", async () => {
  const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];

  const ai = createVertexGenerativeAI({
    project: "moneko-prod",
    location: "global",
    accessToken: "access-token",
    fetchImpl: async (input: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ input: String(input), init });
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                role: "model",
                parts: [
                  {
                    functionCall: {
                      name: "categorize_transactions",
                      args: { categories: ["food"] },
                    },
                  },
                  { text: "food" },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const model = ai.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "Categorize precisely.",
    tools: [{ functionDeclarations: [{ name: "categorize_transactions" }] }],
  });

  const response = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: "Coffee 4 EUR" }] }],
    generationConfig: { maxOutputTokens: 64 },
    toolConfig: { functionCallingConfig: { mode: "ANY" } },
  });

  const body = JSON.parse(String(fetchCalls[0].init?.body));
  assertEquals(body.systemInstruction, {
    role: "system",
    parts: [{ text: "Categorize precisely." }],
  });
  assertEquals(body.tools, [
    { functionDeclarations: [{ name: "categorize_transactions" }] },
  ]);
  assertEquals(body.generationConfig, { maxOutputTokens: 64 });
  assertEquals(response.response.text(), "food");
  assertEquals(response.response.functionCalls(), [
    {
      name: "categorize_transactions",
      args: { categories: ["food"] },
    },
  ]);
});
