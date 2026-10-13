/// <reference lib="deno.ns" />

import {
  classifyTransactionCategories,
  type CategoryEvidence,
  type CategoryAttempt,
} from "../shared/ai-category-classifier.ts";
import {
  createVertexGenerativeAI,
  getVertexAiConfigFromEnv,
} from "../shared/vertex-ai-chat.ts";
import {
  getExpenseCategories,
  getIncomeCategories,
  sanitizeCategoryName,
} from "../shared/category-colors.ts";

interface QualityCase {
  id: string;
  language: string;
  type?: "expense" | "income";
  description: string;
  sourceText: string;
  merchant?: string;
  customCategories?: string[];
  expected: string;
}

interface QualityResult {
  id: string;
  language: string;
  expected: string;
  actual: string | null;
  matched: boolean;
  attempts: CategoryAttempt[];
}

// Synthetic, human-labelled evaluation data. --check-fixtures validates the
// corpus only; it never reports semantic accuracy or calls a model.
export function validateQualityCases(value: unknown): QualityCase[] {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error("Empty quality corpus");
  const ids = new Set<string>();
  for (const row of value) {
    if (
      !row ||
      typeof row !== "object" ||
      typeof row.id !== "string" ||
      !row.id ||
      ids.has(row.id) ||
      typeof row.language !== "string" ||
      !row.language ||
      typeof row.description !== "string" ||
      typeof row.sourceText !== "string" ||
      !row.sourceText ||
      typeof row.expected !== "string" ||
      (row.type != null && row.type !== "expense" && row.type !== "income")
    )
      throw new Error("Invalid quality case");
    ids.add(row.id);
    const custom = row.customCategories ?? [];
    if (
      !Array.isArray(custom) ||
      !custom.every(
        (category) =>
          typeof category === "string" &&
          sanitizeCategoryName(category) === category,
      )
    )
      throw new Error(`Invalid custom labels: ${row.id}`);
    const allowed = new Set([
      ...(row.type === "income"
        ? getIncomeCategories()
        : getExpenseCategories()),
      ...custom,
    ]);
    if (!allowed.has(row.expected))
      throw new Error(`Unsupported expected label: ${row.id}`);
  }
  return value as QualityCase[];
}

export async function evaluateQualityCases(
  cases: QualityCase[],
  genAI: ReturnType<typeof createVertexGenerativeAI>,
) {
  const results: QualityResult[] = [];
  for (const row of cases) {
    const item: CategoryEvidence = {
      type: row.type ?? "expense",
      description: row.description,
      merchant: row.merchant,
      sourceText: row.sourceText,
      amount: 123.45,
      currency: "EUR",
      date: "2026-10-13",
    };
    const result = await classifyTransactionCategories({
      genAI,
      items: [item],
      budgetMs: 30000,
      expenseCategories: [
        ...getExpenseCategories(),
        ...(item.type === "expense" ? (row.customCategories ?? []) : []),
      ],
      incomeCategories: [
        ...getIncomeCategories(),
        ...(item.type === "income" ? (row.customCategories ?? []) : []),
      ],
    });
    results.push({
      id: row.id,
      language: row.language,
      expected: row.expected,
      actual: result.categories[0],
      matched: result.categories[0] === row.expected,
      attempts: result.attempts,
    });
  }
  return {
    evaluated: results.length,
    matched: results.filter((row) => row.matched).length,
    unresolved: results.filter((row) => row.actual === null).length,
    accuracy: results.filter((row) => row.matched).length / results.length,
    results,
  };
}

if (Deno.mainModule === import.meta.url) {
  try {
    if (Deno.args.some((arg) => arg !== "--check-fixtures"))
      throw new Error("Supported option: --check-fixtures");
    const cases = validateQualityCases(
      JSON.parse(
        await Deno.readTextFile(
          new URL(
            "../../../tests/fixtures/ai-category-quality.json",
            import.meta.url,
          ),
        ),
      ),
    );
    if (Deno.args.includes("--check-fixtures")) {
      console.log(
        JSON.stringify({
          fixtureCount: cases.length,
          languages: [...new Set(cases.map((row) => row.language))],
          mode: "fixture_validation_only",
        }),
      );
    } else {
      const config = getVertexAiConfigFromEnv();
      const result = await evaluateQualityCases(
        cases,
        createVertexGenerativeAI(config),
      );
      console.log(JSON.stringify(result, null, 2));
      if (result.matched !== result.evaluated) Deno.exitCode = 1;
    }
  } catch (error) {
    // Do not print provider bodies or credentials.
    console.error(
      error instanceof Error ? error.message : "Category evaluation failed",
    );
    Deno.exitCode = 1;
  }
}
