import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PremiumDashboardSummary } from "../types";
import { usePremiumDashboardSummary } from "../hooks/use-premium-dashboard-summary";
import { formatCompactCurrency, formatCurrency, formatDate } from "../lib/formatters";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, BarChart3 } from "lucide-react";
import { TransactionDetailDialog } from "./transaction-detail-dialog";

interface CategoryDetailDialogProps {
  category: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayCurrency: string;
  wallets: PremiumDashboardSummary["wallets"]["wallets"];
}

export function CategoryDetailDialog({
  category,
  open,
  onOpenChange,
  displayCurrency,
  wallets,
}: CategoryDetailDialogProps) {
  const { data, isLoading, error } = usePremiumDashboardSummary(
    category ? { category, displayCurrency } : undefined,
  );
  const [selectedTransaction, setSelectedTransaction] = useState<
    PremiumDashboardSummary["recentTransactions"][number] | null
  >(null);

  const total = data?.totals.expenseCents ?? 0;
  const transactions = data?.recentTransactions ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-2xl border-neutral-200 bg-white p-0 text-neutral-950 shadow-[0_30px_120px_-56px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-neutral-950 dark:text-white">
          <DialogHeader className="border-b border-neutral-100 px-6 py-5 text-left dark:border-white/10">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
                <BarChart3 className="size-5" aria-hidden="true" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold capitalize tracking-tight text-neutral-950 dark:text-white">
                  {category || "Category"}
                </DialogTitle>
                <DialogDescription>
                  Live category totals and native transaction rows for this period.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-24 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/10" />
                <div className="h-16 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/10" />
                <div className="h-16 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/10" />
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-medium text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
                {error.message}
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat
                    label="Spend"
                    value={formatCurrency(total, displayCurrency)}
                  />
                  <Stat
                    label="Rows"
                    value={`${data?.exportReadiness.transactionCount ?? 0}`}
                  />
                  <Stat
                    label="Receipts"
                    value={`${data?.exportReadiness.receiptCount ?? 0}`}
                  />
                </div>

                <div className="mt-5 divide-y divide-neutral-100 dark:divide-white/10">
                  {transactions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-200 py-12 text-center text-sm font-medium text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                      No transactions found for this category.
                    </div>
                  ) : (
                    transactions.map((transaction) => (
                      <button
                        key={transaction.id}
                        type="button"
                        onClick={() => setSelectedTransaction(transaction)}
                        className="flex w-full items-center justify-between gap-4 rounded-xl px-2 py-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/10 dark:hover:bg-white/[0.04] dark:focus-visible:ring-white/20"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-lg",
                              transaction.type === "income"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300"
                                : "bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
                            )}
                          >
                            {transaction.type === "income" ? (
                              <ArrowUpRight className="size-4" aria-hidden="true" />
                            ) : (
                              <ArrowDownRight className="size-4" aria-hidden="true" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-neutral-950 dark:text-white">
                              {transaction.merchant || transaction.description || "Unknown"}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                              {formatDate(transaction.date)}
                              {transaction.accountName
                                ? ` / ${transaction.accountName}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-neutral-950 dark:text-white">
                          {transaction.type === "income" ? "+" : "-"}
                          {formatCompactCurrency(
                            transaction.amountCents,
                            transaction.currency,
                          )}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TransactionDetailDialog
        open={Boolean(selectedTransaction)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        displayCurrency={displayCurrency}
        wallets={wallets}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-neutral-100 p-4 dark:bg-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </p>
      <p className="mt-2 truncate text-xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}
