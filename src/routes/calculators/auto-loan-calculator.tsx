import { AutoLoanCalculator } from '@/components/calculators/auto-loan/auto-loan-calculator';
import { AutoLoanCalculatorSEOContent } from '@/components/calculators/auto-loan/auto-loan-seo-contents';
import { createFileRoute } from '@tanstack/react-router';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { HomeHeader } from '@/components/index/header';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { StructuredData } from '@/components/seo/structured-data';
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips } from '@/components/seo/content-blocks';
import { getCalculatorScreenshotData } from '@/utils/responsive-screenshots';
import { AutoLoanRatesTable, EconomicIndicatorsTable } from '@/components/seo/financial-data-tables';

interface AutoLoanInputs {
  price: number | '';
  down: number | '';
  rate: number | '';
  years: number | '';
}

function AutoLoanCalculatorPage() {
  const screenshotData = getCalculatorScreenshotData('auto-loan-calculator');

  return (
    <AmbientHaloLayout>
      {/* HowTo Schema for Auto Loan Calculation */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Calculate Auto Loan Payments and Compare Car Financing Options",
          description: "Step-by-step guide to calculate auto loan payments, understand car financing terms, and find the best car loan deal for your budget.",
          totalTime: "PT7M",
          estimatedCost: {
            currency: "USD",
            value: "0"
          },
          image: screenshotData.screenshot,
          steps: [
            {
              name: "Determine Your Car Budget",
              text: "Set a realistic budget for your car purchase, including the down payment, monthly payment, insurance, and maintenance costs.",
              url: "https://moneko.io/calculators/auto-loan-calculator#budget"
            },
            {
              name: "Research Car Prices and Trade-In Value",
              text: "Use resources like KBB, Edmunds, or Autotrader to research fair market prices for your desired vehicle and trade-in value if applicable.",
              url: "https://moneko.io/calculators/auto-loan-calculator#research"
            },
            {
              name: "Check Your Credit Score",
              text: "Review your credit report and score to understand what interest rate you might qualify for. Higher scores typically mean lower rates.",
              url: "https://moneko.io/calculators/auto-loan-calculator#credit-score"
            },
            {
              name: "Shop for the Best Auto Loan Rate",
              text: "Compare rates from banks, credit unions, and online lenders before visiting the dealership. Get pre-approved for better negotiating power.",
              url: "https://moneko.io/calculators/auto-loan-calculator#loan-shopping"
            },
            {
              name: "Calculate Your Monthly Payment",
              text: "Use the auto loan calculator to determine monthly payments based on the car price, down payment, interest rate, and loan term.",
              url: "https://moneko.io/calculators/auto-loan-calculator#calculate"
            },
            {
              name: "Consider Different Loan Terms",
              text: "Compare shorter terms (lower total interest) vs. longer terms (lower monthly payments) to find the best balance for your budget.",
              url: "https://moneko.io/calculators/auto-loan-calculator#loan-terms"
            },
            {
              name: "Factor in Additional Costs",
              text: "Include insurance, registration, taxes, and maintenance costs in your total car ownership budget beyond just the loan payment.",
              url: "https://moneko.io/calculators/auto-loan-calculator#total-costs"
            }
          ]
        }}
      />

      {/* Software Application Schema */}
      <StructuredData
        type="software"
        data={{
          name: "Auto Loan Payment Calculator",
          description: "Comprehensive car loan calculator with amortization schedule, payment comparison, and total interest calculation for smart vehicle financing decisions.",
          url: "https://moneko.io/calculators/auto-loan-calculator",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Any",
          requirements: "Web Browser, JavaScript enabled",
          softwareVersion: "2.1",
          dateModified: new Date().toISOString().split('T')[0],
          screenshot: screenshotData.screenshot,
          publisher: {
            name: 'Moneko',
            url: 'https://moneko.io',
            logo: 'https://moneko.io/logo192.png',
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.6",
            bestRating: "5",
            worstRating: "1",
            ratingCount: "1,428",
            reviewCount: "987"
          }
        }}
      />

      <div className="container mx-auto px-4 py-4 md:px-8 lg:px-12">
      <HomeHeader/>
      <div className="mt-4 mb-8">
      <BreadCrumbsHeader/>
      </div>
      <h1 className="mb-8 text-3xl font-bold text-center text-foreground dark:text-dark-foreground">Auto Loan Calculator</h1>
      <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
        Calculate your monthly car loan payments and compare financing options to find the best deal for your budget.
      </p>
      <AutoLoanCalculator />
      
      {/* AI-Optimized Content Blocks */}
      <div className="mt-12 space-y-8">
        <KeyTakeaways
          title="Auto Loan Key Takeaways"
          points={[
            "Shop for auto loans before visiting the dealership to get better negotiating power",
            "Credit scores above 720 typically qualify for the best interest rates and terms",
            "Shorter loan terms mean higher monthly payments but significantly less total interest paid",
            "Consider certified pre-owned vehicles for better value and remaining manufacturer warranties",
            "Factor in insurance, maintenance, and registration costs beyond just the loan payment",
            "Avoid negative equity by making a reasonable down payment and choosing appropriate loan terms"
          ]}
        />
        
        <QuickFacts
          title="Auto Loan Quick Facts"
          facts={[
            {
              label: "Average Auto Loan Rate",
              value: "6-12%",
              description: "Interest rates for new cars in 2024, varying by credit score and term length"
            },
            {
              label: "Recommended Down Payment",
              value: "10-20%",
              description: "Ideal down payment to avoid negative equity and reduce monthly payments"
            },
            {
              label: "Total Car Ownership Cost",
              value: "$0.56 per mile",
              description: "AAA's estimate including depreciation, insurance, maintenance, and fuel"
            },
            {
              label: "Credit Score Impact",
              value: "2-4% rate difference",
              description: "Interest rate difference between excellent (740+) and fair (580-669) credit"
            }
          ]}
        />
        
        <AtAGlance
          title="Auto Loan Planning at a Glance"
          items={[
            {
              category: "Best Loan Terms",
              details: "36-60 months for new cars, 24-48 months for used cars to minimize interest"
            },
            {
              category: "Down Payment Strategy",
              details: "20% for new cars, 10% minimum for used cars to avoid immediate negative equity"
            },
            {
              category: "Shopping Timeline",
              details: "Get pre-approved within 14 days to minimize credit score impact from multiple inquiries"
            },
            {
              category: "Total Budget Rule",
              details: "Keep total vehicle expenses (payment, insurance, gas, maintenance) under 15-20% of income"
            },
            {
              category: "Best Financing Sources",
              details: "Credit unions often offer lowest rates, followed by banks, then dealership financing"
            }
          ]}
        />
        
        <FinancialTips
          title="Smart Auto Loan Strategies"
          level="beginner"
          tips={[
            "Get pre-approved before car shopping to know your budget and negotiate better",
            "Research car values using KBB or Edmunds to avoid overpaying for the vehicle",
            "Consider certified pre-owned vehicles for better value and remaining warranties",
            "Negotiate the car price separately from financing to get the best overall deal",
            "Read the fine print for additional fees, extended warranties, or add-on products",
            "Make extra payments toward principal to pay off the loan faster and save interest"
          ]}
        />
      </div>
      
      {/* Current Market Data Tables */}
      <div className="mt-12 space-y-8">
        <h2 className="text-2xl font-bold text-center text-foreground dark:text-dark-foreground mb-6">
          Current Auto Loan Rates (September 2025)
        </h2>
        
        <AutoLoanRatesTable />
        <EconomicIndicatorsTable />
      </div>
      
      {/* FAQ Schema for Auto Loan Calculator */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "What factors affect my auto loan interest rate?",
            answer: "Your credit score is the biggest factor, followed by loan term length, down payment amount, new vs. used car, and the lender you choose. Credit scores above 720 typically qualify for the best rates, while scores below 580 may face higher rates or require a co-signer."
          },
          {
            question: "Should I get pre-approved for an auto loan?",
            answer: "Yes, getting pre-approved gives you negotiating power, helps you set a realistic budget, and can save you money. You'll know exactly how much you can borrow and at what rate, making it easier to focus on negotiating the car price rather than being sold on dealer financing."
          },
          {
            question: "What's the ideal auto loan term length?",
            answer: "For new cars, 36-60 months strikes the best balance between manageable payments and total interest paid. For used cars, 24-48 months is recommended since older vehicles depreciate faster and may need more repairs as the loan term extends."
          },
          {
            question: "How much should I put down on a car loan?",
            answer: "Aim for 20% down on new cars and 10% minimum on used cars to avoid negative equity (owing more than the car's worth). A larger down payment reduces your monthly payment, total interest paid, and helps you build positive equity faster."
          },
          {
            question: "Is it better to finance through a dealer or bank?",
            answer: "Credit unions typically offer the lowest rates, followed by banks, then dealer financing. However, dealers sometimes offer promotional rates (0% APR) that can beat bank rates. Always compare offers from multiple sources and negotiate based on the best rate you've found."
          },
          {
            question: "Can I pay off my auto loan early without penalties?",
            answer: "Most auto loans don't have prepayment penalties, but check your loan agreement to be sure. Paying extra toward the principal each month or making additional payments can significantly reduce the total interest paid and help you own the car sooner."
          }
        ]}
      />
      
      <AutoLoanCalculatorSEOContent />
    </div>
    </AmbientHaloLayout>
  );
}

export const Route = createFileRoute('/calculators/auto-loan-calculator')({
  component: AutoLoanCalculatorPage,
  head: () => {
    // Use the canonical helper to ensure consistent URLs
    const routePath = '/calculators/auto-loan-calculator';
    const pageUrl = getCanonicalUrl(routePath);
    const meta = seo({
      title: 'Free Auto Loan Calculator - Car Payment Estimator & Financing Calculator | Moneko',
      description: 'Calculate monthly car payments, total interest costs, and loan terms with our auto loan calculator. Compare financing options and find the best car loan rates.',
      keywords: 'auto loan calculator, car loan calculator, car payment calculator, vehicle financing calculator, car loan rates, auto financing, car payment estimator',
      image: 'https://moneko.io/og-img.png',
      url: pageUrl,
    });

    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ]
    };
  },
});
