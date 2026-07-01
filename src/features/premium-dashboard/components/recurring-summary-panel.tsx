import { PremiumDashboardSummary } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency, formatDate } from "../lib/formatters";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Repeat } from "lucide-react";

interface RecurringSummaryPanelProps {
  recurring: PremiumDashboardSummary["recurring"];
}

export function RecurringSummaryPanel({ recurring }: RecurringSummaryPanelProps) {
  return (
    <Card className="rounded-lg border border-neutral-200/80 bg-white/90 py-0 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 px-5 pb-0 pt-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Recurring
          </p>
          <CardTitle className="mt-2 text-lg font-semibold tracking-tight text-neutral-950 dark:text-white">
            Scheduled money
          </CardTitle>
        </div>
        <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-sm">
          <Repeat className="size-4" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-5">
        <div className="grid grid-cols-3 gap-2">
          <SummaryStat
            label="Income"
            value={formatCompactCurrency(
              recurring.incomeCents,
              recurring.displayCurrency,
            )}
            tone="income"
          />
          <SummaryStat
            label="Bills"
            value={formatCompactCurrency(
              recurring.expenseCents,
              recurring.displayCurrency,
            )}
            tone="expense"
          />
          <SummaryStat
            label="Net"
            value={formatCompactCurrency(recurring.netCents, recurring.displayCurrency)}
            tone={recurring.netCents >= 0 ? "income" : "expense"}
          />
        </div>

        {recurring.upcoming.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-neutral-200 py-10 text-center text-sm font-medium text-neutral-500 dark:border-white/10 dark:text-neutral-400">
            No recurring items are active.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-neutral-100 dark:divide-white/10">
            {recurring.upcoming.map((item) => {
              const hasConvertedDisplay = item.currency !== item.displayCurrency;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.04]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        item.type === "income"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300"
                          : "bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
                      )}
                    >
                      {item.type === "income" ? (
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      ) : (
                        <ArrowDownRight className="size-4" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-neutral-950 dark:text-white">
                        {item.merchant || item.description || item.category}
                      </h3>
                      <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {formatDate(item.date)}
                        {item.accountName ? ` / ${item.accountName}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        item.type === "income"
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-neutral-950 dark:text-white",
                      )}
                    >
                      {item.type === "income" ? "+" : "-"}
                      {formatCompactCurrency(item.amountCents, item.currency)}
                    </p>
                    {hasConvertedDisplay && (
                      <p className="mt-1 text-xs text-neutral-400">
                        {formatCompactCurrency(
                          item.displayAmountCents,
                          item.displayCurrency,
                        )}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "income" | "expense";
}) {
  return (
    <div className="rounded-lg bg-neutral-100 px-3 py-3 dark:bg-white/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-sm font-semibold",
          tone === "income"
            ? "text-emerald-600 dark:text-emerald-300"
            : "text-rose-600 dark:text-rose-300",
        )}
      >
        {value}
      </p>
    </div>
  );
}
