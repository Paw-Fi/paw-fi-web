import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faPiggyBank, 
  faHome, 
  faChartLine, 
  faCoins, 
  faBullseye,
  faArrowRight,
  faCreditCard,
  faShield,
  faMoneyBillTrendUp,
  IconDefinition
} from "@fortawesome/free-solid-svg-icons";
import { GOAL_TYPE_CONFIGS, type GoalType } from "@/components/goal-tracker/types";

interface GoalTypeSelectorProps {
  onSelect: (goalType: GoalType) => void;
}

const goalTypeIcons: Record<GoalType, IconDefinition> = {
  retirement: faPiggyBank,
  home_buying: faHome,
  wealth: faChartLine,
  investment: faCoins,
  passive_income: faMoneyBillTrendUp,
  custom: faBullseye,
  debt_payoff: faCreditCard,
  emergency_fund: faShield,
};

export function GoalTypeSelector({ onSelect }: GoalTypeSelectorProps) {
  const goalTypes = Object.values(GOAL_TYPE_CONFIGS);

  return (
    <div className="mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">What are you saving for?</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">Select a goal to get started.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {goalTypes.map((goalType, index) => (
          <motion.div
            key={goalType.id}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(goalType.id as GoalType)}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl cursor-pointer transition-all duration-300 flex flex-col items-center text-center"
          >
            <div className={`w-16 h-16 ${goalType.color} rounded-full flex items-center justify-center mb-4`}>
              <FontAwesomeIcon 
                icon={goalTypeIcons[goalType.id as keyof typeof goalTypeIcons]} 
                className="w-8 h-8 text-white" 
              />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{goalType.name}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{goalType.description}</p>
            <div className="mt-auto">
              <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
                <span>Get Started</span>
                <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 ml-2" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
