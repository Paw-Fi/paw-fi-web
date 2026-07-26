import { getGoogleAccessToken } from "./google-auth.ts";

const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const DEFAULT_VERTEX_LOCATION = "global";
const DEFAULT_VERTEX_BOT_TIMEOUT_MS = 60000;

type VertexPart = {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: {
    name: string;
    args?: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response?: Record<string, unknown>;
  };
};

type VertexContent = {
  role: string;
  parts: VertexPart[];
};

type VertexToolDeclaration = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
};

type VertexTool = {
  functionDeclarations?: VertexToolDeclaration[];
  function_declarations?: VertexToolDeclaration[];
};

type VertexAiEnvConfig = {
  project: string;
  location: string;
  serviceAccountJson: string;
};

type VertexChatResponse = {
  text: () => string;
  functionCalls: () => Array<{
    name: string;
    args?: Record<string, unknown>;
  }>;
  raw: unknown;
};

type VertexSendMessageOptions = {
  toolConfig?: Record<string, unknown>;
  generationConfig?: Record<string, unknown>;
};

type VertexChatSession = {
  sendMessage: (
    content: unknown,
    options?: VertexSendMessageOptions,
  ) => Promise<{ response: Promise<VertexChatResponse> }>;
  getHistory: () => VertexContent[];
};

type VertexChatOptions = {
  model: string;
  systemInstruction?: string;
  history?: VertexContent[];
  tools?: VertexTool[];
  timeoutMs?: number;
  vertex: {
    project: string;
    location: string;
    serviceAccountJson?: string;
    accessToken?: string;
  };
  fetchImpl?: typeof fetch;
};

type VertexBotChatSessionOptions = {
  modelName: string;
  systemInstruction: string;
  history: Array<{ role: string; parts: Array<Record<string, unknown>> }>;
  tools: any[];
  timeoutMs?: number;
  vertexConfig: {
    project: string;
    location: string;
    serviceAccountJson?: string;
    accessToken?: string;
  };
  fetchImpl?: typeof fetch;
};

type VertexGenerativeAIOptions = {
  project: string;
  location: string;
  serviceAccountJson?: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
};

type VertexGenerativeModelOptions = {
  model: string;
  systemInstruction?: string;
  tools?: VertexTool[];
};

type ServiceAccountShape = {
  project_id?: string;
};

let cachedAccessToken:
  | {
    key: string;
    token: string;
    expiresAt: number;
  }
  | null = null;

function normalizeVertexLocation(raw: string | undefined): string {
  const value = String(raw || "").trim();
  return value || DEFAULT_VERTEX_LOCATION;
}

function parseServiceAccountJson(
  serviceAccountJson: string,
): ServiceAccountShape {
  try {
    return JSON.parse(serviceAccountJson) as ServiceAccountShape;
  } catch {
    throw new Error("GOOGLE_CLOUD_SERVICE_ACCOUNT is not valid JSON");
  }
}

export function getVertexAiConfigFromEnv(): VertexAiEnvConfig {
  const serviceAccountJson = Deno.env.get("GOOGLE_CLOUD_SERVICE_ACCOUNT") || "";
  if (!serviceAccountJson.trim()) {
    throw new Error("Missing GOOGLE_CLOUD_SERVICE_ACCOUNT");
  }

  const serviceAccount = parseServiceAccountJson(serviceAccountJson);
  const project = (
    Deno.env.get("GOOGLE_CLOUD_PROJECT") ||
    Deno.env.get("VERTEX_AI_PROJECT") ||
    serviceAccount.project_id ||
    ""
  ).trim();
  if (!project) {
    throw new Error(
      "Missing Google Cloud project. Set GOOGLE_CLOUD_PROJECT or include project_id in GOOGLE_CLOUD_SERVICE_ACCOUNT.",
    );
  }

  const location = normalizeVertexLocation(
    Deno.env.get("GOOGLE_CLOUD_LOCATION") || Deno.env.get("VERTEX_AI_LOCATION"),
  );

  return {
    project,
    location,
    serviceAccountJson,
  };
}

async function getVertexAccessToken(
  serviceAccountJson: string,
): Promise<string> {
  const cacheKey = serviceAccountJson;
  const now = Date.now();
  if (
    cachedAccessToken &&
    cachedAccessToken.key === cacheKey &&
    cachedAccessToken.expiresAt > now
  ) {
    return cachedAccessToken.token;
  }

  const token = await getGoogleAccessToken({
    serviceAccountJson,
    scope: CLOUD_PLATFORM_SCOPE,
  });

  cachedAccessToken = {
    key: cacheKey,
    token,
    expiresAt: now + 55 * 60 * 1000,
  };

  return token;
}

function cloneContent(content: VertexContent): VertexContent {
  return {
    role: content.role,
    parts: content.parts.map((part) => ({
      ...(part.text != null ? { text: part.text } : {}),
      ...(part.thought != null ? { thought: part.thought } : {}),
      ...(part.thoughtSignature != null
        ? { thoughtSignature: part.thoughtSignature }
        : {}),
      ...(part.functionCall
        ? {
          functionCall: {
            name: part.functionCall.name,
            ...(part.functionCall.args
              ? { args: structuredClone(part.functionCall.args) }
              : {}),
          },
        }
        : {}),
      ...(part.functionResponse
        ? {
          functionResponse: {
            name: part.functionResponse.name,
            ...(part.functionResponse.response
              ? { response: structuredClone(part.functionResponse.response) }
              : {}),
          },
        }
        : {}),
    })),
  };
}

function normalizeTools(
  tools: VertexTool[] | undefined,
): VertexTool[] | undefined {
  if (!Array.isArray(tools) || tools.length === 0) {
    return undefined;
  }

  return tools.map((tool) => {
    if (Array.isArray(tool.functionDeclarations)) {
      return tool;
    }
    if (Array.isArray(tool.function_declarations)) {
      return {
        functionDeclarations: tool.function_declarations,
      };
    }
    return tool;
  });
}

function normalizeSendMessageInput(content: unknown): VertexContent {
  if (typeof content === "string") {
    return {
      role: "user",
      parts: [{ text: content }],
    };
  }

  if (
    Array.isArray(content) &&
    content.every((item) =>
      item && typeof item === "object" && "functionResponse" in item
    )
  ) {
    // Vertex generateContent accepts only `user` and `model` content roles.
    // Function responses are sent as user content (not OpenAI's `tool` role).
    return {
      role: "user",
      parts: content.map((item) => ({
        functionResponse: structuredClone(
          (item as { functionResponse: Record<string, unknown> })
            .functionResponse,
        ) as VertexPart["functionResponse"],
      })),
    };
  }

  if (
    content &&
    typeof content === "object" &&
    typeof (content as VertexContent).role === "string" &&
    Array.isArray((content as VertexContent).parts)
  ) {
    return cloneContent(content as VertexContent);
  }

  throw new Error("Unsupported chat content payload for Vertex AI");
}

function buildEndpoint(
  model: string,
  vertex: { project: string; location: string },
): string {
  const modelPath = `projects/${vertex.project}/locations/${vertex.location}` +
    `/publishers/google/models/${model}`;
  return `https://aiplatform.googleapis.com/v1/${modelPath}:generateContent`;
}

function buildResponseWrapper(payload: any): VertexChatResponse {
  const modelContent = payload?.candidates?.[0]?.content;
  const parts = Array.isArray(modelContent?.parts) ? modelContent.parts : [];

  return {
    text() {
      return parts
        .map((part: any) => typeof part?.text === "string" ? part.text : "")
        .join("")
        .trim();
    },
    functionCalls() {
      return parts
        .map((part: any) => part?.functionCall)
        .filter((call: any) => call && typeof call.name === "string")
        .map((call: any) => ({
          name: call.name,
          ...(call.args && typeof call.args === "object"
            ? { args: call.args as Record<string, unknown> }
            : {}),
        }));
    },
    raw: payload,
  };
}

async function resolveAccessToken(
  options: VertexChatOptions["vertex"],
): Promise<string> {
  if (options.accessToken) {
    return options.accessToken;
  }
  if (options.serviceAccountJson) {
    return await getVertexAccessToken(options.serviceAccountJson);
  }
  throw new Error(
    "Vertex AI auth is not configured. Provide accessToken or serviceAccountJson.",
  );
}

function buildError(status: number, payload: unknown): Error {
  const message = (payload as any)?.error?.message ||
    (payload as any)?.message ||
    `Vertex AI request failed with status ${status}`;
  const error = new Error(String(message));
  (error as any).status = status;
  (error as any).statusCode = status;
  (error as any).response = { status, data: payload };
  return error;
}

export function createVertexChatSession(
  options: VertexChatOptions,
): VertexChatSession {
  const fetchImpl = options.fetchImpl || fetch;
  const history = Array.isArray(options.history)
    ? options.history.map(cloneContent)
    : [];
  const tools = normalizeTools(options.tools);

  return {
    async sendMessage(
      content: unknown,
      perCallOptions?: VertexSendMessageOptions,
    ) {
      const nextContent = normalizeSendMessageInput(content);
      const requestContents = [
        ...history.map(cloneContent),
        cloneContent(nextContent),
      ];
      const accessToken = await resolveAccessToken(options.vertex);
      const response = await fetchImpl(
        buildEndpoint(options.model, options.vertex),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: requestContents,
            ...(options.systemInstruction
              ? {
                systemInstruction: {
                  role: "system",
                  parts: [{ text: options.systemInstruction }],
                },
              }
              : {}),
            ...(tools ? { tools } : {}),
            ...(perCallOptions?.toolConfig
              ? { toolConfig: perCallOptions.toolConfig }
              : {}),
            ...(perCallOptions?.generationConfig
              ? { generationConfig: perCallOptions.generationConfig }
              : {}),
          }),
          signal: AbortSignal.timeout(options.timeoutMs ?? 30000),
        },
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw buildError(response.status, payload);
      }

      const wrapped = buildResponseWrapper(payload);
      history.push(cloneContent(nextContent));

      const modelContent = payload?.candidates?.[0]?.content;
      if (modelContent && Array.isArray(modelContent.parts)) {
        history.push(cloneContent(modelContent as VertexContent));
      }

      return {
        response: Promise.resolve(wrapped),
      };
    },
    getHistory() {
      return history.map(cloneContent);
    },
  };
}

export function createVertexBotChatSession(
  options: VertexBotChatSessionOptions,
): VertexChatSession {
  return createVertexChatSession({
    model: options.modelName,
    systemInstruction: options.systemInstruction,
    history: options.history as VertexContent[],
    tools: options.tools,
    timeoutMs: options.timeoutMs ?? DEFAULT_VERTEX_BOT_TIMEOUT_MS,
    vertex: options.vertexConfig,
    fetchImpl: options.fetchImpl,
  });
}

export function createVertexGenerativeAI(options: VertexGenerativeAIOptions) {
  const fetchImpl = options.fetchImpl || fetch;

  return {
    getGenerativeModel(modelOptions: VertexGenerativeModelOptions) {
      return {
        async generateContent(request: Record<string, unknown>) {
          const accessToken = await resolveAccessToken(options);
          const response = await fetchImpl(
            buildEndpoint(modelOptions.model, options),
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...request,
                ...(modelOptions.systemInstruction &&
                    request.systemInstruction == null
                  ? {
                    systemInstruction: {
                      role: "system",
                      parts: [{ text: modelOptions.systemInstruction }],
                    },
                  }
                  : {}),
                ...(modelOptions.tools && request.tools == null
                  ? { tools: normalizeTools(modelOptions.tools) }
                  : {}),
              }),
            },
          );

          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            throw buildError(response.status, payload);
          }

          return {
            response: buildResponseWrapper(payload),
          };
        },
      };
    },
  };
}
