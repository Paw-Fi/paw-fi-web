import { RetirementCalculator } from '@/components/calculators/retirement/retirement-calculator';
import { RetirementCalculatorSEOContent } from '@/components/calculators/retirement/retirement-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

function RetirementCalculatorPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-center">Retirement Calculator</h1>
      <p className="mb-6 text-lg text-center">
        Estimate your retirement needs, savings, and withdrawal strategies.
      </p>
      <RetirementCalculator />
      <RetirementCalculatorSEOContent />
    </div>
  );
}

export const Route = createFileRoute('/calculators/retirement-calculator')({
  component: RetirementCalculatorPage,
});
