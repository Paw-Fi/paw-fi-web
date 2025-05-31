import { SavingGoalsCalculator } from '@/components/calculators/saving-goals/saving-goals-calculator';
import { SavingGoalsSEOContent } from '@/components/calculators/saving-goals/saving-goals-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

import { seo } from '@/utils/seo';
import { LessonBackButton } from '@/components/learning/lesson-back-button';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/calculators/saving-goals-calculator')({
  component: SavingGoalsCalculatorPage,
  head: () => {
    const pageUrl = 'https://pawfi.app/calculators/saving-goals-calculator';
    const meta = seo({
      title: 'Savings Goal Calculator | PawFi',
      description: 'Define your savings goals and determine how much you need to save regularly to achieve them. Plan for your future with PawFi.',
      keywords: 'savings goal calculator, financial goals, saving plan, regular savings, PawFi',
      image: 'https://paw-fi.app/og-img.png',
      url: pageUrl,
    });
    
    // Add structured data for the savings goal calculator
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      "name": "Savings Goal Calculator",
      "description": "Define your savings goals and determine how much you need to save regularly to achieve them. Plan for your future with PawFi.",
      "url": pageUrl,
      "provider": {
        "@type": "Organization",
        "name": "PawFi",
        "url": "https://pawfi.app/"
      },
      "category": "Financial Planning Tool"
    };
    
    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ],
      script: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(structuredData)
        }
      ]
    };
  },
});

function SavingGoalsCalculatorPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto px-4 py-8">
            <LessonBackButton onBack={() => navigate({ to: "/calculators" })} />

      <h1 className="mb-8 text-3xl font-bold text-center">Savings Goal Calculator</h1>
      <p className="mb-6 text-lg text-center">
        Find out how much you need to save each month or year to reach your savings goal, factoring in compound interest and your current balance.
      </p>
      <SavingGoalsCalculator />
      <SavingGoalsSEOContent />
    </div>
  );
}
