import type {
  PdfAnalysisParserContext,
  PdfAnalysisProvider,
  PdfAnalysisResult,
  PdfDocumentContent,
} from "../types.ts";
import { mergePdfAnalysisResults } from "../completeness.ts";
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
  const message = error instanceof Error
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
  const startedAt = Date.now();
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
  console.log("[pdf-analysis] orchestrator chunk plan", {
    requestId: params.requestId,
    provider: provider.name,
    pageCount: params.content.pageCount,
    chunkCount: chunks.length,
    chunkTokenLimit: getChunkTokenLimit(),
    chunkTokens: chunks.map((chunk) => chunk.estimatedTokens),
    chunkPages: chunks.map((chunk) => chunk.pages),
  });

  if (!shouldUseMapReduce) {
    const systemPrompt = buildPdfSystemPrompt(params.promptContext);
    const userPrompt = buildPdfUserPrompt(params.content, params.promptContext);
    console.log("[pdf-analysis] single-chunk analysis start", {
      requestId: params.requestId,
      textLength: params.content.text?.length ?? 0,
      documentCount: params.content.documents?.length ?? 0,
    });
    const response = await analyzeWithRetry({
      provider,
      content: params.content,
      systemPrompt,
      userPrompt,
    });
    console.log("[pdf-analysis] single-chunk analysis complete", {
      requestId: params.requestId,
      inputTokens: response.inputTokens ?? null,
      outputTokens: response.outputTokens ?? null,
      latencyMs: response.latencyMs,
      elapsedMs: Date.now() - startedAt,
      responseTextLength: response.text.length,
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
    const chunkStartedAt = Date.now();
    const chunkContent: PdfDocumentContent = {
      ...params.content,
      text: chunk.text,
      pages: undefined,
      documents: filterDocumentsByPages(params.content, chunk.pages),
    };
    const systemPrompt = buildPdfSystemPrompt(params.promptContext);
    const userPrompt = buildPdfUserPrompt(chunkContent, params.promptContext);
    console.log("[pdf-analysis] chunk analysis start", {
      requestId: params.requestId,
      chunkIndex: chunk.index,
      chunkCount: chunks.length,
      pages: chunk.pages,
      estimatedTokens: chunk.estimatedTokens,
      textLength: chunk.text.length,
      documentCount: chunkContent.documents?.length ?? 0,
    });
    const response = await analyzeWithRetry({
      provider,
      content: chunkContent,
      systemPrompt,
      userPrompt,
    });
    console.log("[pdf-analysis] chunk analysis response", {
      requestId: params.requestId,
      chunkIndex: chunk.index,
      inputTokens: response.inputTokens ?? null,
      outputTokens: response.outputTokens ?? null,
      latencyMs: response.latencyMs,
      elapsedMs: Date.now() - chunkStartedAt,
      responseTextLength: response.text.length,
    });

    totalInputTokens += response.inputTokens || 0;
    totalOutputTokens += response.outputTokens || 0;
    totalLatencyMs += response.latencyMs;
    const parsedChunk = parsePdfAnalysisResult(
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
    );
    console.log("[pdf-analysis] chunk analysis parsed", {
      requestId: params.requestId,
      chunkIndex: chunk.index,
      documentType: parsedChunk.document_type,
      itemCount: parsedChunk.items.length,
      requiresReview: parsedChunk.requires_review === true,
      error: parsedChunk.error ?? null,
    });
    partials.push(parsedChunk);
  }

  const mergedPartials = mergePdfAnalysisResults({
    partials,
    context: buildParserContext({
      requestId: params.requestId,
      content: params.content,
      rawText: params.content.text || "",
      providerName: provider.name,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      latencyMs: totalLatencyMs,
    }),
  });

  console.log("[pdf-analysis] map-reduce chunk summary", {
    requestId: params.requestId,
    pageCount: params.content.pageCount,
    chunkCount: chunks.length,
    chunkItemCounts: partials.map((partial) => partial.items.length),
    mergedItemCount: mergedPartials.items.length,
  });

  if (mergedPartials.items.length > 0) {
    return mergedPartials;
  }

  const synthesisContent: PdfDocumentContent = {
    text: buildPdfSynthesisUserPrompt(partials),
    pageCount: params.content.pageCount,
    extractionStrategy: params.content.extractionStrategy,
    languageHint: params.content.languageHint,
  };
  console.log("[pdf-analysis] synthesis start", {
    requestId: params.requestId,
    partialCount: partials.length,
    synthesisTextLength: synthesisContent.text?.length ?? 0,
  });
  const synthesisResponse = await analyzeWithRetry({
    provider,
    content: synthesisContent,
    systemPrompt: buildPdfSynthesisPrompt(),
    userPrompt: synthesisContent.text || "",
  });
  console.log("[pdf-analysis] synthesis response", {
    requestId: params.requestId,
    inputTokens: synthesisResponse.inputTokens ?? null,
    outputTokens: synthesisResponse.outputTokens ?? null,
    latencyMs: synthesisResponse.latencyMs,
    responseTextLength: synthesisResponse.text.length,
    elapsedMs: Date.now() - startedAt,
  });

  const synthesized = parsePdfAnalysisResult(
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

  console.log("[pdf-analysis] synthesis summary", {
    requestId: params.requestId,
    synthesisItemCount: synthesized.items.length,
    chunkCount: chunks.length,
  });

  synthesized.metadata = {
    ...synthesized.metadata,
    chunk_count: chunks.length,
    chunk_item_counts: partials.map((partial) => partial.items.length),
    merged_item_count: mergedPartials.items.length,
    synthesis_item_count: synthesized.items.length,
  };

  return synthesized;
}

export function createPdfAnalysisProvider(): PdfAnalysisProvider {
  return selectProvider();
}
