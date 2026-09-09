import type { HelpArticle } from "../../types";
import { createMigrationArticle } from "../_shared/migrate-template";

export const migrateFromGoodbudgetArticle: HelpArticle = createMigrationArticle({
  id: "migrate-from-goodbudget-to-moneko",
  number: "1.18",
  slug: "migrate-from-goodbudget-to-moneko",
  appName: "Goodbudget",
  keywords: [
    "migrate from goodbudget",
    "goodbudget to moneko",
    "goodbudget migration",
    "switch from goodbudget",
    "import goodbudget transactions",
    "goodbudget envelopes to moneko"
  ],
});
