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

// Interactive Projection Chart Component with Real Editing
export function InteractiveProjectionChart({ 
  goal, 
  progressData, 
  onGoalUpdate 
}: { 
  goal: any; 
  progressData: any;
  onGoalUpdate: (updates: any) => Promise<void>;
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
  
  const targetMonths = editedTargetDate ? getMonthsFromDate(editedTargetDate) : 12;
  const maxMonths = getMonthsFromDate(maxDateStr);

  // Calculate projection data based on current monthly contribution and edited values
  const calculateProjection = (monthly: number, targetAmount: number, targetDate: string) => {
    const currentAmount = goal.current_amount || 0;
    const targetDateObj = new Date(targetDate);
    const monthsToTarget = Math.max(1, Math.ceil((targetDateObj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
    
    const labels = [];
    const projectedData = [];
    const targetLine = [];
    
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
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
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
            className={`p-4 rounded-lg mb-6 ${
              statusMessage.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 text-green-800 dark:text-green-200'
                : statusMessage.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200'
                : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-200'
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
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-6">
               
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
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
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
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
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
                />
                
                {/* Target Date Slider */}
                <RangeSlider
                  label="Target Date"
                  value={targetMonths}
                  onChange={(value) => setEditedTargetDate(getDateFromMonths(Number(value)))}
                  min={1}
                  max={maxMonths}
                  step={1}
                  formatValue={(value) => {
                    const date = getDateFromMonths(Number(value));
                    return new Date(date).toLocaleDateString();
                  }}
                  className=""
                />
              </div>
            </div>

            {/* Projection Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg border ${
                isOnTrack 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <FontAwesomeIcon 
                    icon={isOnTrack ? faCheckCircle : faExclamationTriangle} 
                    className={`w-4 h-4 ${
                      isOnTrack ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`} 
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Completion Date
                  </span>
                </div>
                <div className={`text-lg font-bold ${
                  isOnTrack ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
                }`}>
                  {completionDate.toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {projectedCompletion} months
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <FontAwesomeIcon icon={faDollarSign} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Monthly Gap
                  </span>
                </div>
                <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {monthlyGap > 0 ? `+$${monthlyGap}` : monthlyGap < 0 ? `-$${Math.abs(monthlyGap)}` : '$0'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {monthlyGap > 0 ? 'Need more' : monthlyGap < 0 ? 'Ahead of schedule' : 'On track'}
                </div>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <FontAwesomeIcon icon={faCalendar} className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Time Difference
                  </span>
                </div>
                <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                  {projectedCompletion - monthsToTarget > 0 
                    ? `+${projectedCompletion - monthsToTarget}` 
                    : projectedCompletion - monthsToTarget < 0 
                    ? `${projectedCompletion - monthsToTarget}` 
                    : '0'} months
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
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
