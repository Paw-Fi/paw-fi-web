'use client';

import { useMemo, useState } from 'react'; // Added back useMemo as it's used by multiple widgets
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowRight, faCircleCheck, faCircleExclamation, 
  faCircleQuestion, faHandshake,
  faCoins, 
  faChartPie, 
  faFileInvoiceDollar, 
  faSnowflake, 
  faFire
  // Icons for FinancialHealthScorecardWidget are now imported within its definition
} from '@fortawesome/free-solid-svg-icons';
import { 
  IFinancialHealthScorecardWidget, 
  INextBestActionWidget,
  INextBestActionItem, // Added import for INextBestActionItem
  IDebtVisualizerWidget,
  IRetirementReadinessWidget,
  IEnhancedSavingsGoalsWidget,
  IInsuranceCoverageWidget
} from '../types/dashboard-data.typings';
import { Widget } from './Widget';

// Financial Health Scorecard Widget
import { motion, Variants } from 'framer-motion';



import {
  faWallet, 
  faPiggyBank, 
  faCreditCard, 
  faChartLine, 
  faShieldAlt, 
  faQuestionCircle 
} from '@fortawesome/free-solid-svg-icons'; // Added more icons

// Helper to get styles based on financial status
interface StatusStyles {
  textColor: string;
  bgColor: string;
  borderColor: string;
  progressColor: string;
  iconColor?: string;
  ringColor?: string;
}

type FinancialStatus = 'Excellent' | 'Good' | 'Fair' | 'Needs Attention' | string | undefined;

function getFinancialStatusStyles(status?: FinancialStatus): StatusStyles {
  const s = status?.toLowerCase();
  switch (s) {
    case 'excellent':
      return {
        textColor: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/60',
        borderColor: 'border-emerald-500/30 dark:border-emerald-700/50',
        progressColor: 'text-emerald-500 dark:text-emerald-400',
        iconColor: 'text-emerald-500 dark:text-emerald-400',
        ringColor: 'ring-emerald-500',
      };
    case 'good':
      return {
        textColor: 'text-sky-600 dark:text-sky-400',
        bgColor: 'bg-sky-50 dark:bg-sky-900/60',
        borderColor: 'border-sky-500/30 dark:border-sky-700/50',
        progressColor: 'text-sky-500 dark:text-sky-400',
        iconColor: 'text-sky-500 dark:text-sky-400',
        ringColor: 'ring-sky-500',
      };
    case 'fair':
      return {
        textColor: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-900/60',
        borderColor: 'border-amber-500/30 dark:border-amber-700/50',
        progressColor: 'text-amber-500 dark:text-amber-400',
        iconColor: 'text-amber-500 dark:text-amber-400',
        ringColor: 'ring-amber-500',
      };
    case 'needs attention': // Mapped from 'Needs Improvement'
    case 'needs improvement':
      return {
        textColor: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/60',
        borderColor: 'border-orange-500/30 dark:border-orange-700/50',
        progressColor: 'text-orange-500 dark:text-orange-400',
        iconColor: 'text-orange-500 dark:text-orange-400',
        ringColor: 'ring-orange-500',
      };
    case 'poor':
      return {
        textColor: 'text-red-600 dark:text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-900/60',
        borderColor: 'border-red-500/30 dark:border-red-700/50',
        progressColor: 'text-red-500 dark:text-red-400',
        iconColor: 'text-red-500 dark:text-red-400',
        ringColor: 'ring-red-500',
      };
    default:
      return {
        textColor: 'text-slate-600 dark:text-slate-400',
        bgColor: 'bg-slate-100 dark:bg-slate-800/60',
        borderColor: 'border-slate-300/50 dark:border-slate-700/50',
        progressColor: 'text-slate-500 dark:text-slate-400',
        iconColor: 'text-slate-500 dark:text-slate-400',
        ringColor: 'ring-slate-500',
      };
  }
}

// Framer Motion Variants
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.07,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -15 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 100, damping: 12 } },
};

const scoreCircleVariants: Variants = {
  hidden: { strokeDashoffset: 283 }, // Assuming circumference of ~283 for a 45 radius circle (2 * PI * 45)
  visible: (custom: number) => ({
    strokeDashoffset: 283 * (1 - custom / 100),
    transition: { duration: 1.2, ease: [0.33, 1, 0.68, 1] },
  }),
};

// Helper to get category icon
function getCategoryIcon(category?: string) {
  switch (category?.toLowerCase()) {
    case 'budgeting': return faWallet;
    case 'savings': return faPiggyBank;
    case 'debt': return faCreditCard;
    case 'investment': return faChartLine;
    case 'insurance': return faShieldAlt;
    default: return faQuestionCircle;
  }
}

export function FinancialHealthScorecardWidget({ widget }: { widget: IFinancialHealthScorecardWidget }) {
  const { data, showIndividualScores = true } = widget;

  const overallStatusStyles = useMemo(() => getFinancialStatusStyles(data?.overallStatus), [data?.overallStatus]);

  if (!data || !data.overallScore) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="p-6 text-center">
          <FontAwesomeIcon icon={faCircleExclamation} className="text-3xl text-slate-400 dark:text-slate-500 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No financial health data available.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Please check back later or try updating your information.</p>
        </div>
      </Widget>
    );
  }

  const overallScoreNormalized = Math.max(0, Math.min(100, data.overallScore));
  const radius = 45;
  const circumference = 2 * Math.PI * radius; // Approx 282.74

  return (
    <Widget widget={widget} controls={widget.controls}>
      <motion.div 
        className="p-4 md:p-6 flex flex-col space-y-6" 
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Overall Score Section */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center sm:justify-start text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="relative w-32 h-32 md:w-36 md:h-36 shrink-0">
            <svg className="w-full h-full" viewBox="0 0 100 100"> {/* Adjusted viewBox for easier calculations */}
              {/* Background Circle */}
              <circle
                cx="50" cy="50" r={radius}
                fill="none"
                strokeWidth="8"
                stroke="rgba(200, 200, 200, 0.5)" // Debug: Hardcoded background stroke
              />
              {/* Foreground Progress Circle */}
              <motion.circle // Changed back to motion.circle
                cx="50" cy="50" r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                stroke="blue" // Debug: Hardcoded foreground stroke
                strokeDasharray={circumference} // Re-added strokeDasharray
                strokeDashoffset={circumference / 4} // Debug: Static offset to show 3/4 of circle
                // variants={scoreCircleVariants} // Debug: Animation variants still commented out
                // custom={overallScoreNormalized} // Debug: Custom prop still commented out
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} // Kept for orientation
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl md:text-4xl font-bold ${overallStatusStyles.textColor}`}>{Math.round(overallScoreNormalized)}</span>
              <span className={`text-xs font-medium ${overallStatusStyles.textColor} opacity-80`}>/ 100</span>
            </div>
          </div>
          <div className="flex-grow">
            <motion.h3 variants={itemVariants} className={`text-2xl md:text-3xl font-semibold ${overallStatusStyles.textColor}`}>
              {data.overallStatus || 'Not Evaluated'}
            </motion.h3>
            {data.overallScore && (
                <motion.p variants={itemVariants} className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Your overall financial health score is {Math.round(overallScoreNormalized)} out of 100.
                </motion.p>
            )}
          </div>
        </motion.div>

        {/* Score Breakdown Section */}
        {showIndividualScores && data.items && data.items.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Score Breakdown</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((item) => {
                const itemStatusStyles = getFinancialStatusStyles(item.status);
                const itemScoreNormalized = Math.max(0, Math.min(100, item.score));
                return (
                  <motion.div 
                    key={item.id} 
                    variants={itemVariants}
                    className={`p-4 rounded-xl border ${itemStatusStyles.borderColor} ${itemStatusStyles.bgColor} shadow-lg hover:shadow-xl transition-shadow duration-300 bg-opacity-70 dark:bg-opacity-70 backdrop-blur-md`}
                  >
                    <div className="flex items-center mb-2">
                      <FontAwesomeIcon icon={getCategoryIcon(item.category)} className={`w-5 h-5 mr-3 ${itemStatusStyles.iconColor}`} />
                      <h5 className="text-md font-semibold text-slate-700 dark:text-slate-200 flex-grow truncate" title={item.category}>{item.category}</h5>
                      <span className={`text-sm font-bold ${itemStatusStyles.textColor}`}>{itemScoreNormalized}/100</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 my-2">
                        <motion.div 
                            className={`h-2 rounded-full ${item.category === 'Debt' ? 'bg-yellow-400' : itemStatusStyles.progressColor.replace('text-', 'bg-')}`} 
                            initial={{ width: 0 }} 
                            animate={{ width: `${itemScoreNormalized}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>
                    {item.explanation && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {item.explanation}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </motion.div>
    </Widget>
  );
}

// Next Best Action Widget
import { 
  faExclamationTriangle, 
  faArrowUp, 
  faArrowDown, 
  faInfoCircle,
  faTasks
} from '@fortawesome/free-solid-svg-icons';

interface PriorityStyle {
  icon: any; // FontAwesomeIconDefinition
  iconColor: string;
  bgColor: string; // Card background
  textColor: string; // Main text color on card
  borderColor: string;
  buttonBgColor: string;
  buttonHoverBgColor: string;
  badgeTextColor: string;
  badgeBgColor: string;
}

function getPriorityStyles(priority: 'low' | 'medium' | 'high' | 'urgent' | string | undefined): PriorityStyle {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return {
        icon: faExclamationTriangle,
        iconColor: 'text-red-500 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/40 backdrop-blur-md',
        textColor: 'text-red-700 dark:text-red-200',
        borderColor: 'border-red-500/50 dark:border-red-600/70',
        buttonBgColor: 'bg-red-600 dark:bg-red-700',
        buttonHoverBgColor: 'hover:bg-red-700 dark:hover:bg-red-800',
        badgeTextColor: 'text-red-700 dark:text-red-100',
        badgeBgColor: 'bg-red-100 dark:bg-red-500/60',
      };
    case 'high':
      return {
        icon: faArrowUp,
        iconColor: 'text-orange-500 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/40 backdrop-blur-md',
        textColor: 'text-orange-700 dark:text-orange-200',
        borderColor: 'border-orange-500/50 dark:border-orange-600/70',
        buttonBgColor: 'bg-orange-500 dark:bg-orange-600',
        buttonHoverBgColor: 'hover:bg-orange-600 dark:hover:bg-orange-700',
        badgeTextColor: 'text-orange-700 dark:text-orange-100',
        badgeBgColor: 'bg-orange-100 dark:bg-orange-500/60',
      };
    case 'medium':
      return {
        icon: faTasks,
        iconColor: 'text-sky-500 dark:text-sky-400',
        bgColor: 'bg-sky-50 dark:bg-sky-900/40 backdrop-blur-md',
        textColor: 'text-sky-700 dark:text-sky-200',
        borderColor: 'border-sky-500/50 dark:border-sky-600/70',
        buttonBgColor: 'bg-sky-500 dark:bg-sky-600',
        buttonHoverBgColor: 'hover:bg-sky-600 dark:hover:bg-sky-700',
        badgeTextColor: 'text-sky-700 dark:text-sky-100',
        badgeBgColor: 'bg-sky-100 dark:bg-sky-500/60',
      };
    case 'low':
      return {
        icon: faArrowDown,
        iconColor: 'text-emerald-500 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/40 backdrop-blur-md',
        textColor: 'text-emerald-700 dark:text-emerald-200',
        borderColor: 'border-emerald-500/50 dark:border-emerald-600/70',
        buttonBgColor: 'bg-emerald-500 dark:bg-emerald-600',
        buttonHoverBgColor: 'hover:bg-emerald-600 dark:hover:bg-emerald-700',
        badgeTextColor: 'text-emerald-700 dark:text-emerald-100',
        badgeBgColor: 'bg-emerald-100 dark:bg-emerald-500/60',
      };
    default:
      return {
        icon: faInfoCircle,
        iconColor: 'text-slate-500 dark:text-slate-400',
        bgColor: 'bg-slate-100 dark:bg-slate-800/50 backdrop-blur-md',
        textColor: 'text-slate-700 dark:text-slate-300',
        borderColor: 'border-slate-300/60 dark:border-slate-700/60',
        buttonBgColor: 'bg-primary-600 dark:bg-primary-500',
        buttonHoverBgColor: 'hover:bg-primary-700 dark:hover:bg-primary-600',
        badgeTextColor: 'text-slate-700 dark:text-slate-200',
        badgeBgColor: 'bg-slate-200 dark:bg-slate-700/70',
      };
  }
}

export function NextBestActionWidget({ widget }: { widget: INextBestActionWidget }) {
  const { data: actionsData, maxDisplayItems, filterByPriority } = widget;

  const actionsToDisplay = useMemo(() => {
    if (!actionsData || !Array.isArray(actionsData)) return [];

    let filteredActions = [...actionsData];

    if (filterByPriority && ['low', 'medium', 'high', 'urgent'].includes(filterByPriority as string)) {
      filteredActions = filteredActions.filter((action: INextBestActionItem) => action.priority === filterByPriority);
    }
    
    filteredActions.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    if (maxDisplayItems && maxDisplayItems > 0) {
      return filteredActions.slice(0, maxDisplayItems);
    }
    return filteredActions;
  }, [actionsData, maxDisplayItems, filterByPriority]);

  if (!actionsToDisplay || actionsToDisplay.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <motion.div 
          className="p-6 text-center flex flex-col items-center justify-center h-full"
          variants={cardVariants} initial="hidden" animate="visible"
        >
          <FontAwesomeIcon icon={faCircleCheck} className="text-4xl text-emerald-500 dark:text-emerald-400 mb-4" />
          <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">All Caught Up!</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">There are no pending actions for you at the moment.</p>
        </motion.div>
      </Widget>
    );
  }

  return (
    <Widget widget={widget} controls={widget.controls}>
      <motion.div 
        className="p-4 md:p-2 flex flex-col space-y-4"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {actionsToDisplay.map((action) => {
          const priorityStyles = getPriorityStyles(action.priority);
          return (
            <motion.div 
              key={action.id} 
              variants={itemVariants}
              className={`p-4 rounded-xl border ${priorityStyles.borderColor} ${priorityStyles.bgColor} shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group`}
            >
              <div className="flex items-start mb-2">
                <FontAwesomeIcon icon={priorityStyles.icon} className={`w-5 h-5 mr-3 mt-0.5 shrink-0 ${priorityStyles.iconColor}`} />
                <div className="flex-grow">
                  <h4 className={`text-md font-semibold ${priorityStyles.textColor.split(' ')[0]} dark:${priorityStyles.textColor.split(' ')[1]} group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors`}>
                    {action.title}
                  </h4>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${priorityStyles.badgeTextColor} ${priorityStyles.badgeBgColor}`}>
                    {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)} Priority
                  </span>
                </div>
              </div>
              <p className={`text-sm ${priorityStyles.textColor} mb-3 grow leading-relaxed pl-8`}>
                {action.message}
              </p>
              {action.callToAction && (
                <div className="mt-auto self-start pl-8 w-full sm:w-auto">
                  <a 
                    href={action.actionLink || '#'}
                    target={action.actionLink && action.actionLink.startsWith('http') ? '_blank' : '_self'}
                    rel={action.actionLink && action.actionLink.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-center text-white rounded-lg transition-colors duration-150 w-full sm:w-auto focus:ring-4 focus:outline-none ${priorityStyles.buttonBgColor} ${priorityStyles.buttonHoverBgColor} focus:ring-primary-300 dark:focus:ring-primary-800`}
                  >
                    {action.callToAction}
                    <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-3 w-3" />
                  </a>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </Widget>
  );
}

// Debt Visualizer Widget
export function DebtVisualizerWidget({ widget }: { widget: IDebtVisualizerWidget }) {
  const { data, strategy, title } = widget; // Added title from widget props

  if (!data || data.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <motion.div 
          className="p-6 text-center flex flex-col items-center justify-center h-full min-h-[200px]" // Added min-h for better empty state visibility
          variants={cardVariants} initial="hidden" animate="visible"
        >
          <FontAwesomeIcon icon={faCircleCheck} className="text-4xl text-emerald-500 dark:text-emerald-400 mb-4" />
          <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">No Debts to Display!</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">Looks like you're debt-free or haven't added any debts yet.</p>
        </motion.div>
      </Widget>
    );
  }
  
  // Ensure data is an array before sorting and reducing
  const validData = Array.isArray(data) ? data : [];

  const sortedDebts = [...validData].sort((a, b) => {
    if (strategy === 'snowball') {
      return (a.currentBalance || 0) - (b.currentBalance || 0); // Smallest balance first, handle undefined
    }
    // Default to avalanche (highest interest rate first)
    return (b.interestRate || 0) - (a.interestRate || 0); // Handle undefined
  });
  
  const totalOriginalBalance = validData.reduce((sum, debt) => sum + (debt.originalBalance || 0), 0);
  const totalCurrentBalance = validData.reduce((sum, debt) => sum + (debt.currentBalance || 0), 0);
  const totalPaid = totalOriginalBalance - totalCurrentBalance;
  const overallProgressPercentage = totalOriginalBalance > 0 ? Math.max(0, Math.min(100, (totalPaid / totalOriginalBalance) * 100)) : 0;

  const strategyIcon = strategy === 'snowball' ? faSnowflake : faFire;
  const strategyName = strategy === 'snowball' ? 'Snowball' : 'Avalanche';
  const strategyColor = strategy === 'snowball' ? 'text-sky-500 dark:text-sky-400' : 'text-orange-500 dark:text-orange-400';
  const strategyBg = strategy === 'snowball' ? 'bg-sky-100 dark:bg-sky-900/50' : 'bg-orange-100 dark:bg-orange-900/50';

  // Type assertion for debt items in map, assuming IDebtItem or similar from your types
  interface IDebtItem {
    id?: string; // Assuming id might be optional or part of a base type
    name: string;
    currentBalance: number;
    originalBalance: number;
    interestRate: number;
    payoffDate?: string; // Assuming payoffDate might be optional
  }

  return (
    <Widget widget={widget} controls={widget.controls}>
      <motion.div 
        className="p-4 md:p-5 flex flex-col space-y-5"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Overall Summary Card */}
        <motion.div 
          variants={itemVariants}
          className="p-5 rounded-xl bg-slate-100/80 dark:bg-slate-800/70 backdrop-blur-lg shadow-xl border border-slate-200 dark:border-slate-700/80" // Enhanced glassmorphism
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title || 'Debt Overview'}</h3>
            <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${strategyBg} ${strategyColor}`}>
              <FontAwesomeIcon icon={strategyIcon} className={`mr-1.5 w-3 h-3 ${strategyColor}`} />
              {strategyName} Strategy
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mb-4 items-end"> {/* Adjusted gap */}
            <div className="flex items-center space-x-3">
              <FontAwesomeIcon icon={faCoins} className="w-7 h-7 text-primary dark:text-primary-400" /> {/* Adjusted color */}
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Total Current Debt</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  ${totalCurrentBalance.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3 sm:justify-end">
              <FontAwesomeIcon icon={faChartPie} className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Overall Progress</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {overallProgressPercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3.5">
            <motion.div 
              className="bg-gradient-to-r from-emerald-400 to-green-500 dark:from-emerald-500 dark:to-green-600 h-3.5 rounded-full" // Removed transition-all, Framer handles it
              initial={{ width: '0%' }}
              animate={{ width: `${overallProgressPercentage}%` }}
              transition={{ duration: 1, ease: "circOut" }}
            ></motion.div>
          </div>
        </motion.div>

        {/* Individual Debt Cards */}
        <div className="space-y-3.5">
          {sortedDebts.map((debt: IDebtItem, index: number) => { // Added types for debt and index
            const individualProgress = debt.originalBalance > 0 ? Math.max(0, Math.min(100, ((debt.originalBalance - debt.currentBalance) / debt.originalBalance) * 100)) : 0;
            const isFocusDebt = index === 0;

            return (
              <motion.div 
                key={debt.id || `debt-${index}`} // Ensure unique key
                variants={itemVariants}
                className={`p-4 rounded-xl border shadow-md hover:shadow-lg transition-shadow duration-300 ${isFocusDebt ? 'border-primary-500/70 dark:border-primary-400/80 bg-primary-50/60 dark:bg-primary-900/40 backdrop-blur-md' : 'bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border-slate-200 dark:border-slate-700/60'}`} // Enhanced glassmorphism
              >
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faFileInvoiceDollar} className={`w-5 h-5 mr-2.5 ${isFocusDebt ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className={`text-md font-semibold ${isFocusDebt ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-200'}`}>
                      {debt.name}
                    </span>
                  </div>
                  {isFocusDebt && (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${strategyBg} ${strategyColor}`}>
                      <FontAwesomeIcon icon={strategyIcon} className={`mr-1 w-2.5 h-2.5 ${strategyColor}`} />
                      Focus Target
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400 mb-2.5 pl-7"> {/* pl-7 to align with icon */}
                  <div>Current: <span className="font-semibold text-slate-700 dark:text-slate-200">${debt.currentBalance.toLocaleString()}</span></div>
                  <div>APR: <span className="font-semibold text-slate-700 dark:text-slate-200">{debt.interestRate}%</span></div>
                  <div className="md:text-right">Payoff: <span className="font-semibold text-slate-700 dark:text-slate-200">{debt.payoffDate || 'N/A'}</span></div>
                </div>
                
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2.5 relative"> {/* Added relative and pl-7 for alignment */}
                  <div className="absolute left-0 top-0 bottom-0 flex items-center"> {/* This div is for potential icon if needed next to bar */}
                    {/* Icon could go here if desired */}
                  </div>
                  <motion.div 
                    className={`h-full rounded-full ${isFocusDebt ? 'bg-gradient-to-r from-primary-400 to-primary-600' : 'bg-gradient-to-r from-slate-400 to-slate-600'}`} // Gradient progress bar
                    initial={{ width: '0%' }}
                    animate={{ width: `${individualProgress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  ></motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </Widget>
  );
}

// ... (other imports remain the same)

// Retirement Readiness Widget
export function RetirementReadinessWidget({ widget }: { widget: IRetirementReadinessWidget }) {
  const { data: retirementData, title } = widget;
  const [selectedScenarioId, setSelectedScenarioId] = useState(retirementData.currentScenarioId);

  const currentScenario = useMemo(() => {
    return retirementData.scenarios.find(s => s.id === selectedScenarioId);
  }, [retirementData.scenarios, selectedScenarioId]);

  const getStatusColor = (status?: string) => {
    if (!status) return 'text-gray-500';
    switch (status) {
      case 'Ahead': return 'text-green-500 dark:text-green-400';
      case 'On Track': return 'text-blue-500 dark:text-blue-400';
      case 'Behind': return 'text-yellow-500 dark:text-yellow-400';
      case 'Needs Significant Work': return 'text-red-500 dark:text-red-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  if (!retirementData || !retirementData.scenarios || retirementData.scenarios.length === 0) {
    return <Widget widget={widget} controls={widget.controls}><div className="p-4 text-sm text-slate-500 dark:text-slate-400">No retirement scenarios available.</div></Widget>;
  }

  if (!currentScenario) {
    return <Widget widget={widget} controls={widget.controls}><div className="p-4 text-sm text-red-500 dark:text-red-400">Selected retirement scenario not found.</div></Widget>;
  }

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="flex flex-col p-1">
        {retirementData.scenarios.length > 1 && (
          <div className="mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
            <label htmlFor={`${widget.id}-scenario-select`} className="sr-only">Select Scenario</label>
            <select 
              id={`${widget.id}-scenario-select`}
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="w-full p-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:text-slate-200"
            >
              {retirementData.scenarios.map(scenario => (
                <option key={scenario.id} value={scenario.id}>{scenario.scenarioName}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center mb-3">
          <div className="relative w-16 h-16 mr-4 shrink-0">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${currentScenario.score}, 100`}
                className={`transform -rotate-90 origin-center transition-all duration-1000 ease-out ${getStatusColor(currentScenario.status)}`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{currentScenario.score}</div>
            </div>
          </div>
          
          <div className="flex-grow">
            <div className={`text-base font-semibold ${getStatusColor(currentScenario.status)}`}>
              {currentScenario.status}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Projected: <strong>${currentScenario.projectionAmount?.toLocaleString()}</strong> by {currentScenario.projectionDate}
            </div>
          </div>
        </div>
        
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-1">
          <p>{currentScenario.explanation}</p>
          {currentScenario.assumptions && <p><em>Assumptions: {currentScenario.assumptions}</em></p>}
        </div>
      </div>
    </Widget>
  );
}

// Enhanced Savings Goals Widget
export function EnhancedSavingsGoalsWidget({ widget }: { widget: IEnhancedSavingsGoalsWidget }) {
  const { data } = widget;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ahead': return 'text-green-500';
      case 'On Track': return 'text-blue-500';
      default: return 'text-yellow-500';
    }
  };
  
  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="space-y-4">
        {data.map((goal, index) => {
          const progress = (goal.savedAmount / goal.targetAmount) * 100;
          
          return (
            <div key={index} className="border-b border-gray-100 dark:border-gray-700/30 pb-3 last:border-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {goal.name}
                </span>
                <span className={`text-xs font-medium ${getStatusColor(goal.status)}`}>
                  {goal.status}
                </span>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>${goal.savedAmount?.toLocaleString()} of ${goal?.targetAmount?.toLocaleString()}</span>
                <span>Est. completion: {goal.estimatedCompletionDate}</span>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                    goal.status === 'Behind' ? 'bg-yellow-500' : 'bg-primary'
                  }`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}

// Insurance Coverage Widget
export function InsuranceCoverageWidget({ widget }: { widget: IInsuranceCoverageWidget }) {
  // Handle both data structures: direct array or items property
  // This supports both the sample data format and the form component format
  const items = Array.isArray(widget.data) ? widget.data : widget.data?.items;

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="space-y-3">
        {Array.isArray(items) && items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-100">{item.type || item.policyName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.provider}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300 capitalize">
                  {item.status || item.policyType || 'Active'}
                </span>
              </div>
              <div className="mt-2 text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">Coverage</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {item.coverage ? item.coverage : 
                   (typeof item.coverageAmount === 'number' ? `$${item.coverageAmount.toLocaleString()}` : '$0')}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">No policies to display.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Click the pencil to add one.</p>
          </div>
        )}
      </div>
    </Widget>
  );
}
