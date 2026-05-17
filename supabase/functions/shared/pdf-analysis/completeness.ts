import type {
  PdfAnalysisParserContext,
  PdfAnalysisResult,
  PdfTransactionItem,
} from "./types.ts";

import { cleanExtractedText } from "./utils/cleaner.ts";

function uniqueAnomalies(anomalies: unknown[]): unknown[] {
  const result: unknown[] = [];
  const seen = new Set<string>();

  for (const anomaly of anomalies) {
    const key = typeof anomaly === "string"
      ? anomaly
      : JSON.stringify(anomaly);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(anomaly);
  }

  return result;
}

function chooseMostCommonString(
  values: string[],
  fallback: string,
): string {
  const counts = new Map<string, number>();
  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  let winner = fallback;
  let winnerCount = 0;
  for (const [value, count] of counts.entries()) {
    if (count > winnerCount) {
      winner = value;
      winnerCount = count;
    }
  }

  return winner;
}

function buildMetadata(
  context: PdfAnalysisParserContext,
  currencies: string[],
  extras?: Partial<PdfAnalysisResult["metadata"]>,
): PdfAnalysisResult["metadata"] {
  return {
    page_count: context.pageCount,
    extraction_strategy: context.extractionStrategy,
    currencies_detected: currencies,
    ai_provider: context.aiProvider,
    input_tokens: context.inputTokens,
    output_tokens: context.outputTokens,
    latency_ms: context.latencyMs,
    request_id: context.requestId,
    ...extras,
  };
}

export function mergePdfAnalysisResults(params: {
  partials: PdfAnalysisResult[];
  context: PdfAnalysisParserContext;
}): PdfAnalysisResult {
  const mergedItems = params.partials.flatMap((partial) =>
    Array.isArray(partial.items) ? partial.items : []
  );
  const currencies = Array.from(
    new Set(
      mergedItems
        .map((item) => String(item.currency || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  );
  const documentType = chooseMostCommonString(
    params.partials
      .map((partial) => String(partial.document_type || "other"))
      .filter((value) => value !== "other"),
    params.partials[0]?.document_type || "other",
  );
  const language = chooseMostCommonString(
    params.partials
      .map((partial) => String(partial.language || "und"))
      .filter((value) => value !== "und"),
    params.partials[0]?.language || params.context.languageHint || "und",
  );
  const summaries = Array.from(
    new Set(
      params.partials
        .map((partial) => String(partial.summary || "").trim())
        .filter(Boolean),
    ),
  );
  const mergedData = params.partials.reduce<Record<string, unknown>>(
    (acc, partial) => ({
      ...acc,
      ...(partial.data && typeof partial.data === "object" ? partial.data : {}),
    }),
    {},
  );
  const averageConfidence = params.partials.length > 0
    ? params.partials.reduce(
      (sum, partial) => sum + Number(partial.confidence || 0),
      0,
    ) / params.partials.length
    : 0;
  const inheritedError = params.partials.find((partial) =>
    typeof partial.error === "string" && partial.error.trim().length > 0
  )?.error;
  const requiresReview = averageConfidence < 0.7 ||
    params.partials.some((partial) =>
      partial.requires_review === true || partial.error != null
    );

  return {
    document_type: documentType || "other",
    language: language || params.context.languageHint || "und",
    confidence: Math.max(0, Math.min(1, averageConfidence)),
    summary: summaries.slice(0, 3).join(" ").trim(),
    data: mergedData,
    anomalies: uniqueAnomalies(
      params.partials.flatMap((partial) =>
        Array.isArray(partial.anomalies) ? partial.anomalies : []
      ),
    ),
    items: mergedItems,
    metadata: buildMetadata(params.context, currencies, {
      chunk_count: params.partials.length,
      chunk_item_counts: params.partials.map((partial) =>
        Array.isArray(partial.items) ? partial.items.length : 0
      ),
      merged_item_count: mergedItems.length,
    }),
    requires_review: requiresReview,
    ...(inheritedError ? { error: inheritedError } : {}),
  };
}

function hasDateLikeToken(value: string): boolean {
  return /\b\d{4}-\d{2}-\d{2}\b/.test(value) ||
    /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/.test(value) ||
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i
      .test(value);
}

function hasAmountLikeToken(value: string): boolean {
  return /(€|\$|£|¥|₹)\s?\d|\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})\b/.test(value);
}

function isNoiseLine(value: string): boolean {
  return /\b(opening balance|closing balance|available balance|running balance|balance brought forward|balance summary|statement generated|page \d+ of \d+|debits and credits total|total money out|total money in)\b/i
    .test(value);
}

export function estimateBankStatementRowCount(rawText: string): number {
  const cleaned = cleanExtractedText(rawText);
  if (!cleaned) return 0;

  const lines = cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  let count = 0;
  let pendingDate = false;

  for (const line of lines) {
    if (isNoiseLine(line)) {
      pendingDate = false;
      continue;
    }

    const hasDate = hasDateLikeToken(line);
    const hasAmount = hasAmountLikeToken(line);

    if (hasDate && hasAmount) {
      count += 1;
      pendingDate = false;
      continue;
    }

    if (hasDate && !hasAmount) {
      pendingDate = true;
      continue;
    }

    if (pendingDate && hasAmount) {
      count += 1;
      pendingDate = false;
      continue;
    }

    pendingDate = false;
  }

  return count;
}

export function assessBankStatementCompleteness(params: {
  documentType: string;
  rawText: string;
  items: PdfTransactionItem[];
  pageCount: number;
}): {
  estimatedTransactionCount: number;
  suspicious: boolean;
  reason?: string;
} {
  const estimatedTransactionCount = estimateBankStatementRowCount(
    params.rawText,
  );
  const strongStatementEvidence = estimatedTransactionCount >= 25 ||
    (params.pageCount >= 4 && estimatedTransactionCount >= 12);
  const shouldAssess = params.documentType === "bank_statement" ||
    strongStatementEvidence;

  if (!shouldAssess) {
    return {
      estimatedTransactionCount,
      suspicious: false,
    };
  }

  const itemCount = Array.isArray(params.items) ? params.items.length : 0;
  const severeShortfall = estimatedTransactionCount >= 25 &&
    itemCount < Math.floor(estimatedTransactionCount * 0.6) &&
    estimatedTransactionCount - itemCount >= 20;

  return {
    estimatedTransactionCount,
    suspicious: severeShortfall,
    reason: severeShortfall ? "incomplete_bank_statement_extraction" : undefined,
  };
}
