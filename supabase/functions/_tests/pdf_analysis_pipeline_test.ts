/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { cleanExtractedText } from "../shared/pdf-analysis/utils/cleaner.ts";
import {
  detectExtractionStrategy,
  scoreExtractionStrategy,
} from "../shared/pdf-analysis/extractors/router.ts";
import {
  detectDocumentLanguageHint,
  toBcp47LanguageTag,
} from "../shared/pdf-analysis/utils/language.ts";
import { chunkDocumentContent } from "../shared/pdf-analysis/utils/chunker.ts";
import {
  normalizePdfAnalysisResult,
  parsePdfAnalysisResult,
} from "../shared/pdf-analysis/ai/parser.ts";
import { createGeminiPdfAnalysisProvider } from "../shared/pdf-analysis/ai/providers/gemini.ts";
import {
  buildTransactionCategoryClusters,
  normalizeCategorizationText,
} from "../shared/pdf-analysis/categorization.ts";
import { runPdfAnalysisPipeline } from "../shared/pdf-analysis/pipeline.ts";

Deno.test(
  "pdf analysis: cleaner removes control characters and collapses whitespace",
  () => {
    const cleaned = cleanExtractedText(
      "TOTAL:\f\r\n  EUR  12,50\n\n\nDate:\t\t2026-04-21\n| Item | Qty |",
    );

    assertEquals(
      cleaned,
      "TOTAL:\nEUR 12,50\n\nDate: 2026-04-21\n| Item | Qty |",
    );
  },
);

Deno.test(
  "pdf analysis: language hint uses bcp47-style short codes when detectable",
  () => {
    const language = detectDocumentLanguageHint(
      "Rechnung Nummer 123. Gesamtbetrag 1.234,56 EUR. Zahlungsziel 15. April 2026.",
    );

    assertEquals(language, "de");
  },
);

Deno.test(
  "pdf analysis: language normalization matches supported locales",
  () => {
    assertEquals(toBcp47LanguageTag("ko"), "kr");
    assertEquals(toBcp47LanguageTag("kor"), "kr");
    assertEquals(toBcp47LanguageTag("zh-tw"), "zh_TW");
    assertEquals(toBcp47LanguageTag("zh_tw"), "zh_TW");
    assertEquals(toBcp47LanguageTag("pt"), undefined);
  },
);

Deno.test(
  "pdf analysis: strategy scoring favors native for text-rich documents",
  () => {
    const strategy = detectExtractionStrategy({
      pageCount: 2,
      nativeText: "A".repeat(800),
    });

    assertEquals(strategy, "native");
    assertEquals(
      scoreExtractionStrategy({
        pageCount: 2,
        nativeText: "A".repeat(800),
      }).charDensity,
      400,
    );
  },
);

Deno.test(
  "pdf analysis: strategy scoring falls back to hybrid for mixed-content documents",
  () => {
    const strategy = detectExtractionStrategy({
      pageCount: 4,
      nativeText: "A".repeat(200),
    });

    assertEquals(strategy, "hybrid");
  },
);

Deno.test(
  "pdf analysis: strategy scoring falls back to vision for text-poor documents",
  () => {
    const strategy = detectExtractionStrategy({
      pageCount: 5,
      nativeText: "barely any text",
    });

    assertEquals(strategy, "vision");
  },
);

Deno.test(
  "pdf analysis: chunker keeps page boundaries and respects token budget",
  () => {
    const chunks = chunkDocumentContent({
      pageCount: 3,
      tokenLimit: 80,
      pages: [
        "Page 1\nAlpha ".repeat(12),
        "Page 2\nBeta ".repeat(12),
        "Page 3\nGamma ".repeat(12),
      ],
    });

    assertEquals(chunks.length, 3);
    assertMatch(chunks[0].text, /^\[Page 1\]/);
    assertMatch(chunks[1].text, /^\[Page 2\]/);
    assertMatch(chunks[2].text, /^\[Page 3\]/);
  },
);

Deno.test(
  "pdf analysis: parser accepts fenced json and marks low-confidence results for review",
  () => {
    const parsed = parsePdfAnalysisResult(
      [
        "```json",
        "{",
        '  "document_type": "invoice",',
        '  "language": "de",',
        '  "confidence": 0.61,',
        '  "summary": "Kurzfassung",',
        '  "data": {},',
        '  "anomalies": [],',
        '  "items": [],',
        '  "metadata": {',
        '    "page_count": 2,',
        '    "extraction_strategy": "hybrid",',
        '    "currencies_detected": ["EUR"]',
        "  }",
        "}",
        "```",
      ].join("\n"),
      {
        extractionStrategy: "hybrid",
        pageCount: 2,
      },
    );

    assertEquals(parsed.requires_review, true);
    assertEquals(parsed.metadata.extraction_strategy, "hybrid");
  },
);

Deno.test(
  "pdf analysis: normalizer returns analysis_failed envelope with cleaned raw text when ai output is invalid",
  () => {
    const normalized = normalizePdfAnalysisResult(null, {
      extractionStrategy: "native",
      pageCount: 1,
      rawText: "  Header\f\n\nvalue  ",
      languageHint: "en",
    });

    assertEquals(normalized.error, "analysis_failed");
    assertEquals(normalized.raw_text, "Header\n\nvalue");
    assertEquals(normalized.metadata.extraction_strategy, "native");
  },
);

Deno.test(
  "pdf analysis: pipeline falls back to cleaned raw text when provider analysis fails",
  async () => {
    const result = await runPdfAnalysisPipeline({
      base64Pdf: "JVBERi0xLjQ=",
      contentType: "application/pdf",
      callerCurrency: "EUR",
      callerDate: "2026-04-21",
      expenseCategories: ["other"],
      incomeCategories: ["other"],
      createProvider: () => ({
        name: "mock",
        async analyze() {
          throw new Error("provider unavailable");
        },
      }),
      storage: {
        async get() {
          return null;
        },
        async set() {
          return;
        },
        async log() {
          return;
        },
      },
      extractors: {
        async native() {
          return {
            text: "Invoice total EUR 12,50",
            pages: ["Invoice total EUR 12,50"],
            pageCount: 1,
          };
        },
        async ocr() {
          return null;
        },
        async vision() {
          return { documents: [], pageCount: 1 };
        },
      },
    });

    assertEquals(result.error, "analysis_failed");
    assertEquals(result.rawText, "Invoice total EUR 12,50");
    assertEquals(result.items, []);
  },
);

Deno.test(
  "pdf analysis: pipeline does not cache successful empty-item analyses",
  async () => {
    let cacheWrites = 0;

    await runPdfAnalysisPipeline({
      base64Pdf: "JVBERi0xLjQ=",
      contentType: "application/pdf",
      callerCurrency: "EUR",
      callerDate: "2026-04-21",
      expenseCategories: ["other"],
      incomeCategories: ["other"],
      createProvider: () => ({
        name: "mock",
        async analyze() {
          return {
            text: JSON.stringify({
              document_type: "bank_statement",
              language: "en",
              confidence: 0.95,
              summary: "No transactions returned.",
              data: {},
              anomalies: [],
              items: [],
              metadata: {
                page_count: 1,
                extraction_strategy: "hybrid",
                currencies_detected: ["EUR"],
              },
            }),
            model: "mock-model",
            latencyMs: 1,
          };
        },
      }),
      storage: {
        async get() {
          return null;
        },
        async set() {
          cacheWrites += 1;
        },
        async log() {
          return;
        },
      },
      extractors: {
        async native() {
          return {
            text: "Statement opening balance and closing balance",
            pages: ["Statement opening balance and closing balance"],
            pageCount: 1,
          };
        },
        async ocr() {
          return null;
        },
        async vision() {
          return { documents: [], pageCount: 1 };
        },
      },
    });

    assertEquals(cacheWrites, 0);
  },
);

Deno.test(
  "pdf analysis categorization: normalization preserves multilingual meaning while removing statement noise",
  () => {
    assertEquals(
      normalizeCategorizationText("  Compra Café №1234  21/04/2026 €4,20  "),
      "compra cafe",
    );
    assertEquals(
      normalizeCategorizationText("スーパー マーケット 2026-04-21 1,250円"),
      "スーパー マーケット",
    );
  },
);

Deno.test(
  "pdf analysis categorization: clusters repeated noisy transaction descriptions without merchant rules",
  () => {
    const clusters = buildTransactionCategoryClusters([
      {
        type: "expense",
        amount: 4.2,
        category: "other",
        currency: "EUR",
        date: "2026-04-21",
        description: "Compra Café №1234 21/04/2026",
      },
      {
        type: "expense",
        amount: 4.2,
        category: "other",
        currency: "EUR",
        date: "2026-04-22",
        description: "compra cafe #9876",
      },
      {
        type: "income",
        amount: 2500,
        category: "income",
        currency: "EUR",
        date: "2026-04-22",
        description: "Payroll April",
      },
    ]);

    assertEquals(clusters.length, 2);
    assertEquals(clusters[0].memberIndexes, [0, 1]);
    assertEquals(clusters[0].representative.description, "compra cafe");
    assertEquals(clusters[1].memberIndexes, [2]);
  },
);

Deno.test(
  "pdf analysis: Vertex provider retries models in configured fallback order",
  async () => {
    const attempts: string[] = [];
    const provider = createGeminiPdfAnalysisProvider({
      modelNames: ["gemini-3.1-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
      createClient: () => ({
        getGenerativeModel({ model, systemInstruction }: any) {
          return {
            async generateContent(request: Record<string, unknown>) {
              attempts.push(model);
              if (model !== "gemini-2.5-pro") {
                throw new Error(`model failed: ${model}`);
              }

              return {
                response: {
                  text() {
                    return JSON.stringify({
                      ok: true,
                      systemInstruction,
                      request,
                    });
                  },
                  raw: {
                    usageMetadata: {
                      promptTokenCount: 10,
                      candidatesTokenCount: 20,
                    },
                  },
                },
              };
            },
          };
        },
      }),
    });

    const result = await provider.analyze(
      {
        text: "Bank statement page 1",
        pageCount: 1,
        extractionStrategy: "hybrid",
      },
      "system prompt",
      "user prompt",
    );

    assertEquals(attempts, [
      "gemini-3.1-flash",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
    ]);
    assertEquals(result.model, "gemini-2.5-pro");
    assertEquals(result.inputTokens, 10);
    assertEquals(result.outputTokens, 20);
  },
);
