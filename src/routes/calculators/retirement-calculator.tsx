import { RetirementCalculator } from '@/components/calculators/retirement/retirement-calculator';
import { RetirementCalculatorSEOContent } from '@/components/calculators/retirement/retirement-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

function RetirementCalculatorPage() {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto px-4 py-8">
            <LessonBackButton onBack={() => navigate({ to: "/calculators" })} />

      <h1 className="mb-8 text-3xl font-bold text-center">Retirement Calculator</h1>
      <p className="mb-6 text-lg text-center">
        Estimate your retirement needs, savings, and withdrawal strategies.
      </p>
      <RetirementCalculator />
      <RetirementCalculatorSEOContent />
    </div>
  );
}

import { seo } from '@/utils/seo';
import { LessonBackButton } from '@/components/learning/lesson-back-button';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/calculators/retirement-calculator')({
  component: RetirementCalculatorPage,
  head: () => {
    const meta = seo({
      title: 'Retirement Savings Calculator | PawFi',
      description: "Plan for your retirement. Estimate how much you need to save and how long your savings will last with PawFi's retirement calculator.",
      keywords: 'retirement calculator, retirement planning, savings goal, 401k, IRA, pension, PawFi',
      image: 'https://paw-fi.app/og-img.png',
    });
    return {
      meta
    };
  },
});
