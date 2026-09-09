import type { HelpArticle } from "../../types";
import { createMigrationArticle } from "../_shared/migrate-template";

export const migrateFromEverydollarArticle: HelpArticle = createMigrationArticle({
  id: "migrate-from-everydollar-to-moneko",
  number: "1.15",
  slug: "migrate-from-everydollar-to-moneko",
  appName: "EveryDollar",
  keywords: [
    "migrate from everydollar",
    "everydollar to moneko",
    "everydollar migration",
    "switch from everydollar",
    "import everydollar transactions",
    "ramsey everydollar to moneko"
  ],
});
