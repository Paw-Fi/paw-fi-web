import {
  isRecordLookupToolName,
  isWriteMutationToolName,
} from "./mutation-claim-guard.ts";

// Ground truth for one bot turn, built only from tool results. Nothing in here
// is derived from model prose or from the user's wording.

export const BOT_TOOL_KINDS = {
  write: "write",
  lookup: "lookup",
  analysis: "analysis",
  other: "other",
} as const;

export type BotToolKind = typeof BOT_TOOL_KINDS[keyof typeof BOT_TOOL_KINDS];

export interface BotToolExecution {
  tool: string;
  kind: BotToolKind;
  succeeded: boolean;
  action?: string;
  evidence: string;
  evidenceTruncated: boolean;
}

export interface SavedTransactionFact {
  id: string;
  type: "expense" | "income";
  amount: number | null;
  currency: string | null;
  date: string | null;
  label: string;
  recurring: boolean;
}

export interface BotTurnLedger {
  executions: BotToolExecution[];
  savedTransactions: SavedTransactionFact[];
  batchRowsNotSaved: number;
}

export interface BotTurnFacts {
  writeSucceeded: boolean;
  writeFailed: boolean;
  lookupSucceeded: boolean;
  hasUnsavedDraft: boolean;
  toolFailed: boolean;
  // A transaction save tool ran on this turn, whatever its outcome.
  saveAttempted: boolean;
}

const EVIDENCE_CHARS_PER_TOOL = 6000;
const EVIDENCE_CHARS_TOTAL = 20000;
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TRANSACTION_SAVE_TOOLS = new Set([
  "add_transaction",
  "add_transactions_batch",
]);
// Keys that carry no user-visible fact: internal identifiers, links and
// transport flags. Dropping them keeps evidence small and free of raw IDs.
const NON_EVIDENCE_KEY =
  /(?:^|_)(?:id|ids|url|key|token)$|^_|^has_selection_memory$/i;

export function createBotTurnLedger(): BotTurnLedger {
  return { executions: [], savedTransactions: [], batchRowsNotSaved: 0 };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function hasToolError(result: Record<string, unknown> | null): boolean {
  return typeof result?.error === "string" && result.error.trim().length > 0;
}

function compactEvidence(
  value: unknown,
  maxChars: number,
): { text: string; truncated: boolean } {
  let text: string;
  try {
    text = JSON.stringify(
      value,
      (key, item) => (key && NON_EVIDENCE_KEY.test(key) ? undefined : item),
    ) ?? "null";
  } catch {
    text = "null";
  }
  return text.length > maxChars
    ? { text: text.slice(0, maxChars), truncated: true }
    : { text, truncated: false };
}

function toSavedTransactionFact(
  row: unknown,
  typeHint: unknown,
): SavedTransactionFact | null {
  const record = asRecord(row);
  const id = typeof record?.id === "string" ? record.id.trim() : "";
  if (!record || !id) return null;
  const cents = record.amount_cents;
  const major = record.amount;
  const amount = typeof cents === "number" && Number.isFinite(cents)
    ? cents / 100
    : typeof major === "number" && Number.isFinite(major)
    ? major
    : null;
  const currency = typeof record.currency === "string" && record.currency.trim()
    ? record.currency.trim().toUpperCase()
    : null;
  const dateText = typeof record.date === "string"
    ? record.date.slice(0, 10)
    : "";
  const label = [
    record.merchant,
    record.raw_text,
    record.description,
    record.source,
  ]
    .find((item): item is string => typeof item === "string" && !!item.trim());
  return {
    id,
    type: String(record.type ?? typeHint ?? "").toLowerCase() === "income"
      ? "income"
      : "expense",
    amount: amount === null ? null : Math.abs(amount),
    currency,
    date: CALENDAR_DATE.test(dateText) ? dateText : null,
    label: (label ?? "").trim().slice(0, 80),
    recurring: record.is_recurring === true,
  };
}

// Accepts either the stored row or the persistence function's response
// envelope ({ success, data: row }); a rejected envelope is never a saved row.
function unwrapSavedRow(data: unknown): Record<string, unknown> | null {
  const outer = asRecord(data);
  if (!outer || typeof outer.id === "string") return outer;
  return outer.success === false ? null : asRecord(outer.data);
}

// Returns whether the tool call is confirmed to have done what it is for.
// A save counts only when the persistence layer returned the stored row.
export function recordBotToolExecution(
  ledger: BotTurnLedger,
  toolName: string | null | undefined,
  toolResult: unknown,
  args?: Record<string, unknown> | null,
): boolean {
  const tool = typeof toolName === "string" ? toolName : "";
  const result = asRecord(toolResult);
  // A tool that stopped to ask which record is meant, or to refresh its
  // context, changed nothing and attempted nothing.
  const stoppedBeforeActing = result?.needs_disambiguation === true ||
    result?.status === "context_refresh_required";
  const kind: BotToolKind = tool === "analyze_expense"
    ? BOT_TOOL_KINDS.analysis
    : stoppedBeforeActing
    ? BOT_TOOL_KINDS.other
    : isWriteMutationToolName(tool, toolResult)
    ? BOT_TOOL_KINDS.write
    : isRecordLookupToolName(tool, toolResult)
    ? BOT_TOOL_KINDS.lookup
    : BOT_TOOL_KINDS.other;

  let succeeded: boolean;
  if (tool === "add_transaction") {
    const fact = result?.success === true
      ? toSavedTransactionFact(unwrapSavedRow(result.data), args?.type)
      : null;
    if (fact) ledger.savedTransactions.push(fact);
    succeeded = fact !== null;
  } else if (tool === "add_transactions_batch") {
    const rows = Array.isArray(result?.results) ? result.results : [];
    const before = ledger.savedTransactions.length;
    for (const row of rows) {
      const entry = asRecord(row);
      const fact = entry?.success === true
        ? toSavedTransactionFact(
          { ...asRecord(entry.data), id: entry.id },
          entry.type,
        )
        : null;
      if (fact) ledger.savedTransactions.push(fact);
      else ledger.batchRowsNotSaved += 1;
    }
    succeeded = ledger.savedTransactions.length > before;
  } else if (
    kind === BOT_TOOL_KINDS.write || kind === BOT_TOOL_KINDS.analysis
  ) {
    succeeded = result?.success === true && !hasToolError(result);
  } else {
    succeeded = result !== null && result.success !== false &&
      !hasToolError(result) && !stoppedBeforeActing;
  }

  const evidence = compactEvidence(toolResult, EVIDENCE_CHARS_PER_TOOL);
  ledger.executions.push({
    tool,
    kind,
    succeeded,
    ...(typeof result?.action === "string" ? { action: result.action } : {}),
    evidence: evidence.text,
    evidenceTruncated: evidence.truncated,
  });
  return succeeded;
}

export function summarizeBotTurn(ledger: BotTurnLedger): BotTurnFacts {
  const of = (kind: BotToolKind, succeeded: boolean) =>
    ledger.executions.some((item) =>
      item.kind === kind && item.succeeded === succeeded
    );
  const writeSucceeded = of(BOT_TOOL_KINDS.write, true);
  return {
    writeSucceeded,
    writeFailed: of(BOT_TOOL_KINDS.write, false),
    lookupSucceeded: of(BOT_TOOL_KINDS.lookup, true),
    hasUnsavedDraft: of(BOT_TOOL_KINDS.analysis, true) && !writeSucceeded,
    toolFailed: ledger.executions.some((item) => !item.succeeded),
    saveAttempted: ledger.executions.some((item) =>
      TRANSACTION_SAVE_TOOLS.has(item.tool)
    ),
  };
}

// Compact, size-capped record handed to the reply verifier and to corrective
// prompts. Later tools are dropped first if the total budget is exceeded.
export function buildTurnEvidence(ledger: BotTurnLedger): string {
  const facts = summarizeBotTurn(ledger);
  let remaining = EVIDENCE_CHARS_TOTAL;
  const operations = ledger.executions.map((item) => {
    const result = item.evidence.slice(0, Math.max(0, remaining));
    remaining -= result.length;
    return {
      tool: item.tool,
      kind: item.kind,
      outcome: item.succeeded ? "succeeded" : "failed",
      ...(item.action ? { action: item.action } : {}),
      result,
      result_truncated: item.evidenceTruncated ||
        result.length < item.evidence.length,
    };
  });
  return JSON.stringify({
    any_write_succeeded: facts.writeSucceeded,
    any_record_lookup_succeeded: facts.lookupSucceeded,
    extracted_draft_not_saved: facts.hasUnsavedDraft,
    saved_transaction_count: ledger.savedTransactions.length,
    batch_rows_not_saved: ledger.batchRowsNotSaved,
    operations,
  });
}

export interface BotTurnAudit {
  operations: Array<{
    tool: string;
    kind: BotToolKind;
    outcome: "succeeded" | "failed";
    action?: string;
  }>;
  saved_transaction_ids: string[];
  batch_rows_not_saved: number;
}

// Bounded, text-free record for logs and chat_messages.metadata.
export function buildTurnAudit(ledger: BotTurnLedger): BotTurnAudit {
  return {
    operations: ledger.executions.map((item) => ({
      tool: item.tool,
      kind: item.kind,
      outcome: item.succeeded ? "succeeded" as const : "failed" as const,
      ...(item.action ? { action: item.action } : {}),
    })),
    saved_transaction_ids: ledger.savedTransactions.map((item) => item.id)
      .slice(0, 50),
    batch_rows_not_saved: ledger.batchRowsNotSaved,
  };
}
