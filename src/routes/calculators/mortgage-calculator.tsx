import { MortgageCalculator } from '@/components/calculators/mortgage/mortgage';
import { MortgageCalculatorSEOContent } from '@/components/calculators/mortgage/mortgage-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/calculators/mortgage-calculator')({
  component: MortgageCalculatorPage,
});
function MortgageCalculatorPage  ()  {
  return (
<div className="container mx-auto px-4 py-8 md:px-8 lg:px-12">
      <h1 className="mb-8 text-3xl font-bold text-center">Mortgage Calculator</h1>
      <p className="mb-6 text-lg text-center">
        Calculate your monthly mortgage payments and see a complete amortization schedule.
      </p>
      <MortgageCalculator />
      <MortgageCalculatorSEOContent />
    </div>
  );
};
