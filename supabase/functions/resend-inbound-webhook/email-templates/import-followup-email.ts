import { baseTemplate, renderFooter } from "../../shared/email-layout.ts";
import {
  escapeHtml,
  formatCurrency,
  pluralize,
  sanitizeSubject,
} from "../../shared/email-utils.ts";

interface FollowupEmailBuilderConfig {
  appUrl: string;
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
  transactions: Array<Record<string, unknown>>;
  attachmentResults: FollowupAttachmentResult[];
  retainedAttachmentCount: number;
  retainedOriginals: boolean;
}

export function createFollowupEmailBuilder(config: FollowupEmailBuilderConfig) {
  return (params: FollowupEmailParams) => buildFollowupEmail(params, config);
}

function buildFollowupEmail(
  params: FollowupEmailParams,
  config: FollowupEmailBuilderConfig,
) {
  const premiumDashboardUrl = `${config.appUrl.replace(/\/$/, "")}/dashboard/export`;
  const attachmentLines = renderAttachmentLines(params.attachmentResults);
  const transactionLines = renderTransactionLines(params.transactions);
  const content = renderContent(
    params,
    premiumDashboardUrl,
    attachmentLines,
    transactionLines,
  );
  const retentionFooter = resolveRetentionFooter(params.retainedOriginals);
  const text = buildTextEmail(
    params,
    config,
    premiumDashboardUrl,
    retentionFooter,
  );

  return {
    subject: sanitizeSubject("Your Moneko import is complete"),
    html: baseTemplate(
      content,
      renderFooter({
        customReason: retentionFooter,
      }),
    ),
    text,
  };
}

function renderContent(
  params: FollowupEmailParams,
  premiumDashboardUrl: string,
  attachmentLines: string,
  transactionLines: string,
): string {
  if (params.retainedOriginals) {
    return renderPremiumContent(
      params,
      premiumDashboardUrl,
      attachmentLines,
      transactionLines,
    );
  }
  return renderStandardContent(params, attachmentLines, transactionLines);
}

function resolveRetentionFooter(retainedOriginals: boolean): string {
  if (retainedOriginals) {
    return "Your original forwarded files are available from your Moneko Premium dashboard. Replies are not monitored.";
  }
  return "Moneko does not store forwarded attachments on our servers. We download them temporarily only to extract transactions. Replies are not monitored.";
}

function renderPremiumContent(
  params: FollowupEmailParams,
  premiumDashboardUrl: string,
  attachmentLines: string,
  transactionLines: string,
): string {
  return `
    <h1 class="title">Your Moneko import is complete</h1>
    <p class="subtitle">We finished processing the files forwarded from ${escapeHtml(params.senderEmail)}.</p>
    <p>Your original forwarded files have been saved in private storage for your Premium account. You can review and download them from your Moneko dashboard.</p>
    <p>
      <a href="${escapeHtml(premiumDashboardUrl)}" style="display:inline-block;background-color:#111827;color:#ffffff !important;padding:12px 20px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;margin:8px 0 20px 0;">
        Open Premium Dashboard
      </a>
    </p>
    ${renderImportSummary(params)}
    <p><strong>Original files saved:</strong> ${params.retainedAttachmentCount}</p>
    <p><strong>Attachment summary</strong></p>
    <ul>${attachmentLines}</ul>
    ${renderSavedTransactionsSection(transactionLines)}
  `;
}

function renderStandardContent(
  params: FollowupEmailParams,
  attachmentLines: string,
  transactionLines: string,
): string {
  return `
    <h1 class="title">Your Moneko import is complete</h1>
    <p class="subtitle">We finished processing the files forwarded from ${escapeHtml(params.senderEmail)}.</p>
    ${renderImportSummary(params)}
    <p><strong>Attachment summary</strong></p>
    <ul>${attachmentLines}</ul>
    ${renderSavedTransactionsSection(transactionLines)}
  `;
}

function renderImportSummary(params: FollowupEmailParams): string {
  return `
    <p><strong>Saved:</strong> ${params.savedCount} ${pluralize(params.savedCount, "transaction")}</p>
    <p><strong>Duplicates skipped:</strong> ${params.duplicateCount}</p>
    <p><strong>Failed:</strong> ${params.failedCount}</p>
  `;
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
  premiumDashboardUrl: string,
  retentionFooter: string,
): string {
  const premiumText = renderPremiumText(
    params.retainedOriginals,
    premiumDashboardUrl,
  );
  return `Moneko processed files from ${params.senderEmail}. Import inbox: ${config.importInboxEmail}. Saved: ${params.savedCount}. Duplicates skipped: ${params.duplicateCount}. Failed: ${params.failedCount}. ${retentionFooter}${premiumText} Contact ${config.supportEmail} if you need help.`;
}

function renderPremiumText(
  retainedOriginals: boolean,
  premiumDashboardUrl: string,
): string {
  if (!retainedOriginals) return "";
  return ` Open your Premium dashboard to review or download files: ${premiumDashboardUrl}.`;
}
