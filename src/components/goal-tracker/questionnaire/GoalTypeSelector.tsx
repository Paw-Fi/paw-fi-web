import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faPiggyBank, 
  faHome, 
  faChartLine, 
  faCoins, 
  faBullseye,
  faClock,
  faGraduationCap,
  faArrowRight
} from "@fortawesome/free-solid-svg-icons";
import { GOAL_TYPE_CONFIGS, type GoalType } from "@/components/goal-tracker/types";

interface GoalTypeSelectorProps {
  onSelect: (goalType: GoalType) => void;
  onCancel: () => void;
}

const goalTypeIcons = {
  retirement: faPiggyBank,
  home_buying: faHome,
  wealth: faChartLine,
  investment: faCoins,
  custom: faBullseye,
};

export function GoalTypeSelector({ onSelect, onCancel }: GoalTypeSelectorProps) {
  const goalTypes = Object.values(GOAL_TYPE_CONFIGS);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold text-foreground dark:text-dark-foreground mb-4">
          What's Your Financial Goal?
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Choose the type of financial goal you want to create. Our AI will generate a personalized strategy with smart milestones tailored to your specific needs.
        </p>
      </motion.div>

      {/* Goal Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {goalTypes.map((goalType, index) => (
          <motion.div
            key={goalType.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(goalType.id as GoalType)}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700 cursor-pointer group hover:shadow-lg transition-all duration-300"
          >
            {/* Icon and Badge */}
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 ${goalType.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <FontAwesomeIcon 
                  icon={goalTypeIcons[goalType.id as keyof typeof goalTypeIcons]} 
                  className="w-6 h-6 text-white" 
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  goalType.difficulty === 'beginner' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : goalType.difficulty === 'intermediate'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {goalType.difficulty}
                </span>
              </div>
            </div>

            {/* Content */}
            <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground mb-2 group-hover:text-primary transition-colors">
              {goalType.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              {goalType.description}
            </p>

            {/* Estimated Time */}
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-500 mb-4">
              <FontAwesomeIcon icon={faClock} className="w-4 h-4 mr-2" />
              <span>{goalType.estimatedTime}</span>
            </div>

            {/* Benefits */}
            <div className="space-y-2 mb-6">
              {goalType.benefits.slice(0, 3).map((benefit, benefitIndex) => (
                <div key={benefitIndex} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* Action */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-primary">Get Started</span>
              <FontAwesomeIcon 
                icon={faArrowRight} 
                className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform duration-300" 
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Popular Choice Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-center"
      >
        <div className="inline-flex items-center px-4 py-2 bg-primary/10 dark:bg-primary/20 rounded-full">
          <FontAwesomeIcon icon={faGraduationCap} className="w-4 h-4 text-primary mr-2" />
          <span className="text-sm font-medium text-primary">
            Most users start with Retirement Planning or Home Buying goals
          </span>
        </div>
      </motion.div>

      {/* Help Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="text-center mt-8"
      >
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Don't worry, you can always create multiple goals or modify them later. 
          Our AI will help you optimize your strategy as your situation changes.
        </p>
      </motion.div>
    </div>
  );
}