import {
  createVertexGenerativeAI,
  getVertexAiConfigFromEnv,
} from "../../../vertex-ai-chat.ts";

import type {
  PdfAnalysisProvider,
  PdfAnalysisProviderResult,
  PdfDocumentContent,
} from "../../types.ts";

interface VertexLikeClient {
  getGenerativeModel(modelOptions: {
    model: string;
    systemInstruction?: string;
  }): {
    generateContent(
      request: Record<string, unknown>,
    ): Promise<{ response: { text(): string; raw?: Record<string, unknown> } }>;
  };
}

interface GeminiPdfProviderOptions {
  createClient?: () => VertexLikeClient;
  modelNames?: string[];
}

function getGeminiModelNames(): string[] {
  try {
    const configured = Deno.env.get("PDF_ANALYSIS_GEMINI_MODELS")?.trim();
    if (configured) {
      const models = configured
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (models.length > 0) return models;
    }

    return ["gemini-3.1-flash", "gemini-2.5-flash", "gemini-2.5-pro"];
  } catch {
    return ["gemini-3.1-flash", "gemini-2.5-flash", "gemini-2.5-pro"];
  }
}

function buildGeminiParts(
  userPrompt: string,
  content: PdfDocumentContent,
): any[] {
  const parts: any[] = [{ text: userPrompt }];

  for (const document of content.documents || []) {
    parts.push({
      inlineData: {
        mimeType: document.mimeType,
        data: document.base64,
      },
    });
  }

  for (const image of content.images || []) {
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.base64,
      },
    });
  }

  return parts;
}

export function createGeminiPdfAnalysisProvider(
  options?: GeminiPdfProviderOptions,
): PdfAnalysisProvider {
  const genAI = options?.createClient
    ? options.createClient()
    : createVertexGenerativeAI(getVertexAiConfigFromEnv());
  const modelNames = options?.modelNames?.length
    ? options.modelNames
    : getGeminiModelNames();

  return {
    name: "vertex",
    async analyze(
      content: PdfDocumentContent,
      systemPrompt: string,
      userPrompt: string,
    ): Promise<PdfAnalysisProviderResult> {
      const startedAt = Date.now();
      let lastError: unknown;

      for (const modelName of modelNames) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt,
          });

          const response = await model.generateContent({
            contents: [
              { role: "user", parts: buildGeminiParts(userPrompt, content) },
            ],
            generationConfig: {
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
            },
          });

          const raw = (response.response as any)?.raw || {};
          const usage = raw?.usageMetadata || {};

          return {
            text: response.response.text(),
            model: modelName,
            inputTokens: Number(usage.promptTokenCount || 0) || undefined,
            outputTokens: Number(usage.candidatesTokenCount || 0) || undefined,
            latencyMs: Date.now() - startedAt,
          };
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error("All Vertex PDF models failed");
    },
  };
}
