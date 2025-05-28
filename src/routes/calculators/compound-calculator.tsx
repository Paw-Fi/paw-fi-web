import CompoundCalculator from '@/components/calculators/compound/compound-calculator';
import { CompoundCalculatorSEOContent } from '@/components/calculators/compound/compound-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

import { seo } from '@/utils/seo';
import { useNavigate } from '@tanstack/react-router';
import { LessonBackButton } from '@/components/learning/lesson-back-button';

export const Route = createFileRoute('/calculators/compound-calculator')({
  component: CompoundCalculatorPage,
  head: () => {
    const meta = seo({
      title: 'Compound Interest Calculator | PawFi',
      description: 'Visualize the power of compound interest. Calculate how your investments can grow over time with our compound interest calculator.',
      keywords: 'compound interest calculator, investment growth, financial planning, compounding, PawFi',
      image: 'https://pawfi.app/og-img.png',
    });
    return {
      meta    
    };
  },
});

function CompoundCalculatorPage() {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto px-4 py-8 md:px-8 lg:px-12">
      <LessonBackButton onBack={() => navigate({ to: "/calculators" })} />
      <h1 className="mb-8 text-3xl font-bold text-center">Compound Interest Calculator</h1>
      <p className="mb-6 text-lg text-center">
        Discover the power of compound interest and see how your investments can grow over time.
      </p>
      <CompoundCalculator />
      <CompoundCalculatorSEOContent />
    </div>
  );
}
