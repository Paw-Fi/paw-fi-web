import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRoute,
  faCheckCircle,
  faDollarSign,
  faRepeat,
  faPlay,
  faClock,
  faFlag,
  faExclamationCircle,
  faCalendarAlt,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { formatProfileForAI } from '@/hooks/use-financial-health-profile';
import { profile } from 'console';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Milestone {
  id?: string;
  title: string;
  description: string;
  milestone_type: string;
  target_amount?: number;
  due_date: string;
  priority: string;
  frequency?: string;
  habit_description?: string;
  habit_target_value?: number;
}

interface NextStepsPageProps {
  milestones: Milestone[];
  strategy: string;
}

export function NextStepsPage({ milestones, strategy }: NextStepsPageProps) {
  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'amount':
        return faDollarSign;
      case 'habit':
        return faRepeat;
      case 'action':
        return faPlay;
      default:
        return faCheckCircle;
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-600 dark:text-red-400',
          dot: 'bg-red-500'
        };
      case 'high':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-600 dark:text-orange-400',
          dot: 'bg-orange-500'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-600 dark:text-yellow-400',
          dot: 'bg-yellow-500'
        };
      case 'low':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-600 dark:text-green-400',
          dot: 'bg-green-500'
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-600 dark:text-blue-400',
          dot: 'bg-blue-500'
        };
    }
  };
  
  const getTimelineStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: 'Overdue', color: 'text-red-600 dark:text-red-400' };
    } else if (diffDays <= 30) {
      return { text: `${diffDays} days`, color: 'text-orange-600 dark:text-orange-400' };
    } else if (diffDays <= 90) {
      return { text: `${Math.ceil(diffDays / 30)} months`, color: 'text-yellow-600 dark:text-yellow-400' };
    } else {
      return { text: `${Math.ceil(diffDays / 365)} years`, color: 'text-green-600 dark:text-green-400' };
    }
  };
  
  // Sort milestones by priority and due date
  const sortedMilestones = [...milestones].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
  
  // Get immediate actions (critical and high priority, due within 90 days)
  const immediateActions = sortedMilestones.filter(m => {
    const dueDate = new Date(m.due_date);
    const now = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return (m.priority === 'critical' || m.priority === 'high') && diffDays <= 90;
  });
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mb-6">
          <FontAwesomeIcon icon={faRoute} className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Your Action Plan
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Here's your personalized roadmap to success. Follow these milestones and actions 
          to stay on track and achieve your financial goal.
        </p>
      </motion.div>
      
      {/* Immediate Actions */}
      {immediateActions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-8 border border-red-200 dark:border-red-800"
        >
          <div className="flex items-center mb-6">
            <FontAwesomeIcon icon={faExclamationCircle} className="w-6 h-6 text-red-500 mr-3" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Immediate Actions Required</h2>
          </div>
          <div className="space-y-4">
            {immediateActions.map((milestone, index) => {
              const colors = getPriorityColor(milestone.priority);
              const timeline = getTimelineStatus(milestone.due_date);
              
              return (
                <motion.div
                  key={milestone.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + (index * 0.1) }}
                  className="flex items-start p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className={`w-3 h-3 rounded-full ${colors.dot} mt-2 mr-4 flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {milestone.title}
                      </h3>
                      <div className="flex items-center ml-4">
                        <FontAwesomeIcon icon={faClock} className={`w-4 h-4 ${timeline.color} mr-2`} />
                        <span className={`text-sm font-medium ${timeline.color}`}>
                          {timeline.text}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {milestone.description}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <span className="capitalize">{milestone.milestone_type}</span>
                      {milestone.target_amount && (
                        <>
                          <span className="mx-2">•</span>
                          <span>${milestone.target_amount.toLocaleString()}</span>
                        </>
                      )}
                      {milestone.frequency && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="capitalize">{milestone.frequency}</span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
      
      {/* All Milestones Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center mb-6">
          <FontAwesomeIcon icon={faFlag} className="w-6 h-6 text-blue-500 mr-3" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Complete Roadmap</h2>
        </div>
        
        <div className="space-y-6">
          {sortedMilestones.map((milestone, index) => {
            const colors = getPriorityColor(milestone.priority);
            const timeline = getTimelineStatus(milestone.due_date);
            
            return (
              <motion.div
                key={milestone.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + (index * 0.1) }}
                className="relative"
              >
                {/* Timeline line */}
                {index < sortedMilestones.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200 dark:bg-gray-600" />
                )}
                
                <div className="flex items-start">
                  <div className={`w-12 h-12 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center mr-4 flex-shrink-0`}>
                    <FontAwesomeIcon 
                      icon={getMilestoneIcon(milestone.milestone_type)} 
                      className={`w-5 h-5 ${colors.text}`} 
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {milestone.title}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 mr-2" />
                          <span>Due: {new Date(milestone.due_date).toLocaleDateString()}</span>
                          <span className="mx-2">•</span>
                          <span className={`capitalize px-2 py-1 rounded-full text-xs ${colors.bg} ${colors.text}`}>
                            {milestone.priority}
                          </span>
                        </div>
                      </div>
                      <div className={`text-right ${timeline.color}`}>
                        <div className="text-sm font-medium">{timeline.text}</div>
                        {milestone.target_amount && (
                          <div className="text-lg font-bold">
                            ${milestone.target_amount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      {milestone.description}
                    </p>
                    
                    {milestone.habit_description && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <FontAwesomeIcon icon={faRepeat} className="w-4 h-4 mr-2" />
                          <span className="font-medium">Habit: </span>
                          <span className="ml-1">{milestone.habit_description}</span>
                          {milestone.habit_target_value && (
                            <>
                              <span className="mx-2">•</span>
                              <span>${milestone.habit_target_value.toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
      
      {/* Strategy Reminder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-8 border border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-center mb-4">
          <FontAwesomeIcon icon={faArrowRight} className="w-6 h-6 text-blue-500 mr-3" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Remember Your Strategy</h2>
        </div>
        <article className="prose prose-purple mx-auto max-w-none dark:prose-invert lg:prose-lg px-4 py-6">
    <ReactMarkdown remarkPlugins={[remarkGfm]} >{strategy}</ReactMarkdown>
  </article>        
      </motion.div>
    </div>
  );
}