import type { HelpArticle } from "../../types";
import { createMigrationArticle } from "../_shared/migrate-template";

export const migrateFromCashewArticle: HelpArticle = createMigrationArticle({
  id: "migrate-from-cashew-to-moneko",
  number: "1.16",
  slug: "migrate-from-cashew-to-moneko",
  appName: "Cashew",
  keywords: [
    "migrate from cashew",
    "cashew to moneko",
    "cashew migration",
    "switch from cashew",
    "import cashew transactions",
    "cashew backup to moneko"
  ],
});
