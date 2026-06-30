import { baseTemplate, renderFooter } from "../../shared/email-layout.ts";
import {
  escapeHtml,
  formatCurrency,
  pluralize,
  sanitizeSubject,
} from "../../shared/email-utils.ts";

interface FollowupEmailBuilderConfig {
  appTransactionsUrl: string;
  importInboxEmail: string;
  supportEmail: string;
}

export interface FollowupAttachmentResult {
  filename: string;
  success: boolean;
  itemCount: number;
  error?: string;
}

export interface FollowupEmailParams {
  senderEmail: string;
  subjectLine: string;
  savedCount: number;
  duplicateCount: number;
  failedCount: number;
  failureReasons?: string[];
  transactions: Array<Record<string, unknown>>;
  attachmentResults: FollowupAttachmentResult[];
  appTransactionsUrl?: string;
}

export function createFollowupEmailBuilder(config: FollowupEmailBuilderConfig) {
  return (params: FollowupEmailParams) => buildFollowupEmail(params, config);
}

function buildFollowupEmail(
  params: FollowupEmailParams,
  config: FollowupEmailBuilderConfig,
) {
  const appTransactionsUrl =
    params.appTransactionsUrl ?? config.appTransactionsUrl;
  const attachmentLines = renderAttachmentLines(params.attachmentResults);
  const transactionLines = renderTransactionLines(params.transactions);
  const content = renderContent(
    params,
    appTransactionsUrl,
    attachmentLines,
    transactionLines,
  );
  const footerReason =
    "Moneko does not store forwarded attachments on our servers. We download them temporarily only to extract transactions. Replies are not monitored.";
  const text = buildTextEmail(params, config, appTransactionsUrl, footerReason);

  return {
    subject: sanitizeSubject("Your Moneko import is complete"),
    html: baseTemplate(
      content,
      renderFooter({
        customReason: footerReason,
      }),
    ),
    text,
  };
}

function renderContent(
  params: FollowupEmailParams,
  appTransactionsUrl: string,
  attachmentLines: string,
  transactionLines: string,
): string {
  return `
    <h1 class="title">Your Moneko import is complete</h1>
    <p class="subtitle">We finished processing the files forwarded from ${escapeHtml(params.senderEmail)}.</p>
    ${renderOpenTransactionsButton(appTransactionsUrl)}
    ${renderImportSummary(params)}
    <p><strong>Attachment summary</strong></p>
    <ul>${attachmentLines}</ul>
    ${renderSavedTransactionsSection(transactionLines)}
  `;
}

function renderOpenTransactionsButton(appTransactionsUrl: string): string {
  return `
    <p>
      <a href="${escapeHtml(appTransactionsUrl)}" style="display:inline-block;background-color:#7458FF;color:#ffffff !important;padding:14px 24px;border-radius:8px;font-weight:600;font-size:16px;text-decoration:none !important;margin:8px 0 20px 0;">
        Open transactions in Moneko
      </a>
    </p>
  `;
}

function renderImportSummary(params: FollowupEmailParams): string {
  return `
    <p><strong>Saved:</strong> ${params.savedCount} ${pluralize(params.savedCount, "transaction")}</p>
    <p><strong>Duplicates skipped:</strong> ${params.duplicateCount}</p>
    <p><strong>Failed:</strong> ${params.failedCount}</p>
    ${renderFailureReasons(params.failureReasons)}
  `;
}

function renderFailureReasons(reasons?: string[]): string {
  const uniqueReasons = Array.from(
    new Set(
      (reasons ?? [])
        .map((reason) => reason.trim())
        .filter((reason) => reason.length > 0),
    ),
  );

  if (uniqueReasons.length === 0) return "";

  return `<p><strong>Failure ${pluralize(uniqueReasons.length, "reason")}:</strong> ${uniqueReasons.map(escapeHtml).join("; ")}</p>`;
}

function renderSavedTransactionsSection(transactionLines: string): string {
  if (!transactionLines) return "";
  return `<p><strong>Saved transactions</strong></p><ul>${transactionLines}</ul>`;
}

function renderAttachmentLines(
  attachmentResults: FollowupAttachmentResult[],
): string {
  return attachmentResults
    .map((item) => {
      if (!item.success) {
        return `<li>${escapeHtml(item.filename)}: ${escapeHtml(item.error || "analysis failed")}</li>`;
      }
      return `<li>${escapeHtml(item.filename)}: ${item.itemCount} ${pluralize(item.itemCount, "transaction")} found</li>`;
    })
    .join("");
}

function renderTransactionLines(
  transactions: Array<Record<string, unknown>>,
): string {
  const lines = transactions.slice(0, 30).map(renderTransactionLine).join("");
  if (transactions.length <= 30) return lines;
  return `${lines}<li>...</li>`;
}

function renderTransactionLine(item: Record<string, unknown>): string {
  const type = resolveTransactionType(item);
  const amount = Number(item.amount ?? 0);
  const currency = resolveTransactionCurrency(item);
  const category = resolveTransactionCategory(item);
  const description = resolveTransactionDescription(item);
  const dateText = renderTransactionDate(item);

  return `<li><strong>${escapeHtml(type)}</strong>: ${escapeHtml(description)} · ${escapeHtml(category)} · ${escapeHtml(formatCurrency(amount, currency))}${dateText}</li>`;
}

function resolveTransactionType(item: Record<string, unknown>): string {
  if (item.type === "income") return "Income";
  return "Expense";
}

function resolveTransactionCurrency(item: Record<string, unknown>): string {
  if (typeof item.currency === "string") return item.currency;
  return "USD";
}

function resolveTransactionCategory(item: Record<string, unknown>): string {
  if (typeof item.category === "string") return item.category;
  return "other";
}

function renderTransactionDate(item: Record<string, unknown>): string {
  if (typeof item.date !== "string") return "";
  if (!item.date) return "";
  return ` · ${escapeHtml(item.date)}`;
}

function resolveTransactionDescription(item: Record<string, unknown>): string {
  if (
    typeof item.description === "string" &&
    item.description.trim().length > 0
  ) {
    return item.description.trim();
  }
  if (typeof item.merchant === "string" && item.merchant.trim().length > 0) {
    return item.merchant.trim();
  }
  return "Imported transaction";
}

function buildTextEmail(
  params: FollowupEmailParams,
  config: FollowupEmailBuilderConfig,
  appTransactionsUrl: string,
  footerReason: string,
): string {
  const failureReasons = Array.from(
    new Set(
      (params.failureReasons ?? [])
        .map((reason) => reason.trim())
        .filter((reason) => reason.length > 0),
    ),
  );
  const failureText =
    failureReasons.length > 0
      ? ` Failure ${pluralize(failureReasons.length, "reason")}: ${failureReasons.join("; ")}.`
      : "";

  return `Moneko processed files from ${params.senderEmail}. Import inbox: ${config.importInboxEmail}. Saved: ${params.savedCount}. Duplicates skipped: ${params.duplicateCount}. Failed: ${params.failedCount}.${failureText} Open transactions in Moneko: ${appTransactionsUrl}. ${footerReason} Contact ${config.supportEmail} if you need help.`;
}
