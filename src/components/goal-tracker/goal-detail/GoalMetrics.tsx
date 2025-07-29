import { motion, useSpring, useTransform } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faChartLine,
  faCalendarCheck,
  faUpLong,
  faDownLong,
  faClock,
  faDollarSign,
  faPercent,
  faBullseye,
  faRocket,
  faExclamationTriangle,
  faCheckCircle,
  faInfoCircle,
  faArrowUp,
  faArrowDown,
  faEquals,
  faFireFlameCurved,
  faStar
} from "@fortawesome/free-solid-svg-icons";
import type { FinancialGoal, GoalMilestone } from "@/components/goal-tracker/types";
import { useState, useEffect, useMemo } from "react";

interface GoalMetricsProps {
  goal: FinancialGoal;
  milestones: GoalMilestone[];
}

interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: string;
  bgColor: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  description: string;
  isHighlight?: boolean;
}

export function GoalMetrics({ goal, milestones }: GoalMetricsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'projections'>('overview');
  const [animationComplete, setAnimationComplete] = useState(false);

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const startDate = new Date(goal.created_at);
    const targetDate = new Date(goal.target_date);
    
    // Time calculations
    const totalDays = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const timeProgress = Math.min((daysElapsed / totalDays) * 100, 100);
    
    // Amount calculations
    const currentAmount = goal.current_amount || 0;
    const targetAmount = goal.target_amount;
    const remainingAmount = targetAmount - currentAmount;
    const amountProgress = goal.progress_percentage || 0;
    
    // Performance calculations
    const expectedProgress = timeProgress;
    const progressDifference = amountProgress - expectedProgress;
    const isAhead = progressDifference > 5;
    const isBehind = progressDifference < -5;
    const isOnTrack = !isAhead && !isBehind;
    
    // Milestones calculations
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    const totalMilestones = milestones.length;
    const milestoneCompletion = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
    const overdueMilestones = milestones.filter(m => {
      const dueDate = new Date(m.due_date);
      return dueDate < now && m.status !== 'completed';
    }).length;
    
    // Velocity calculations
    const dailyRequiredAmount = daysRemaining > 0 ? remainingAmount / daysRemaining : 0;
    const averageDailyProgress = daysElapsed > 0 ? currentAmount / daysElapsed : 0;
    const velocityTrend = averageDailyProgress > dailyRequiredAmount ? 'up' : 
                         averageDailyProgress < dailyRequiredAmount ? 'down' : 'neutral';
    
    // Projections
    const projectedFinalAmount = daysRemaining > 0 ? 
      currentAmount + (averageDailyProgress * daysRemaining) : currentAmount;
    const projectedCompletion = projectedFinalAmount >= targetAmount;
    
    return {
      // Time metrics
      totalDays,
      daysElapsed,
      daysRemaining,
      timeProgress,
      
      // Amount metrics
      currentAmount,
      targetAmount,
      remainingAmount,
      amountProgress,
      
      // Performance
      expectedProgress,
      progressDifference,
      isAhead,
      isBehind,
      isOnTrack,
      
      // Milestones
      completedMilestones,
      totalMilestones,
      milestoneCompletion,
      overdueMilestones,
      
      // Velocity
      dailyRequiredAmount,
      averageDailyProgress,
      velocityTrend,
      
      // Projections
      projectedFinalAmount,
      projectedCompletion
    };
  }, [goal, milestones]);

  const getPerformanceStatus = () => {
    if (metrics.isAhead) {
      return {
        status: 'Ahead of Schedule',
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        icon: faRocket,
        description: `You're ${Math.abs(metrics.progressDifference).toFixed(1)}% ahead of your expected progress`
      };
    }
    
    if (metrics.isBehind) {
      return {
        status: 'Behind Schedule',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        icon: faExclamationTriangle,
        description: `You're ${Math.abs(metrics.progressDifference).toFixed(1)}% behind your expected progress`
      };
    }
    
    return {
      status: 'On Track',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      icon: faBullseye,
      description: 'Your progress is aligned with your timeline'
    };
  };

  const overviewMetrics: MetricCard[] = [
    {
      id: 'current-amount',
      title: 'Current Amount',
      value: `$${metrics.currentAmount.toLocaleString()}`,
      subtitle: `${metrics.amountProgress.toFixed(1)}% of target`,
      icon: faDollarSign,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'Amount saved towards your goal'
    },
    {
      id: 'remaining',
      title: 'Remaining',
      value: `$${metrics.remainingAmount.toLocaleString()}`,
      subtitle: `${(100 - metrics.amountProgress).toFixed(1)}% to go`,
      icon: faBullseye,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      description: 'Amount still needed to reach your goal'
    },
    {
      id: 'time-remaining',
      title: 'Time Remaining',
      value: `${metrics.daysRemaining}`,
      subtitle: 'days to target date',
      icon: faClock,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      description: 'Days until your goal deadline'
    },
    {
      id: 'milestone-progress',
      title: 'Milestones',
      value: `${metrics.completedMilestones}/${metrics.totalMilestones}`,
      subtitle: `${metrics.milestoneCompletion.toFixed(0)}% completed`,
      icon: faCheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      description: 'Milestone completion progress'
    }
  ];

  const progressMetrics: MetricCard[] = [
    {
      id: 'daily-required',
      title: 'Daily Target',
      value: `$${metrics.dailyRequiredAmount.toFixed(0)}`,
      subtitle: 'required daily savings',
      icon: faBullseye,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      trend: metrics.velocityTrend as 'up' | 'down' | 'neutral',
      description: 'Amount needed to save daily to reach your goal'
    },
    {
      id: 'average-daily',
      title: 'Daily Average',
      value: `$${metrics.averageDailyProgress.toFixed(0)}`,
      subtitle: 'current daily average',
      icon: faChartLine,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      trend: metrics.velocityTrend as 'up' | 'down' | 'neutral',
      description: 'Your current daily savings rate'
    },
    {
      id: 'time-vs-progress',
      title: 'Progress vs Time',
      value: `${metrics.progressDifference > 0 ? '+' : ''}${metrics.progressDifference.toFixed(1)}%`,
      subtitle: 'vs expected progress',
      icon: metrics.isAhead ? faUpLong : metrics.isBehind ? faDownLong : faEquals,
      color: metrics.isAhead ? 'text-emerald-600 dark:text-emerald-400' : 
             metrics.isBehind ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400',
      bgColor: metrics.isAhead ? 'bg-emerald-50 dark:bg-emerald-900/20' : 
               metrics.isBehind ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20',
      trend: metrics.isAhead ? 'up' : metrics.isBehind ? 'down' : 'neutral',
      description: 'How your actual progress compares to expected progress',
      isHighlight: true
    },
    {
      id: 'overdue-milestones',
      title: 'Overdue Milestones',
      value: metrics.overdueMilestones,
      subtitle: 'need attention',
      icon: faExclamationTriangle,
      color: metrics.overdueMilestones > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400',
      bgColor: metrics.overdueMilestones > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-900/20',
      description: 'Milestones that have passed their due date'
    }
  ];

  const projectionMetrics: MetricCard[] = [
    {
      id: 'projected-amount',
      title: 'Projected Final Amount',
      value: `$${metrics.projectedFinalAmount.toLocaleString()}`,
      subtitle: `${((metrics.projectedFinalAmount / metrics.targetAmount) * 100).toFixed(1)}% of target`,
      icon: faChartLine,
      color: metrics.projectedCompletion ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      bgColor: metrics.projectedCompletion ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20',
      description: 'Estimated final amount based on current progress rate',
      isHighlight: true
    },
    {
      id: 'completion-probability',
      title: 'Success Likelihood',
      value: `${metrics.projectedCompletion ? '95' : '45'}%`,
      subtitle: 'based on current pace',
      icon: metrics.projectedCompletion ? faStar : faExclamationTriangle,
      color: metrics.projectedCompletion ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      bgColor: metrics.projectedCompletion ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20',
      description: 'Probability of reaching your goal on time'
    },
    {
      id: 'acceleration-needed',
      title: 'Acceleration Needed',
      value: metrics.projectedCompletion ? '0%' : `${(((metrics.dailyRequiredAmount / metrics.averageDailyProgress) - 1) * 100).toFixed(0)}%`,
      subtitle: 'increase in savings rate',
      icon: faRocket,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'How much you need to increase your savings rate'
    },
    {
      id: 'completion-score',
      title: 'Completion Score',
      value: `${Math.round((metrics.amountProgress + metrics.timeProgress) / 2)}%`,
      subtitle: 'overall performance',
      icon: faFireFlameCurved,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      description: 'Combined progress and timeline performance score'
    }
  ];

  const getCurrentMetrics = () => {
    switch (activeTab) {
      case 'progress': return progressMetrics;
      case 'projections': return projectionMetrics;
      default: return overviewMetrics;
    }
  };

  const performanceStatus = getPerformanceStatus();

  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-hidden"
    >
      <div className="relative bg-gradient-to-br from-white via-white to-green-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-green-900/20 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-xl shadow-black/5 dark:shadow-black/20">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.05),transparent_60%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.1),transparent_60%)]" />
        
        {/* Content */}
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-600/10 dark:from-green-400/30 dark:to-green-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-green-500/20 dark:border-green-400/30"
              >
                <FontAwesomeIcon
                  icon={faChartLine}
                  className="w-7 h-7 text-green-600 dark:text-green-400"
                />
              </motion.div>
              
              <div>
                <motion.h2
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold text-gray-900 dark:text-white mb-1"
                >
                  Goal Analytics
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-600 dark:text-gray-400"
                >
                  Comprehensive performance metrics and insights
                </motion.p>
              </div>
            </div>

            {/* Performance Status Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className={`flex items-center gap-3 px-6 py-3 ${performanceStatus.bgColor} rounded-xl border border-gray-200/50 dark:border-gray-600/50`}
            >
              <FontAwesomeIcon icon={performanceStatus.icon} className={`w-5 h-5 ${performanceStatus.color}`} />
              <div>
                <div className={`font-semibold ${performanceStatus.color}`}>
                  {performanceStatus.status}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {performanceStatus.description}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-2 mb-8 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl"
          >
            {[
              { id: 'overview', label: 'Overview', icon: faChartLine },
              { id: 'progress', label: 'Progress', icon: faUpLong },
              { id: 'projections', label: 'Projections', icon: faBullseye }
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                <span>{tab.label}</span>
              </motion.button>
            ))}
          </motion.div>

          {/* Metrics Grid */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {getCurrentMetrics().map((metric, index) => (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-6 bg-white dark:bg-gray-700/50 rounded-xl border border-gray-200/50 dark:border-gray-600/50 hover:shadow-lg transition-all group ${
                  metric.isHighlight ? 'ring-2 ring-green-500/20 dark:ring-green-400/20' : ''
                }`}
              >
                {/* Highlight Indicator */}
                {metric.isHighlight && (
                  <div className="absolute top-3 right-3">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-3 h-3 bg-green-500 rounded-full"
                    />
                  </div>
                )}

                {/* Icon */}
                <div className={`w-12 h-12 ${metric.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <FontAwesomeIcon icon={metric.icon} className={`w-6 h-6 ${metric.color}`} />
                </div>

                {/* Content */}
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {metric.title}
                    </h3>
                    {metric.trend && (
                      <FontAwesomeIcon 
                        icon={metric.trend === 'up' ? faArrowUp : metric.trend === 'down' ? faArrowDown : faEquals}
                        className={`w-3 h-3 ${
                          metric.trend === 'up' ? 'text-emerald-600' : 
                          metric.trend === 'down' ? 'text-red-600' : 'text-gray-400'
                        }`}
                      />
                    )}
                  </div>
                  
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {metric.value}
                  </div>
                  
                  {metric.subtitle && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      {metric.subtitle}
                    </div>
                  )}

                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {metric.description}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Progress Visualization */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-green-50/50 dark:from-gray-700/50 dark:to-green-900/20 rounded-xl border border-gray-200/50 dark:border-gray-600/50"
            >
              <div className="flex items-center gap-3 mb-6">
                <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-semibold text-gray-900 dark:text-white">Progress Comparison</span>
              </div>
              
              <div className="space-y-4">
                {/* Amount Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Amount Progress</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{metrics.amountProgress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(metrics.amountProgress, 100)}%` }}
                      transition={{ duration: 1.5, delay: 1 }}
                    />
                  </div>
                </div>

                {/* Time Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Progress</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{metrics.timeProgress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(metrics.timeProgress, 100)}%` }}
                      transition={{ duration: 1.5, delay: 1.2 }}
                    />
                  </div>
                </div>

                {/* Milestone Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Milestone Progress</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{metrics.milestoneCompletion.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${metrics.milestoneCompletion}%` }}
                      transition={{ duration: 1.5, delay: 1.4 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}