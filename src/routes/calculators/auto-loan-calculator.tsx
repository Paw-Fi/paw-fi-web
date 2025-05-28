import { AutoLoanCalculator } from '@/components/calculators/auto-loan/auto-loan-calculator';
import { AutoLoanCalculatorSEOContent } from '@/components/calculators/auto-loan/auto-loan-seo-contents';
import { createFileRoute } from '@tanstack/react-router';
import { seo } from '@/utils/seo';
import { useNavigate } from '@tanstack/react-router';
import { LessonBackButton } from '@/components/learning/lesson-back-button';

function AutoLoanCalculatorPage() {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto px-4 py-8">
      <LessonBackButton onBack={() => navigate({ to: "/calculators" })} />
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
  head: () => {
    const meta = seo({
      title: 'Auto Loan Calculator | PawFi',
      description: "Calculate your auto loan payments, interest, and total cost with PawFi's easy-to-use car loan calculator.",
      keywords: 'auto loan calculator, car loan calculator, vehicle financing, car payment estimator, PawFi',
      image: 'https://paw-fi.app/og-img.png',
    });
    return {
      meta
    };
  },
});
