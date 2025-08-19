import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faChartLine,
  faClock,
  faPercent,
  faBullseye,
  faRocket,
  faExclamationTriangle,
  faCheckCircle
} from "@fortawesome/free-solid-svg-icons";
import type { FinancialGoal, GoalMilestone } from "@/components/goal-tracker/types/goal-types";
import { useState, useMemo } from "react";

interface GoalMetricsProps {
  goal: FinancialGoal;
  milestones: GoalMilestone[];
}

export function GoalMetrics({ goal, milestones }: GoalMetricsProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // Calculate core metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const startDate = new Date(goal.created_at);
    const targetDate = new Date(goal.target_date);
    
    const totalDays = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const timeProgress = Math.min((daysElapsed / totalDays) * 100, 100);
    
    const currentAmount = goal.current_amount || 0;
    const targetAmount = goal.target_amount;
    const remainingAmount = targetAmount - currentAmount;
    const amountProgress = goal.progress_percentage || 0;
    
    const expectedProgress = timeProgress;
    const progressDifference = amountProgress - expectedProgress;
    const isAhead = progressDifference > 5;
    const isBehind = progressDifference < -5;
    
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    const totalMilestones = milestones.length;
    const milestoneCompletion = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
    
    const dailyRequiredAmount = daysRemaining > 0 ? remainingAmount / daysRemaining : 0;
    const averageDailyProgress = daysElapsed > 0 ? currentAmount / daysElapsed : 0;
    
    return {
      currentAmount,
      targetAmount,
      remainingAmount,
      amountProgress,
      daysRemaining,
      timeProgress,
      progressDifference,
      isAhead,
      isBehind,
      completedMilestones,
      totalMilestones,
      milestoneCompletion,
      dailyRequiredAmount,
      averageDailyProgress
    };
  }, [goal, milestones]);

  // Compact metrics for sidebar display
  const compactMetrics = [
    {
      id: 'progress',
      title: 'Progress',
      value: `${metrics.amountProgress.toFixed(1)}%`,
      icon: faPercent,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      id: 'remaining',
      title: 'Remaining',
      value: `$${(metrics.remainingAmount / 1000).toFixed(0)}k`,
      icon: faBullseye,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      id: 'days',
      title: 'Days Left',
      value: metrics.daysRemaining,
      icon: faClock,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      id: 'daily-target',
      title: 'Daily Need',
      value: `$${metrics.dailyRequiredAmount.toFixed(0)}`,
      icon: faBullseye,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      id: 'milestones',
      title: 'Milestones',
      value: `${metrics.completedMilestones}/${metrics.totalMilestones}`,
      icon: faCheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      id: 'performance',
      title: 'Status',
      value: metrics.isAhead ? 'Ahead' : metrics.isBehind ? 'Behind' : 'On Track',
      icon: metrics.isAhead ? faRocket : metrics.isBehind ? faExclamationTriangle : faBullseye,
      color: metrics.isAhead ? 'text-emerald-600 dark:text-emerald-400' : 
             metrics.isBehind ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400',
      bgColor: metrics.isAhead ? 'bg-emerald-50 dark:bg-emerald-900/20' : 
               metrics.isBehind ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20',
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header - Compact */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faChartLine} className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Analytics</h3>
          </div>
        </div>
        
        {/* Quick Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="font-medium text-gray-900 dark:text-white">{metrics.amountProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(metrics.amountProgress, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Compact Metrics Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {compactMetrics.map((metric) => (
            <div 
              key={metric.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
                selectedMetric === metric.id 
                  ? `${metric.bgColor} border-current ${metric.color}` 
                  : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => setSelectedMetric(selectedMetric === metric.id ? null : metric.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <FontAwesomeIcon 
                  icon={metric.icon} 
                  className={`w-3 h-3 ${selectedMetric === metric.id ? metric.color : 'text-gray-500 dark:text-gray-400'}`} 
                />
                <span className={`text-xs font-medium ${
                  selectedMetric === metric.id ? metric.color : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {metric.title}
                </span>
              </div>
              
              <div className={`text-lg font-bold ${
                selectedMetric === metric.id ? metric.color : 'text-gray-900 dark:text-white'
              }`}>
                {metric.value}
              </div>
            </div>
          ))}
        </div>

        {/* Expanded Details */}
        {selectedMetric && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-500/30"
          >
            <div className="text-xs text-blue-800 dark:text-blue-200">
              {selectedMetric === 'progress' && (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Current: ${metrics.currentAmount.toLocaleString()}</span>
                    <span>Target: ${metrics.targetAmount.toLocaleString()}</span>
                  </div>
                  <div>Daily pace: ${metrics.averageDailyProgress.toFixed(0)} / Required: ${metrics.dailyRequiredAmount.toFixed(0)}</div>
                </div>
              )}
              {selectedMetric === 'remaining' && (
                <div>Still need ${metrics.remainingAmount.toLocaleString()} to reach your ${metrics.targetAmount.toLocaleString()} goal</div>
              )}
              {selectedMetric === 'days' && (
                <div>{metrics.daysRemaining} days until {new Date(goal.target_date).toLocaleDateString()}</div>
              )}
              {selectedMetric === 'daily-target' && (
                <div>Based on {metrics.daysRemaining} days remaining and ${metrics.remainingAmount.toLocaleString()} needed</div>
              )}
              {selectedMetric === 'milestones' && (
                <div>{metrics.completedMilestones} of {metrics.totalMilestones} milestones completed ({metrics.milestoneCompletion.toFixed(0)}%)</div>
              )}
              {selectedMetric === 'performance' && (
                <div>
                  {metrics.isAhead && `${Math.abs(metrics.progressDifference).toFixed(1)}% ahead of schedule`}
                  {metrics.isBehind && `${Math.abs(metrics.progressDifference).toFixed(1)}% behind schedule`}
                  {!metrics.isAhead && !metrics.isBehind && 'Progress is aligned with timeline'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}