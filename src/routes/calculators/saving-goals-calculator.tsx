import { SavingGoalsCalculator } from '@/components/calculators/saving-goals/saving-goals-calculator';
import { SavingGoalsSEOContent } from '@/components/calculators/saving-goals/saving-goals-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/calculators/saving-goals-calculator')({
  component: SavingGoalsCalculatorPage,
});

function SavingGoalsCalculatorPage() {
  return (
    <div className="mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-center">Savings Goal Calculator</h1>
      <p className="mb-6 text-lg text-center">
        Find out how much you need to save each month or year to reach your savings goal, factoring in compound interest and your current balance.
      </p>
      <SavingGoalsCalculator />
      <SavingGoalsSEOContent />
    </div>
  );
}
