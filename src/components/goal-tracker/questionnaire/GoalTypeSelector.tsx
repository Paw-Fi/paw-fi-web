import { motion } from "framer-motion";
import { GOAL_TYPE_CONFIGS, type GoalType } from "@/components/goal-tracker/types";

interface GoalTypeSelectorProps {
  onSelect: (goalType: GoalType) => void;
}

export function GoalTypeSelector({ onSelect }: GoalTypeSelectorProps) {
  const goalTypes = Object.values(GOAL_TYPE_CONFIGS);

  return (
    <div className="mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-light text-foreground mb-4">What are you saving for?</h1>
        <p className="text-lg text-muted-foreground">Select a goal to get started.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        {goalTypes.map((goalType, index) => (
          <motion.div
            key={goalType.id}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(goalType.id as GoalType)}
            className="bg-card rounded-3xl p-8 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col items-center text-center group"
          >           
            <h3 className="text-xl font-medium text-foreground mb-3">{goalType.name}</h3>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{goalType.description}</p>
            <div className="mt-auto">
              <div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform duration-200">
                <span>Get Started</span>
                <span className="ml-2 text-sm">→</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
