import { MortgageCalculator } from '@/components/calculators/mortgage/mortgage';
import { MortgageCalculatorSEOContent } from '@/components/calculators/mortgage/mortgage-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

import { seo } from '@/utils/seo';
import { LessonBackButton } from '@/components/learning/lesson-back-button';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/calculators/mortgage-calculator')({
  component: MortgageCalculatorPage,
  head: () => {
    const meta = seo({
      title: 'Mortgage Calculator | PawFi',
      description: 'Estimate your monthly mortgage payments, including principal, interest, taxes, and insurance (PITI). Analyze your home loan with PawFi.',
      keywords: 'mortgage calculator, home loan calculator, PITI calculator, amortization schedule, PawFi',
      image: 'https://pawfi.app/og-img.png',
    });
    return {
      meta
    };
  },
});
function MortgageCalculatorPage  ()  {
  const navigate = useNavigate();
  return (
<div className="container mx-auto px-4 py-8 md:px-8 lg:px-12">
<LessonBackButton onBack={() => navigate({ to: "/calculators" })} />
      <h1 className="mb-8 text-3xl font-bold text-center">Mortgage Calculator</h1>
      <p className="mb-6 text-lg text-center">
        Calculate your monthly mortgage payments and see a complete amortization schedule.
      </p>
      <MortgageCalculator />
      <MortgageCalculatorSEOContent />
    </div>
  );
};
