import {
  AI_CATEGORY_POLICY,
  buildCategoryAssignmentTools,
  isGenericAiCategory,
  readCategoryAssignments,
} from "./ai-category-policy.ts";
import { runWithTimeout } from "./async-timeout.ts";
import { GEMINI_MODEL_FALLBACKS } from "./gemini-models.ts";
import type { createVertexGenerativeAI } from "./vertex-ai-chat.ts";

export interface CategoryEvidence {
  type: "expense" | "income";
  description: string;
  merchant?: string;
  sourceText?: string;
  amount: number;
  currency: string;
  date: string;
}

export interface CategoryAttempt {
  model: string;
  phase: "classification";
  budgetMs: number;
  elapsedMs: number;
  outcome:
    | "specific"
    | "generic"
    | "invalid_response"
    | "provider_error"
    | "cancelled"
    | "timed_out";
  itemCount: number;
}

/** Preserve valid specific labels. Spend the bounded inference budget on
 * missing, invalid and generic categories instead of discarding a usable
 * category when an additional verifier is unavailable. User corrections and
 * remaps are applied once by category-resolution after this boundary.
 */
export async function classifyTransactionCategories(params: {
  genAI: ReturnType<typeof createVertexGenerativeAI>;
  items: CategoryEvidence[];
  expenseCategories: string[];
  incomeCategories: string[];
  initialCategories?: Array<string | null>;
  initialModel?: string;
  budgetMs: number;
  /** Stagger overlapping fallbacks without shortening the primary deadline. */
  hedgeDelayMs?: number;
  onAttempt?: (attempt: CategoryAttempt) => void;
}): Promise<{
  categories: Array<string | null>;
  attempts: CategoryAttempt[];
  error?: unknown;
}> {
  const deadline = Date.now() + params.budgetMs;
  const startedAt = Date.now();
  const allowed = params.items.map(
    (item) =>
      new Set(
        item.type === "income"
          ? params.incomeCategories
          : params.expenseCategories,
      ),
  );
  const categories: Array<string | null> = params.items.map((_, index) => {
    const initial = params.initialCategories?.[index];
    return typeof initial === "string" && allowed[index].has(initial)
      ? initial
      : null;
  });
  const attempts: CategoryAttempt[] = [];
  let lastError: unknown;
  // A notification model has already returned a generic answer. Give a
  // different, stronger fallback first access to the recovery budget.
  const previousModelIndex = GEMINI_MODEL_FALLBACKS.findIndex(
    (model) => model === params.initialModel,
  );
  const models =
    previousModelIndex < 0
      ? [...GEMINI_MODEL_FALLBACKS]
      : [
          ...GEMINI_MODEL_FALLBACKS.slice(previousModelIndex + 1),
          ...GEMINI_MODEL_FALLBACKS.slice(0, previousModelIndex),
          GEMINI_MODEL_FALLBACKS[previousModelIndex],
        ];

  const stop = new AbortController();
  const pendingIndexes = () =>
    categories.flatMap((category, itemIndex) =>
      category === null || isGenericAiCategory(category) ? [itemIndex] : [],
    );

  async function runAttempt(index: number, overlapping: boolean) {
    const pending = pendingIndexes();
    const remaining = deadline - Date.now();
    if (stop.signal.aborted || !pending.length || remaining <= 0) return;
    const budgetMs =
      !overlapping && index < models.length - 1
        ? Math.ceil(remaining / 2)
        : remaining;
    const startedAt = Date.now();
    const attempt: CategoryAttempt = {
      model: models[index],
      phase: "classification",
      budgetMs,
      elapsedMs: 0,
      outcome: "provider_error",
      itemCount: pending.length,
    };
    try {
      const model = params.genAI.getGenerativeModel({
        model: models[index],
        systemInstruction: `${AI_CATEGORY_POLICY}\nReturn one exact allowed category per input in the same order by calling categorize_transactions. This is a focused category recovery pass: an earlier generic answer is not evidence that no category fits. Reconsider the actual purchase or income source against the ENTIRE allowed catalog, including broad supported categories and custom categories. Use the original notification/source evidence instead of relying solely on the bank, processor or a short generated description. Return a generic category only when no more informative allowed category is supported; do not fabricate missing purchase details.`,
        tools: buildCategoryAssignmentTools(
          pending.flatMap((i) => [...allowed[i]]),
          pending.length,
        ),
      });
      const response = await runWithTimeout({
        timeoutMs: budgetMs,
        timeoutMessage: "Transaction categorization timed out",
        signal: stop.signal,
        operation: (signal) =>
          model.generateContent(
            {
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: JSON.stringify({
                        expenseCategories: params.expenseCategories,
                        incomeCategories: params.incomeCategories,
                        transactions: pending.map((i) => params.items[i]),
                      }),
                    },
                  ],
                },
              ],
              toolConfig: {
                functionCallingConfig: {
                  mode: "ANY",
                  allowedFunctionNames: ["categorize_transactions"],
                },
              },
              generationConfig: {
                temperature: 0,
                maxOutputTokens: Math.min(
                  8192,
                  Math.max(256, pending.length * 128),
                ),
                thinkingConfig: {
                  thinkingLevel:
                    models[index] === "gemini-3.8-flash" ? "LOW" : "MINIMAL",
                },
              },
            },
            { signal },
          ),
      });
      if (stop.signal.aborted) {
        attempt.outcome = "cancelled";
        return;
      }
      const assigned = readCategoryAssignments(
        response,
        pending.map((i) => allowed[i]),
      );
      if (!assigned) {
        attempt.outcome = "invalid_response";
        return;
      }
      pending.forEach((itemIndex, resultIndex) => {
        // A late generic response must never overwrite a specific winner.
        if (
          assigned[resultIndex] !== null &&
          (categories[itemIndex] === null ||
            isGenericAiCategory(categories[itemIndex]!))
        )
          categories[itemIndex] = assigned[resultIndex];
      });
      attempt.outcome = assigned.some((category) => category === null)
        ? "invalid_response"
        : assigned.some((category) => isGenericAiCategory(category!))
          ? "generic"
          : "specific";
      if (!pendingIndexes().length)
        stop.abort(new DOMException("Category resolved", "AbortError"));
    } catch (error) {
      if (stop.signal.aborted) {
        attempt.outcome = "cancelled";
        return;
      }
      lastError = error;
      if (
        error instanceof Error &&
        error.message === "Transaction categorization timed out"
      )
        attempt.outcome = "timed_out";
      const status = Number((error as { status?: number })?.status);
      if (status === 401 || status === 403) stop.abort(error);
    } finally {
      attempt.elapsedMs = Date.now() - startedAt;
      attempts.push(attempt);
      params.onAttempt?.(attempt);
    }
  }

  async function waitForFallback(delayMs: number, previous: Promise<void>) {
    if (stop.signal.aborted || delayMs <= 0) return;
    let timer: number | undefined;
    let onAbort: (() => void) | undefined;
    const scheduled = new Promise<void>((resolve) => {
      onAbort = resolve;
      stop.signal.addEventListener("abort", onAbort, { once: true });
      timer = setTimeout(resolve, delayMs);
    });
    try {
      // A generic, invalid or failed result can advance fallback immediately.
      await Promise.race([scheduled, previous]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      if (onAbort) stop.signal.removeEventListener("abort", onAbort);
    }
  }

  const hedgeDelayMs = params.hedgeDelayMs;
  if (
    hedgeDelayMs !== undefined &&
    Number.isFinite(hedgeDelayMs) &&
    hedgeDelayMs > 0
  ) {
    const tasks: Promise<void>[] = [];
    for (let index = 0; index < models.length; index++) {
      const previous = tasks[index - 1];
      tasks.push(
        (async () => {
          if (previous)
            await waitForFallback(
              startedAt + index * hedgeDelayMs - Date.now(),
              previous,
            );
          await runAttempt(index, true);
        })(),
      );
    }
    // Parent cancellation settles losers immediately, including clients that
    // fail to honor AbortSignal; their timers and scheduled starts are cleared.
    await Promise.allSettled(tasks);
  } else {
    for (let index = 0; index < models.length; index++) {
      if (stop.signal.aborted) break;
      await runAttempt(index, false);
    }
  }
  return { categories, attempts, ...(lastError ? { error: lastError } : {}) };
}
