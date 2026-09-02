import type { HelpArticle } from "../types";
import { androidNotificationCaptureArticle } from "./android-notification-capture";
import { aiCaptureAccuracyArticle } from "./ai-capture-accuracy";
import { aiAssistantBoundariesArticle } from "./ai-assistant-boundaries";
import { householdsArticle } from "./households";
import { multiCurrencyArticle } from "./multi-currency";
import { monekoPlusArticle } from "./moneko-plus";
import { appLockArticle } from "./app-lock";
import { privacySecurityArticle } from "./privacy-security";
import { aiScenarioPlanningArticle } from "./ai-scenario-planning";
import { applePayTrackingArticle } from "./apple-pay-tracking";
import { bankSyncSecurityArticle } from "./bank-sync-security";
import { categoriesArticle } from "./categories";
import { commonDiscrepanciesArticle } from "./common-discrepancies";
import { createFirstSpaceArticle } from "./create-first-space";
import { duplicateTransactionsArticle } from "./duplicate-transactions";
import { emailReceiptsArticle } from "./email-receipts";
import { envelopeBudgetingArticle } from "./envelope-budgeting";
import { importExportDataArticle } from "./import-export-data";
import { importingHistorySafelyArticle } from "./importing-history-safely";
import { exportingDataWithoutLockInArticle } from "./exporting-data-without-lock-in";
import { financialMonthDateTimezoneArticle } from "./financial-month-date-timezone";
import { iosWidgetsArticle } from "./ios-widgets";
import { connectBankFeatureAvailabilityArticle } from "./connect-bank-feature-availability";
import { logExpenseArticle } from "./log-expense";
import { negativeWalletBalanceAfterPlaidSyncArticle } from "./negative-wallet-balance-after-plaid-sync";
import { notificationsRemindersArticle } from "./notifications-reminders";
import { openingBalancesWalletReconciliationArticle } from "./opening-balances-wallet-reconciliation";
import { offlineSyncDevicesArticle } from "./offline-sync-devices";
import { pocketsArticle } from "./pockets";
import { quickActionsSiriArticle } from "./quick-actions-siri";
import { recurringExpensesIncomeArticle } from "./recurring-expenses-income";
import { reportsHealthExplainNumberArticle } from "./reports-health-explain-number";
import { reportingProblemsFeedbackArticle } from "./reporting-problems-feedback";
import { settlementsArticle } from "./settlements";
import { sharedExpenseTrackerGuideArticle } from "./shared-expense-tracker-guide";
import { splitExpensesArticle } from "./split-expenses";
import { transfersRefundsCashArticle } from "./transfers-refunds-cash";
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
  aiCaptureAccuracyArticle,
  aiAssistantBoundariesArticle,
  splitExpensesArticle,
  settlementsArticle,
  whatsappTelegramArticle,
  applePayTrackingArticle,
  androidNotificationCaptureArticle,
  duplicateTransactionsArticle,
  emailReceiptsArticle,
  quickActionsSiriArticle,
  envelopeBudgetingArticle,
  pocketsArticle,
  transfersRefundsCashArticle,
  categoriesArticle,
  walletsArticle,
  openingBalancesWalletReconciliationArticle,
  householdsArticle,
  multiCurrencyArticle,
  financialMonthDateTimezoneArticle,
  bankSyncSecurityArticle,
  connectBankFeatureAvailabilityArticle,
  negativeWalletBalanceAfterPlaidSyncArticle,
  recurringExpensesIncomeArticle,
  reportsHealthExplainNumberArticle,
  reportingProblemsFeedbackArticle,
  appLockArticle,
  privacySecurityArticle,
  aiScenarioPlanningArticle,
  importingHistorySafelyArticle,
  exportingDataWithoutLockInArticle,
  offlineSyncDevicesArticle,
  notificationsRemindersArticle,
  commonDiscrepanciesArticle,
];
