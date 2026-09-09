import type { HelpArticle } from "../../types";
import { createMigrationArticle } from "../_shared/migrate-template";

export const migrateFromSplitwiseArticle: HelpArticle = createMigrationArticle({
  id: "migrate-from-splitwise-to-moneko",
  number: "1.14",
  slug: "migrate-from-splitwise-to-moneko",
  appName: "Splitwise",
  keywords: [
    "migrate from splitwise",
    "splitwise to moneko",
    "splitwise migration",
    "switch from splitwise",
    "import splitwise expenses",
    "splitwise to moneko"
  ],
});
