import {
  type LocalizedEmailContent,
  localizedPluralize,
  withEmailLocalization,
} from "../../shared/automated-email-localization.ts";
import { createEmailTranslator } from "../../shared/automated-email-localization.ts";
import { baseTemplate, renderFooter } from "../../shared/email-layout.ts";
import { escapeHtml, sanitizeSubject } from "../../shared/email-utils.ts";

export function buildImportReviewRequiredEmail(params: {
  reviewUrl: string;
  savedCount: number;
  reviewCount: number;
}, language = "en"): LocalizedEmailContent {
  const { t, h } = createEmailTranslator(language);

  const reviewLine = t`${params.reviewCount} ${
    localizedPluralize(params.reviewCount, "transaction", undefined, language)
  } needs your attention because more than one source-supported value may be correct.`;
  const content =
    h`<h1 class="title">Action needed: review your Moneko import</h1>
    <p>We imported ${params.savedCount} ${
      localizedPluralize(params.savedCount, "transaction", undefined, language)
    }.</p>
    <p>${escapeHtml(reviewLine)}</p>
    <p>Loading this page does not import anything. Review the available choices before confirming.</p>
    <p><a class="button" href="${
      escapeHtml(params.reviewUrl)
    }">Review transaction</a></p>
    <p>This secure link expires in 72 hours. If you did not request this import, you can decline it.</p>`;
  return withEmailLocalization({
    subject: sanitizeSubject(t("Action needed: review your Moneko import")),
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "Moneko temporarily retains only the bounded evidence needed to explain a pending import review. It does not retain forwarded email bodies or attachments.",
        ),
      }, language),
      language,
    ),
    text: t`We imported ${params.savedCount} ${
      localizedPluralize(params.savedCount, "transaction", undefined, language)
    }.\n\n${reviewLine}\n\nLoading this page does not import anything. Review the available choices before confirming:\n${params.reviewUrl}\n\nThis secure link expires in 72 hours. If you did not request this import, you can decline it.`,
  }, (locale) => buildImportReviewRequiredEmail(params, locale));
}
