import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { FinancialGoal, UpdateGoalRequest } from '@/components/goal-tracker/types/goal-types';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/contexts/auth-context';
import { useGoal } from '@/hooks/goal-tracker/use-goal';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { format, parseISO, addMonths } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { goalQueryKeys } from '@/hooks/goal-tracker/use-goals';

interface AdjustTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: FinancialGoal | undefined;
  onOptimisticUpdate?: (updates: Partial<FinancialGoal>) => void;
}

export function AdjustTimelineModal({ isOpen, onClose, goal, onOptimisticUpdate }: AdjustTimelineModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [targetDate, setTargetDate] = useState('');
  const [showMinDateAlert, setShowMinDateAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate required monthly amount for selected date (safe calculation)
  const calculateRequiredMonthlyAmount = () => {
    if (!goal?.target_amount || !targetDate) {
      return 0;
    }
    
    const remainingAmount = goal.target_amount - (goal.current_amount || 0);
    if (remainingAmount <= 0) {
      return 0;
    }
    
    const now = new Date();
    const selectedDate = new Date(targetDate);
    const timeDiffMs = selectedDate.getTime() - now.getTime();
    
    if (timeDiffMs <= 0) {
      return remainingAmount; // If date is in the past/today, show full amount
    }
    
    const monthsUntilTarget = Math.max(1, Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24 * 30.44)));
    return Math.ceil(remainingAmount / monthsUntilTarget);
  };

  // Calculate minimum required date to achieve goal with current capacity
  const calculateMinimumDate = () => {
    if (!goal?.target_amount || !goal?.ai_questionnaire_data?.monthly_savings_capacity) {
      return new Date();
    }
    
    const remainingAmount = goal.target_amount - (goal.current_amount || 0);
    const monthlyCapacity = parseInt(goal.ai_questionnaire_data.monthly_savings_capacity);
    
    if (monthlyCapacity <= 0 || remainingAmount <= 0) {
      return new Date();
    }
    
    const monthsRequired = Math.ceil(remainingAmount / monthlyCapacity);
    return addMonths(new Date(), monthsRequired);
  };

  const minimumDate = calculateMinimumDate();

  useEffect(() => {
    if (goal?.target_date) {
      try {
        const parsedDate = parseISO(goal.target_date);
        setTargetDate(format(parsedDate, 'yyyy-MM-dd'));
      } catch (error) {
        console.error('Invalid date format for goal target_date:', goal.target_date);
        setTargetDate('');
      }
    }
  }, [goal]);

  // Check if selected date is before minimum required date
  useEffect(() => {
    if (targetDate) {
      const selectedDate = new Date(targetDate);
      setShowMinDateAlert(selectedDate < minimumDate);
    } else {
      setShowMinDateAlert(false);
    }
  }, [targetDate, minimumDate]);

  const handleSubmit = async () => {
    if (!targetDate) {
      toast.error('Please select a target date.');
      return;
    }

    if (!goal || !user?.id) {
      toast.error('Goal data is not available.');
      return;
    }

    const updates: UpdateGoalRequest = { target_date: targetDate };

    // Apply optimistic update immediately
    if (onOptimisticUpdate) {
      onOptimisticUpdate(updates);
    }

    setIsLoading(true);

    try {
      // Determine the action type based on date comparison
      const originalDate = new Date(goal.target_date);
      const newDate = new Date(targetDate);
      const daysDifference = Math.ceil((newDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const action = daysDifference > 0 ? 'extend_timeline' : 'update_timeline';
      
      // Call the goal-timeline-manager function
      const { data, error } = await supabase.functions.invoke('goal-timeline-manager', {
        body: {
          action,
          goalId: goal.id,
          userId: user.id,
          payload: {
            target_date: targetDate,
            original_target_date: goal.target_date,
            reason: showMinDateAlert ? 'User adjusted aggressive timeline' : undefined,
            auto_generated: false,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update timeline');
      }

      toast.success('Goal timeline updated successfully!');
      onClose();
      
      // Invalidate and refetch related queries
      if (goal?.id && user?.id) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: goalQueryKeys.detail(goal.id) }),
          queryClient.invalidateQueries({ queryKey: goalQueryKeys.lists() }),
          queryClient.invalidateQueries({ queryKey: goalQueryKeys.metrics(user.id) }),
          queryClient.invalidateQueries({ queryKey: ['user-activities', user.id] }),
        ]);
      }
    } catch (error) {
      // Revert optimistic update on error
      if (onOptimisticUpdate && goal) {
        onOptimisticUpdate({ target_date: goal.target_date });
      }
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to update timeline: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Goal Timeline">
      <div className="p-6">
        <p className="text-muted-foreground mb-6">
          Current Target Date: {goal?.target_date ? format(parseISO(goal.target_date), 'MMMM dd, yyyy') : 'Not set'}
        </p>
        
        {/* Minimum date info */}
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
          <p className="text-sm text-foreground font-medium">
            <strong>Minimum required date:</strong> {format(minimumDate, 'MMMM dd, yyyy')}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Based on your current monthly savings capacity of ${goal?.ai_questionnaire_data?.monthly_savings_capacity || 0}/month
          </p>
        </div>

        <div className="mb-6">
          <label htmlFor="targetDate" className="block text-sm font-medium text-foreground mb-3">
            New Target Date
          </label>
          
          {/* Alert message for dates before minimum */}
          {showMinDateAlert && (
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <div className="flex items-start gap-3">
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Timeline too aggressive
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This date requires ${calculateRequiredMonthlyAmount().toLocaleString()}/month, 
                    but your capacity is ${goal?.ai_questionnaire_data?.monthly_savings_capacity || 0}/month.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <input
            type="date"
            id="targetDate"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full px-4 py-3 border rounded-2xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            min={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="px-6 py-3 rounded-full">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="px-6 py-3 rounded-full hover:scale-105 transition-all duration-200">
            {isLoading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
