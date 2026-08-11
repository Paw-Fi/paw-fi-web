/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertMatch,
  assertObjectMatch,
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

function buildMockPdfItems(params: {
  count: number;
  prefix: string;
  startIndex?: number;
}) {
  const startIndex = params.startIndex ?? 0;
  return Array.from({ length: params.count }, (_, index) => {
    const itemNumber = startIndex + index + 1;
    return {
      type: itemNumber % 9 === 0 ? "income" : "expense",
      amount: Number((itemNumber + 0.37).toFixed(2)),
      category: itemNumber % 9 === 0 ? "salary" : "other",
      currency: "USD",
      date: `2026-04-${String((itemNumber % 28) + 1).padStart(2, "0")}`,
      description: `${params.prefix} transaction ${itemNumber}`,
      merchant: `${params.prefix.toUpperCase()}-${itemNumber}`,
    };
  });
}

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
  "pdf analysis: multi-chunk imports preserve all unique chunk items without lossy synthesis",
  async () => {
    const previousChunkLimit = Deno.env.get("PDF_ANALYSIS_CHUNK_TOKEN_LIMIT");
    Deno.env.set("PDF_ANALYSIS_CHUNK_TOKEN_LIMIT", "120");

    try {
      let synthesisAttempts = 0;
      const firstChunkItems = buildMockPdfItems({
        count: 60,
        prefix: "chunk-a",
      });
      const secondChunkItems = buildMockPdfItems({
        count: 60,
        prefix: "chunk-b",
        startIndex: 60,
      });

      const result = await runPdfAnalysisPipeline({
        base64Pdf: "JVBERi0xLjQ=",
        contentType: "application/pdf",
        callerCurrency: "USD",
        callerDate: "2026-04-21",
        expenseCategories: ["other"],
        incomeCategories: ["salary", "other"],
        createProvider: () => ({
          name: "mock",
          async analyze(content) {
            const text = content.text || "";

            if (text.includes("Merge these chunk-level analysis results")) {
              synthesisAttempts += 1;
              return {
                text: JSON.stringify({
                  document_type: "bank_statement",
                  language: "en",
                  confidence: 0.95,
                  summary: "Lossy synthesized summary",
                  data: {},
                  anomalies: [],
                  items: buildMockPdfItems({
                    count: 50,
                    prefix: "truncated",
                  }),
                  metadata: {
                    page_count: 4,
                    extraction_strategy: "native",
                    currencies_detected: ["USD"],
                  },
                }),
                model: "mock-model",
                latencyMs: 1,
              };
            }

            const chunkItems = text.includes("[Page 1]")
              ? firstChunkItems
              : secondChunkItems;
            return {
              text: JSON.stringify({
                document_type: "bank_statement",
                language: "en",
                confidence: 0.96,
                summary: "Chunk analysis",
                data: {},
                anomalies: [],
                items: chunkItems,
                metadata: {
                  page_count: 2,
                  extraction_strategy: "native",
                  currencies_detected: ["USD"],
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
            return;
          },
          async log() {
            return;
          },
        },
        extractors: {
          async native() {
            return {
              text: [
                "2026-04-01 chunk a 10.00 ".repeat(20),
                "2026-04-02 chunk b 20.00 ".repeat(20),
                "2026-04-03 chunk c 30.00 ".repeat(20),
                "2026-04-04 chunk d 40.00 ".repeat(20),
              ].join("\n\n"),
              pages: [
                "2026-04-01 chunk a 10.00 ".repeat(20),
                "2026-04-02 chunk b 20.00 ".repeat(20),
                "2026-04-03 chunk c 30.00 ".repeat(20),
                "2026-04-04 chunk d 40.00 ".repeat(20),
              ],
              pageCount: 4,
            };
          },
          async ocr() {
            return null;
          },
          async vision() {
            return { documents: [], pageCount: 4 };
          },
        },
      });

      assertEquals(result.items.length, 120);
      assertEquals(synthesisAttempts, 0);
      assertObjectMatch(result.items[0], firstChunkItems[0]);
      assertObjectMatch(result.items[119], secondChunkItems[59]);
    } finally {
      if (previousChunkLimit == null) {
        Deno.env.delete("PDF_ANALYSIS_CHUNK_TOKEN_LIMIT");
      } else {
        Deno.env.set("PDF_ANALYSIS_CHUNK_TOKEN_LIMIT", previousChunkLimit);
      }
    }
  },
);

Deno.test(
  "pdf analysis: multi-chunk merge preserves repeated legitimate transactions",
  async () => {
    const previousChunkLimit = Deno.env.get("PDF_ANALYSIS_CHUNK_TOKEN_LIMIT");
    Deno.env.set("PDF_ANALYSIS_CHUNK_TOKEN_LIMIT", "120");

    try {
      const repeatedTransaction = {
        type: "expense",
        amount: 12.5,
        category: "other",
        currency: "USD",
        date: "2026-04-21",
        description: "Parking meter",
        merchant: "City Parking",
      };

      const result = await runPdfAnalysisPipeline({
        base64Pdf: "JVBERi0xLjQ=",
        contentType: "application/pdf",
        callerCurrency: "USD",
        callerDate: "2026-04-21",
        expenseCategories: ["other"],
        incomeCategories: ["salary", "other"],
        createProvider: () => ({
          name: "mock",
          async analyze() {
            return {
              text: JSON.stringify({
                document_type: "bank_statement",
                language: "en",
                confidence: 0.96,
                summary: "Chunk analysis",
                data: {},
                anomalies: [],
                items: [repeatedTransaction],
                metadata: {
                  page_count: 1,
                  extraction_strategy: "native",
                  currencies_detected: ["USD"],
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
            return;
          },
          async log() {
            return;
          },
        },
        extractors: {
          async native() {
            return {
              text: [
                "2026-04-21 Parking meter 12.50",
                "2026-04-21 Parking meter 12.50",
                "2026-04-22 Coffee 4.80",
                "2026-04-23 Lunch 18.20",
              ].join("\n\n"),
              pages: [
                "2026-04-21 Parking meter 12.50",
                "2026-04-21 Parking meter 12.50",
                "2026-04-22 Coffee 4.80",
                "2026-04-23 Lunch 18.20",
              ],
              pageCount: 4,
            };
          },
          async ocr() {
            return null;
          },
          async vision() {
            return { documents: [], pageCount: 4 };
          },
        },
      });

      assertEquals(result.items.length, 2);
      assertObjectMatch(result.items[0], repeatedTransaction);
      assertObjectMatch(result.items[1], repeatedTransaction);
    } finally {
      if (previousChunkLimit == null) {
        Deno.env.delete("PDF_ANALYSIS_CHUNK_TOKEN_LIMIT");
      } else {
        Deno.env.set("PDF_ANALYSIS_CHUNK_TOKEN_LIMIT", previousChunkLimit);
      }
    }
  },
);

Deno.test(
  "pdf analysis: suspiciously incomplete bank-statement results are marked for review and not cached",
  async () => {
    let cacheWrites = 0;
    const bankStatementText = Array.from({ length: 40 }, (_, index) => {
      const day = String((index % 28) + 1).padStart(2, "0");
      return `2026-04-${day} Merchant ${index + 1} ${index + 1}.45`;
    }).join("\n");

    const result = await runPdfAnalysisPipeline({
      base64Pdf: "JVBERi0xLjQ=",
      contentType: "application/pdf",
      callerCurrency: "USD",
      callerDate: "2026-04-21",
      expenseCategories: ["other"],
      incomeCategories: ["salary", "other"],
      createProvider: () => ({
        name: "mock",
        async analyze() {
          return {
            text: JSON.stringify({
              document_type: "bank_statement",
              language: "en",
              confidence: 0.97,
              summary: "Partial statement extraction",
              data: {},
              anomalies: [],
              items: buildMockPdfItems({
                count: 10,
                prefix: "partial",
              }),
              metadata: {
                page_count: 1,
                extraction_strategy: "native",
                currencies_detected: ["USD"],
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
            text: bankStatementText,
            pages: [bankStatementText],
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

    assertEquals(result.analysis.requires_review, true);
    assertEquals(cacheWrites, 0);
    assertEquals(
      result.analysis.anomalies.includes("incomplete_bank_statement_extraction"),
      true,
    );
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
      modelNames: [
        "gemini-3.1-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.1-pro-preview",
      ],
      createClient: () => ({
        getGenerativeModel({ model, systemInstruction }: any) {
          return {
            async generateContent(request: Record<string, unknown>) {
              attempts.push(model);
              if (model !== "gemini-3.1-pro-preview") {
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
      "gemini-3.1-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.1-pro-preview",
    ]);
    assertEquals(result.model, "gemini-3.1-pro-preview");
    assertEquals(result.inputTokens, 10);
    assertEquals(result.outputTokens, 20);
  },
);
