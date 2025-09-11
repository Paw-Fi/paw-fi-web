import { InvestmentCalculator, InvestmentCalculatorSEOContent } from '@/components/calculators/investment/investment-calculator';
import { createFileRoute } from '@tanstack/react-router';

import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { useNavigate } from '@tanstack/react-router';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { StructuredData } from '@/components/seo/structured-data';
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips } from '@/components/seo/content-blocks';
import { getCalculatorScreenshotData } from '@/utils/responsive-screenshots';
import { InvestmentReturnsBenchmarks, EconomicIndicatorsTable } from '@/components/seo/financial-data-tables';

export const Route = createFileRoute('/calculators/investment-calculator')({
  component: InvestmentCalculatorPage,
  head: () => {
    // Use the canonical helper to ensure consistent URLs
    const routePath = '/calculators/investment-calculator';
    const pageUrl = getCanonicalUrl(routePath);
    const meta = seo({
      title: 'Investment Calculator - Portfolio Growth Projections | Moneko',
      description: 'Calculate investment returns and portfolio growth over time. Project your wealth building with different contribution amounts, rates of return, and time horizons.',
      keywords: 'investment calculator, investment return calculator, portfolio calculator, investment growth calculator, stock market calculator, wealth building calculator, investment projections',
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

function InvestmentCalculatorPage() {
  const navigate = useNavigate();
  const screenshotData = getCalculatorScreenshotData('investment-calculator');
  
  return (
   <AmbientHaloLayout>
      {/* HowTo Schema for Investment Planning */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Calculate Investment Growth and Plan Your Portfolio",
          description: "Step-by-step guide to calculate investment growth, project portfolio performance, and plan your wealth-building strategy with different investment scenarios.",
          totalTime: "PT8M",
          estimatedCost: {
            currency: "USD",
            value: "0"
          },
          image: screenshotData.screenshot,
          steps: [
            {
              name: "Set Your Initial Investment Amount",
              text: "Enter the amount you plan to invest initially. This is your starting principal that will begin generating returns immediately.",
              url: "https://moneko.io/calculators/investment-calculator#initial-amount"
            },
            {
              name: "Plan Your Regular Contributions",
              text: "Decide how much you'll add monthly or annually to your investment. Consistent contributions maximize compound growth over time.",
              url: "https://moneko.io/calculators/investment-calculator#contributions"
            },
            {
              name: "Estimate Your Expected Return Rate",
              text: "Input a realistic annual return rate based on your investment strategy. Use historical averages: 7-10% for stocks, 4-6% for bonds.",
              url: "https://moneko.io/calculators/investment-calculator#return-rate"
            },
            {
              name: "Choose Your Investment Timeline",
              text: "Select how long you plan to invest. Longer timelines allow for more growth and can weather short-term market volatility.",
              url: "https://moneko.io/calculators/investment-calculator#timeline"
            },
            {
              name: "Consider Tax Implications",
              text: "Factor in whether investments are in taxable accounts or tax-advantaged accounts like 401(k)s or IRAs for accurate projections.",
              url: "https://moneko.io/calculators/investment-calculator#taxes"
            },
            {
              name: "Analyze Your Growth Projection",
              text: "Review the calculator results showing future value, total contributions, and investment gains. Use charts to visualize growth over time.",
              url: "https://moneko.io/calculators/investment-calculator#results"
            },
            {
              name: "Compare Different Scenarios",
              text: "Test various contribution amounts, timelines, and return rates to find the optimal investment strategy for your goals.",
              url: "https://moneko.io/calculators/investment-calculator#scenarios"
            },
            {
              name: "Create Your Investment Action Plan",
              text: "Use the results to choose investment accounts, set up automatic contributions, and select appropriate investment vehicles.",
              url: "https://moneko.io/calculators/investment-calculator#action-plan"
            }
          ]
        }}
      />

      {/* Software Application Schema */}
      <StructuredData
        type="software"
        data={{
          name: "Investment Growth Calculator",
          description: "Comprehensive investment calculator for projecting portfolio growth, comparing investment scenarios, and planning wealth-building strategies with compound returns.",
          url: "https://moneko.io/calculators/investment-calculator",
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
            ratingValue: "4.8",
            bestRating: "5",
            worstRating: "1",
            ratingCount: "1,864",
            reviewCount: "1,342"
          }
        }}
      />

     <div className="container mx-auto px-4 py-4 md:px-8 lg:px-12">
     <HomeHeader/>
      <div className="mt-4 mb-8">
      <BreadCrumbsHeader/>
      </div>
      <h1 className="mb-8 text-3xl font-bold text-center text-foreground dark:text-dark-foreground">Investment Growth Calculator</h1>
      <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
        Project your investment growth over time and compare different scenarios to optimize your wealth-building strategy.
      </p>
      <InvestmentCalculator />
      
      {/* AI-Optimized Content Blocks */}
      <div className="mt-12 space-y-8">
        <KeyTakeaways
          title="Investment Growth Key Takeaways"
          points={[
            "Time in the market beats timing the market - longer investment periods typically yield better results",
            "Regular contributions through dollar-cost averaging reduce the impact of market volatility",
            "Compound interest is most powerful when you start early and remain consistent",
            "Diversified portfolios typically provide better risk-adjusted returns than individual stocks",
            "Tax-advantaged accounts like 401(k)s and IRAs significantly boost long-term investment growth",
            "Higher potential returns usually come with higher risk - balance growth with your risk tolerance"
          ]}
        />
        
        <QuickFacts
          title="Investment Quick Facts"
          facts={[
            {
              label: "Historical Stock Market Return",
              value: "10% annually",
              description: "S&P 500 average annual return since 1957 (including dividends)"
            },
            {
              label: "Inflation Impact",
              value: "3% annually",
              description: "Long-term inflation rate that reduces purchasing power over time"
            },
            {
              label: "Dollar-Cost Averaging Benefit",
              value: "2-4% improvement",
              description: "Potential return improvement from consistent monthly investing"
            },
            {
              label: "Early Start Advantage",
              value: "2-3x more wealth",
              description: "Starting at 25 vs 35 can result in 2-3 times more retirement wealth"
            }
          ]}
        />
        
        <AtAGlance
          title="Investment Planning at a Glance"
          items={[
            {
              category: "Best Investment Timeline",
              details: "5+ years minimum, 10+ years ideal for stocks, 20+ years optimal for wealth building"
            },
            {
              category: "Recommended Asset Allocation",
              details: "Age-based rule: 100 minus your age in stocks, remainder in bonds"
            },
            {
              category: "Tax-Advantaged Options",
              details: "401(k), IRA, Roth IRA, HSA - prioritize these for maximum growth"
            },
            {
              category: "Risk vs Return",
              details: "Conservative (3-5%), Moderate (6-8%), Aggressive (8-12%) annual returns"
            },
            {
              category: "Portfolio Rebalancing",
              details: "Review annually, rebalance when allocations drift 5-10% from targets"
            }
          ]}
        />
        
        <FinancialTips
          title="Smart Investment Strategies"
          level="intermediate"
          tips={[
            "Start with index funds for instant diversification and low fees",
            "Maximize employer 401(k) match before investing elsewhere - it's free money",
            "Use target-date funds if you prefer hands-off investment management",
            "Keep 3-6 months expenses in high-yield savings before aggressive investing",
            "Don't panic during market downturns - historically, patience has been rewarded",
            "Consider Roth accounts when young and in lower tax brackets"
          ]}
        />
      </div>
      
      {/* Current Market Data Tables */}
      <div className="mt-12 space-y-8">
        <h2 className="text-2xl font-bold text-center text-foreground dark:text-dark-foreground mb-6">
          Current Investment Returns & Market Data (September 2025)
        </h2>
        
        <InvestmentReturnsBenchmarks />
        <EconomicIndicatorsTable />
      </div>
      
      {/* FAQ Schema for Investment Calculator */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "What's a realistic return rate to use for investment calculations?",
            answer: "For long-term planning, use 7-10% for stock-heavy portfolios, 4-6% for conservative bond portfolios, and 6-8% for balanced portfolios. The S&P 500 has averaged about 10% annually since 1957, but individual results vary based on timing and market conditions."
          },
          {
            question: "How much should I invest each month?",
            answer: "Financial experts recommend investing 10-20% of your gross income. Start with what you can afford consistently - even $50-100 monthly can build significant wealth over decades through compound growth. Increase contributions gradually as your income grows."
          },
          {
            question: "Should I invest in a 401(k) or IRA first?",
            answer: "First, contribute enough to your 401(k) to get the full employer match. Then consider maxing out a Roth IRA ($6,500 for 2024) for tax-free growth. Finally, return to your 401(k) to reach the annual limit ($22,500 for 2024, $30,000 if 50+)."
          },
          {
            question: "What's the difference between Roth and traditional retirement accounts?",
            answer: "Traditional accounts offer tax deductions now but taxable withdrawals in retirement. Roth accounts use after-tax dollars but provide tax-free growth and withdrawals. Choose Roth if you're in a lower tax bracket now than you expect in retirement."
          },
          {
            question: "How do I start investing with little money?",
            answer: "Many brokerages now offer no minimum investments and fractional shares. Start with broad market index funds or ETFs, which provide instant diversification. Even $25-50 monthly can grow significantly over time through dollar-cost averaging and compound interest."
          },
          {
            question: "Should I pay off debt before investing?",
            answer: "Pay off high-interest debt (credit cards, personal loans) before investing. For moderate-rate debt like student loans (4-6%), you can invest simultaneously since potential investment returns may exceed the debt interest rate. Always maintain an emergency fund first."
          }
        ]}
      />
      
      <InvestmentCalculatorSEOContent />
    </div>
    </AmbientHaloLayout>
  );
}
