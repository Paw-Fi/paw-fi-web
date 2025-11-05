import { Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AppleLogo from '@/assets/images/shared/apple-logo.png';

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
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
            <h3 className="text-2xl font-medium text-foreground mb-2">Your Referral Code</h3>
            {trialActive && (
              <p className="text-sm text-muted-foreground mb-4">
                Temporary access {trialEndLabel ? `ends ${trialEndLabel}` : 'is active'} · Lifetime upgrades automatically when a friend accepts.
              </p>
            )}
            <div className="bg-subtle-background rounded-2xl p-6 mb-4">
              <p className="text-4xl font-mono font-semibold text-foreground mb-3">{code}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/referral?code=${code}`);
                  toast.success('Referral link copied to clipboard!');
                }}
                className="rounded-full"
              >
                <Copy className="w-4 h-4" />
                Copy Referral Link
              </Button>
            </div>
            <div className="space-y-2">          
              {trialActive && (
                <div className="flex items-center justify-center">
                  <a
                    href="https://testflight.apple.com/join/Q9rNbkN5"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black px-6 py-4 md:px-8 md:py-5 text-base md:text-lg font-semibold shadow-sm hover:opacity-90 transition"
                  >
                    <img src={AppleLogo} alt="Apple" className="h-5" />
                    Download on TestFlight
                  </a>
                </div>
              )}
              {!trialActive && trialEligible && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    While you wait,
                    <a
                      href="#"
                      onClick={onStartTrial}
                      className="text-primary underline underline-offset-4 hover:opacity-90 mx-1"
                    >
                      claim a 1‑month free trial
                    </a>
                    to get temporary access to explore our app (no card required; you won’t be charged)
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
    </motion.div>
  );
}
