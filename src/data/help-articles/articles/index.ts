import type { HelpArticle } from "../types";
import { aiScenarioPlanningArticle } from "./ai-scenario-planning";
import { applePayTrackingArticle } from "./apple-pay-tracking";
import { categoriesArticle } from "./categories";
import { createFirstSpaceArticle } from "./create-first-space";
import { emailReceiptsArticle } from "./email-receipts";
import { envelopeBudgetingArticle } from "./envelope-budgeting";
import { importExportDataArticle } from "./import-export-data";
import { iosWidgetsArticle } from "./ios-widgets";
import { logExpenseArticle } from "./log-expense";
import { negativeWalletBalanceAfterPlaidSyncArticle } from "./negative-wallet-balance-after-plaid-sync";
import { pocketsArticle } from "./pockets";
import { quickActionsSiriArticle } from "./quick-actions-siri";
import { recurringExpensesIncomeArticle } from "./recurring-expenses-income";
import { sharedExpenseTrackerGuideArticle } from "./shared-expense-tracker-guide";
import { splitExpensesArticle } from "./split-expenses";
import { walletsArticle } from "./wallets";
import { whatsappTelegramArticle } from "./whatsapp-telegram";
import { whatIsMonekoArticle } from "./what-is-moneko";

export const helpArticles: HelpArticle[] = [
  whatIsMonekoArticle,
  sharedExpenseTrackerGuideArticle,
  createFirstSpaceArticle,
  importExportDataArticle,
  iosWidgetsArticle,
  logExpenseArticle,
  splitExpensesArticle,
  whatsappTelegramArticle,
  applePayTrackingArticle,
  emailReceiptsArticle,
  quickActionsSiriArticle,
  envelopeBudgetingArticle,
  pocketsArticle,
  categoriesArticle,
  walletsArticle,
  negativeWalletBalanceAfterPlaidSyncArticle,
  recurringExpensesIncomeArticle,
  aiScenarioPlanningArticle,
];
