import { RetirementCalculator } from '@/components/calculators/retirement/retirement-calculator';
import { RetirementCalculatorSEOContent } from '@/components/calculators/retirement/retirement-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

function RetirementCalculatorPage() {
  const navigate = useNavigate();
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

import { seo } from '@/utils/seo';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/calculators/retirement-calculator')({
  component: RetirementCalculatorPage,
  head: () => {
    const pageUrl = 'https://moneko.io/calculators/retirement-calculator';
    const meta = seo({
      title: 'Retirement Savings Calculator | Moneko',
      description: "Plan for your retirement. Estimate how much you need to save and how long your savings will last with Moneko's retirement calculator.",
      keywords: 'retirement calculator, retirement planning, savings goal, 401k, IRA, pension, Moneko',
      image: 'https://moneko.io/og-img.png',
      url: pageUrl,
    });
    
    // Add structured data for retirement calculator page
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      "name": "Retirement Savings Calculator",
      "description": "Plan for your retirement. Estimate how much you need to save and how long your savings will last with Moneko's retirement calculator.",
      "url": pageUrl,
      "provider": {
        "@type": "Organization",
        "name": "Moneko",
        "url": "https://moneko.io/"
      },
      "category": "Retirement Planning"
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
