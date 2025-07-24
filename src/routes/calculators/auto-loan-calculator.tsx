import { AutoLoanCalculator } from '@/components/calculators/auto-loan/auto-loan-calculator';
import { AutoLoanCalculatorSEOContent } from '@/components/calculators/auto-loan/auto-loan-seo-contents';
import { createFileRoute } from '@tanstack/react-router';
import { seo } from '@/utils/seo';
import { useNavigate } from '@tanstack/react-router';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { HomeHeader } from '@/components/index/header';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';

interface AutoLoanInputs {
  price: number | '';
  down: number | '';
  rate: number | '';
  years: number | '';
}

function AutoLoanCalculatorPage() {
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
  };

  return (
    <AmbientHaloLayout>
      <div className="container mx-auto px-4 py-4">
      <HomeHeader/>
      <div className="mt-4 mb-8">
      <BreadCrumbsHeader/>
      </div>
      <h1 className="mb-8 text-3xl font-bold text-center">Auto Loan Calculator</h1>
      <p className="mb-6 text-lg text-center">
        Estimate your monthly auto loan payments, see a full amortization schedule, and learn about car financing.
      </p>
      <AutoLoanCalculator />
      <AutoLoanCalculatorSEOContent />
    </div>
    </AmbientHaloLayout>
  );
}

export const Route = createFileRoute('/calculators/auto-loan-calculator')({
  component: AutoLoanCalculatorPage,
  head: () => {
    const pageUrl = 'https://moneko.io/calculators/auto-loan-calculator';
    const meta = seo({
      title: 'Auto Loan Calculator | Moneko',
      description: "Calculate your auto loan payments, interest, and total cost with Moneko's easy-to-use car loan calculator.",
      keywords: 'auto loan calculator, car loan calculator, vehicle financing, car payment estimator, Moneko',
      image: 'https://moneko.io/og-img.png',
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      "name": "Auto Loan Calculator",
      "description": "Calculate your auto loan payments, interest, and total cost with Moneko's easy-to-use car loan calculator.",
      "url": pageUrl,
      "provider": {
        "@type": "Organization",
        "name": "Moneko",
        "url": "https://moneko.io/"
      },
      "category": "Auto Loan"
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
