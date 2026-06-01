import React from "react";
import { PremiumDashboardSummary } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency, formatDate } from "../lib/formatters";
import { Receipt, Search, Paperclip } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TransactionsSearchPanelProps {
  transactions: PremiumDashboardSummary["recentTransactions"];
}

export function TransactionsSearchPanel({ transactions }: TransactionsSearchPanelProps) {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">Recent Transactions</CardTitle>
        <div className="relative w-48 sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search recent..."
            className="pl-8 bg-slate-50 dark:bg-slate-900 border-none focus-visible:ring-1"
          />
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No transactions found in this period.
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 sm:p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      tx.type === "income"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {/* Placeholder category icon */}
                    <span className="font-semibold text-sm">
                      {tx.category ? tx.category.charAt(0).toUpperCase() : "?"}
                    </span>
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {tx.merchant || tx.description || "Unknown"}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 truncate">
                      <span>{formatDate(tx.date)}</span>
                      <span>•</span>
                      <span>{tx.category}</span>
                      {tx.accountName && (
                        <>
                          <span>•</span>
                          <span className="truncate">{tx.accountName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                  <span
                    className={cn(
                      "font-semibold",
                      tx.type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-900 dark:text-slate-100"
                    )}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {formatCompactCurrency(tx.amountCents, tx.currency)}
                  </span>
                  {(tx.receiptImageUrl || tx.attachmentCount > 0) && (
                    <div className="flex gap-1 text-slate-400">
                      {tx.receiptImageUrl && <Receipt className="w-3.5 h-3.5" />}
                      {tx.attachmentCount > 0 && <Paperclip className="w-3.5 h-3.5" />}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
