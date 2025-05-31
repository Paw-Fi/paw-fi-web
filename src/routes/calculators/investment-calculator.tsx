import { InvestmentCalculator, InvestmentCalculatorSEOContent } from '@/components/calculators/investment/investment-calculator';
import { createFileRoute } from '@tanstack/react-router';

import { seo } from '@/utils/seo';
import { LessonBackButton } from '@/components/learning/lesson-back-button';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/calculators/investment-calculator')({
  component: InvestmentCalculatorPage,
  head: () => {
    const pageUrl = 'https://pawfi.app/calculators/investment-calculator';
    const meta = seo({
      title: 'Investment Growth Calculator | PawFi',
      description: "Project your investment growth over time. See how regular contributions and returns can build your wealth with PawFi's investment calculator.",
      keywords: 'investment calculator, investment growth, portfolio projection, wealth building, financial goals, PawFi',
      image: 'https://paw-fi.app/og-img.png',
      url: pageUrl,
    });
    
    // Add structured data for investment calculator page
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      "name": "Investment Growth Calculator",
      "description": "Project your investment growth over time. See how regular contributions and returns can build your wealth with PawFi's investment calculator.",
      "url": pageUrl,
      "provider": {
        "@type": "Organization",
        "name": "PawFi",
        "url": "https://pawfi.app/"
      },
      "category": "Investment"
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

function InvestmentCalculatorPage() {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto px-4 py-8">
            <LessonBackButton onBack={() => navigate({ to: "/calculators" })} />
      <h1 className="mb-8 text-3xl font-bold text-center">Investment Calculator</h1>
      <p className="mb-6 text-lg text-center">
        Explore how your investments can grow over time and compare different scenarios. Calculate future value, required contributions, return rates, starting amounts, and investment durations.
      </p>
      <InvestmentCalculator />
      <InvestmentCalculatorSEOContent />
    </div>
  );
}
