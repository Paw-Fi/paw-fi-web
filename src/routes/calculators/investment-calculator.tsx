import { InvestmentCalculator, InvestmentCalculatorSEOContent } from '@/components/calculators/investment/investment-calculator';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/calculators/investment-calculator')({
  component: InvestmentCalculatorPage,
});

function InvestmentCalculatorPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-center">Investment Calculator</h1>
      <p className="mb-6 text-lg text-center">
        Explore how your investments can grow over time and compare different scenarios. Calculate future value, required contributions, return rates, starting amounts, and investment durations.
      </p>
      <InvestmentCalculator />
      <InvestmentCalculatorSEOContent />
    </div>
  );
}
