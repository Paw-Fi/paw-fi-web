import { MortgageCalculator } from '@/components/calculators/mortgage/mortgage';
import { MortgageCalculatorSEOContent } from '@/components/calculators/mortgage/mortgage-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { useNavigate } from '@tanstack/react-router';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';

export const Route = createFileRoute('/calculators/mortgage-calculator')({
  component: MortgageCalculatorPage,
  head: () => {
    // Use the canonical helper to ensure consistent URLs
    const routePath = '/calculators/mortgage-calculator';
    const pageUrl = getCanonicalUrl(routePath);
    const meta = seo({
      title: 'Mortgage Calculator | Moneko',
      description: 'Estimate your monthly mortgage payments, including principal, interest, taxes, and insurance (PITI). Analyze your home loan with Moneko.',
      keywords: 'mortgage calculator, home loan calculator, PITI calculator, amortization schedule, Moneko',
      image: 'https://moneko.io/og-img.png',
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
        "url": "https://moneko.io/"
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
<AmbientHaloLayout>
<div className="container mx-auto px-4 py-4 md:px-8 lg:px-12">
<HomeHeader/>
      <div className="mt-4 mb-8">
      <BreadCrumbsHeader/>
      </div>
      <h1 className="mb-8 text-3xl font-bold text-center">Mortgage Calculator</h1>
      <p className="mb-6 text-lg text-center">
        Calculate your monthly mortgage payments and see a complete amortization schedule.
      </p>
      <MortgageCalculator />
      <MortgageCalculatorSEOContent />
    </div>
    </AmbientHaloLayout>
  );
};
