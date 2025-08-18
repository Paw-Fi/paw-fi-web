import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBullseye, 
  faCalendarAlt, 
  faChartLine, 
  faDollarSign,
  faExclamationCircle,
  faLightbulb,
  faRocket,
} from '@fortawesome/free-solid-svg-icons';
import type { GoalCreationResult } from '@/components/goal-tracker/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MonekoAdvisorMessage from '@/components/ui/MonekoAdvisorMessage';

interface GoalSummaryPageProps {
  goalData: GoalCreationResult;
  isLoggedIn: boolean;
}

export function GoalSummaryPage({ goalData, isLoggedIn }: GoalSummaryPageProps) {
  const { goal, projections } = goalData;
  
  // Calculate time to goal
  const startDate = new Date(goal?.start_date || Date.now());
  const targetDate = new Date(goal?.target_date || Date.now());
  const totalMonths = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  
  // Calculate progress
  const progressPercentage = goal?.progress_percentage || 0;
  const currentAmount = goal?.current_amount || 0;
  const targetAmount = goal?.target_amount || 0;
  
  // Monthly required from projections
  const monthlyRequired = projections?.monthlyRequired || 0;
  const confidenceLevel = Math.round((projections?.confidenceLevel || 0) * 100);
  
  const cards = [
    {
      icon: faBullseye,
      title: 'Target Goal',
      value: `$${targetAmount.toLocaleString()}`,
      subtitle: goal?.description?.slice(0, 100) + '...',
      color: 'blue'
    },
    {
      icon: faCalendarAlt,
      title: 'Timeline',
      value: `${totalMonths} months`,
      subtitle: `Target date: ${targetDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`,
      color: 'purple'
    },
    {
      icon: faChartLine,
      title: 'Current Progress',
      value: `${progressPercentage}%`,
      subtitle: `$${currentAmount.toLocaleString()} of $${targetAmount.toLocaleString()}`,
      color: 'green'
    },
    {
      icon: faDollarSign,
      title: 'Monthly Required',
      value: `$${monthlyRequired.toLocaleString()}`,
      subtitle: `${confidenceLevel}% confidence level`,
      color: 'orange'
    }
  ];
  
  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
      purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400',
      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400',
      orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };
  
  const urgentMilestones = (goalData.milestones || [])
    .filter(m => m.priority === 'critical' || m.priority === 'high')
    .slice(0, 3);
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
          <FontAwesomeIcon icon={faRocket} className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {goal?.title || 'Your Financial Goal'}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Here's your personalized financial plan created by our AI. Let's break down the key details of your journey to success.
        </p>
      </motion.div>

      {/* Moneko Advisor Message - Plan Message */}
      {goalData.advisorMessages?.planMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <MonekoAdvisorMessage
            message={goalData.advisorMessages.planMessage}
            showMessage={true}
            typewriterSpeed={25}
          />
        </motion.div>
      )}
      
      {/* Key Metrics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className={`p-6 rounded-xl border ${getColorClasses(card.color)} hover:shadow-lg transition-shadow duration-300`}
          >
            <div className="flex items-center mb-4">
              <div className={`w-10 h-10 rounded-lg bg-current bg-opacity-10 flex items-center justify-center mr-3`}>
                <FontAwesomeIcon icon={card.icon} className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{card.title}</h3>
            </div>
            <p className="text-2xl font-bold mb-2">{card.value}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{card.subtitle}</p>
            {!isLoggedIn && index >= 2 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">Advanced metrics available after sign up</p>
            )}
          </motion.div>
        ))}
      </motion.div>
      
      {/* Strategy Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 relative"
      >
        <div className="flex items-center mb-4">
          <FontAwesomeIcon icon={faLightbulb} className="w-6 h-6 text-yellow-500 mr-3" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Strategy</h2>
        </div>
        <article className={`prose prose-purple mx-auto max-w-none dark:prose-invert lg:prose-lg px-4 py-6 ${!isLoggedIn ? 'line-clamp-2' : ''}`}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              // Add proper spacing for paragraphs and other elements
              p: ({children}) => <p className="mb-4 leading-relaxed">{children}</p>,
              h1: ({children}) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
              h2: ({children}) => <h2 className="text-xl font-semibold mb-3 mt-5">{children}</h2>,
              h3: ({children}) => <h3 className="text-lg font-medium mb-2 mt-4">{children}</h3>,
              ul: ({children}) => <ul className="mb-4 pl-6 space-y-2">{children}</ul>,
              ol: ({children}) => <ol className="mb-4 pl-6 space-y-2">{children}</ol>,
              li: ({children}) => <li className="leading-relaxed">{children}</li>,
              blockquote: ({children}) => <blockquote className="border-l-4 border-purple-300 dark:border-purple-600 pl-4 my-4 italic">{children}</blockquote>,
              // Handle details/summary for collapsible sections
              details: ({children}) => (
                <details className="mb-4 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  {children}
                </details>
              ),
              summary: ({children}) => (
                <summary className="cursor-pointer bg-gray-50 dark:bg-gray-700 px-4 py-3 font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  {children}
                </summary>
              ),
              // Add spacing for other common elements
              strong: ({children}) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
              em: ({children}) => <em className="italic text-gray-700 dark:text-gray-300">{children}</em>,
              code: ({children}) => <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono">{children}</code>,
              pre: ({children}) => <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
            }}
          >
            {goalData.strategy}
          </ReactMarkdown>
        </article>
        {!isLoggedIn && (
          <div className="px-4 pb-4 text-center">
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
              Full strategy available after sign up
            </span>
          </div>
        )}
      </motion.div>
      
      {/* What Needs Attention */}
      {urgentMilestones.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 relative"
        >
          <div className="flex items-center mb-6">
            <FontAwesomeIcon icon={faExclamationCircle} className="w-6 h-6 text-red-500 mr-3" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">What Needs Your Attention</h2>
          </div>
          <div className="space-y-4">
            {urgentMilestones.slice(0, isLoggedIn ? urgentMilestones.length : 2).map((milestone, index) => (
              <div 
                key={milestone.id || index}
                className="flex items-start p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className={`
                  w-2 h-2 rounded-full mt-2 mr-4 flex-shrink-0
                  ${milestone.priority === 'critical' ? 'bg-red-500' : 'bg-orange-500'}
                `} />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {milestone.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Due: {new Date(milestone.due_date || '').toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {milestone.description}
                  </p>
                  {!isLoggedIn && index >= 1 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">Detailed action plan available after sign up</p>
                  )}
                </div>
              </div>
            ))}
            {!isLoggedIn && urgentMilestones.length > 2 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  +{urgentMilestones.length - 2} more priority action{urgentMilestones.length > 3 ? 's' : ''} available after sign up
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}