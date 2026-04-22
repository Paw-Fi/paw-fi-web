import type {
  PdfAnalysisParserContext,
  PdfAnalysisProvider,
  PdfAnalysisResult,
  PdfDocumentContent,
} from "../types.ts";
import { chunkDocumentContent } from "../utils/chunker.ts";
import {
  buildPdfSynthesisPrompt,
  buildPdfSynthesisUserPrompt,
  buildPdfSystemPrompt,
  buildPdfUserPrompt,
  type PdfPromptContext,
} from "./prompts.ts";
import { parsePdfAnalysisResult } from "./parser.ts";
import { createGeminiPdfAnalysisProvider } from "./providers/gemini.ts";

function getChunkTokenLimit(): number {
  try {
    return Number(Deno.env.get("PDF_ANALYSIS_CHUNK_TOKEN_LIMIT") || 6000);
  } catch {
    return 6000;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();
  return [
    "429",
    "500",
    "502",
    "503",
    "504",
    "rate limit",
    "temporarily unavailable",
    "timeout",
    "timed out",
    "overloaded",
  ].some((phrase) => message.includes(phrase));
}

async function analyzeWithRetry(params: {
  provider: PdfAnalysisProvider;
  content: PdfDocumentContent;
  systemPrompt: string;
  userPrompt: string;
}) {
  let attempt = 0;
  let delayMs = 600;

  for (;;) {
    try {
      return await params.provider.analyze(
        params.content,
        params.systemPrompt,
        params.userPrompt,
      );
    } catch (error) {
      attempt += 1;
      if (attempt >= 3 || !isRetryableError(error)) {
        throw error;
      }
      const jitter = Math.floor(Math.random() * 250);
      await sleep(delayMs + jitter);
      delayMs *= 2;
    }
  }
}

function selectProvider(): PdfAnalysisProvider {
  return createGeminiPdfAnalysisProvider();
}

function buildParserContext(params: {
  requestId: string;
  content: PdfDocumentContent;
  rawText: string;
  providerName: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
}): PdfAnalysisParserContext {
  return {
    extractionStrategy: params.content.extractionStrategy,
    pageCount: params.content.pageCount,
    rawText: params.rawText,
    languageHint: params.content.languageHint,
    aiProvider: params.providerName,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    latencyMs: params.latencyMs,
    requestId: params.requestId,
  };
}

function filterDocumentsByPages(content: PdfDocumentContent, pages: number[]) {
  if (!Array.isArray(content.documents) || content.documents.length === 0) {
    return undefined;
  }
  const pageSet = new Set(pages);
  return content.documents.filter((document) => pageSet.has(document.page));
}

export async function runPdfAnalysisOrchestrator(params: {
  content: PdfDocumentContent;
  promptContext: PdfPromptContext;
  requestId: string;
  createProvider?: () => PdfAnalysisProvider;
}): Promise<PdfAnalysisResult> {
  const provider = params.createProvider
    ? params.createProvider()
    : selectProvider();
  const chunks = chunkDocumentContent({
    pageCount: params.content.pageCount,
    tokenLimit: getChunkTokenLimit(),
    pages: params.content.pages,
    text: params.content.text,
  });
  const shouldUseMapReduce = chunks.length > 1;

  if (!shouldUseMapReduce) {
    const systemPrompt = buildPdfSystemPrompt(params.promptContext);
    const userPrompt = buildPdfUserPrompt(params.content, params.promptContext);
    const response = await analyzeWithRetry({
      provider,
      content: params.content,
      systemPrompt,
      userPrompt,
    });

    return parsePdfAnalysisResult(
      response.text,
      buildParserContext({
        requestId: params.requestId,
        content: params.content,
        rawText: params.content.text || "",
        providerName: provider.name,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        latencyMs: response.latencyMs,
      }),
    );
  }

  const partials: PdfAnalysisResult[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalLatencyMs = 0;

  for (const chunk of chunks) {
    const chunkContent: PdfDocumentContent = {
      ...params.content,
      text: chunk.text,
      pages: undefined,
      documents: filterDocumentsByPages(params.content, chunk.pages),
    };
    const systemPrompt = buildPdfSystemPrompt(params.promptContext);
    const userPrompt = buildPdfUserPrompt(chunkContent, params.promptContext);
    const response = await analyzeWithRetry({
      provider,
      content: chunkContent,
      systemPrompt,
      userPrompt,
    });

    totalInputTokens += response.inputTokens || 0;
    totalOutputTokens += response.outputTokens || 0;
    totalLatencyMs += response.latencyMs;
    partials.push(
      parsePdfAnalysisResult(
        response.text,
        buildParserContext({
          requestId: params.requestId,
          content: chunkContent,
          rawText: chunk.text,
          providerName: provider.name,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          latencyMs: response.latencyMs,
        }),
      ),
    );
  }

  const synthesisContent: PdfDocumentContent = {
    text: buildPdfSynthesisUserPrompt(partials),
    pageCount: params.content.pageCount,
    extractionStrategy: params.content.extractionStrategy,
    languageHint: params.content.languageHint,
  };
  const synthesisResponse = await analyzeWithRetry({
    provider,
    content: synthesisContent,
    systemPrompt: buildPdfSynthesisPrompt(),
    userPrompt: synthesisContent.text || "",
  });

  return parsePdfAnalysisResult(
    synthesisResponse.text,
    buildParserContext({
      requestId: params.requestId,
      content: params.content,
      rawText: params.content.text || "",
      providerName: provider.name,
      inputTokens: totalInputTokens + (synthesisResponse.inputTokens || 0),
      outputTokens: totalOutputTokens + (synthesisResponse.outputTokens || 0),
      latencyMs: totalLatencyMs + synthesisResponse.latencyMs,
    }),
  );
}

export function createPdfAnalysisProvider(): PdfAnalysisProvider {
  return selectProvider();
}
