import type { HelpArticle } from "../../types";
import { createMigrationArticle } from "../_shared/migrate-template";

export const migrateFromPocketguardArticle: HelpArticle = createMigrationArticle({
  id: "migrate-from-pocketguard-to-moneko",
  number: "1.13",
  slug: "migrate-from-pocketguard-to-moneko",
  appName: "PocketGuard",
  keywords: [
    "migrate from pocketguard",
    "pocketguard to moneko",
    "pocketguard migration",
    "switch from pocketguard",
    "import pocketguard transactions"
  ],
});
