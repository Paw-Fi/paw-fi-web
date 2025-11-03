import { Gift } from 'lucide-react';
import { motion } from 'framer-motion';

interface AcceptInvitationCardProps {
  code: string;
  referrerEmail: string;
  onAccept: () => void;
  isLoading: boolean;
}

export function AcceptInvitationCard({
  code,
  referrerEmail,
  onAccept,
  isLoading,
}: AcceptInvitationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
    >
      <div className="text-center mb-6">
        <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl p-3 w-fit mx-auto mb-4">
          <Gift className="w-8 h-8 text-moneko-foreground" />
        </div>
        <h3 className="text-2xl font-semibold text-moneko-foreground mb-2">
          You're Invited!
        </h3>
        <p className="text-moneko-muted-foreground mb-4">
          {referrerEmail} invited you to join Moneko Premium
        </p>
        <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-4 mb-6 inline-block">
          <p className="text-sm text-moneko-muted-foreground mb-1">Referral Code</p>
          <p className="text-2xl font-mono font-bold text-moneko-foreground">{code}</p>
        </div>
      </div>

      <button
        onClick={onAccept}
        disabled={isLoading}
        className="w-full px-6 py-3 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : 'Accept Invitation & Get Lifetime Access'}
      </button>
    </motion.div>
  );
}
