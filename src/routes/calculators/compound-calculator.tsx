import CompoundCalculator from '@/components/calculators/compound/compound-calculator';
import { CompoundCalculatorSEOContent } from '@/components/calculators/compound/compound-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

import { seo } from '@/utils/seo';
import { useNavigate } from '@tanstack/react-router';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { StructuredData } from '@/components/seo/structured-data';
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips } from '@/components/seo/content-blocks';
import { getCalculatorScreenshotData } from '@/utils/responsive-screenshots';
import { InvestmentReturnsBenchmarks, EconomicIndicatorsTable } from '@/components/seo/financial-data-tables';

export const Route = createFileRoute('/calculators/compound-calculator')({
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

function CompoundCalculatorPage() {
  const navigate = useNavigate();
  const screenshotData = getCalculatorScreenshotData('compound-calculator');
  
  return (
    <AmbientHaloLayout>
      {/* HowTo Schema for Compound Interest Calculation */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Calculate Compound Interest for Investment Growth",
          description: "Learn how to calculate compound interest to understand how your investments can grow over time with compounding returns.",
          totalTime: "PT5M",
          estimatedCost: {
            currency: "USD",
            value: "0"
          },
          image: screenshotData.screenshot,
          steps: [
            {
              name: "Enter Your Initial Investment Amount",
              text: "Input the principal amount you plan to invest initially. This is your starting capital that will begin earning compound interest.",
              url: "https://moneko.io/calculators/compound-calculator#principal"
            },
            {
              name: "Set Your Expected Annual Interest Rate",
              text: "Enter the annual interest rate you expect to earn on your investment. This can be based on historical market returns or expected portfolio performance.",
              url: "https://moneko.io/calculators/compound-calculator#rate"
            },
            {
              name: "Choose Your Investment Timeline",
              text: "Select how many years you plan to keep your money invested. Longer timelines allow for more powerful compounding effects.",
              url: "https://moneko.io/calculators/compound-calculator#time"
            },
            {
              name: "Select Compounding Frequency",
              text: "Choose how often interest is compounded - annually, semi-annually, quarterly, monthly, or daily. More frequent compounding increases your returns.",
              url: "https://moneko.io/calculators/compound-calculator#frequency"
            },
            {
              name: "Add Regular Contributions (Optional)",
              text: "Enter any additional monthly or annual contributions you plan to make to maximize the growth potential of your investment.",
              url: "https://moneko.io/calculators/compound-calculator#contributions"
            },
            {
              name: "Review Your Growth Projection",
              text: "Analyze the results showing your future value, total contributions, and compound interest earned. Use the visual chart to understand growth over time.",
              url: "https://moneko.io/calculators/compound-calculator#results"
            }
          ]
        }}
      />

      {/* Software Application Schema */}
      <StructuredData
        type="software"
        data={{
          name: "Compound Interest Calculator",
          description: "Free online calculator to visualize how investments grow with compound interest over time. Features interactive charts and detailed projections.",
          url: "https://moneko.io/calculators/compound-calculator",
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
            ratingCount: "2,847",
            reviewCount: "1,923"
          }
        }}
      />
      
      <div className="container mx-auto px-4 py-4 md:px-8 lg:px-12">
        <HomeHeader/>
        <div className="mt-4 mb-8">
          <BreadCrumbsHeader/>
        </div>
        <h1 className="mb-8 text-3xl font-bold text-center text-foreground dark:text-dark-foreground">Compound Interest Calculator</h1>
        <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
          Discover the power of compound interest and see how your investments can grow over time.
        </p>
        
        {/* Content Attribution & Credibility */}
        <div className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-4">
          <p className="mb-1"><strong>Last Updated:</strong> September 7, 2025 | <strong>Reviewed by:</strong> Sabina Shao, CEO & Financial Education Expert</p>
          <p><strong>Data Sources:</strong> Federal Reserve Economic Data (FRED), S&P 500 Historical Returns, Bureau of Labor Statistics</p>
        </div>
        
        <CompoundCalculator />
        
        {/* AI-Optimized Content Blocks */}
        <div className="mt-12 space-y-8">
          <KeyTakeaways
            title="Compound Interest Key Takeaways"
            points={[
              "Compound interest earns returns on both your principal and accumulated interest, creating exponential growth over time",
              "Starting early is crucial - even small amounts can grow significantly with decades of compounding",
              "Higher contribution frequency and compounding frequency both increase your total returns",
              "The 'Rule of 72' helps estimate doubling time: divide 72 by your interest rate",
              "Tax-advantaged accounts like 401(k)s and IRAs maximize compound growth by deferring taxes"
            ]}
          />
          
          <QuickFacts
            title="Compound Interest Quick Facts"
            facts={[
              {
                label: "Historical Stock Market Return",
                value: "7-10% annually",
                description: "S&P 500 average over the past century, adjusted for inflation"
              },
              {
                label: "Doubling Time at 7%",
                value: "~10.3 years",
                description: "Your money doubles approximately every 10 years at 7% compound interest"
              },
              {
                label: "Impact of Starting Early",
                value: "2-3x more wealth",
                description: "Starting at 25 vs 35 can result in 2-3 times more retirement wealth"
              },
              {
                label: "Power of Monthly Contributions",
                value: "$500/month → $1.37M",
                description: "At 7% annual return over 30 years with monthly compounding"
              }
            ]}
          />
          
          <AtAGlance
            title="Compound Interest at a Glance"
            items={[
              {
                category: "Best For",
                details: "Long-term investing, retirement planning, building wealth over time"
              },
              {
                category: "Time Horizon",
                details: "Minimum 5-10 years, ideal for 20+ years of growth"
              },
              {
                category: "Risk Level",
                details: "Varies by investment type - savings accounts (low) to stocks (higher)"
              },
              {
                category: "Tax Considerations",
                details: "Use tax-advantaged accounts (401k, IRA) to maximize compounding"
              },
              {
                category: "Key Factors",
                details: "Principal amount, interest rate, time period, compounding frequency"
              }
            ]}
          />
          
          <FinancialTips
            title="Compound Interest Pro Tips"
            level="beginner"
            tips={[
              "Start with any amount - even $25/month can grow to significant wealth over decades",
              "Automate your investments to ensure consistent contributions without thinking about it",
              "Reinvest all dividends and interest to maximize the compounding effect",
              "Use the 'pay yourself first' strategy - invest before spending on non-essentials",
              "Don't panic during market downturns - stay invested to benefit from long-term compounding",
              "Consider increasing contributions by 1% annually or with each raise"
            ]}
          />
        </div>
        
        {/* Current Market Data Tables */}
        <div className="mt-12 space-y-8">
          <h2 className="text-2xl font-bold text-center text-foreground dark:text-dark-foreground mb-6">
            Current Market Data (September 2025)
          </h2>
          
          <InvestmentReturnsBenchmarks />
          <EconomicIndicatorsTable />
        </div>
        
        {/* FAQ Schema for Compound Interest Calculator */}
        <StructuredData
          type="faq"
          data={[
            {
              question: "What is compound interest and how does it work?",
              answer: "Compound interest is interest calculated on both the initial principal and the accumulated interest from previous periods. Unlike simple interest, compound interest allows your money to grow exponentially over time because you earn interest on your interest."
            },
            {
              question: "How often should interest compound for maximum growth?",
              answer: "The more frequently interest compounds, the more you earn. Daily compounding provides the highest returns, followed by monthly, quarterly, semi-annually, and annually. However, the difference between daily and monthly compounding is often minimal."
            },
            {
              question: "What's the difference between compound interest and simple interest?",
              answer: "Simple interest is calculated only on the principal amount, while compound interest is calculated on both the principal and accumulated interest. Compound interest grows exponentially, making it much more powerful for long-term investing."
            },
            {
              question: "How can I use compound interest for retirement planning?",
              answer: "Start investing early and consistently to maximize compound interest benefits. Even small monthly contributions can grow significantly over decades. Use tax-advantaged accounts like 401(k)s and IRAs to compound your returns without immediate tax implications."
            },
            {
              question: "What interest rate should I expect for compound interest calculations?",
              answer: "Interest rates vary by investment type. Savings accounts offer 1-5%, CDs offer 3-6%, stock market historical averages are 7-10%, and bonds typically provide 2-8%. Use conservative estimates for realistic projections."
            }
          ]}
        />
        
        <CompoundCalculatorSEOContent />
      </div>
    </AmbientHaloLayout>
  );
}
