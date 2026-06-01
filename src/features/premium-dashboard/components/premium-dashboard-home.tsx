import { usePremiumDashboardSummary } from "../hooks/use-premium-dashboard-summary";
import { DashboardMetricCard } from "./dashboard-metric-card";
import { ActionItemsPanel } from "./action-items-panel";
import { CashflowChart } from "./cashflow-chart";
import { BudgetProgressPanel } from "./budget-progress-panel";
import { TransactionsSearchPanel } from "./transactions-search-panel";
import { ExportCenter } from "./export-center";
import { Wallet, TrendingUp, ArrowDownRight, ArrowUpRight, Receipt, Activity } from "lucide-react";
import { formatCurrency } from "../lib/formatters";

export function PremiumDashboardHome() {
  const { data, isLoading, error } = usePremiumDashboardSummary();

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-32 bg-slate-200 rounded-xl animate-pulse"></div>
          <div className="h-32 bg-slate-200 rounded-xl animate-pulse"></div>
          <div className="h-32 bg-slate-200 rounded-xl animate-pulse"></div>
          <div className="h-32 bg-slate-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-500">
        Error loading dashboard: {error.message}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your business snapshot</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back. Here's how your business is doing this period.
          </p>
        </div>
        {/* Date Range Selector will go here */}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardMetricCard
            title="Cash on Hand"
            value={formatCurrency(data.totals.cashOnHandCents, data.period.displayCurrency)}
            icon={Wallet}
            description="Total available balance across selected accounts"
          />
          <DashboardMetricCard
            title="Net Cashflow"
            value={formatCurrency(data.totals.netCashflowCents, data.period.displayCurrency)}
            icon={Activity}
            trend={{ value: 0, label: "this period" }} // Could compute real trend if returned
          />
          <DashboardMetricCard
            title="Total Income"
            value={formatCurrency(data.totals.incomeCents, data.period.displayCurrency)}
            icon={ArrowUpRight}
            className="border-emerald-200 dark:border-emerald-800/50"
          />
          <DashboardMetricCard
            title="Total Expenses"
            value={formatCurrency(data.totals.expenseCents, data.period.displayCurrency)}
            icon={ArrowDownRight}
            className="border-rose-200 dark:border-rose-800/50"
          />
        </div>

        <ActionItemsPanel items={data.actionItems} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <CashflowChart trends={data.trends} currency={data.period.displayCurrency} />
          <BudgetProgressPanel budgets={data.budgetProgress} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TransactionsSearchPanel transactions={data.recentTransactions} />
          <div className="col-span-1 space-y-6">
            <DashboardMetricCard
              title="Receipt Coverage"
              value={`${data.totals.receiptCoveragePercent}%`}
              icon={Receipt}
              description={`${data.exportReadiness.missingReceiptCount} transactions missing receipts`}
              trend={{
                value: data.totals.receiptCoveragePercent,
                label: "coverage",
                isPositiveGood: true
              }}
            />
          </div>
        </div>

        <ExportCenter />
      </div>
    </div>
  );
}
