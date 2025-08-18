import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function EditGoalModal({ 
  isOpen, 
  onClose, 
  goal,
  onGoalUpdate,
  onOptimisticUpdate
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  goal: any;
  onGoalUpdate: any;
  onOptimisticUpdate: any;
}) {
  const [formData, setFormData] = useState({
    title: goal?.title || '',
    description: goal?.description || '',
    target_amount: goal?.target_amount || 0,
    target_date: goal?.target_date ? new Date(goal.target_date).toISOString().split('T')[0] : ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form data when goal changes
  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title || '',
        description: goal.description || '',
        target_amount: goal.target_amount || 0,
        target_date: goal.target_date ? new Date(goal.target_date).toISOString().split('T')[0] : ''
      });
    }
  }, [goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Optimistic update
      const optimisticUpdates = {
        ...formData,
        target_amount: Number(formData.target_amount),
        updated_at: new Date().toISOString()
      };
      
      onOptimisticUpdate(optimisticUpdates);

      // API call
      await onGoalUpdate({
        title: formData.title,
        description: formData.description,
        target_amount: Number(formData.target_amount),
        target_date: formData.target_date
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal');
      // Revert optimistic update by refetching
      window.location.reload();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Goal"
      size="medium"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Goal Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white"
            placeholder="Enter goal title"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white resize-none"
            rows={3}
            placeholder="Describe your goal"
          />
        </div>

        {/* Target Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
              $
            </span>
            <input
              type="number"
              value={formData.target_amount}
              onChange={(e) => handleInputChange('target_amount', parseFloat(e.target.value) || 0)}
              className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white"
              placeholder="0"
              min="0"
              step="0.01"
              required
            />
          </div>
        </div>

        {/* Target Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Date
          </label>
          <input
            type="date"
            value={formData.target_date}
            onChange={(e) => handleInputChange('target_date', e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white"
            required
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faClock} className="w-4 h-4 animate-spin" />
                Updating...
              </div>
            ) : (
              'Update Goal'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
