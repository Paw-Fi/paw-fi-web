import { Copy } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ReferrerCodeCardProps {
  code: string;
  acceptanceCount: number;
  completedCount: number;
  trialEnd?: string | null;
  isTrialing?: boolean;
  trialEligible?: boolean;
  trialJustStarted?: boolean;
  onStartTrial: (e?: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function ReferrerCodeCard({
  code,
  acceptanceCount,
  completedCount,
  trialEnd,
  isTrialing,
  trialEligible,
  trialJustStarted,
  onStartTrial,
}: ReferrerCodeCardProps) {
  const computedFallbackEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const trialActive = Boolean(
    trialJustStarted ||
      isTrialing ||
      (trialEnd && new Date(trialEnd).getTime() > Date.now()),
  );
  const trialEndLabel =
    (trialEnd
      ? new Date(trialEnd)
      : trialJustStarted
        ? computedFallbackEnd
        : null
    )?.toLocaleDateString() ?? null;
  return (
    <div>
      <Card className="border-subtle-border rounded-3xl">
        <CardContent className="p-8">
          {trialActive && (
            <div className="mb-6 rounded-2xl border border-green-200 bg-green-50/80 px-4 py-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200">
              <p className="font-medium">
                1‑month temporary access{" "}
                {trialEndLabel ? `ends ${trialEndLabel}` : ""}.
              </p>
              <p className="mt-1 opacity-90">
                Keep sharing your referral link while temporary access is active
                so more friends can claim the discounted lifetime offer.
              </p>
            </div>
          )}
          <div className="mb-6 text-center">
            <h3 className="text-foreground mb-2 text-2xl font-medium">
              Your Referral Link
            </h3>
            {trialActive && (
              <p className="text-muted-foreground mb-4 text-sm">
                Temporary access{" "}
                {trialEndLabel ? `ends ${trialEndLabel}` : "is active"} · share
                your referral link to help friends claim 50% off lifetime.
              </p>
            )}
            <div className="bg-subtle-background mb-4 rounded-2xl p-6">
              <div className="relative mb-3">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/referral/${code}`}
                  className="text-foreground bg-card border-subtle-border focus:ring-primary/20 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent line-clamp-1 w-full cursor-default overflow-x-auto rounded-xl border px-4 py-3 font-mono text-sm overflow-ellipsis focus:ring-2 focus:outline-none md:text-base lg:pr-12"
                  style={{
                    WebkitOverflowScrolling: "touch",
                    scrollbarWidth: "thin",
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/referral/${code}`,
                    );
                    toast.success("Referral link copied to clipboard!");
                  }}
                  className="absolute top-1/2 right-4 hidden -translate-y-1/2 rounded-full text-sm font-bold lg:flex"
                >
                  <Copy className="h-4 w-4 font-bold" />
                  Copy Referral Link
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/referral/${code}`,
                  );
                  toast.success("Referral link copied to clipboard!");
                }}
                className="mx-auto flex rounded-full font-bold lg:hidden"
              >
                <Copy className="h-4 w-4 font-bold" />
                Copy Referral Link
              </Button>
            </div>
            <div className="space-y-3">
              {/* Trial CTA - Only show if not trialing and eligible */}
              {!trialActive && trialEligible && (
                <div className="text-center">
                  <p className="text-muted-foreground text-lg">
                    Spread the word. Friends who join with your link get 50% off
                    the lifetime plan automatically applied at checkout.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-subtle-border grid grid-cols-2 gap-4 border-t pt-6">
            <div className="text-center">
              <p className="text-foreground mb-1 text-3xl font-light">
                {acceptanceCount}
              </p>
              <p className="text-muted-foreground text-sm">Accepted</p>
            </div>
            <div className="text-center">
              <p className="text-foreground mb-1 text-3xl font-light">
                {completedCount}
              </p>
              <p className="text-muted-foreground text-sm">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
