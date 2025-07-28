import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

interface MilestoneCheckResult {
  newAchievements: Array<{
    id: string;
    target_value: number;
    ai_message: string;
    badge_earned?: string;
    milestone_type: string;
  }>;
  shouldCelebrate: boolean;
}

// Constants for better maintainability
const MILESTONE_PERCENTAGES = [10, 25, 50, 75, 90, 100] as const;
const CELEBRATION_TOAST_DURATION = 8000;
const CELEBRATION_DELAY = 500;

// Validation helper
function validateInput(userId: string, goalId: string): boolean {
  if (!userId || !goalId) {
    console.error('useMilestoneTracking: userId and goalId are required');
    return false;
  }
  return true;
}

export function useMilestoneTracking(userId: string, goalId: string) {
  const queryClient = useQueryClient();

  // Early validation
  const isValidInput = validateInput(userId, goalId);

  // Function to check for new milestone achievements
  const checkMilestoneAchievements = async (currentAmount: number): Promise<MilestoneCheckResult> => {
    try {
      // Get goal data to calculate progress percentages
      const { data: goal, error: goalError } = await supabase
        .from('financial_goals')
        .select('target_amount')
        .eq('id', goalId)
        .single();

      if (goalError || !goal) {
        throw new Error('Could not fetch goal data');
      }

      const progressPercentage = (currentAmount / goal.target_amount) * 100;

      // Check which percentage milestones should be achieved
      const achievedPercentages = MILESTONE_PERCENTAGES.filter(p => progressPercentage >= p);

      // Get existing milestones to avoid duplicates
      const { data: existingMilestones, error: milestonesError } = await supabase
        .from('goal_milestones')
        .select('*')
        .eq('goal_id', goalId)
        .eq('achieved', true);

      if (milestonesError) {
        throw new Error('Could not fetch existing milestones');
      }

      const existingPercentages = new Set(
        existingMilestones
          .filter(m => m.milestone_type === 'percentage')
          .map(m => Math.round((m.target_value / goal.target_amount) * 100))
      );

      const newPercentages = achievedPercentages.filter(p => !existingPercentages.has(p));

      const newAchievements = [];

      // Create new milestone achievements
      for (const percentage of newPercentages) {
        const targetValue = (goal.target_amount * percentage) / 100;
        const aiMessage = generateMilestoneMessage(percentage, currentAmount, goal.target_amount);
        const badgeEarned = getBadgeForPercentage(percentage);

        const { data: newMilestone, error: insertError } = await supabase
          .from('goal_milestones')
          .insert({
            goal_id: goalId,
            milestone_type: 'percentage',
            target_value: targetValue,
            current_value: currentAmount,
            achieved: true,
            achieved_at: new Date().toISOString(),
            ai_message: aiMessage,
            badge_earned: badgeEarned
          })
          .select()
          .single();

        if (!insertError && newMilestone) {
          newAchievements.push(newMilestone);
        }
      }

      return {
        newAchievements,
        shouldCelebrate: newAchievements.length > 0
      };

    } catch (error) {
      console.error('Error checking milestone achievements:', error);
      return { newAchievements: [], shouldCelebrate: false };
    }
  };

  // Function to trigger milestone celebration
  const celebrateMilestone = (milestone: any) => {
    // Show celebration toast
    toast.success(
      `🎉 ${milestone.ai_message}`,
      {
        position: "top-center",
        autoClose: CELEBRATION_TOAST_DURATION,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: 'milestone-celebration-toast',
        style: {
          background: 'linear-gradient(45deg, #10B981, #059669)',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold'
        }
      }
    );

    // Trigger confetti effect (if you have a confetti library)
    // You could add react-confetti or similar library here
    
    // Update coaching session to record the celebration
    supabase.functions.invoke('ai-coaching-engine', {
      body: {
        userId,
        goalId,
        sessionType: 'milestone_celebration',
        milestoneData: {
          milestoneId: milestone.id,
          targetValue: milestone.target_value,
          aiMessage: milestone.ai_message,
          badgeEarned: milestone.badge_earned
        }
      }
    }).catch(error => {
      console.error('Error recording milestone celebration:', error);
    });
  };

  // Function to manually update goal amount and check milestones
  const updateGoalAmountAndCheckMilestones = async (newAmount: number) => {
    try {
      // Update the goal amount
      const { error: updateError } = await supabase
        .from('financial_goals')
        .update({ 
          current_amount: newAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error('Failed to update goal amount');
      }

      // Check for new milestone achievements
      const result = await checkMilestoneAchievements(newAmount);

      // Celebrate new achievements
      if (result.shouldCelebrate) {
        result.newAchievements.forEach(milestone => {
          setTimeout(() => celebrateMilestone(milestone), CELEBRATION_DELAY); // Slight delay for better UX
        });
      }

      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['goal-milestones', goalId] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      queryClient.invalidateQueries({ queryKey: ['user-goals', userId] });

      return {
        success: true,
        newAchievements: result.newAchievements.length,
        message: result.shouldCelebrate 
          ? `🎉 Congratulations! You've achieved ${result.newAchievements.length} new milestone${result.newAchievements.length > 1 ? 's' : ''}!`
          : 'Goal amount updated successfully!'
      };

    } catch (error) {
      console.error('Error updating goal amount:', error);
      toast.error('Failed to update goal amount. Please try again.');
      return {
        success: false,
        newAchievements: 0,
        message: 'Failed to update goal amount'
      };
    }
  };

  return {
    checkMilestoneAchievements,
    celebrateMilestone,
    updateGoalAmountAndCheckMilestones
  };
}

// Helper function to generate personalized milestone messages
function generateMilestoneMessage(percentage: number, currentAmount: number, targetAmount: number): string {
  const messages: Record<number, string[]> = {
    10: [
      "🌱 Excellent start! You've built the foundation for your financial future!",
      "🎯 First milestone reached! Every journey begins with a single step.",
      "💪 10% complete! You're already ahead of most people who never start."
    ],
    25: [
      "🚀 Fantastic progress! You've hit the quarter mark with determination!",
      "⭐ 25% achieved! Your consistency is building real wealth.",
      "🏆 Quarter way there! Your financial discipline is paying off."
    ],
    50: [
      "🎉 Amazing! You've reached the halfway point of your goal!",
      "🔥 50% complete! You're proving that your dreams are achievable.",
      "💎 Halfway milestone unlocked! Your future self will thank you."
    ],
    75: [
      "🌟 Outstanding achievement! 75% complete - you're in the home stretch!",
      "🏅 Three-quarters done! Your dedication is truly inspiring.",
      "⚡ 75% milestone! You're so close to making your goal a reality."
    ],
    90: [
      "🎊 Almost there! 90% complete - the finish line is in sight!",
      "🔥 90% achieved! You're about to accomplish something incredible.",
      "🚀 Final stretch! Your persistence is about to pay off big time."
    ],
    100: [
      "🎉🎉 GOAL ACHIEVED! You did it! Your financial goal is now a reality!",
      "🏆 CONGRATULATIONS! You've successfully reached your target amount!",
      "⭐ MISSION ACCOMPLISHED! Your dedication has paid off completely!"
    ]
  };

  const messageOptions = messages[percentage] || ["Great milestone achieved!"];
  const randomMessage = messageOptions[Math.floor(Math.random() * messageOptions.length)];
  
  return randomMessage;
}

// Helper function to assign badges for different percentages
function getBadgeForPercentage(percentage: number): string {
  const badges: Record<number, string> = {
    10: "starter",
    25: "bronze",
    50: "silver", 
    75: "gold",
    90: "platinum",
    100: "diamond"
  };
  
  return badges[percentage] || "achievement";
}