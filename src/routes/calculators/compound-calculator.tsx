import CompoundCalculator from '@/components/calculators/compound/compound-calculator';
import { CompoundCalculatorSEOContent } from '@/components/calculators/compound/compound-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/calculators/compound-calculator')({
  component: CompoundCalculatorPage,
});

function CompoundCalculatorPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-8 lg:px-12">
      <h1 className="mb-8 text-3xl font-bold text-center">Compound Interest Calculator</h1>
      <p className="mb-6 text-lg text-center">
        Discover the power of compound interest and see how your investments can grow over time.
      </p>
      <CompoundCalculator />
      <CompoundCalculatorSEOContent />
    </div>
  );
}
