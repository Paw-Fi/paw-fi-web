import React from "react";
import { PremiumDashboardSummary } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency, formatDate } from "../lib/formatters";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TransactionsSearchPanelProps {
  transactions: PremiumDashboardSummary["recentTransactions"];
}

export function TransactionsSearchPanel({ transactions }: TransactionsSearchPanelProps) {
  return (
    <Card className="col-span-1 lg:col-span-2 border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Recent Transactions</CardTitle>
        <div className="relative w-48 sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-9 h-9 bg-slate-50 dark:bg-slate-900 border-none rounded-full focus-visible:ring-1"
          />
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No transactions found in this period.
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="overflow-hidden">
                    <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {tx.merchant || tx.description || "Unknown"}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                      <span>{formatDate(tx.date)}</span>
                      <span className="opacity-50">•</span>
                      <span>{tx.category}</span>
                      {tx.accountName && (
                        <>
                          <span className="opacity-50">•</span>
                          <span className="truncate">{tx.accountName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                  <span
                    className={cn(
                      "font-semibold text-sm",
                      tx.type === "income"
                        ? "text-slate-900 dark:text-slate-100"
                        : "text-slate-900 dark:text-slate-100"
                    )}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {formatCompactCurrency(tx.amountCents, tx.currency)}
                  </span>
                  {(tx.receiptImageUrl || tx.attachmentCount > 0) && (
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Has Attachment
                    </span>
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
