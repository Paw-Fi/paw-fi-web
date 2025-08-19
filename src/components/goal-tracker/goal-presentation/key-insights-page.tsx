import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBrain,
  faPiggyBank,
  faClock,
  faChartLine,
  faLightbulb,
  faExclamationTriangle,
  faCheckCircle,
  faArrowTrendUp
} from '@fortawesome/free-solid-svg-icons';
import type { Insight, AdvisorMessage } from '@/components/goal-tracker/types';
import MonekoAdvisorMessage from '@/components/ui/MonekoAdvisorMessage';

interface KeyInsightsPageProps {
  insights: Insight[];
  isLoggedIn: boolean;
  advisorMessage?: AdvisorMessage;
}

export function KeyInsightsPage({ insights, isLoggedIn, advisorMessage }: KeyInsightsPageProps) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'savings':
        return faPiggyBank;
      case 'timeline':
        return faClock;
      case 'market':
        return faChartLine;
      case 'strategy':
        return faLightbulb;
      default:
        return faArrowTrendUp;
    }
  };
  
  const getInsightColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-500'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          icon: 'text-yellow-500'
        };
      case 'low':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          icon: 'text-green-500'
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-500'
        };
    }
  };
  
  const getPriorityIcon = (priority: string, actionable: boolean) => {
    if (actionable) {
      return priority === 'high' ? faExclamationTriangle : faLightbulb;
    }
    return faCheckCircle;
  };
  
  // Group insights by priority
  const highPriorityInsights = insights.filter(i => i.priority === 'high');
  const mediumPriorityInsights = insights.filter(i => i.priority === 'medium');
  const lowPriorityInsights = insights.filter(i => i.priority === 'low');
  
  const renderInsightGroup = (title: string, groupInsights: Insight[], delay: number) => {
    if (groupInsights.length === 0) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="space-y-4"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
        <div className="space-y-4">
          {groupInsights.map((insight, index) => {
            const colors = getInsightColor(insight.priority);
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + (index * 0.1) }}
                className={`p-6 rounded-xl border ${colors.bg} ${colors.border} hover:shadow-lg transition-all duration-300`}
              >
                <div className="flex items-start">
                  <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center mr-4 flex-shrink-0`}>
                    <FontAwesomeIcon 
                      icon={getInsightIcon(insight.type)} 
                      className={`w-5 h-5 ${colors.icon}`} 
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {insight.title}
                      </h4>
                      <div className="flex items-center ml-4">
                        <FontAwesomeIcon 
                          icon={getPriorityIcon(insight.priority, insight.actionable)} 
                          className={`w-4 h-4 ${colors.icon}`} 
                        />
                        {insight.actionable && (
                          <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.icon}`}>
                            Action Required
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {insight.content}
                    </p>
                    <div className="flex items-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="capitalize">{insight.type} insight</span>
                      <span className="mx-2">•</span>
                      <span className="capitalize">{insight.priority} priority</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  };
  
  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-6">
          <FontAwesomeIcon icon={faBrain} className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Key Insights From Your AI Advisor
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Our AI has analyzed your financial situation and identified important insights to help you succeed. 
          Pay special attention to actionable items that require your attention.
        </p>
      </motion.div>

      {/* Moneko Advisor Message - Insights Message */}
      {advisorMessage?.content && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <MonekoAdvisorMessage
            message={{
              message: advisorMessage.content,
              tone: advisorMessage.tone
            }}
            showMessage={true}
            typewriterSpeed={75}
          />
        </motion.div>
      )}
      
      {/* Insights by Priority */}
      <div className="space-y-12">
        {renderInsightGroup(
          '🚨 High Priority Insights', 
          highPriorityInsights, 
          0.2
        )}
        
        {renderInsightGroup(
          '⚠️ Medium Priority Insights', 
          isLoggedIn ? mediumPriorityInsights : mediumPriorityInsights.slice(0, 1), 
          0.4
        )}
        
        {renderInsightGroup(
          '✅ Additional Insights', 
          isLoggedIn ? lowPriorityInsights : lowPriorityInsights.slice(0, 1), 
          0.6
        )}
        
        {!isLoggedIn && (mediumPriorityInsights.length > 1 || lowPriorityInsights.length > 1) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 text-center"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Additional Insights Available
            </h3>
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              +{(mediumPriorityInsights.length > 1 ? mediumPriorityInsights.length - 1 : 0) + (lowPriorityInsights.length > 1 ? lowPriorityInsights.length - 1 : 0)} more personalized insights available after sign up
            </p>
          </motion.div>
        )}
      </div>
      
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-8 border border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-center mb-4">
          <FontAwesomeIcon icon={faBrain} className="w-6 h-6 text-blue-500 mr-3" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Analysis Summary</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {insights.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Insights
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
              {insights.filter(i => i.actionable).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Action Items
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-2">
              {highPriorityInsights.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              High Priority
            </div>
          </div>
        </div>
        {!isLoggedIn && (
          <div className="mt-4 text-center text-sm text-blue-600 dark:text-blue-400 font-medium">
            Complete detailed analysis available after sign up
          </div>
        )}
      </motion.div>
    </div>
  );
}