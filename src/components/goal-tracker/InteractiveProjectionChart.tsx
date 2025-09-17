import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faChartLine, 
  faChevronUp, 
  faChevronDown, 
  faCheckCircle, 
  faExclamationTriangle, 
  faDollarSign, 
  faCalendar, 
  faInfoCircle,
  faCheck,
  faTimes,
  faClock,
  faEdit,
  faSliders
} from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion";
import { Line } from 'react-chartjs-2';
import RangeSlider from '@/components/ui/RangeSlider';
import { toast } from "react-toastify";

// Interactive Projection Chart Component with Real Editing
export function InteractiveProjectionChart({ 
  goal, 
  progressData, 
  onGoalUpdate ,
  isSubscriptionActive,
  onSubscriptionRequired
}: { 
  goal: any; 
  progressData: any;
  onGoalUpdate: (updates: any) => Promise<void>;
  isSubscriptionActive?: boolean;
  onSubscriptionRequired?: () => void;
}) {
  const [showProjection, setShowProjection] = useState(true);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Editable goal parameters
  const [editedTargetAmount, setEditedTargetAmount] = useState(goal.target_amount || 0);
  const [editedTargetDate, setEditedTargetDate] = useState(goal.target_date || '');
  
  // Initialize edited values when goal changes
  useEffect(() => {
    setEditedTargetAmount(goal.target_amount || 0);
    setEditedTargetDate(goal.target_date || '');
  }, [goal.target_amount, goal.target_date]);
  
  // Calculate date range for slider (current date to 10 years from now)
  const currentDate = new Date();
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 10);
  const minDateStr = currentDate.toISOString().split('T')[0];
  const maxDateStr = maxDate.toISOString().split('T')[0];
  
  // Calculate months from current date for date slider
  const getMonthsFromDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffTime = date.getTime() - currentDate.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44)));
  };
  
  const getDateFromMonths = (months: number) => {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };
  
  // Use existing date variables
  const currentDateStr = minDateStr;
  
  // For calculations, we still need months
  const targetMonths = editedTargetDate ? getMonthsFromDate(editedTargetDate) : 12;

  // Calculate projection data based on current monthly contribution and edited values
  const calculateProjection = (monthly: number, targetAmount: number, targetDate: string) => {
    const currentAmount = goal.current_amount || 0;
    const targetDateObj = new Date(targetDate);
    const monthsToTarget = Math.max(1, Math.ceil((targetDateObj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
    
    const labels: string[] = [];
    const projectedData: number[] = [];
    const targetLine: number[] = [];
    
    // Generate monthly projections
    for (let i = 0; i <= monthsToTarget; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() + i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
      
      const projectedAmount = currentAmount + (monthly * i);
      projectedData.push(Math.min(projectedAmount, targetAmount));
      targetLine.push(targetAmount);
    }
    
    return { labels, projectedData, targetLine, monthsToTarget };
  };
  
  // Editing functions
  const startEditing = () => {
    setIsEditingGoal(true);
  };
  
  const cancelEditing = () => {
    setIsEditingGoal(false);
    setEditedTargetAmount(goal.target_amount || 0);
    setEditedTargetDate(goal.target_date || '');
  };
  
  const saveChanges = async () => {
    if (isUpdating) return;
    if(!isSubscriptionActive)
    {
      onSubscriptionRequired?.();
      return
    }
    
    setIsUpdating(true);
    try {
      const updates: any = {};
      
      if (editedTargetAmount !== goal.target_amount) {
        updates.target_amount = editedTargetAmount;
      }
      
      if (editedTargetDate !== goal.target_date) {
        updates.target_date = editedTargetDate;
      }
      
      if (Object.keys(updates).length > 0) {
        await onGoalUpdate(updates);
      }
      
      setIsEditingGoal(false);
    } catch (error) {
      console.error('Failed to update goal:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Current monthly contribution from progressData
  const monthlyContribution = progressData.monthlyCapacity || 0;
  
  const { labels, projectedData, targetLine, monthsToTarget } = calculateProjection(
    monthlyContribution, 
    editedTargetAmount, 
    editedTargetDate
  );
  
  // Calculate completion date and gap using edited values
  const projectedCompletion = monthlyContribution > 0 
    ? Math.ceil((editedTargetAmount - goal.current_amount) / monthlyContribution)
    : targetMonths;
  
  const completionDate = new Date();
  completionDate.setMonth(completionDate.getMonth() + projectedCompletion);
  
  const isOnTrack = projectedCompletion <= targetMonths;
  const monthlyGap = Math.ceil((editedTargetAmount - goal.current_amount) / targetMonths) - monthlyContribution;
  
  // Status message based on changes
  const getStatusMessage = () => {
    const amountChanged = editedTargetAmount !== goal.target_amount;
    const dateChanged = editedTargetDate !== goal.target_date;
    
    if (!amountChanged && !dateChanged) {
      return { type: 'info', message: 'Current goal settings' };
    }
    
    if (amountChanged && dateChanged) {
      const amountDiff = editedTargetAmount - goal.target_amount;
      const originalMonths = getMonthsFromDate(goal.target_date);
      const newMonths = targetMonths;
      const timeDiff = newMonths - originalMonths;
      
      return {
        type: amountDiff > 0 || timeDiff < 0 ? 'warning' : 'success',
        message: `Target ${amountDiff > 0 ? 'increased' : 'decreased'} by $${Math.abs(amountDiff).toLocaleString()} and timeline ${timeDiff > 0 ? 'extended' : 'shortened'} by ${Math.abs(timeDiff)} months`
      };
    }
    
    if (amountChanged) {
      const diff = editedTargetAmount - goal.target_amount;
      return {
        type: diff > 0 ? 'warning' : 'success',
        message: `Target amount ${diff > 0 ? 'increased' : 'decreased'} by $${Math.abs(diff).toLocaleString()}`
      };
    }
    
    if (dateChanged) {
      const originalMonths = getMonthsFromDate(goal.target_date);
      const diff = targetMonths - originalMonths;
      return {
        type: diff < 0 ? 'warning' : 'success',
        message: `Timeline ${diff > 0 ? 'extended' : 'shortened'} by ${Math.abs(diff)} months`
      };
    }
    
    return { type: 'info', message: 'Current goal settings' };
  };
  
  const statusMessage = getStatusMessage();

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Projected Savings',
        data: projectedData,
        borderColor: isOnTrack ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        backgroundColor: isOnTrack ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: isOnTrack ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Target Amount',
        data: targetLine,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: $${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-card rounded-3xl shadow-sm p-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        
        
       
      </div>

      {/* Status Banner */}
      <AnimatePresence>
        {isEditingGoal && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl mb-6 ${
              statusMessage.type === 'success' 
                ? 'bg-success/10 border border-success/20 text-success'
                : statusMessage.type === 'warning'
                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                : 'bg-primary/10 border border-primary/20 text-primary'
            }`}
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon 
                icon={statusMessage.type === 'success' ? faCheckCircle : statusMessage.type === 'warning' ? faExclamationTriangle : faInfoCircle} 
                className="w-4 h-4" 
              />
              <span className="text-sm font-medium">{statusMessage.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence>
        {showProjection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Goal Parameter Controls - Always Visible */}
            <div className="bg-muted/50 rounded-3xl p-8 space-y-8">
               
                {/* Save/Cancel buttons - only show when there are changes */}
                <AnimatePresence>
                  {(editedTargetAmount !== goal.target_amount || editedTargetDate !== goal.target_date) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-2"
                    >
                      <button
                        onClick={saveChanges}
                        disabled={isUpdating}
                        className="px-6 py-3 bg-success hover:bg-success/90 disabled:bg-muted text-success-foreground rounded-full transition-all duration-200 flex items-center gap-2 hover:scale-105"
                      >
                        <FontAwesomeIcon 
                          icon={isUpdating ? faClock : faCheck} 
                          className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} 
                        />
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={isUpdating}
                        className="px-6 py-3 bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-muted-foreground hover:text-foreground rounded-full transition-all duration-200 flex items-center gap-2 hover:scale-105"
                      >
                        <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                        Cancel
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                  
              {/* Sliders - Two per row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Target Amount Slider */}
                <RangeSlider
                  label="Target Amount"
                  value={editedTargetAmount}
                  onChange={(value) => setEditedTargetAmount(Number(value))}
                  min={1000}
                  max={1000000}
                  step={1000}
                  formatValue={(value) => `$${Number(value).toLocaleString()}`}
                  className=""
                  type="number"
                  isValueEditable
                />
                
                {/* Target Date Slider */}
                <RangeSlider
                  label="Target Date"
                  value={editedTargetDate || currentDateStr}
                  onChange={(value) => {
                    setEditedTargetDate(value as string);
                  }}
                  min={currentDateStr}
                  max={maxDateStr}
                  step={1} // 1 day step
                  formatValue={(value) => {
                    return new Date(value as string).toLocaleDateString();
                  }}
                  className=""
                  isValueEditable
                  type="date"
                />
              </div>
            </div>

            {/* Projection Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-6 rounded-2xl border ${
                isOnTrack 
                  ? 'bg-success/10 border-success/20'
                  : 'bg-destructive/10 border-destructive/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <FontAwesomeIcon 
                    icon={isOnTrack ? faCheckCircle : faExclamationTriangle} 
                    className={`w-4 h-4 ${
                      isOnTrack ? 'text-success' : 'text-destructive'
                    }`} 
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    Completion Date
                  </span>
                </div>
                <div className={`text-lg font-semibold ${
                  isOnTrack ? 'text-success' : 'text-destructive'
                }`}>
                  {completionDate.toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {projectedCompletion} months
                </div>
              </div>

              <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <FontAwesomeIcon icon={faDollarSign} className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Monthly Gap
                  </span>
                </div>
                <div className="text-lg font-semibold text-primary">
                  {monthlyGap > 0 ? `+$${monthlyGap}` : monthlyGap < 0 ? `-$${Math.abs(monthlyGap)}` : '$0'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {monthlyGap > 0 ? 'Need more' : monthlyGap < 0 ? 'Ahead of schedule' : 'On track'}
                </div>
              </div>

              <div className="p-6 bg-purple-50 border border-purple-200 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <FontAwesomeIcon icon={faCalendar} className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Time Difference
                  </span>
                </div>
                <div className="text-lg font-semibold text-purple-800">
                  {projectedCompletion - monthsToTarget > 0 
                    ? `+${projectedCompletion - monthsToTarget}` 
                    : projectedCompletion - monthsToTarget < 0 
                    ? `${projectedCompletion - monthsToTarget}` 
                    : '0'} months
                </div>
                <div className="text-xs text-muted-foreground">
                  vs. target timeline
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-80">
              <Line data={chartData} options={chartOptions} />
            </div>

           
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </motion.div>
  );
}
