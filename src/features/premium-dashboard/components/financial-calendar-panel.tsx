import { PremiumDashboardSummary } from "../types";
import { formatCompactCurrency } from "../lib/formatters";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialCalendarPanelProps {
  trends: PremiumDashboardSummary["trends"];
  currency: string;
  startDate: string;
  endDate: string;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end && days.length < 42) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function FinancialCalendarPanel({
  trends,
  currency,
  startDate,
  endDate,
}: FinancialCalendarPanelProps) {
  const totalsByDate = new Map(trends.map((trend) => [trend.date, trend]));
  const days = buildDays(startDate, endDate);
  const maxExpense = Math.max(1, ...trends.map((trend) => trend.expenseCents));

  return (
    <section className="rounded-lg border border-neutral-200/80 bg-white/90 p-5 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Calendar
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-neutral-950 dark:text-white">
            Daily flow
          </h2>
        </div>
        <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500 text-white shadow-sm">
          <CalendarDays className="size-4" aria-hidden="true" />
        </div>
      </div>

      {days.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-neutral-200 py-10 text-center text-sm font-medium text-neutral-500 dark:border-white/10 dark:text-neutral-400">
          No calendar data for this period.
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-7 gap-2">
          {days.map((day) => {
            const key = dateKey(day);
            const totals = totalsByDate.get(key);
            const expense = totals?.expenseCents ?? 0;
            const income = totals?.incomeCents ?? 0;
            const intensity = expense > 0 ? Math.max(0.14, expense / maxExpense) : 0;

            return (
              <div
                key={key}
                className={cn(
                  "min-h-20 rounded-lg border p-2 transition-colors",
                  totals
                    ? "border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/[0.04]"
                    : "border-neutral-100 bg-white/50 dark:border-white/5 dark:bg-white/[0.02]",
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    {day.getUTCDate()}
                  </span>
                  {expense > 0 && (
                    <span
                      className="size-2 rounded-full bg-rose-500"
                      style={{ opacity: intensity }}
                    />
                  )}
                </div>
                {totals && (
                  <div className="mt-2 space-y-1">
                    {income > 0 && (
                      <p className="truncate text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                        +{formatCompactCurrency(income, currency)}
                      </p>
                    )}
                    {expense > 0 && (
                      <p className="truncate text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">
                        -{formatCompactCurrency(expense, currency)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
