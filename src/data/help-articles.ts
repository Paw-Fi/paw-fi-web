export type {
  HelpArticle,
  HelpArticleFaqItem,
  HelpArticleHowToStep,
  HelpCategory,
} from "./help-articles/types";
export { helpArticles } from "./help-articles/articles";
export { helpCategories } from "./help-articles/categories";

import { helpArticles } from "./help-articles/articles";
import { helpCategories } from "./help-articles/categories";
import type { HelpArticle } from "./help-articles/types";

const directLinkOnlyHelpArticleIds = new Set([
  "ai-capture-accuracy",
  "common-discrepancies",
  "exporting-data-without-lock-in",
  "financial-month-date-timezone",
  "importing-history-safely",
  "notifications-reminders",
  "offline-sync-devices",
  "reports-health-explain-number",
  "settlements",
  "transfers-refunds-cash",
]);

export const listedHelpArticles = helpArticles.filter(
  (article) => !directLinkOnlyHelpArticleIds.has(article.id),
);

export const totalHelpArticles = listedHelpArticles.length;

export function findHelpArticleBySlug(slug: string) {
  return helpArticles.find((article) => article.slug === slug);
}

export function getHelpCategory(categoryId: string) {
  return helpCategories.find((category) => category.id === categoryId);
}

export function getHelpArticlesByCategory(categoryId: string) {
  return listedHelpArticles.filter(
    (article) => article.categoryId === categoryId,
  );
}

export function getFeaturedHelpArticles() {
  return listedHelpArticles.filter((article) => article.featured);
}

export function getRelatedHelpArticles(article: HelpArticle, limit = 4) {
  return helpArticles
    .filter(
      (candidate) =>
        candidate.categoryId === article.categoryId &&
        candidate.id !== article.id,
    )
    .slice(0, limit);
}
