import type { PdfAnalysisResult, PdfDocumentContent } from "../types.ts";

export interface PdfPromptContext {
  callerCurrency: string;
  callerDate: string;
  expenseCategories: string[];
  incomeCategories: string[];
  typeHint?: string;
  householdPrompt?: string;
  categoryPreferenceGuidance?: string[];
}

export function buildPdfSystemPrompt(context: PdfPromptContext): string {
  const typeHint = context.typeHint && context.typeHint !== "mixed"
    ? `Document import hint: imported transactions are likely ${context.typeHint}. Use this only as a hint.`
    : "";
  const householdPrompt = context.householdPrompt
    ? `Household context:\n${context.householdPrompt}`
    : "";

  return [
    "You are a universal PDF document analysis engine for a financial import pipeline.",
    "You will receive extracted PDF text and sometimes page-level document or image inputs.",
    "Do semantic understanding yourself. The extraction layer only gives you raw content.",
    "Never assume the source language, field names, currency symbol, or document template.",
    "",
    "Tasks:",
    "1. Identify the document type. Choose from: invoice, contract, bank_statement, medical_record, tax_form, shipping_manifest, receipt, report, or other.",
    "2. Extract all meaningful structured data that is actually present into the free-form `data` object.",
    "3. Normalize dates into ISO 8601 strings where possible while preserving originals inside `data`.",
    "4. Normalize money values inside `data` using the document evidence. Do not guess currencies that are not supported by the content.",
    "5. Detect anomalies such as missing totals, inconsistent balances, suspicious clauses, or expired dates.",
    "6. Write a concise summary in the same language as the document.",
    "7. If the document contains transaction-like financial records that can be imported, return them in `items`.",
    "8. If there are no importable transactions, return `items: []`.",
    "9. If the document is a bank statement, extract every transaction row from every page. Do not sample or stop early.",
    "10. If you suspect the bank statement extraction is incomplete, add an anomaly describing that risk.",
    "",
    "Rules for `items`:",
    `- category must be chosen from this expense list when type=expense: ${
      context.expenseCategories.join(", ")
    }`,
    `- category must be chosen from this income list when type=income: ${
      context.incomeCategories.join(", ")
    }`,
    ...(context.categoryPreferenceGuidance ?? []),
    "- amount must be a positive number",
    "- date must be ISO YYYY-MM-DD when possible",
    "- description should be short and human-readable",
    "- merchant must be the clean store/payee/counterparty name when present; keep it separate from description",
    "- do not include card numbers, reference IDs, dates, or amounts in merchant",
    "- do not invent transactions that are not supported by the document",
    typeHint,
    householdPrompt,
    "",
    "Return only valid JSON with this exact envelope:",
    JSON.stringify({
      document_type: "string",
      language: "string",
      confidence: 0,
      summary: "string",
      data: {},
      anomalies: [],
      items: [
        {
          type: "expense|income",
          amount: 0,
          category: "string",
          currency: "string",
          date: "YYYY-MM-DD",
          description: "string",
          merchant: "string",
        },
      ],
      metadata: {
        page_count: 0,
        extraction_strategy: "string",
        currencies_detected: [],
      },
    }),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPdfUserPrompt(
  content: PdfDocumentContent,
  context: PdfPromptContext,
): string {
  const sections = [
    `Caller currency: ${context.callerCurrency}`,
    `Caller date: ${context.callerDate}`,
    `Page count: ${content.pageCount}`,
    `Extraction strategy: ${content.extractionStrategy}`,
    content.languageHint ? `Language hint: ${content.languageHint}` : "",
    content.documents && content.documents.length > 0
      ? "Additional page-level PDF documents are attached after this prompt."
      : "",
    content.images && content.images.length > 0
      ? "Additional page images are attached after this prompt."
      : "",
    content.text
      ? `Extracted document content:\n${content.text}`
      : "No extracted text was available.",
  ];

  return sections.filter(Boolean).join("\n\n");
}

export function buildPdfSynthesisPrompt(): string {
  return [
    "You are merging chunk-level PDF analyses from the same document.",
    "Combine the partial outputs into one final JSON envelope with the same schema.",
    "Deduplicate repeated transactions and anomalies.",
    "For bank statements, prioritize completeness and keep every unique transaction row.",
    "When chunk outputs disagree, prefer consistency for metadata and completeness for bank-statement transactions.",
    "Return only JSON.",
  ].join("\n");
}

export function buildPdfSynthesisUserPrompt(
  results: PdfAnalysisResult[],
): string {
  return [
    "Merge these chunk-level analysis results into one final document result.",
    "Chunk results:",
    JSON.stringify(results),
  ].join("\n\n");
}
