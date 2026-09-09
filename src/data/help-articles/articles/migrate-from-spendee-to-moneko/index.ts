import type { HelpArticle } from "../../types";
import { createMigrationArticle } from "../_shared/migrate-template";

export const migrateFromSpendeeArticle: HelpArticle = createMigrationArticle({
  id: "migrate-from-spendee-to-moneko",
  number: "1.19",
  slug: "migrate-from-spendee-to-moneko",
  appName: "Spendee",
  keywords: [
    "migrate from spendee",
    "spendee to moneko",
    "spendee migration",
    "switch from spendee",
    "import spendee transactions",
    "spendee to moneko"
  ],
});
