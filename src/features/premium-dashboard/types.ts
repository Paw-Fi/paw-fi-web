export interface PremiumDashboardSummary {
  period: {
    startDate: string;
    endDate: string;
    displayCurrency: string;
  };
  totals: {
    cashOnHandCents: number;
    netWorthCents: number;
    incomeCents: number;
    expenseCents: number;
    netCashflowCents: number;
    profitLossCents: number;
    receiptCoveragePercent: number;
  };
  trends: Array<{
    date: string;
    incomeCents: number;
    expenseCents: number;
    netCashflowCents: number;
  }>;
  actionItems: Array<{
    id: string;
    severity: "info" | "warning" | "urgent" | "success";
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
  }>;
  budgetProgress: Array<{
    id: string;
    name: string;
    allocatedCents: number;
    spentCents: number;
    remainingCents: number;
    currency: string;
  }>;
  topCategories: Array<{
    category: string;
    amountCents: number;
    transactionCount: number;
    currency: string;
  }>;
  recentTransactions: Array<{
    id: string;
    type: "income" | "expense";
    date: string;
    amountCents: number;
    currency: string;
    category: string;
    description: string | null;
    merchant: string | null;
    accountId: string | null;
    accountName: string | null;
    receiptImageUrl: string | null;
    attachmentCount: number;
  }>;
  exportReadiness: {
    transactionCount: number;
    receiptCount: number;
    emailAttachmentCount: number;
    uncategorizedCount: number;
    missingReceiptCount: number;
  };
}

export type ExportJobStatus =
  | "queued"
  | "preparing"
  | "collecting_files"
  | "generating"
  | "ready"
  | "failed"
  | "expired";

export type ExportType =
  | "transactions_csv"
  | "reports_csv"
  | "tax_package_zip"
  | "files_zip"
  | "account_history_csv"
  | "category_data_csv"
  | "everything_zip";

export interface PremiumExportJob {
  id: string;
  user_id: string;
  status: ExportJobStatus;
  export_type: ExportType;
  filters: Record<string, unknown>;
  storage_bucket: string;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  error_text: string | null;
  progress_percent: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  expires_at: string | null;
}
