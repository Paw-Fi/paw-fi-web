import {
  type LocalizedEmailContent,
  localizedPluralize,
  withEmailLocalization,
} from "../../shared/automated-email-localization.ts";
import { createEmailTranslator } from "../../shared/automated-email-localization.ts";
import { baseTemplate, renderFooter } from "../../shared/email-layout.ts";
import {
  escapeHtml,
  formatCurrency,
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
  language = "en",
): LocalizedEmailContent {
  const { t } = createEmailTranslator(language);

  const appTransactionsUrl = params.appTransactionsUrl ??
    config.appTransactionsUrl;
  const didFail = params.savedCount === 0 && params.duplicateCount === 0 &&
    params.failedCount > 0;
  const didSkipDuplicatesOnly = params.savedCount === 0 &&
    params.duplicateCount > 0 && params.failedCount === 0;
  const attachmentLines = renderAttachmentLines(
    params.attachmentResults,
    language,
  );
  const transactionLines = renderTransactionLines(
    params.transactions,
    language,
  );
  const content = renderContent(
    params,
    appTransactionsUrl,
    attachmentLines,
    transactionLines,
    didFail,
    didSkipDuplicatesOnly,
    language,
  );
  const footerReason = t(
    "Moneko does not store forwarded attachments or email content on our servers. We process them temporarily only to extract transactions. Replies are not monitored.",
  );
  const text = buildTextEmail(
    params,
    config,
    appTransactionsUrl,
    footerReason,
    didFail,
    didSkipDuplicatesOnly,
    language,
  );

  return withEmailLocalization({
    subject: sanitizeSubject(
      didSkipDuplicatesOnly
        ? t("This Moneko import was already logged")
        : didFail
        ? t("Moneko could not complete your import")
        : t("Your Moneko import is complete"),
    ),
    html: baseTemplate(
      content,
      renderFooter({
        customReason: footerReason,
      }, language),
      language,
    ),
    text,
  }, (locale) => buildFollowupEmail(params, config, locale));
}

function renderContent(
  params: FollowupEmailParams,
  appTransactionsUrl: string,
  attachmentLines: string,
  transactionLines: string,
  didFail: boolean,
  didSkipDuplicatesOnly: boolean,
  language = "en",
): string {
  const { t, h } = createEmailTranslator(language);

  return h`
    <h1 class="title">${
    didSkipDuplicatesOnly
      ? t("This import was already logged")
      : didFail
      ? t("Moneko could not complete your import")
      : t("Your Moneko import is complete")
  }</h1>
    <p class="subtitle">${
    didSkipDuplicatesOnly
      ? t("We found transaction content in the import forwarded from")
      : didFail
      ? t(
        "We could not extract a transaction from the import content forwarded from",
      )
      : t("We finished processing the import content forwarded from")
  } ${escapeHtml(params.senderEmail)}${
    didSkipDuplicatesOnly
      ? t(
        ", but it matched a transaction already logged in Moneko, so nothing new was saved.",
      )
      : "."
  }</p>
    ${renderOpenTransactionsButton(appTransactionsUrl, language)}
    ${renderImportSummary(params, language)}
    <p><strong>Import source summary</strong></p>
    <ul>${attachmentLines}</ul>
    ${renderSavedTransactionsSection(transactionLines, language)}
  `;
}

function renderOpenTransactionsButton(
  appTransactionsUrl: string,
  language = "en",
): string {
  const { h } = createEmailTranslator(language);

  return h`
    <p>
      <a href="${
    escapeHtml(appTransactionsUrl)
  }" style="display:inline-block;background-color:#7458FF;color:#ffffff !important;padding:14px 24px;border-radius:8px;font-weight:600;font-size:16px;text-decoration:none !important;margin:8px 0 20px 0;">
        Open transactions in Moneko
      </a>
    </p>
  `;
}

function renderImportSummary(
  params: FollowupEmailParams,
  language = "en",
): string {
  const { h } = createEmailTranslator(language);

  return h`
    <p><strong>Saved:</strong> ${params.savedCount} ${
    localizedPluralize(params.savedCount, "transaction", undefined, language)
  }</p>
    <p><strong>Duplicates skipped:</strong> ${params.duplicateCount}</p>
    <p><strong>Failed:</strong> ${params.failedCount}</p>
    ${renderFailureReasons(params.failureReasons, language)}
  `;
}

function renderFailureReasons(reasons?: string[], language = "en"): string {
  const { h } = createEmailTranslator(language);

  const uniqueReasons = Array.from(
    new Set(
      (reasons ?? [])
        .map((reason) => reason.trim())
        .filter((reason) => reason.length > 0),
    ),
  );

  if (uniqueReasons.length === 0) return "";

  return h`<p><strong>Failure ${
    localizedPluralize(uniqueReasons.length, "reason", undefined, language)
  }:</strong> ${uniqueReasons.map(escapeHtml).join("; ")}</p>`;
}

function renderSavedTransactionsSection(
  transactionLines: string,
  language = "en",
): string {
  const { h } = createEmailTranslator(language);

  if (!transactionLines) return "";
  return h`<p><strong>Saved transactions</strong></p><ul>${transactionLines}</ul>`;
}

function renderAttachmentLines(
  attachmentResults: FollowupAttachmentResult[],
  language = "en",
): string {
  const { t, h } = createEmailTranslator(language);

  return attachmentResults
    .map((item) => {
      if (!item.success) {
        return h`<li>${escapeHtml(item.filename)}: ${
          escapeHtml(item.error || t("analysis failed"))
        }</li>`;
      }
      return h`<li>${escapeHtml(item.filename)}: ${item.itemCount} ${
        localizedPluralize(item.itemCount, "transaction", undefined, language)
      } found</li>`;
    })
    .join("");
}

function renderTransactionLines(
  transactions: Array<Record<string, unknown>>,
  language = "en",
): string {
  const { h } = createEmailTranslator(language);

  const lines = transactions.slice(0, 30).map((item) =>
    renderTransactionLine(item, language)
  ).join("");
  if (transactions.length <= 30) return lines;
  return h`${lines}<li>...</li>`;
}

function renderTransactionLine(
  item: Record<string, unknown>,
  language = "en",
): string {
  const { t, h } = createEmailTranslator(language);

  const type = t(resolveTransactionType(item));
  const amount = Number(item.amount ?? 0);
  const currency = resolveTransactionCurrency(item);
  const category = resolveTransactionCategory(item);
  const description = resolveTransactionDescription(item, language);
  const dateText = renderTransactionDate(item);

  return h`<li><strong>${escapeHtml(type)}</strong>: ${
    escapeHtml(description)
  } · ${escapeHtml(category)} · ${
    escapeHtml(formatCurrency(amount, currency, language))
  }${dateText}</li>`;
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

function resolveTransactionDescription(
  item: Record<string, unknown>,
  language = "en",
): string {
  if (
    typeof item.description === "string" &&
    item.description.trim().length > 0
  ) {
    return item.description.trim();
  }
  if (typeof item.merchant === "string" && item.merchant.trim().length > 0) {
    return item.merchant.trim();
  }
  return createEmailTranslator(language).t("Imported transaction");
}

function buildTextEmail(
  params: FollowupEmailParams,
  config: FollowupEmailBuilderConfig,
  appTransactionsUrl: string,
  footerReason: string,
  didFail: boolean,
  didSkipDuplicatesOnly: boolean,
  language = "en",
): string {
  const { t } = createEmailTranslator(language);

  const failureReasons = Array.from(
    new Set(
      (params.failureReasons ?? [])
        .map((reason) => reason.trim())
        .filter((reason) => reason.length > 0),
    ),
  );
  const failureText = failureReasons.length > 0
    ? t` Failure ${
      localizedPluralize(failureReasons.length, "reason", undefined, language)
    }: ${failureReasons.join("; ")}.`
    : "";

  const statusText = didSkipDuplicatesOnly
    ? t("Moneko skipped this duplicate import")
    : didFail
    ? t("Moneko could not complete the import")
    : t("Moneko completed the import");
  return t`${statusText} from ${params.senderEmail}. Import inbox: ${config.importInboxEmail}. Saved: ${params.savedCount}. Duplicates skipped: ${params.duplicateCount}. Failed: ${params.failedCount}.${failureText} Open transactions in Moneko: ${appTransactionsUrl}. ${footerReason} Contact ${config.supportEmail} if you need help.`;
}
