import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRocket,
  faUserPlus,
  faChartLine,
  faCheckCircle,
  faStar,
  faArrowRight,
  faLock,
  faBell,
  faSync,
  faClipboardList
} from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui/button';

interface FinalCallToActionPageProps {
  isLoggedIn: boolean;
  goalTitle: string;
  onComplete: () => void;
  onRegister: () => void;
}

export function FinalCallToActionPage({ 
  isLoggedIn, 
  goalTitle, 
  onComplete, 
  onRegister 
}: FinalCallToActionPageProps) {
  const features = [
    {
      icon: faChartLine,
      title: 'Track Progress',
      description: 'Monitor your savings and milestone completion with real-time updates'
    },
    {
      icon: faBell,
      title: 'Smart Reminders',
      description: 'Get personalized notifications to stay on track with your goals'
    },
    {
      icon: faSync,
      title: 'AI Updates',
      description: 'Receive AI-powered insights and strategy adjustments as you progress'
    },
    {
      icon: faClipboardList,
      title: 'Action Items',
      description: 'Manage your financial tasks and milestones in one organized place'
    }
  ];
  
  if (isLoggedIn) {
    return (
      <div className="text-center space-y-8">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1 
          }}
          className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mb-6"
        >
          <FontAwesomeIcon icon={faCheckCircle} className="w-10 h-10 text-white" />
        </motion.div>
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🎉 Your Plan is Ready!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            <strong>{goalTitle}</strong> has been saved to your dashboard. 
            You can now track your progress, manage milestones, and receive AI-powered insights.
          </p>
        </motion.div>
        
        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + (index * 0.1) }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-4">
                  <FontAwesomeIcon icon={feature.icon} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <Button
            onClick={onComplete}
            variant="primary"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 mr-3" />
            View Your Dashboard
            <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5 ml-3" />
          </Button>
        </motion.div>
      </div>
    );
  }
  
  // Not logged in - Registration prompt
  return (
    <div className="text-center space-y-8">
      {/* Hero Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.1 
        }}
        className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-6"
      >
        <FontAwesomeIcon icon={faRocket} className="w-10 h-10 text-white" />
      </motion.div>
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Ready to Start Your Journey?
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
          Your personalized <strong>{goalTitle}</strong> is ready! 
          Create a free account to save your plan, track progress, and achieve your financial dreams.
        </p>
      </motion.div>
      
      {/* Value Proposition */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8 max-w-4xl mx-auto border border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-center justify-center mb-6">
          <FontAwesomeIcon icon={faLock} className="w-6 h-6 text-blue-500 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            What You'll Get (100% Free)
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + (index * 0.1) }}
              className="flex items-start text-left"
            >
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <FontAwesomeIcon icon={feature.icon} className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="flex items-center justify-center space-x-8 text-sm text-gray-500 dark:text-gray-400"
        >
          <div className="flex items-center">
            <FontAwesomeIcon icon={faLock} className="w-4 h-4 mr-2" />
            <span>Secure & Private</span>
          </div>
          <div className="flex items-center">
            <FontAwesomeIcon icon={faStar} className="w-4 h-4 mr-2" />
            <span>100% Free</span>
          </div>
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 mr-2" />
            <span>No Credit Card</span>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="space-y-4"
      >
        <Button
          onClick={onRegister}
          variant="primary"
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <FontAwesomeIcon icon={faUserPlus} className="w-5 h-5 mr-3" />
          Create Free Account & Save Plan
          <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5 ml-3" />
        </Button>
        
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Takes less than 30 seconds • No spam, ever • Cancel anytime
        </p>
      </motion.div>
      
      {/* Alternative Option */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="pt-8 border-t border-gray-200 dark:border-gray-700"
      >
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Already have an account?
        </p>
        <Button
          onClick={onComplete}
          variant="outline"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          Sign In to Save Plan
        </Button>
      </motion.div>
    </div>
  );
}