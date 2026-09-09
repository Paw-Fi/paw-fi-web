import type { HelpArticle } from "../../types";
import { createMigrationArticle } from "../_shared/migrate-template";

export const migrateFromCopilotArticle: HelpArticle = createMigrationArticle({
  id: "migrate-from-copilot-to-moneko",
  number: "1.12",
  slug: "migrate-from-copilot-to-moneko",
  appName: "Copilot",
  keywords: [
    "migrate from copilot",
    "copilot to moneko",
    "copilot migration",
    "switch from copilot",
    "import copilot transactions",
    "copilot money to moneko"
  ],
});
