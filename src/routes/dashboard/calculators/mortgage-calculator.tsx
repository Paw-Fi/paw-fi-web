import { MortgageCalculator } from '@/components/calculators/mortgage/mortgage';
import { MortgageCalculatorSEOContent } from '@/components/calculators/mortgage/mortgage-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

import { seo } from '@/utils/seo';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/calculators/mortgage-calculator')({
  component: MortgageCalculatorPage,
  head: () => {
    const pageUrl = 'https://pawfi.app/calculators/mortgage-calculator';
    const meta = seo({
      title: 'Mortgage Calculator | Moneko',
      description: 'Estimate your monthly mortgage payments, including principal, interest, taxes, and insurance (PITI). Analyze your home loan with Moneko.',
      keywords: 'mortgage calculator, home loan calculator, PITI calculator, amortization schedule, Moneko',
      image: 'https://paw-fi.app/og-img.png',
      url: pageUrl,
    });
    
    // Add structured data for the mortgage calculator
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      "name": "Mortgage Calculator",
      "description": "Interactive calculator to estimate monthly mortgage payments and view amortization schedules",
      "url": pageUrl,
      "provider": {
        "@type": "Organization",
        "name": "Moneko",
        "url": "https://pawfi.app/"
      },
      "category": "Financial Education Tool"
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
function MortgageCalculatorPage  ()  {
  const navigate = useNavigate();
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
