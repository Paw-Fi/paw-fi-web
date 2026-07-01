import { usePremiumDashboardSummary } from "../hooks/use-premium-dashboard-summary";
import { useState } from "react";
import { DashboardMetricCard } from "./dashboard-metric-card";
import { ActionItemsPanel } from "./action-items-panel";
import { CashflowChart } from "./cashflow-chart";
import { BudgetProgressPanel } from "./budget-progress-panel";
import { TransactionsSearchPanel } from "./transactions-search-panel";
import { ExportCenter } from "./export-center";
import { WalletsOverviewPanel } from "./wallets-overview-panel";
import { RecurringSummaryPanel } from "./recurring-summary-panel";
import { TransactionEditorDialog } from "./transaction-editor-dialog";
import { CategoryDetailDialog } from "./category-detail-dialog";
import { FinancialCalendarPanel } from "./financial-calendar-panel";
import { Wallet, TrendingUp, ArrowDownRight, ArrowUpRight, Receipt, FolderCheck, Tags, Plus } from "lucide-react";
import { formatCompactCurrency, formatCurrency } from "../lib/formatters";
import { Button } from "@/components/ui/button";

function formatPeriodRange(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${formatter.format(new Date(startDate))} - ${formatter.format(new Date(endDate))}`;
}

export function PremiumDashboardHome() {
  const { data, isLoading, error } = usePremiumDashboardSummary();
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-neutral-950 dark:bg-[#050505] dark:text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="space-y-3">
            <div className="h-4 w-32 animate-pulse rounded-full bg-neutral-200 dark:bg-white/10" />
            <div className="h-12 w-full max-w-xl animate-pulse rounded-lg bg-neutral-200 dark:bg-white/10" />
            <div className="h-5 w-full max-w-md animate-pulse rounded-lg bg-neutral-200/80 dark:bg-white/10" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-lg border border-neutral-200/80 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="h-80 animate-pulse rounded-lg border border-neutral-200/80 bg-white/80 lg:col-span-2 dark:border-white/10 dark:bg-white/[0.06]" />
            <div className="h-80 animate-pulse rounded-lg border border-neutral-200/80 bg-white/80 dark:border-white/10 dark:bg-white/[0.06]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] px-4 py-10 text-neutral-950 dark:bg-[#050505] dark:text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-lg border border-rose-200 bg-white p-6 shadow-[0_18px_60px_-42px_rgba(244,63,94,0.7)] dark:border-rose-400/25 dark:bg-rose-400/10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-500">
            Dashboard unavailable
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
            Error loading dashboard
          </h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const periodLabel = formatPeriodRange(data.period.startDate, data.period.endDate);
  const topCategoryMax = Math.max(
    1,
    ...data.topCategories.map((category) => category.amountCents),
  );

  return (
    <div className="min-h-screen overflow-hidden bg-[#f5f5f7] text-neutral-950 dark:bg-[#050505] dark:text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.22),transparent_32%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.14),transparent_28%)]" />

      <main className="relative mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-neutral-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.07] dark:text-neutral-300">
                Premium dashboard
              </span>
              <span className="rounded-full border border-neutral-200 bg-white/60 px-3 py-1 text-xs font-medium text-neutral-500 backdrop-blur dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-400">
                {periodLabel}
              </span>
            </div>
            <h1 className="max-w-4xl text-[clamp(2.5rem,6vw,5.5rem)] font-semibold leading-[0.95] tracking-tight text-neutral-950 dark:text-white">
              Your money, in focus.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-300 sm:text-lg">
              A clean view of cash, cashflow, pockets, receipts, categories, and export readiness from your live Moneko data.
            </p>
            <div className="mt-6">
              <Button
                type="button"
                size="lg"
                onClick={() => setIsAddingTransaction(true)}
                className="rounded-full bg-neutral-950 px-5 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add transaction
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200/80 bg-white/80 p-5 shadow-[0_22px_80px_-54px_rgba(15,23,42,0.6)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Export readiness
                </p>
                <p className="mt-2 text-4xl font-semibold tracking-tight">
                  {data.totals.receiptCoveragePercent}%
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                <FolderCheck className="size-5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-neutral-100 px-2 py-3 dark:bg-white/10">
                <p className="text-lg font-semibold">{data.exportReadiness.transactionCount}</p>
                <p className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Transactions
                </p>
              </div>
              <div className="rounded-lg bg-neutral-100 px-2 py-3 dark:bg-white/10">
                <p className="text-lg font-semibold">{data.exportReadiness.receiptCount}</p>
                <p className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Receipts
                </p>
              </div>
              <div className="rounded-lg bg-neutral-100 px-2 py-3 dark:bg-white/10">
                <p className="text-lg font-semibold">{data.exportReadiness.emailAttachmentCount}</p>
                <p className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Emails
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardMetricCard
            title="Cash on hand"
            value={formatCurrency(data.totals.cashOnHandCents, data.period.displayCurrency)}
            icon={Wallet}
            tone="cash"
            eyebrow={data.period.displayCurrency}
          />
          <DashboardMetricCard
            title="Net cashflow"
            value={formatCurrency(data.totals.netCashflowCents, data.period.displayCurrency)}
            icon={TrendingUp}
            tone="neutral"
            eyebrow="Period"
          />
          <DashboardMetricCard
            title="Total income"
            value={formatCurrency(data.totals.incomeCents, data.period.displayCurrency)}
            icon={ArrowUpRight}
            tone="income"
            eyebrow="Inflow"
          />
          <DashboardMetricCard
            title="Total expenses"
            value={formatCurrency(data.totals.expenseCents, data.period.displayCurrency)}
            icon={ArrowDownRight}
            tone="expense"
            eyebrow="Outflow"
          />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4">
          <ActionItemsPanel items={data.actionItems} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <CashflowChart trends={data.trends} currency={data.period.displayCurrency} />
            <BudgetProgressPanel budgets={data.budgetProgress} />
          </div>

          <FinancialCalendarPanel
            trends={data.trends}
            currency={data.period.displayCurrency}
            startDate={data.period.startDate}
            endDate={data.period.endDate}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <WalletsOverviewPanel wallets={data.wallets} />
            <RecurringSummaryPanel recurring={data.recurring} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TransactionsSearchPanel
              transactions={data.recentTransactions}
              displayCurrency={data.period.displayCurrency}
              wallets={data.wallets.wallets}
            />

            <aside className="space-y-4">
              <DashboardMetricCard
                title="Receipt coverage"
                value={`${data.totals.receiptCoveragePercent}%`}
                description={`${data.exportReadiness.missingReceiptCount} transactions missing receipts`}
                icon={Receipt}
                tone="coverage"
                eyebrow="Audit"
              />

              <section className="rounded-lg border border-neutral-200/80 bg-white/90 p-5 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                      Top categories
                    </p>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight">
                      Where money went
                    </h2>
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-lg bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
                    <Tags className="size-4" aria-hidden="true" />
                  </div>
                </div>

                {data.topCategories.length === 0 ? (
                  <div className="mt-8 rounded-lg border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                    No category spend in this period.
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {data.topCategories.slice(0, 5).map((category) => {
                      const width = Math.max(
                        4,
                        (category.amountCents / topCategoryMax) * 100,
                      );

                      return (
                        <button
                          key={category.category}
                          type="button"
                          onClick={() => setSelectedCategory(category.category)}
                          className="block w-full rounded-lg p-2 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/10 dark:hover:bg-white/[0.04] dark:focus-visible:ring-white/20"
                        >
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate font-medium capitalize text-neutral-700 dark:text-neutral-200">
                              {category.category}
                            </span>
                            <span className="shrink-0 font-semibold text-neutral-950 dark:text-white">
                              {formatCompactCurrency(category.amountCents, category.currency)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-neutral-950 transition-[width] duration-500 ease-out dark:bg-white"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <p className="text-xs text-neutral-400">
                            {category.transactionCount} transaction{category.transactionCount === 1 ? "" : "s"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <div id="export-center">
                <ExportCenter />
              </div>
            </aside>
          </div>
        </div>
      </main>

      <TransactionEditorDialog
        open={isAddingTransaction}
        onOpenChange={setIsAddingTransaction}
        displayCurrency={data.period.displayCurrency}
        wallets={data.wallets.wallets}
      />

      {selectedCategory && (
        <CategoryDetailDialog
          open={Boolean(selectedCategory)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setSelectedCategory(null);
          }}
          category={selectedCategory}
          displayCurrency={data.period.displayCurrency}
          wallets={data.wallets.wallets}
        />
      )}
    </div>
  );
}
