import type { HelpArticle } from "../types";
import { androidNotificationCaptureArticle } from "./android-notification-capture";
import { householdsArticle } from "./households";
import { multiCurrencyArticle } from "./multi-currency";
import { monekoPlusArticle } from "./moneko-plus";
import { appLockArticle } from "./app-lock";
import { privacySecurityArticle } from "./privacy-security";
import { aiScenarioPlanningArticle } from "./ai-scenario-planning";
import { applePayTrackingArticle } from "./apple-pay-tracking";
import { bankSyncSecurityArticle } from "./bank-sync-security";
import { categoriesArticle } from "./categories";
import { createFirstSpaceArticle } from "./create-first-space";
import { emailReceiptsArticle } from "./email-receipts";
import { envelopeBudgetingArticle } from "./envelope-budgeting";
import { importExportDataArticle } from "./import-export-data";
import { iosWidgetsArticle } from "./ios-widgets";
import { connectBankFeatureAvailabilityArticle } from "./connect-bank-feature-availability";
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
  monekoPlusArticle,
  createFirstSpaceArticle,
  importExportDataArticle,
  iosWidgetsArticle,
  logExpenseArticle,
  splitExpensesArticle,
  whatsappTelegramArticle,
  applePayTrackingArticle,
  androidNotificationCaptureArticle,
  emailReceiptsArticle,
  quickActionsSiriArticle,
  envelopeBudgetingArticle,
  pocketsArticle,
  categoriesArticle,
  walletsArticle,
  householdsArticle,
  multiCurrencyArticle,
  bankSyncSecurityArticle,
  connectBankFeatureAvailabilityArticle,
  negativeWalletBalanceAfterPlaidSyncArticle,
  recurringExpensesIncomeArticle,
  appLockArticle,
  privacySecurityArticle,
  aiScenarioPlanningArticle,
];
