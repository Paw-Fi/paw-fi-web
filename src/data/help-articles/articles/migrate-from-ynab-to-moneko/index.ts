import type { HelpArticle } from "../../types";
import { createMigrationArticle } from "../_shared/migrate-template";

export const migrateFromYnabArticle: HelpArticle = createMigrationArticle({
  id: "migrate-from-ynab-to-moneko",
  number: "1.10",
  slug: "migrate-from-ynab-to-moneko",
  appName: "YNAB",
  keywords: [
    "migrate from ynab",
    "ynab to moneko",
    "ynab migration",
    "switch from ynab",
    "import ynab transactions",
    "ynab export to moneko"
  ],
});
