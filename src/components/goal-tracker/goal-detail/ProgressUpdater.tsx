import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faDollarSign,
  faPlus,
  faMinus,
  faArrowUp,
  faArrowDown,
  faPercent,
  faCalendarAlt,
  faChartLine,
  faSave,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faInfoCircle
} from "@fortawesome/free-solid-svg-icons";
import type { FinancialGoal } from "@/components/goal-tracker/types";
import { useState, useEffect, useOptimistic } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

interface ProgressUpdaterProps {
  goal: FinancialGoal;
  onUpdate: () => void; // Callback to notify parent of an update
  onOptimisticUpdate?: (updates: Partial<FinancialGoal>) => void; // Optimistic updates
}

interface ProgressUpdatePayload {
  goalId: string;
  userId: string;
  updateType: 'amount_added' | 'manual_adjustment';
  amountChange: number;
  userNote?: string;
}

export function ProgressUpdater({ goal, onUpdate, onOptimisticUpdate }: ProgressUpdaterProps) {
  const { user } = useAuth();
  const [updateType, setUpdateType] = useState<'amount' | 'percentage'>('amount');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickAmounts] = useState([100, 250, 500, 1000, 2500, 5000]);

  // Optimistic state for goal updates
  const [optimisticGoal, setOptimisticGoal] = useOptimistic(
    goal,
    (state, newGoal: Partial<FinancialGoal>) => ({ ...state, ...newGoal })
  );

  // Use optimistic data or fallback to real data
  const currentGoal = optimisticGoal || goal;

  // Calculated values
  const remainingAmount = currentGoal.target_amount - currentGoal.current_amount;
  const currentProgress = currentGoal.progress_percentage || 0;
  const amountValue = parseFloat(amount) || 0;
  
  // Preview calculations
  const previewAmount = updateType === 'amount' 
    ? currentGoal.current_amount + amountValue
    : currentGoal.target_amount * (amountValue / 100);
  
  const previewProgress = updateType === 'amount'
    ? Math.min((previewAmount / currentGoal.target_amount) * 100, 100)
    : Math.min(amountValue, 100);

  const progressDifference = previewProgress - currentProgress;

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
    setUpdateType('amount');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }
    
    if (!amount || amountValue <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (updateType === 'percentage' && amountValue > 100) {
      setError('Percentage cannot exceed 100%');
      return;
    }

    if (updateType === 'amount' && previewAmount > currentGoal.target_amount) {
      setError('Amount would exceed target goal');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Calculate the amount change for different update types
      let amountChange: number;
      
      // Calculate optimistic updates first
      let newCurrentAmount: number;
      let newProgressPercentage: number;
      
      if (updateType === 'amount') {
        amountChange = amountValue;
        newCurrentAmount = currentGoal.current_amount + amountValue;
        newProgressPercentage = Math.min((newCurrentAmount / currentGoal.target_amount) * 100, 100);
      } else {
        // For percentage mode, calculate the target amount based on percentage
        const targetAmount = currentGoal.target_amount * (amountValue / 100);
        amountChange = targetAmount - currentGoal.current_amount;
        newCurrentAmount = targetAmount;
        newProgressPercentage = Math.min(amountValue, 100);
      }
      
      // Apply optimistic updates immediately
      const optimisticUpdates = {
        current_amount: newCurrentAmount,
        progress_percentage: newProgressPercentage
      };
      
      setOptimisticGoal(optimisticUpdates);
      
      // Also notify parent component for immediate UI updates
      if (onOptimisticUpdate) {
        onOptimisticUpdate(optimisticUpdates);
      }

      const payload: ProgressUpdatePayload = {
        goalId: currentGoal.id,
        userId: user.id,
        updateType: 'amount_added',
        amountChange: amountChange, // Pass with correct sign
        userNote: note.trim() || undefined,
      };

      const { error: functionError } = await supabase.functions.invoke(
        'goal-progress-tracker',
        { body: payload },
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      // Notify parent component to refetch data
      onUpdate();
      
      // Reset form and show success
      setAmount('');
      setNote('');
      setShowSuccess(true);
    } catch (err) {
      // Revert optimistic updates on error
      setOptimisticGoal({});
      if (onOptimisticUpdate) {
        // Revert parent optimistic state by triggering a refetch
        onUpdate();
      }
      setError(err instanceof Error ? err.message : 'Failed to update progress');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = amount && amountValue > 0 && 
    (updateType === 'percentage' ? amountValue <= 100 : previewAmount <= currentGoal.target_amount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-hidden"
    >
      <div className="relative bg-gradient-to-br from-white via-white to-blue-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-blue-900/20 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-xl shadow-black/5 dark:shadow-black/20">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.05),transparent_60%)] dark:bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.1),transparent_60%)]" />
        
        {/* Success Overlay */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-400/20 backdrop-blur-sm rounded-2xl z-10 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                className="flex items-center gap-3 px-6 py-3 bg-emerald-500 text-white rounded-full shadow-lg"
              >
                <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5" />
                <span className="font-semibold">Progress Updated Successfully!</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/10 dark:from-blue-400/30 dark:to-blue-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-blue-500/20 dark:border-blue-400/30"
            >
              <FontAwesomeIcon
                icon={faChartLine}
                className="w-7 h-7 text-blue-600 dark:text-blue-400"
              />
            </motion.div>
            
            <div>
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-gray-900 dark:text-white mb-1"
              >
                Update Progress
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-gray-600 dark:text-gray-400"
              >
                Track your financial goal progress and milestones
              </motion.p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Update Type Selector */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Update Method
              </label>
              <div className="flex gap-3">
                <motion.button
                  type="button"
                  onClick={() => setUpdateType('amount')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    updateType === 'amount'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                  }`}
                >
                  <FontAwesomeIcon icon={faDollarSign} className="w-5 h-5" />
                  <span className="font-medium">By Amount</span>
                </motion.button>
                
                <motion.button
                  type="button"
                  onClick={() => setUpdateType('percentage')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    updateType === 'percentage'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                  }`}
                >
                  <FontAwesomeIcon icon={faPercent} className="w-5 h-5" />
                  <span className="font-medium">By Percentage</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Quick Amount Buttons (only for amount mode) */}
            <AnimatePresence>
              {updateType === 'amount' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    Quick Add
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {quickAmounts.map((quickAmount) => (
                      <motion.button
                        key={quickAmount}
                        type="button"
                        onClick={() => handleQuickAmount(quickAmount)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        ${quickAmount.toLocaleString()}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Amount/Percentage Input */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                {updateType === 'amount' ? 'Amount to Add' : 'Target Percentage'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FontAwesomeIcon 
                    icon={updateType === 'amount' ? faDollarSign : faPercent} 
                    className="w-5 h-5 text-gray-400" 
                  />
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={updateType === 'amount' ? '0.00' : '0'}
                  min="0"
                  max={updateType === 'percentage' ? '100' : undefined}
                  step={updateType === 'amount' ? '0.01' : '0.1'}
                  className="w-full pl-12 pr-4 py-4 text-lg font-semibold bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </motion.div>

            {/* Progress Preview */}
            <AnimatePresence>
              {amount && amountValue > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 bg-gradient-to-r from-gray-50 to-blue-50/50 dark:from-gray-700/50 dark:to-blue-900/20 rounded-xl border border-gray-200/50 dark:border-gray-600/50"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">Preview Changes</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Amount</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        ${currentGoal.current_amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        {currentProgress.toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                      >
                        <FontAwesomeIcon icon={progressDifference >= 0 ? faArrowUp : faArrowDown} className="w-3 h-3" />
                        {Math.abs(progressDifference).toFixed(1)}%
                      </motion.div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">New Amount</div>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        ${previewAmount.toLocaleString()}
                      </div>
                      <div className="text-sm text-emerald-600 dark:text-emerald-400">
                        {previewProgress.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Note Input */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Note (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about this progress update..."
                rows={3}
                className="w-full p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all resize-none"
              />
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-400"
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5" />
                  <span className="font-medium">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={!isValid || isSubmitting}
              whileHover={isValid ? { scale: 1.02 } : {}}
              whileTap={isValid ? { scale: 0.98 } : {}}
              className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl font-semibold transition-all ${
                isValid && !isSubmitting
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <FontAwesomeIcon icon={faSpinner} className="w-5 h-5" />
                </motion.div>
              ) : (
                <FontAwesomeIcon icon={faSave} className="w-5 h-5" />
              )}
              <span>
                {isSubmitting ? 'Updating Progress...' : 'Update Progress'}
              </span>
            </motion.button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}