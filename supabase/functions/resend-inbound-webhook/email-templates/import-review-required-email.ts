import { baseTemplate, renderFooter } from "../../shared/email-layout.ts";
import {
  escapeHtml,
  pluralize,
  sanitizeSubject,
} from "../../shared/email-utils.ts";

export function buildImportReviewRequiredEmail(params: {
  reviewUrl: string;
  savedCount: number;
  reviewCount: number;
}): { subject: string; html: string; text: string } {
  const reviewLine = `${params.reviewCount} ${pluralize(params.reviewCount, "transaction")} needs your attention because more than one source-supported value may be correct.`;
  const content = `<h1 class="title">Action needed: review your Moneko import</h1>
    <p>We imported ${params.savedCount} ${pluralize(params.savedCount, "transaction")}.</p>
    <p>${escapeHtml(reviewLine)}</p>
    <p>Loading this page does not import anything. Review the available choices before confirming.</p>
    <p><a class="button" href="${escapeHtml(params.reviewUrl)}">Review transaction</a></p>
    <p>This secure link expires in 72 hours. If you did not request this import, you can decline it.</p>`;
  return {
    subject: sanitizeSubject("Action needed: review your Moneko import"),
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "Moneko temporarily retains only the bounded evidence needed to explain a pending import review. It does not retain forwarded email bodies or attachments.",
      }),
    ),
    text: `We imported ${params.savedCount} ${pluralize(params.savedCount, "transaction")}.\n\n${reviewLine}\n\nLoading this page does not import anything. Review the available choices before confirming:\n${params.reviewUrl}\n\nThis secure link expires in 72 hours. If you did not request this import, you can decline it.`,
  };
}
