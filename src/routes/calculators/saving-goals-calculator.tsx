import { SavingGoalsCalculator } from '@/components/calculators/saving-goals/saving-goals-calculator';
import { SavingGoalsSEOContent } from '@/components/calculators/saving-goals/saving-goals-seo-contents';
import { createFileRoute } from '@tanstack/react-router';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { seo } from '@/utils/seo';
import { useNavigate, useSearch } from '@tanstack/react-router';

export const Route = createFileRoute('/calculators/saving-goals-calculator')({
  component: SavingGoalsCalculatorPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      goalId: (search.goalId as string) || '',
      source: (search.source as string) || ''
    };
  },
  head: () => {
    const pageUrl = 'https://moneko.io/calculators/saving-goals-calculator';
    const meta = seo({
      title: 'Savings Goal Calculator | Moneko',
      description: 'Define your savings goals and determine how much you need to save regularly to achieve them. Plan for your future with Moneko.',
      keywords: 'savings goal calculator, financial goals, saving plan, regular savings, Moneko',
      image: 'https://moneko.io/og-img.png',
      url: pageUrl,
    });
    
    // Add structured data for the savings goal calculator
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      "name": "Savings Goal Calculator",
      "description": "Define your savings goals and determine how much you need to save regularly to achieve them. Plan for your future with Moneko.",
      "url": pageUrl,
      "provider": {
        "@type": "Organization",
        "name": "Moneko",
        "url": "https://moneko.io/"
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
  const { goalId, source } = useSearch({ from: '/calculators/saving-goals-calculator' });
  
  return (
    <AmbientHaloLayout>
    <div className="container mx-auto px-4 py-4 md:px-8 lg:px-12">
      <HomeHeader/>
      <div className="mt-4 mb-8">
      <BreadCrumbsHeader/>
      </div>
      
      {/* AI Recommendation Context */}
      {source === 'ai_recommendation' && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                💡 Your AI coach recommended this calculator to help with your goal
              </p>
            </div>
          </div>
        </div>
      )}
      
      <h1 className="mb-8 text-3xl font-bold text-center text-foreground dark:text-dark-foreground">Savings Goal Calculator</h1>
      <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
        Find out how much you need to save each month or year to reach your savings goal, factoring in compound interest and your current balance.
      </p>
      <SavingGoalsCalculator goalId={goalId} />
      <SavingGoalsSEOContent />
    </div>
    </AmbientHaloLayout>
  );
}
