import { Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

export function ReferrerCodeCard({ code, acceptanceCount, completedCount, trialEnd, isTrialing, trialEligible, trialJustStarted, onStartTrial }: ReferrerCodeCardProps) {
  const computedFallbackEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const trialActive = Boolean(trialJustStarted || isTrialing || (trialEnd && new Date(trialEnd).getTime() > Date.now()));
  const trialEndLabel = (trialEnd
    ? new Date(trialEnd)
    : trialJustStarted
      ? computedFallbackEnd
      : null
  )?.toLocaleDateString() ?? null;
  return (
    <div>
      <Card className="rounded-3xl border-subtle-border">
        <CardContent className="p-8">
          {trialActive && (
            <div className="mb-6 rounded-2xl bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 px-4 py-3 text-sm text-green-800 dark:text-green-200">
              <p className="font-medium">1‑month temporary access {trialEndLabel ? `ends ${trialEndLabel}` : ''}.</p>
              <p className="mt-1 opacity-90">
                We’ll automatically upgrade you to lifetime when a friend accepts your invite and completes checkout.
              </p>
            </div>
          )}        
          <div className="text-center mb-6">
            <h3 className="text-2xl font-medium text-foreground mb-2">Your Referral Link</h3>
            {trialActive && (
              <p className="text-sm text-muted-foreground mb-4">
                Temporary access {trialEndLabel ? `ends ${trialEndLabel}` : 'is active'} · Lifetime upgrades automatically when a friend accepts.
              </p>
            )}
            <div className="bg-subtle-background rounded-2xl p-6 mb-4">
              <div className="relative mb-3">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/referral/${code}`}
                  className="w-full px-4 line-clamp-1 overflow-ellipsis py-3 lg:pr-12 text-sm md:text-base font-mono text-foreground bg-card border border-subtle-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-default overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'thin',
                  }}
                />
                 <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/referral/${code}`);
                  toast.success('Referral link copied to clipboard!');
                }}
                className="hidden lg:flex rounded-full absolute right-4 top-1/2 -translate-y-1/2 font-bold text-sm"
              >
                <Copy className="w-4 h-4 font-bold" />
                Copy Referral Link
              </Button>
              </div>
                  <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/referral/${code}`);
                  toast.success('Referral link copied to clipboard!');
                }}
                className="flex lg:hidden rounded-full mx-auto font-bold"
              >
                <Copy className="w-4 h-4 font-bold" />
                Copy Referral Link
              </Button>
             
            </div>
            <div className="space-y-3">             

              {/* Trial CTA - Only show if not trialing and eligible */}
              {!trialActive && trialEligible && (
                <div className="text-center">
                  <p className="text-lg text-muted-foreground">
                   Spread the word! Share your referral link — every friend who joins helps you earn lifetime access
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-subtle-border">
            <div className="text-center">
              <p className="text-3xl font-light text-foreground mb-1">{acceptanceCount}</p>
              <p className="text-sm text-muted-foreground">Accepted</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-light text-foreground mb-1">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
