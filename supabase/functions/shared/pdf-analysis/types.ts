export const PDF_EXTRACTION_STRATEGY = {
  native: "native",
  hybrid: "hybrid",
  vision: "vision",
  ocr: "ocr",
} as const;

export interface PdfStrategyScore {
  strategy: string;
  charDensity: number;
  pageCount: number;
  maxNativePages: number;
}

export interface PdfChunk {
  index: number;
  pages: number[];
  text: string;
  estimatedTokens: number;
}

export interface PdfImagePart {
  page: number;
  base64: string;
  mimeType: string;
}

export interface PdfInlineDocument {
  page: number;
  base64: string;
  mimeType: string;
}

export interface PdfDocumentContent {
  text?: string;
  pages?: string[];
  images?: PdfImagePart[];
  documents?: PdfInlineDocument[];
  languageHint?: string;
  pageCount: number;
  extractionStrategy: string;
}

export interface PdfTransactionItem {
  type: string;
  amount: number;
  category: string;
  currency: string;
  date: string;
  description?: string;
  merchant?: string;
  breakdown?: string[];
  payerUserId?: string;
  customSplits?: Record<string, unknown>;
}

export interface PdfAnalysisMetadata {
  page_count: number;
  extraction_strategy: string;
  currencies_detected: string[];
  cache_hit?: boolean;
  ai_provider?: string;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms?: number;
  request_id?: string;
}

export interface PdfAnalysisResult {
  document_type: string;
  language: string;
  confidence: number;
  summary: string;
  data: Record<string, unknown>;
  anomalies: unknown[];
  items: PdfTransactionItem[];
  metadata: PdfAnalysisMetadata;
  requires_review?: boolean;
  error?: string;
  raw_text?: string;
}

export interface PdfAnalysisParserContext {
  extractionStrategy: string;
  pageCount: number;
  rawText?: string;
  languageHint?: string;
  aiProvider?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  requestId?: string;
}

export interface PdfChunkerOptions {
  pageCount: number;
  tokenLimit: number;
  pages?: string[];
  text?: string;
}

export interface PdfAnalysisProviderResult {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
}

export interface PdfAnalysisProvider {
  name: string;
  analyze(
    content: PdfDocumentContent,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<PdfAnalysisProviderResult>;
}

export interface PdfNativeExtractionResult {
  text: string;
  pages: string[];
  pageCount: number;
}

export interface PdfOcrExtractionResult {
  text: string;
  pages: string[];
  pageCount: number;
}

export interface PdfPipelineResult {
  items: PdfTransactionItem[];
  analysis: PdfAnalysisResult;
  rawText?: string;
  error?: string;
}
