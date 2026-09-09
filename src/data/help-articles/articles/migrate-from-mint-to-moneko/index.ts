import type { HelpArticle } from "../../types";
import { createMigrationArticle } from "../_shared/migrate-template";

export const migrateFromMintArticle: HelpArticle = createMigrationArticle({
  id: "migrate-from-mint-to-moneko",
  number: "1.17",
  slug: "migrate-from-mint-to-moneko",
  appName: "Mint",
  keywords: [
    "migrate from mint",
    "mint to moneko",
    "mint migration",
    "switch from mint",
    "import mint transactions",
    "mint.com to moneko",
    "mint discontinued"
  ],
});
