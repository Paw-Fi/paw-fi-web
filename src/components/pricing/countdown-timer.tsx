import { useEffect, useState } from "react";
import { Flame, Sparkles, Timer } from "lucide-react";

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  monthName: string;
  isExpired: boolean;
}

export function getEndOfMonthTimeLeft(): TimeLeft {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // 0th day of next month gives the last day of the current month
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const diff = Math.max(0, endOfMonth.getTime() - now.getTime());

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const monthName = now.toLocaleString("en-US", { month: "long" });

  return {
    days,
    hours,
    minutes,
    seconds,
    monthName,
    isExpired: diff <= 0,
  };
}

export function useEndOfMonthCountdown(): TimeLeft {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getEndOfMonthTimeLeft);

  useEffect(() => {
    setTimeLeft(getEndOfMonthTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(getEndOfMonthTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return timeLeft;
}

export function LifetimeCountdownCard({
  className = "",
}: {
  className?: string;
}) {
  const timeLeft = useEndOfMonthCountdown();

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-orange-500/25 bg-orange-500/5 p-3.5 backdrop-blur-sm dark:border-orange-500/30 dark:bg-orange-500/10 ${className}`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400">
          <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500 animate-pulse" />
          <span>{timeLeft.monthName} Limited Offer</span>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground dark:text-white/60">
          Ends this month
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className="rounded-xl border border-border/50 bg-background/90 px-1 py-1.5 shadow-xs dark:border-white/10 dark:bg-[#1A1A1A]">
          <span className="block font-mono text-base font-bold text-foreground dark:text-white">
            {String(timeLeft.days).padStart(2, "0")}
          </span>
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-white/50">
            Days
          </span>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/90 px-1 py-1.5 shadow-xs dark:border-white/10 dark:bg-[#1A1A1A]">
          <span className="block font-mono text-base font-bold text-foreground dark:text-white">
            {String(timeLeft.hours).padStart(2, "0")}
          </span>
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-white/50">
            Hours
          </span>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/90 px-1 py-1.5 shadow-xs dark:border-white/10 dark:bg-[#1A1A1A]">
          <span className="block font-mono text-base font-bold text-foreground dark:text-white">
            {String(timeLeft.minutes).padStart(2, "0")}
          </span>
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-white/50">
            Mins
          </span>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/90 px-1 py-1.5 shadow-xs dark:border-white/10 dark:bg-[#1A1A1A]">
          <span className="block font-mono text-base font-bold text-orange-600 dark:text-orange-400">
            {String(timeLeft.seconds).padStart(2, "0")}
          </span>
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-white/50">
            Secs
          </span>
        </div>
      </div>
    </div>
  );
}

export function PricingPromoBanner() {
  const timeLeft = useEndOfMonthCountdown();

  return (
    <div className="relative mx-auto mb-8 max-w-2xl overflow-hidden rounded-full border border-orange-500/25 bg-orange-500/5 px-4 py-2 shadow-sm backdrop-blur-md dark:border-orange-500/30 dark:bg-orange-500/10">
      <div className="flex flex-wrap items-center justify-center gap-2 text-center text-xs font-semibold sm:text-sm">
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
          30% OFF
        </span>
        <span className="text-foreground font-medium">
          Limited-time {timeLeft.monthName} offer: Lifetime Plan is 30% off!
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
          <Timer className="h-3.5 w-3.5" />
          {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s left
        </span>
      </div>
    </div>
  );
}
