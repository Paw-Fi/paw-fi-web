import { Link } from '@tanstack/react-router';
import { UserPlus, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface InviteeRegisterCardProps {
  code?: string;
}

export function InviteeRegisterCard({ code }: InviteeRegisterCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
    >
      <div className="flex items-start gap-4">
        <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl p-3 shrink-0">
          <UserPlus className="w-6 h-6 text-moneko-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-moneko-foreground mb-2">
            Step 1: Create Your Account
          </h3>
          <p className="text-moneko-muted-foreground mb-4">
            Register to accept this invitation and unlock lifetime premium access
          </p>
          <Link
            to="/register"
            search={code ? ({ code } as any) : undefined}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            Create Account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
