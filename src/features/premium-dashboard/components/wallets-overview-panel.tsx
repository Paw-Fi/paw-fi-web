import { PremiumDashboardSummary } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "../lib/formatters";
import { cn } from "@/lib/utils";
import { WalletCards } from "lucide-react";

interface WalletsOverviewPanelProps {
  wallets: PremiumDashboardSummary["wallets"];
}

export function WalletsOverviewPanel({ wallets }: WalletsOverviewPanelProps) {
  const visibleWallets = wallets.wallets.slice(0, 6);

  return (
    <Card className="rounded-lg border border-neutral-200/80 bg-white/90 py-0 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 px-5 pb-0 pt-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Wallets
          </p>
          <CardTitle className="mt-2 text-lg font-semibold tracking-tight text-neutral-950 dark:text-white">
            Net worth
          </CardTitle>
        </div>
        <div className="flex size-9 items-center justify-center rounded-lg bg-neutral-950 text-white shadow-sm dark:bg-white dark:text-neutral-950">
          <WalletCards className="size-4" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-5">
        <div className="rounded-lg bg-neutral-950 p-5 text-white dark:bg-white dark:text-neutral-950">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55 dark:text-neutral-500">
            Total balance
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {formatCompactCurrency(wallets.netWorthCents, wallets.displayCurrency)}
          </p>
        </div>

        {visibleWallets.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-neutral-200 py-10 text-center text-sm font-medium text-neutral-500 dark:border-white/10 dark:text-neutral-400">
            No wallets found for this scope.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {visibleWallets.map((wallet) => {
              const hasConvertedDisplay =
                wallet.currency !== wallets.displayCurrency;

              return (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200/70 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-neutral-950 dark:text-white">
                        {wallet.name}
                      </h3>
                      {wallet.isDefault && (
                        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500 shadow-sm dark:bg-white/10 dark:text-neutral-300">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {wallet.currency}
                      {wallet.isSystem ? " system wallet" : " wallet"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        wallet.balanceCents < 0
                          ? "text-rose-600 dark:text-rose-300"
                          : "text-neutral-950 dark:text-white",
                      )}
                    >
                      {formatCompactCurrency(wallet.balanceCents, wallet.currency)}
                    </p>
                    {hasConvertedDisplay && (
                      <p className="mt-1 text-xs text-neutral-400">
                        {formatCompactCurrency(
                          wallet.displayBalanceCents,
                          wallets.displayCurrency,
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
