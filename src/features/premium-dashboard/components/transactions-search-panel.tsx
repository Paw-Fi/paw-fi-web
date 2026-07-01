import React from "react";
import { useMemo, useState } from "react";
import { PremiumDashboardSummary } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency, formatDate } from "../lib/formatters";
import { ArrowDownRight, ArrowUpRight, Paperclip, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TransactionDetailDialog } from "./transaction-detail-dialog";

interface TransactionsSearchPanelProps {
  transactions: PremiumDashboardSummary["recentTransactions"];
  displayCurrency: string;
  wallets: PremiumDashboardSummary["wallets"]["wallets"];
}

export function TransactionsSearchPanel({
  transactions,
  displayCurrency,
  wallets,
}: TransactionsSearchPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<
    PremiumDashboardSummary["recentTransactions"][number] | null
  >(null);

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return transactions;
    return transactions.filter((tx) =>
      [
        tx.merchant,
        tx.description,
        tx.category,
        tx.accountName,
        tx.currency,
        tx.type,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [search, transactions]);

  return (
    <>
      <Card className="col-span-1 rounded-lg border border-neutral-200/80 bg-white/90 py-0 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:col-span-2 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
        <CardHeader className="flex flex-col gap-4 px-5 pb-0 pt-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Ledger
            </p>
            <CardTitle className="mt-2 text-lg font-semibold tracking-tight text-neutral-950 dark:text-white">
              Recent transactions
            </CardTitle>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search..."
              aria-label="Search transactions"
              className="h-10 rounded-full border-neutral-200 bg-neutral-50 pl-9 text-sm shadow-none focus-visible:border-neutral-400 focus-visible:ring-neutral-950/10 dark:border-white/10 dark:bg-white/[0.06] dark:focus-visible:border-white/25 dark:focus-visible:ring-white/20"
            />
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-5 sm:px-5 sm:pb-5">
          {visibleTransactions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-200 py-16 text-center text-sm font-medium text-neutral-500 dark:border-white/10 dark:text-neutral-400">
              No transactions found in this period.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-white/10">
              {visibleTransactions.map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => setSelectedTransaction(tx)}
                  className="group flex w-full items-center justify-between gap-4 rounded-lg px-2 py-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/10 dark:hover:bg-white/[0.04] dark:focus-visible:ring-white/20 sm:px-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        tx.type === "income"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300"
                          : "bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
                      )}
                    >
                      {tx.type === "income" ? (
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      ) : (
                        <ArrowDownRight className="size-4" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-neutral-950 transition-colors group-hover:text-neutral-600 dark:text-white dark:group-hover:text-neutral-300">
                        {tx.merchant || tx.description || "Unknown"}
                      </h4>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <span>{formatDate(tx.date)}</span>
                        <span className="text-neutral-300 dark:text-neutral-600">/</span>
                        <span className="capitalize">{tx.category}</span>
                        {tx.accountName && (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-600">/</span>
                            <span className="truncate">{tx.accountName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        tx.type === "income"
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-neutral-950 dark:text-white"
                      )}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatCompactCurrency(tx.amountCents, tx.currency)}
                    </span>
                    {(tx.receiptImageUrl || tx.attachmentCount > 0) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
                        <Paperclip className="size-3" aria-hidden="true" />
                        Attachment
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
