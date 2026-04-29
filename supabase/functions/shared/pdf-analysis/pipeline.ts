import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

import type {
  PdfAnalysisProvider,
  PdfDocumentContent,
  PdfNativeExtractionResult,
  PdfOcrExtractionResult,
  PdfPipelineResult,
} from "./types.ts";
import { PDF_EXTRACTION_STRATEGY } from "./types.ts";
import { assessBankStatementCompleteness } from "./completeness.ts";
import {
  createPdfAnalysisProvider,
  runPdfAnalysisOrchestrator,
} from "./ai/orchestrator.ts";
import type { PdfPromptContext } from "./ai/prompts.ts";
import { normalizePdfAnalysisResult } from "./ai/parser.ts";
import { extractNativeTextFromPdf } from "./extractors/native.ts";
import { extractOcrTextFromPdf } from "./extractors/ocr.ts";
import { detectExtractionStrategy } from "./extractors/router.ts";
import { buildVisionDocumentsFromPdf } from "./extractors/vision.ts";
import {
  createPdfAnalysisStorage,
  type PdfAnalysisStorage,
} from "./storage.ts";
import { cleanExtractedText } from "./utils/cleaner.ts";
import { hashPdfBytes, hashPdfCacheKey } from "./utils/hasher.ts";
import { detectDocumentLanguageHint } from "./utils/language.ts";

const PDF_ANALYSIS_CACHE_VERSION = "2026-04-23-v2";

function getMaxNativePages(): number {
  try {
    return Number(Deno.env.get("PDF_ANALYSIS_MAX_PAGES_NATIVE") || 100);
  } catch {
    return 100;
  }
}

function getProviderFingerprint(): string {
  try {
    const configuredModels = Deno.env.get("PDF_ANALYSIS_GEMINI_MODELS")?.trim();
    if (configuredModels) {
      return `vertex:${configuredModels}|pipeline:${PDF_ANALYSIS_CACHE_VERSION}`;
    }
    return `vertex:gemini-3.1-flash-lite-preview,gemini-2.5-flash,gemini-2.5-pro|pipeline:${PDF_ANALYSIS_CACHE_VERSION}`;
  } catch {
    return `vertex:gemini-3.1-flash-lite-preview,gemini-2.5-flash,gemini-2.5-pro|pipeline:${PDF_ANALYSIS_CACHE_VERSION}`;
  }
}

interface PdfPipelineExtractors {
  native(base64Pdf: string): Promise<PdfNativeExtractionResult | null>;
  ocr(base64Pdf: string): Promise<PdfOcrExtractionResult | null>;
  vision(base64Pdf: string): Promise<{ documents: any[]; pageCount: number }>;
}

export interface RunPdfAnalysisPipelineOptions extends PdfPromptContext {
  base64Pdf: string;
  contentType: string;
  createProvider?: () => PdfAnalysisProvider;
  storage?: PdfAnalysisStorage;
  extractors?: Partial<PdfPipelineExtractors>;
}

function createExtractors(
  overrides?: Partial<PdfPipelineExtractors>,
): PdfPipelineExtractors {
  return {
    native: overrides?.native || extractNativeTextFromPdf,
    ocr: overrides?.ocr || extractOcrTextFromPdf,
    vision: overrides?.vision || buildVisionDocumentsFromPdf,
  };
}

function pickPreferredText(
  strategy: string,
  nativeResult: PdfNativeExtractionResult | null,
  ocrResult: PdfOcrExtractionResult | null,
): { text: string; pages: string[] } {
  if (strategy === PDF_EXTRACTION_STRATEGY.native) {
    return {
      text: cleanExtractedText(nativeResult?.text || ""),
      pages: nativeResult?.pages || [],
    };
  }

  const nativeLength = nativeResult?.text.length ?? 0;
  const ocrLength = ocrResult?.text.length ?? 0;
  if (ocrLength >= nativeLength) {
    return {
      text: cleanExtractedText(ocrResult?.text || nativeResult?.text || ""),
      pages: ocrResult?.pages || nativeResult?.pages || [],
    };
  }

  return {
    text: cleanExtractedText(nativeResult?.text || ocrResult?.text || ""),
    pages: nativeResult?.pages || ocrResult?.pages || [],
  };
}

export async function runPdfAnalysisPipeline(
  options: RunPdfAnalysisPipelineOptions,
): Promise<PdfPipelineResult> {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const pdfBytes = decodeBase64(options.base64Pdf);
  const pdfHash = await hashPdfBytes(pdfBytes);
  const hash = await hashPdfCacheKey({
    pdfHash,
    providerFingerprint: getProviderFingerprint(),
    callerCurrency: options.callerCurrency,
    callerDate: options.callerDate,
    expenseCategories: [...options.expenseCategories].sort(),
    incomeCategories: [...options.incomeCategories].sort(),
    typeHint: options.typeHint || "",
    householdPrompt: options.householdPrompt || "",
    categoryPreferenceGuidance: (options.categoryPreferenceGuidance ?? []).join(
      "\n",
    ),
  });
  const storage = options.storage || createPdfAnalysisStorage();
  const cached = await storage.get(hash);
  const cacheEligible = cached != null &&
    cached.error == null &&
    cached.requires_review !== true &&
    cached.metadata.completeness_suspect !== true;
  if (cached && !cacheEligible) {
    console.warn("[pdf-analysis] bypassing non-clean cache entry", {
      hash,
      documentType: cached.document_type,
      itemCount: cached.items.length,
      requiresReview: cached.requires_review === true,
      error: cached.error ?? null,
      completenessSuspect: cached.metadata.completeness_suspect === true,
    });
  }
  if (cached && cacheEligible) {
    console.log("[pdf-analysis] cache hit", {
      hash,
      documentType: cached.document_type,
      itemCount: cached.items.length,
      pageCount: cached.metadata.page_count,
      requiresReview: cached.requires_review === true,
      completenessSuspect: cached.metadata.completeness_suspect === true,
    });
    await storage.log({
      requestId,
      hash,
      documentType: cached.document_type,
      pageCount: cached.metadata.page_count,
      extractionStrategy: cached.metadata.extraction_strategy,
      aiProvider: cached.metadata.ai_provider,
      inputTokens: cached.metadata.input_tokens,
      outputTokens: cached.metadata.output_tokens,
      latencyMs: Date.now() - startedAt,
      cacheHit: true,
    });
    return {
      items: cached.items,
      analysis: cached,
      rawText: cached.raw_text,
    };
  }

  const extractors = createExtractors(options.extractors);
  console.log("[pdf-analysis] native extraction start", {
    requestId,
    hash,
    pdfBytes: pdfBytes.length,
  });
  const nativeResult = await extractors.native(options.base64Pdf);
  console.log("[pdf-analysis] native extraction complete", {
    requestId,
    hash,
    pageCount: nativeResult?.pageCount ?? null,
    textLength: nativeResult?.text.length ?? 0,
    pageTextCount: nativeResult?.pages.length ?? 0,
    elapsedMs: Date.now() - startedAt,
  });
  const pageCount = nativeResult?.pageCount || 1;
  const strategy = detectExtractionStrategy({
    pageCount,
    nativeText: nativeResult?.text || "",
    maxNativePages: getMaxNativePages(),
  });
  console.log("[pdf-analysis] extraction strategy selected", {
    requestId,
    hash,
    strategy,
    pageCount,
    nativeTextLength: nativeResult?.text.length ?? 0,
    maxNativePages: getMaxNativePages(),
    elapsedMs: Date.now() - startedAt,
  });
  const ocrResult = strategy === PDF_EXTRACTION_STRATEGY.native
    ? null
    : await (async () => {
      console.log("[pdf-analysis] ocr extraction start", {
        requestId,
        hash,
        strategy,
      });
      const result = await extractors.ocr(options.base64Pdf);
      console.log("[pdf-analysis] ocr extraction complete", {
        requestId,
        hash,
        pageCount: result?.pageCount ?? null,
        textLength: result?.text.length ?? 0,
        pageTextCount: result?.pages.length ?? 0,
        elapsedMs: Date.now() - startedAt,
      });
      return result;
    })();

  let content: PdfDocumentContent;
  if (strategy === PDF_EXTRACTION_STRATEGY.native) {
    const preferred = pickPreferredText(strategy, nativeResult, ocrResult);
    content = {
      text: preferred.text,
      pages: preferred.pages,
      pageCount,
      languageHint: detectDocumentLanguageHint(preferred.text),
      extractionStrategy: strategy,
    };
  } else if (strategy === PDF_EXTRACTION_STRATEGY.hybrid) {
    const preferred = pickPreferredText(strategy, nativeResult, ocrResult);
    console.log("[pdf-analysis] vision document build start", {
      requestId,
      hash,
      strategy,
    });
    const vision = await extractors.vision(options.base64Pdf);
    console.log("[pdf-analysis] vision document build complete", {
      requestId,
      hash,
      pageCount: vision.pageCount,
      documentCount: Array.isArray(vision.documents)
        ? vision.documents.length
        : 0,
      elapsedMs: Date.now() - startedAt,
    });
    content = {
      text: preferred.text,
      pages: preferred.pages,
      documents: vision.documents,
      pageCount: vision.pageCount,
      extractionStrategy: strategy,
    };
    content.languageHint = detectDocumentLanguageHint(content.text || "");
  } else {
    const preferred = pickPreferredText(strategy, nativeResult, ocrResult);
    console.log("[pdf-analysis] vision document build start", {
      requestId,
      hash,
      strategy,
    });
    const vision = await extractors.vision(options.base64Pdf);
    console.log("[pdf-analysis] vision document build complete", {
      requestId,
      hash,
      pageCount: vision.pageCount,
      documentCount: Array.isArray(vision.documents)
        ? vision.documents.length
        : 0,
      elapsedMs: Date.now() - startedAt,
    });
    content = {
      text: preferred.text,
      pages: preferred.pages,
      documents: vision.documents,
      pageCount: vision.pageCount,
      languageHint: detectDocumentLanguageHint(preferred.text),
      extractionStrategy: strategy,
    };
  }

  const rawText = cleanExtractedText(content.text || "");
  console.log("[pdf-analysis] orchestrator start", {
    requestId,
    hash,
    pageCount: content.pageCount,
    extractionStrategy: content.extractionStrategy,
    rawTextLength: rawText.length,
    pageTextCount: content.pages?.length ?? 0,
    documentCount: content.documents?.length ?? 0,
    elapsedMs: Date.now() - startedAt,
  });

  try {
    const analysis = await runPdfAnalysisOrchestrator({
      content,
      requestId,
      promptContext: {
        callerCurrency: options.callerCurrency,
        callerDate: options.callerDate,
        expenseCategories: options.expenseCategories,
        incomeCategories: options.incomeCategories,
        typeHint: options.typeHint,
        householdPrompt: options.householdPrompt,
      },
      createProvider: options.createProvider || createPdfAnalysisProvider,
    });
    console.log("[pdf-analysis] orchestrator complete", {
      requestId,
      hash,
      itemCount: analysis.items.length,
      documentType: analysis.document_type,
      requiresReview: analysis.requires_review === true,
      elapsedMs: Date.now() - startedAt,
    });

    analysis.metadata = {
      ...analysis.metadata,
      latency_ms: Date.now() - startedAt,
    };

    const completeness = assessBankStatementCompleteness({
      documentType: analysis.document_type,
      rawText,
      items: analysis.items,
      pageCount: content.pageCount,
    });

    analysis.metadata = {
      ...analysis.metadata,
      estimated_statement_rows: completeness.estimatedTransactionCount,
      completeness_suspect: completeness.suspicious,
    };

    if (completeness.suspicious && completeness.reason) {
      analysis.requires_review = true;
      analysis.error = completeness.reason;
      analysis.anomalies = Array.isArray(analysis.anomalies)
        ? Array.from(new Set([...analysis.anomalies, completeness.reason]))
        : [completeness.reason];
    }

    console.log("[pdf-analysis] pipeline result", {
      requestId,
      hash,
      documentType: analysis.document_type,
      pageCount: content.pageCount,
      extractionStrategy: content.extractionStrategy,
      rawTextLength: rawText.length,
      itemCount: analysis.items.length,
      requiresReview: analysis.requires_review === true,
      estimatedStatementRows: completeness.estimatedTransactionCount,
      completenessSuspect: completeness.suspicious,
      chunkCount: analysis.metadata.chunk_count,
      chunkItemCounts: analysis.metadata.chunk_item_counts,
      inputTokens: analysis.metadata.input_tokens,
      outputTokens: analysis.metadata.output_tokens,
      latencyMs: analysis.metadata.latency_ms,
    });

    const cacheableBankStatement = !(
      analysis.document_type === "bank_statement" &&
      analysis.requires_review === true
    );
    if (
      analysis.items.length > 0 && !analysis.error && cacheableBankStatement
    ) {
      await storage.set(hash, analysis);
    }
    await storage.log({
      requestId,
      hash,
      documentType: analysis.document_type,
      pageCount: analysis.metadata.page_count,
      extractionStrategy: analysis.metadata.extraction_strategy,
      aiProvider: analysis.metadata.ai_provider,
      inputTokens: analysis.metadata.input_tokens,
      outputTokens: analysis.metadata.output_tokens,
      latencyMs: analysis.metadata.latency_ms,
      cacheHit: false,
    });

    for (const anomaly of analysis.anomalies) {
      await storage.log({
        requestId,
        hash,
        documentType: analysis.document_type,
        pageCount: analysis.metadata.page_count,
        extractionStrategy: analysis.metadata.extraction_strategy,
        aiProvider: analysis.metadata.ai_provider,
        inputTokens: analysis.metadata.input_tokens,
        outputTokens: analysis.metadata.output_tokens,
        latencyMs: analysis.metadata.latency_ms,
        cacheHit: false,
        anomaly,
      });
    }

    return {
      items: analysis.items,
      analysis,
      rawText,
    };
  } catch (error) {
    const analysis = normalizePdfAnalysisResult(null, {
      extractionStrategy: strategy,
      pageCount: content.pageCount,
      rawText,
      languageHint: content.languageHint,
      aiProvider: options.createProvider
        ? options.createProvider().name
        : undefined,
      latencyMs: Date.now() - startedAt,
      requestId,
    });

    await storage.log({
      requestId,
      hash,
      documentType: analysis.document_type,
      pageCount: analysis.metadata.page_count,
      extractionStrategy: analysis.metadata.extraction_strategy,
      aiProvider: analysis.metadata.ai_provider,
      latencyMs: analysis.metadata.latency_ms,
      cacheHit: false,
      anomaly: error instanceof Error ? error.message : String(error),
    });

    return {
      items: [],
      analysis,
      rawText: analysis.raw_text,
      error: analysis.error,
    };
  }
}
