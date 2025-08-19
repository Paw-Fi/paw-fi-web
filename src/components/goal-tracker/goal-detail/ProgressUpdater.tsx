import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faDollarSign,
  faPercent,
  faChartLine,
  faSave,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faInfoCircle
} from "@fortawesome/free-solid-svg-icons";
import type { FinancialGoal } from "@/components/goal-tracker/types/goal-types";
import { useState, useEffect, useOptimistic } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

interface ProgressUpdaterProps {
  goal: FinancialGoal;
  onUpdate: () => void;
  onOptimisticUpdate?: (updates: Partial<FinancialGoal>) => void;
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
  const [quickAmounts] = useState([100, 500, 1000, 2500, 5000, 10000]);

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

    setIsSubmitting(true);
    setError(null);

    try {
      // Calculate actual values
      const newCurrentAmount = updateType === 'amount' 
        ? currentGoal.current_amount + amountValue
        : currentGoal.target_amount * (amountValue / 100);
      
      const newProgressPercentage = Math.min((newCurrentAmount / currentGoal.target_amount) * 100, 100);
      const actualAmountChange = newCurrentAmount - currentGoal.current_amount;

      // Apply optimistic updates immediately
      const optimisticUpdates = {
        current_amount: newCurrentAmount,
        progress_percentage: newProgressPercentage,
        updated_at: new Date().toISOString(),
      };

      setOptimisticGoal(optimisticUpdates);
      if (onOptimisticUpdate) {
        onOptimisticUpdate(optimisticUpdates);
      }

      // Prepare payload for the database function
      const payload: ProgressUpdatePayload = {
        goalId: currentGoal.id,
        userId: user.id,
        updateType: updateType === 'amount' ? 'amount_added' : 'manual_adjustment',
        amountChange: actualAmountChange,
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
    <div className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Success/Error Messages */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-0 left-0 right-0 p-2 bg-green-500 text-white rounded-t-lg flex items-center justify-center gap-2 text-sm font-medium z-20"
          >
            <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4" />
            Progress Updated!
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-0 left-0 right-0 p-2 bg-red-500 text-white rounded-t-lg flex items-center justify-center gap-2 text-sm font-medium z-20"
          >
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4" />
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-white hover:text-red-200"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              Update Progress
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Add savings or set percentage
            </p>
          </div>
        </div>

        {/* Update Method Selection - Compact */}
        <div className="mb-4">
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setUpdateType('amount');
                setAmount('');
              }}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                updateType === 'amount'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FontAwesomeIcon icon={faDollarSign} className="w-3 h-3" />
              Amount
            </button>
            <button
              type="button"
              onClick={() => {
                setUpdateType('percentage');
                setAmount('');
              }}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                updateType === 'percentage'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FontAwesomeIcon icon={faPercent} className="w-3 h-3" />
              Percentage
            </button>
          </div>
        </div>

        {/* Quick Amount Buttons - Compact */}
        {updateType === 'amount' && (
          <div className="mb-4">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => handleQuickAmount(quickAmount)}
                  className="px-2 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  ${quickAmount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Section - Inline */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {updateType === 'amount' ? 'Amount' : 'Percentage'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon 
                    icon={updateType === 'amount' ? faDollarSign : faPercent} 
                    className="w-3 h-3 text-gray-400"
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
                  className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-sm font-medium text-gray-900 dark:text-white transition-colors"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add note..."
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-sm text-gray-900 dark:text-white transition-colors"
                disabled={isSubmitting}
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting || !amount || amountValue <= 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faSave} className="w-3 h-3" />
              )}
              {isSubmitting ? 'Saving' : 'Update'}
            </button>
          </div>
        </form>

        {/* Progress Preview - Compact */}
        {amount && amountValue > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-500/30"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faInfoCircle} className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-900 dark:text-blue-100">Preview</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-blue-700 dark:text-blue-300">
                  ${currentGoal.current_amount.toLocaleString()} → ${previewAmount.toLocaleString()}
                </span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {previewProgress.toFixed(1)}% (+{progressDifference.toFixed(1)}%)
                </span>
              </div>
            </div>
            
            {/* Compact Progress Bar */}
            <div className="relative h-2 bg-white dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gray-300 dark:bg-gray-600 rounded-full"
                style={{ width: `${currentProgress}%` }}
              />
              <motion.div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                initial={{ width: `${currentProgress}%` }}
                animate={{ width: `${previewProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}