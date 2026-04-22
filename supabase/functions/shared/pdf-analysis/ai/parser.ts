import type {
  PdfAnalysisParserContext,
  PdfAnalysisResult,
  PdfTransactionItem,
} from "../types.ts";
import { cleanExtractedText } from "../utils/cleaner.ts";

function extractJsonPayload(input: string): string | null {
  const source = String(input || "").trim();
  if (!source) return null;

  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return source.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

function normalizeTransactionItem(item: unknown): PdfTransactionItem | null {
  if (!item || typeof item !== "object") return null;

  const candidate = item as Record<string, unknown>;
  const amount = Number(candidate.amount);
  const category = String(candidate.category || "other").trim() || "other";
  const currency = String(candidate.currency || "")
    .trim()
    .toUpperCase();
  const date = String(candidate.date || "").trim();
  const type =
    String(candidate.type || "expense")
      .trim()
      .toLowerCase() === "income"
      ? "income"
      : "expense";

  if (!Number.isFinite(amount) || amount <= 0 || !date) return null;

  const breakdown = Array.isArray(candidate.breakdown)
    ? candidate.breakdown.map((value) => String(value).trim()).filter(Boolean)
    : undefined;

  return {
    type,
    amount,
    category,
    currency,
    date,
    description:
      typeof candidate.description === "string"
        ? candidate.description.trim()
        : undefined,
    merchant:
      typeof candidate.merchant === "string"
        ? candidate.merchant.trim()
        : undefined,
    breakdown: breakdown && breakdown.length > 0 ? breakdown : undefined,
    payerUserId:
      typeof candidate.payerUserId === "string"
        ? candidate.payerUserId.trim()
        : undefined,
    customSplits:
      candidate.customSplits && typeof candidate.customSplits === "object"
        ? (candidate.customSplits as Record<string, unknown>)
        : undefined,
  };
}

function buildMetadata(
  context: PdfAnalysisParserContext,
  currencies: string[],
) {
  return {
    page_count: context.pageCount,
    extraction_strategy: context.extractionStrategy,
    currencies_detected: currencies,
    ai_provider: context.aiProvider,
    input_tokens: context.inputTokens,
    output_tokens: context.outputTokens,
    latency_ms: context.latencyMs,
    request_id: context.requestId,
  };
}

export function normalizePdfAnalysisResult(
  parsed: unknown,
  context: PdfAnalysisParserContext,
): PdfAnalysisResult {
  const candidate =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  const rawText = cleanExtractedText(context.rawText || "");

  if (!candidate) {
    return {
      document_type: "other",
      language: context.languageHint || "und",
      confidence: 0,
      summary: "",
      data: {},
      anomalies: [],
      items: [],
      metadata: buildMetadata(context, []),
      error: "analysis_failed",
      raw_text: rawText,
      requires_review: true,
    };
  }

  const items = Array.isArray(candidate.items)
    ? candidate.items
        .map(normalizeTransactionItem)
        .filter((item) => item !== null)
    : [];
  const normalizedItems = items as PdfTransactionItem[];
  const currencies = Array.from(
    new Set(
      normalizedItems
        .map((item) => item.currency)
        .filter((value) => typeof value === "string" && value.length > 0),
    ),
  );
  const confidence = Number(candidate.confidence);
  const normalizedConfidence = Number.isFinite(confidence)
    ? Math.max(0, Math.min(1, confidence))
    : 0;

  return {
    document_type: String(candidate.document_type || "other").trim() || "other",
    language:
      String(candidate.language || context.languageHint || "und").trim() ||
      "und",
    confidence: normalizedConfidence,
    summary: String(candidate.summary || "").trim(),
    data:
      candidate.data && typeof candidate.data === "object"
        ? (candidate.data as Record<string, unknown>)
        : {},
    anomalies: Array.isArray(candidate.anomalies) ? candidate.anomalies : [],
    items: normalizedItems,
    metadata: buildMetadata(context, currencies),
    requires_review: normalizedConfidence < 0.7,
  };
}

export function parsePdfAnalysisResult(
  input: string,
  context: PdfAnalysisParserContext,
): PdfAnalysisResult {
  const payload = extractJsonPayload(input);
  if (!payload) return normalizePdfAnalysisResult(null, context);

  try {
    return normalizePdfAnalysisResult(JSON.parse(payload), context);
  } catch {
    return normalizePdfAnalysisResult(null, context);
  }
}
