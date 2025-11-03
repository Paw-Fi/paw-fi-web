import { Users } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReferralUser } from '@/types/referral.types';

interface ReferralAcceptanceListProps {
  acceptances: ReferralUser[];
}

export function ReferralAcceptanceList({ acceptances }: ReferralAcceptanceListProps) {
  if (!acceptances || acceptances.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
    >
      <h3 className="text-xl font-semibold text-moneko-foreground mb-4">Friends Who Joined</h3>
      <div className="space-y-3">
        {acceptances.map((acceptance) => (
          <div
            key={acceptance.userId}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="bg-slate-200 dark:bg-slate-600 rounded-full w-10 h-10 flex items-center justify-center">
                <Users className="w-5 h-5 text-moneko-foreground" />
              </div>
              <div>
                <p className="font-medium text-moneko-foreground">
                  {acceptance.fullName || acceptance.email || 'User'}
                </p>
                <p className="text-sm text-moneko-muted-foreground">
                  {new Date(acceptance.acceptedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                acceptance.status === 'completed'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
              }`}
            >
              {acceptance.status === 'completed' ? 'Completed' : 'Pending'}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
