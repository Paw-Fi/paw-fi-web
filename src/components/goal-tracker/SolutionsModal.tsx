import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faArrowUp, 
  faMinus, 
  faCalendarAlt, 
  faChartLine, 
  faExclamationTriangle 
} from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function SolutionsModal({ 
  isOpen, 
  onClose, 
  savingsGap, 
  goal, 
  progressData,
  onAdjustTimeline
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  savingsGap: number;
  goal: any;
  progressData: any;
  onAdjustTimeline: () => void;
}) {
  const solutions = [
    {
      id: 'increase-income',
      title: 'Increase Your Income',
      icon: faArrowUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-500/30',
      strategies: [
        `Ask for a raise of $${Math.ceil(savingsGap * 1.3)}/month (accounting for taxes)`,
        'Start a side hustle or freelance work',
        'Sell unused items or rent out assets',
        'Pick up extra hours or overtime shifts'
      ],
      impact: 'High',
      difficulty: 'Medium'
    },
    {
      id: 'reduce-expenses',
      title: 'Cut Monthly Expenses',
      icon: faMinus,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-500/30',
      strategies: [
        `Review subscriptions and cancel $${Math.ceil(savingsGap * 0.3)}/month worth`,
        'Cook more meals at home instead of eating out',
        'Switch to cheaper phone/internet plans',
        'Reduce entertainment and shopping expenses'
      ],
      impact: 'Medium',
      difficulty: 'Low'
    },
    {
      id: 'optimize-timeline',
      title: 'Adjust Your Timeline',
      icon: faCalendarAlt,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-500/30',
      strategies: [
        `Extend target date by ${Math.ceil(savingsGap / progressData.monthlyCapacity * 12)} months`,
        'Break goal into smaller milestones',
        'Start with a lower target amount first',
        'Consider a phased approach to reaching your goal'
      ],
      impact: 'High',
      difficulty: 'Very Low'
    },
    {
      id: 'investment-boost',
      title: 'Investment Strategy',
      icon: faChartLine,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-500/30',
      strategies: [
        'Invest existing savings for higher returns',
        'Use dollar-cost averaging for consistent growth',
        'Consider low-cost index funds or ETFs',
        'Automate investments to reduce required manual savings'
      ],
      impact: 'Medium',
      difficulty: 'Medium'
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Very Low': return 'text-green-600 bg-green-100';
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'text-emerald-600 bg-emerald-100';
      case 'Medium': return 'text-blue-600 bg-blue-100';
      case 'Low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Savings Gap Solutions"
      size="large"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Monthly Shortfall: ${savingsGap.toLocaleString()}
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                You need ${progressData.requiredMonthly}/month but can currently save ${progressData.monthlyCapacity}/month. 
                Here are proven strategies to close this gap:
              </p>
            </div>
          </div>
        </div>

        {/* Solutions Grid */}
        <div className="space-y-6">
          {solutions.map((solution, index) => (
            <motion.div
              key={solution.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-6 bg-white dark:bg-gray-700/50 rounded-xl border-2 ${solution.borderColor}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${solution.bgColor} rounded-xl flex items-center justify-center`}>
                    <FontAwesomeIcon icon={solution.icon} className={`w-6 h-6 ${solution.color}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {solution.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(solution.impact)}`}>
                        {solution.impact} Impact
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(solution.difficulty)}`}>
                        {solution.difficulty} Difficulty
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {solution.strategies.map((strategy, strategyIndex) => (
                  <div
                    key={strategyIndex}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      {strategyIndex + 1}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {strategy}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="sm:order-1"
            >
              Close
            </Button>
            <Button
              onClick={onAdjustTimeline}
              className="bg-amber-600 hover:bg-amber-700 text-white sm:order-2"
            >
              <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 mr-2" />
              Adjust Timeline
            </Button>            
          </div>
        </div>
      </div>
    </Modal>
  );
}
