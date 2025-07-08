import CompoundCalculator from '@/components/calculators/compound/compound-calculator';
import { CompoundCalculatorSEOContent } from '@/components/calculators/compound/compound-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

import { seo } from '@/utils/seo';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/calculators/compound-calculator')({
  component: CompoundCalculatorPage,
  head: () => {
    const pageUrl = 'https://moneko.io/calculators/compound-calculator';
    const meta = seo({
      title: 'Compound Interest Calculator | Moneko',
      description: 'Visualize the power of compound interest. Calculate how your investments can grow over time with our compound interest calculator.',
      keywords: 'compound interest calculator, investment growth, financial planning, compounding, Moneko',
      image: 'https://moneko.io/og-img.png',
      url: pageUrl,
    });
    
    // Add structured data for the calculator
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      "name": "Compound Interest Calculator",
      "description": "Interactive calculator to visualize how investments grow with compound interest over time",
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

function CompoundCalculatorPage() {
  const navigate = useNavigate();
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
