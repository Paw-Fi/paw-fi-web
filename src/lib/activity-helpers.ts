import {
  faChartLine,
  faPlus,
  faFlag,
  faArrowUp,
  faArrowDown,
  faTrophy,
  faCalendarAlt,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import type { Activity } from "@/hooks/useUserActivities";

export const getActivityDetails = (activity: Activity) => {
  const metadata = activity.metadata;
  const amountChange = metadata?.amountChange;
  const newProgressPercentage = metadata?.newProgressPercentage;
  const isOnTrack = metadata?.isOnTrack;

  switch (activity.action) {
    case 'goal_created':
      return {
        icon: faPlus,
        color: 'text-blue-600 dark:text-blue-400',
        title: 'Goal Created',
        description: metadata?.targetAmount 
          ? `Target set at $${metadata.targetAmount.toLocaleString()}`
          : `New goal "${activity.goalTitle}" created`,
      };
    
    case 'goal_progress_updated':
      const progressIcon = amountChange && amountChange > 0 ? faArrowUp : faArrowDown;
      const progressColor = amountChange && amountChange > 0 
        ? (isOnTrack !== false ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400')
        : 'text-red-600 dark:text-red-400';
      
      let progressDescription = '';
      if (amountChange && newProgressPercentage !== undefined) {
        const changeText = amountChange > 0 ? 'Added' : 'Reduced by';
        const amountText = `${changeText} $${Math.abs(amountChange).toLocaleString()}`;
        const progressText = `${newProgressPercentage.toFixed(1)}% complete`;
        const trackingText = isOnTrack === false ? ' (Behind schedule)' : isOnTrack === true ? ' (On track)' : '';
        progressDescription = `${amountText} • ${progressText}${trackingText}`;
      } else if (newProgressPercentage !== undefined) {
        progressDescription = `Progress is now ${newProgressPercentage.toFixed(1)}% complete`;
      } else if (amountChange) {
        const changeText = amountChange > 0 ? 'Added' : 'Reduced by';
        progressDescription = `${changeText} $${Math.abs(amountChange).toLocaleString()}`;
      } else {
        progressDescription = `Progress updated for "${activity.goalTitle}"`;
      }

      return {
        icon: progressIcon,
        color: progressColor,
        title: amountChange && amountChange > 0 ? 'Money Added' : amountChange && amountChange < 0 ? 'Amount Reduced' : 'Progress Updated',
        description: progressDescription,
      };
    
    case 'goal_completed':
      return {
        icon: faTrophy,
        color: 'text-purple-600 dark:text-purple-400',
        title: 'Goal Achieved! 🎉',
        description: metadata?.finalAmount 
          ? `Completed with $${metadata.finalAmount.toLocaleString()}`
          : `Goal "${activity.goalTitle}" achieved!`,
      };
    
    case 'milestone_completed':
      const milestoneTitle = metadata?.title;
      const milestoneAmount = metadata?.amount ? `$${metadata.amount.toLocaleString()}` : '';
      const milestoneProgress = metadata?.progressPercentage ? ` • ${metadata.progressPercentage.toFixed(1)}% complete` : '';
      
      let milestoneDescription = '';
      if (milestoneTitle && milestoneAmount) {
        milestoneDescription = `"${milestoneTitle}" reached (${milestoneAmount})${milestoneProgress}`;
      } else if (milestoneTitle) {
        milestoneDescription = `"${milestoneTitle}" completed${milestoneProgress}`;
      } else if (milestoneAmount) {
        milestoneDescription = `Milestone reached (${milestoneAmount})${milestoneProgress}`;
      } else {
        milestoneDescription = `Milestone completed for "${activity.goalTitle}"`;
      }
      
      return {
        icon: faFlag,
        color: 'text-yellow-500 dark:text-yellow-400',
        title: 'Milestone Reached',
        description: milestoneDescription,
      };
    
    case 'goal_timeline_updated':
      const timelineIcon = metadata?.isExtension ? faClock : faCalendarAlt;
      const timelineColor = metadata?.isExtension 
        ? 'text-orange-600 dark:text-orange-400' 
        : 'text-blue-600 dark:text-blue-400';
      
      let timelineDescription = '';
      if (metadata?.daysDifference !== undefined) {
        const absDays = Math.abs(metadata.daysDifference);
        const dayText = absDays === 1 ? 'day' : 'days';
        
        if (metadata.daysDifference > 0) {
          timelineDescription = `Timeline extended by ${absDays} ${dayText}`;
        } else if (metadata.daysDifference < 0) {
          timelineDescription = `Timeline shortened by ${absDays} ${dayText}`;
        } else {
          timelineDescription = 'Timeline date updated';
        }
        
        if (metadata.newTargetDate) {
          const targetDate = new Date(metadata.newTargetDate);
          timelineDescription += ` • Target: ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
      } else {
        timelineDescription = metadata?.reason || 'Goal timeline updated';
      }
      
      return {
        icon: timelineIcon,
        color: timelineColor,
        title: 'Timeline Updated',
        description: timelineDescription,
      };
    
    case 'goal_timeline_extended':
      const extensionDays = metadata?.extensionDays || 0;
      const extensionText = extensionDays === 1 ? 'day' : 'days';
      
      let extensionDescription = `Extended by ${extensionDays} ${extensionText}`;
      if (metadata?.newTargetDate) {
        const targetDate = new Date(metadata.newTargetDate);
        extensionDescription += ` • New target: ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
      if (metadata?.reason) {
        extensionDescription += ` (${metadata.reason})`;
      }
      
      return {
        icon: faClock,
        color: 'text-orange-600 dark:text-orange-400',
        title: 'Timeline Extended',
        description: extensionDescription,
      };
    
    case 'goal_target_adjusted':
      const adjustmentIcon = metadata?.adjustmentType === 'timeline' ? faCalendarAlt : faArrowUp;
      const adjustmentColor = 'text-purple-600 dark:text-purple-400';
      
      let adjustmentDescription = '';
      if (metadata?.adjustmentType === 'timeline' && metadata?.newTargetDate) {
        const targetDate = new Date(metadata.newTargetDate);
        adjustmentDescription = `Target date: ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      } else if (metadata?.targetChange && metadata?.newTargetAmount) {
        const changeText = metadata.targetChange > 0 ? 'increased' : 'decreased';
        adjustmentDescription = `Target ${changeText} to $${metadata.newTargetAmount.toLocaleString()}`;
      } else {
        adjustmentDescription = 'Goal target adjusted';
      }
      
      return {
        icon: adjustmentIcon,
        color: adjustmentColor,
        title: 'Target Adjusted',
        description: adjustmentDescription,
      };

    default:
      return {
        icon: faChartLine,
        color: 'text-gray-500 dark:text-gray-400',
        title: 'Goal Activity',
        description: metadata?.customMessage || `Activity for "${activity.goalTitle}"`,
      };
  }
};

export const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  }
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
