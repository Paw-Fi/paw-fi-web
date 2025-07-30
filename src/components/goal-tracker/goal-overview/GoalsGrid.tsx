import { FinancialGoal } from "../types/goal-types";
import { GoalCard } from "../shared/GoalCard";

interface GoalsGridProps {
  goals: FinancialGoal[];
  onGoalUpdate?: () => void;
}

export function GoalsGrid({ goals, onGoalUpdate }: GoalsGridProps) {
  return (
     
      <div                className="grid grid-cols-1 xl:grid-cols-3 gap-6"
>
        {goals.map((goal, index) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            index={index}
            onGoalUpdate={onGoalUpdate}
          />
        ))}
    </div>
  );
}