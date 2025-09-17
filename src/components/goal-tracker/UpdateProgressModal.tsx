import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { Modal } from "@/components/ui/modal";
import { ActivityActions } from "@/utils/reward-actions-clone";

// Enhanced Update Progress Modal
export function UpdateProgressModal({ isOpen, onClose, goal, onProgressUpdate }: {
  isOpen: boolean;
  onClose: () => void;
  goal: any;
  onProgressUpdate: (data: any) => void;
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
      
      // Call the progress update function - it handles optimistic updates internally
      await onProgressUpdate({
        goalId: goal.id,
        updateType: ActivityActions.GOAL_PROGRESS_UPDATED,
        amountChange: amountValue,
        userNote: note || undefined
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
            <label className="block text-sm font-medium text-muted-foreground mb-4">
              Amount to Add
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl text-muted-foreground">
                $
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-4 text-xl bg-muted/50 border-0 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:bg-card text-foreground transition-all duration-200"
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
            <label className="block text-sm font-medium text-muted-foreground mb-4">
              Quick Add
            </label>
            <div className="grid grid-cols-2 gap-3">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => handleQuickAmount(quickAmount)}
                  className="p-4 bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-2xl font-medium transition-all duration-200 hover:scale-105"
                  disabled={isSubmitting}
                >
                  ${quickAmount}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 bg-muted/50 border-0 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:bg-card text-foreground resize-none transition-all duration-200"
              rows={3}
              placeholder="Add a note about this progress update..."
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-muted-foreground hover:text-foreground font-medium transition-all duration-200 hover:scale-105"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
              className="px-8 py-3 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground rounded-full font-medium flex items-center gap-2 transition-all duration-200 disabled:cursor-not-allowed hover:scale-105 shadow-sm hover:shadow-md"
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
