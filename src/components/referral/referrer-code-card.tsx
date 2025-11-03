import { Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

interface ReferrerCodeCardProps {
  code: string;
  acceptanceCount: number;
  completedCount: number;
}

export function ReferrerCodeCard({
  code,
  acceptanceCount,
  completedCount,
}: ReferrerCodeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
    >
      <div className="text-center mb-6">
        <h3 className="text-2xl font-semibold text-moneko-foreground mb-4">
          Your Referral Code
        </h3>
        <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-6 mb-4">
          <p className="text-4xl font-mono font-bold text-moneko-foreground mb-2">{code}</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/referral?code=${code}`);
              toast.success('Referral link copied to clipboard!');
            }}
            className="inline-flex items-center gap-2 text-sm text-moneko-muted-foreground hover:text-moneko-foreground transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy Referral Link
          </button>
        </div>
        <p className="text-moneko-muted-foreground">
          Share this code with friends. When they join, you both get lifetime premium access!
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <p className="text-3xl font-bold text-moneko-foreground mb-1">{acceptanceCount}</p>
          <p className="text-sm text-moneko-muted-foreground">Total Invitations</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-moneko-foreground mb-1">{completedCount}</p>
          <p className="text-sm text-moneko-muted-foreground">Completed</p>
        </div>
      </div>
    </motion.div>
  );
}
