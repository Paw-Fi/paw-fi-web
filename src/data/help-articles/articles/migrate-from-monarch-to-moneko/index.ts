import type { HelpArticle } from "../../types";
import { createMigrationArticle } from "../_shared/migrate-template";

export const migrateFromMonarchArticle: HelpArticle = createMigrationArticle({
  id: "migrate-from-monarch-to-moneko",
  number: "1.11",
  slug: "migrate-from-monarch-to-moneko",
  appName: "Monarch",
  keywords: [
    "migrate from monarch",
    "monarch to moneko",
    "monarch migration",
    "switch from monarch",
    "import monarch transactions",
    "monarch money to moneko"
  ],
});
