import { X, UserPlus, Send, CheckCircle, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: Send,
    title: 'Share Your Code',
    description: 'Copy your unique referral link and share it with friends via email, social media, or messaging apps.',
    color: 'bg-blue-50 dark:bg-blue-950/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    icon: UserPlus,
    title: 'Friend Signs Up',
    description: 'Your friend creates their Moneko account using your referral link and accepts the invitation.',
    color: 'bg-purple-50 dark:bg-purple-950/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    icon: CheckCircle,
    title: 'Complete Registration',
    description: 'Your friend completes the checkout process to activate their account (usually within 24 hours).',
    color: 'bg-amber-50 dark:bg-amber-950/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    icon: Gift,
    title: 'Both Get Premium',
    description: 'Once completed, both you and your friend receive lifetime premium access automatically!',
    color: 'bg-green-50 dark:bg-green-950/30',
    iconColor: 'text-green-600 dark:text-green-400',
  },
];

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl pointer-events-auto max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-moneko-foreground">
                  How Referrals Work
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-moneko-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-8 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="space-y-6">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: index * 0.1,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                        className="flex gap-4"
                      >
                        {/* Step Number & Icon */}
                        <div className="flex flex-col items-center">
                          <div className={`${step.color} rounded-2xl p-3 shrink-0`}>
                            <Icon className={`w-6 h-6 ${step.iconColor}`} />
                          </div>
                          {index < steps.length - 1 && (
                            <div className="w-0.5 h-12 bg-slate-200 dark:bg-slate-700 mt-4" />
                          )}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 pt-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-moneko-muted-foreground">
                              Step {index + 1}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-moneko-foreground mb-2">
                            {step.title}
                          </h3>
                          <p className="text-moneko-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Important Notes */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: steps.length * 0.1,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  className="mt-8 p-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                >
                  <h4 className="font-semibold text-moneko-foreground mb-3">
                    Important Notes
                  </h4>
                  <ul className="space-y-2 text-sm text-moneko-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-moneko-primary mt-0.5">•</span>
                      <span>Both you and your friend must complete the registration process</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-moneko-primary mt-0.5">•</span>
                      <span>Referral codes are unique and can be shared with unlimited friends</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-moneko-primary mt-0.5">•</span>
                      <span>Premium access is activated automatically once both parties complete registration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-moneko-primary mt-0.5">•</span>
                      <span>You can track your referral progress on this page</span>
                    </li>
                  </ul>
                </motion.div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
                <button
                  onClick={onClose}
                  className="w-full px-6 py-3 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-full font-medium hover:opacity-90 transition-opacity"
                >
                  Got It!
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
