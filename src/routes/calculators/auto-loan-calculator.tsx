import { AutoLoanCalculator } from '@/components/calculators/auto-loan/auto-loan-calculator';
import { AutoLoanCalculatorSEOContent } from '@/components/calculators/auto-loan/auto-loan-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

function AutoLoanCalculatorPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-center">Auto Loan Calculator</h1>
      <p className="mb-6 text-lg text-center">
        Estimate your monthly auto loan payments, see a full amortization schedule, and learn about car financing.
      </p>
      <AutoLoanCalculator />
      <AutoLoanCalculatorSEOContent />
    </div>
  );
}

export const Route = createFileRoute('/calculators/auto-loan-calculator')({
  component: AutoLoanCalculatorPage,
});
