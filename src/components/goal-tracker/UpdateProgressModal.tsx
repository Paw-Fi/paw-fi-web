import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { Modal } from "@/components/ui/modal";

// Enhanced Update Progress Modal
export function UpdateProgressModal({ isOpen, onClose, goal, onProgressUpdate, onOptimisticUpdate }: {
  isOpen: boolean;
  onClose: () => void;
  goal: any;
  onProgressUpdate: (data: any) => void;
  onOptimisticUpdate: (data: any) => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickAmounts = [100, 250, 500, 1000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const amountValue = parseFloat(amount);
      
      // Optimistic update
      const newAmount = goal.current_amount + amountValue;
      const newProgressPercentage = (newAmount / goal.target_amount) * 100;
      
      onOptimisticUpdate({
        current_amount: newAmount,
        progress_percentage: Math.min(100, newProgressPercentage),
        updated_at: new Date().toISOString()
      });

      await onProgressUpdate({
        goalId: goal.id,
        amountChange: amountValue,
        note: note || undefined
      });

      // Reset form and close modal
      setAmount('');
      setNote('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update progress');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Progress">
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Amount to Add
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl text-gray-500 dark:text-gray-400">
                $
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-4 text-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Quick Add
            </label>
            <div className="grid grid-cols-2 gap-3">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => handleQuickAmount(quickAmount)}
                  className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg font-medium transition-colors"
                  disabled={isSubmitting}
                >
                  ${quickAmount}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white resize-none"
              rows={3}
              placeholder="Add a note about this progress update..."
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-semibold flex items-center gap-2 transition-all duration-200 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <FontAwesomeIcon icon={faClock} className="w-4 h-4 animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faArrowUp} className="w-4 h-4" />
              )}
              {isSubmitting ? 'Updating...' : 'Update Progress'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
