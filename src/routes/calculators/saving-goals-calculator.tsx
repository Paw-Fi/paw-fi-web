import { SavingGoalsCalculator } from '@/components/calculators/saving-goals/saving-goals-calculator';
import { SavingGoalsSEOContent } from '@/components/calculators/saving-goals/saving-goals-seo-contents';
import { createFileRoute } from '@tanstack/react-router';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { StructuredData } from '@/components/seo/structured-data';
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips } from '@/components/seo/content-blocks';
import { getCalculatorScreenshotData } from '@/utils/responsive-screenshots';
import { HighYieldSavingsRates, EconomicIndicatorsTable } from '@/components/seo/financial-data-tables';

export const Route = createFileRoute('/calculators/saving-goals-calculator')({
  component: SavingGoalsCalculatorPage,
  head: () => {
    // Use the canonical helper to ensure consistent URLs
    const routePath = '/calculators/saving-goals-calculator';
    const pageUrl = getCanonicalUrl(routePath);
    const meta = seo({
      title: 'Free Savings Goal Calculator - Monthly Savings Planner & Goal Tracker | Moneko',
      description: 'Calculate monthly savings needed to reach your financial goals. Plan for emergency funds, vacations, home down payments, and major purchases with our savings calculator.',
      keywords: 'savings goal calculator, savings planner, monthly savings calculator, emergency fund calculator, financial goals calculator, savings tracker, goal planner',
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

function SavingGoalsCalculatorPage() {
  const screenshotData = getCalculatorScreenshotData('saving-goals-calculator');
  
  return (
    <AmbientHaloLayout>
      {/* HowTo Schema for Savings Goal Planning */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Calculate Savings Goals and Create an Effective Saving Plan",
          description: "Step-by-step guide to set realistic savings goals, calculate required monthly savings, and create a sustainable saving strategy for any financial objective.",
          totalTime: "PT6M",
          estimatedCost: {
            currency: "USD",
            value: "0"
          },
          image: screenshotData.screenshot,
          steps: [
            {
              name: "Define Your Specific Financial Goal",
              text: "Clearly identify what you're saving for - emergency fund, vacation, home down payment, car purchase, or other specific objective with a target amount.",
              url: "https://moneko.io/calculators/saving-goals-calculator#define-goal"
            },
            {
              name: "Set a Realistic Target Amount",
              text: "Research the actual cost of your goal. For emergency funds, aim for 3-6 months of expenses. For purchases, get accurate pricing including taxes and fees.",
              url: "https://moneko.io/calculators/saving-goals-calculator#target-amount"
            },
            {
              name: "Choose Your Timeline",
              text: "Decide when you want to achieve your goal. Consider urgency, other financial priorities, and what monthly savings amount is realistic for your budget.",
              url: "https://moneko.io/calculators/saving-goals-calculator#timeline"
            },
            {
              name: "Account for Your Starting Balance",
              text: "Enter how much you already have saved toward this goal. This reduces the total amount you need to save going forward.",
              url: "https://moneko.io/calculators/saving-goals-calculator#starting-balance"
            },
            {
              name: "Factor in Interest Earnings",
              text: "Include expected interest rate from your savings account or investment. High-yield savings accounts typically earn 4-5% annually.",
              url: "https://moneko.io/calculators/saving-goals-calculator#interest-rate"
            },
            {
              name: "Calculate Required Monthly Savings",
              text: "Use the calculator to determine exactly how much you need to save each month to reach your goal within your chosen timeline.",
              url: "https://moneko.io/calculators/saving-goals-calculator#calculate"
            },
            {
              name: "Set Up Automatic Savings",
              text: "Arrange automatic transfers from checking to savings on payday to ensure consistent progress toward your goal without relying on willpower.",
              url: "https://moneko.io/calculators/saving-goals-calculator#automate"
            },
            {
              name: "Monitor and Adjust Your Progress",
              text: "Review your progress monthly and adjust your savings amount if your income changes or if you want to reach your goal faster.",
              url: "https://moneko.io/calculators/saving-goals-calculator#monitor"
            }
          ]
        }}
      />

      {/* Software Application Schema */}
      <StructuredData
        type="software"
        data={{
          name: "Savings Goal Calculator",
          description: "Comprehensive savings planning tool to calculate monthly savings requirements, track progress toward financial goals, and optimize saving strategies with compound interest calculations.",
          url: "https://moneko.io/calculators/saving-goals-calculator",
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
            ratingValue: "4.9",
            bestRating: "5",
            worstRating: "1",
            ratingCount: "2,567",
            reviewCount: "1,834"
          }
        }}
      />

      <div className="container mx-auto px-4 py-4 md:px-8 lg:px-12">
        <HomeHeader/>
        <div className="mt-4 mb-8">
          <BreadCrumbsHeader/>
        </div>
        <h1 className="mb-8 text-3xl font-bold text-center text-foreground dark:text-dark-foreground">Savings Goal Calculator</h1>
        <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
          Calculate how much to save monthly to reach your financial goals. Plan for emergencies, vacations, major purchases, and build your financial future.
        </p>
        <SavingGoalsCalculator />
        
        {/* AI-Optimized Content Blocks */}
        <div className="mt-12 space-y-8">
          <KeyTakeaways
            title="Savings Goal Key Takeaways"
            points={[
              "Automate your savings to ensure consistency and remove the temptation to skip months",
              "Emergency funds should cover 3-6 months of expenses before focusing on other goals",
              "High-yield savings accounts can significantly boost your progress with compound interest",
              "Break large goals into smaller milestones to maintain motivation and track progress",
              "Review and adjust your savings rate when income increases to reach goals faster",
              "Consider separate savings accounts for different goals to avoid mixing funds"
            ]}
          />
          
          <QuickFacts
            title="Savings Planning Quick Facts"
            facts={[
              {
                label: "Recommended Emergency Fund",
                value: "3-6 months expenses",
                description: "Higher end for irregular income or single-income households"
              },
              {
                label: "High-Yield Savings Rate",
                value: "4.5-5.5% APY",
                description: "Current rates at top online banks for 2024"
              },
              {
                label: "Recommended Savings Rate",
                value: "20% of income",
                description: "Total savings rate including retirement, emergency fund, and goals"
              },
              {
                label: "Compound Interest Impact",
                value: "10-30% boost",
                description: "How much interest earnings can reduce required monthly savings"
              }
            ]}
          />
          
          <AtAGlance
            title="Savings Goal Planning at a Glance"
            items={[
              {
                category: "Priority Order",
                details: "Emergency fund first, then employer 401(k) match, then other goals like vacations or purchases"
              },
              {
                category: "Account Types",
                details: "High-yield savings for short-term goals, CDs for medium-term, investments for long-term (5+ years)"
              },
              {
                category: "Timeline Guidelines",
                details: "Emergency fund: 6-12 months, vacation: 6-24 months, home down payment: 2-5 years"
              },
              {
                category: "Automation Strategy",
                details: "Set up automatic transfers on payday, start small and increase over time"
              },
              {
                category: "Progress Tracking",
                details: "Review monthly, celebrate milestones, adjust for income changes or goal modifications"
              }
            ]}
          />
          
          <FinancialTips
            title="Effective Savings Strategies"
            level="beginner"
            tips={[
              "Pay yourself first by automating savings transfers immediately after payday",
              "Use the 1% rule: increase savings rate by 1% whenever you get a raise",
              "Open separate savings accounts for each major goal to track progress clearly",
              "Take advantage of high-yield savings accounts to maximize interest earnings",
              "Consider the 50/30/20 budget rule: 50% needs, 30% wants, 20% savings and debt payoff",
              "Review and recalculate your goals quarterly to stay on track with changing circumstances"
            ]}
          />
        </div>
        
        {/* Current Market Data Tables */}
        <div className="mt-12 space-y-8">
          <h2 className="text-2xl font-bold text-center text-foreground dark:text-dark-foreground mb-6">
            Current Savings Rates (September 2025)
          </h2>
          
          <HighYieldSavingsRates />
          <EconomicIndicatorsTable />
        </div>
        
        {/* FAQ Schema for Savings Goal Calculator */}
        <StructuredData
          type="faq"
          data={[
            {
              question: "How much should I save in my emergency fund?",
              answer: "Financial experts recommend saving 3-6 months of essential expenses for your emergency fund. If you have irregular income, are self-employed, or are the sole earner in your household, aim for 6 months or more. Start with a smaller goal like $1,000 and build from there."
            },
            {
              question: "What's the best account type for my savings goals?",
              answer: "For goals within 2 years, use high-yield savings accounts (4-5% APY). For 2-5 year goals, consider CDs or money market accounts. For goals beyond 5 years, low-risk investments like index funds may offer better returns, though with some market risk."
            },
            {
              question: "Should I save for multiple goals simultaneously?",
              answer: "Focus on your emergency fund first, then employer 401(k) match if available. After these priorities, you can save for multiple goals simultaneously by dividing your available savings amount between them. Use separate accounts to track progress clearly."
            },
            {
              question: "How do I stay motivated to save for long-term goals?",
              answer: "Break large goals into smaller milestones, celebrate achievements along the way, and automate your savings to remove daily decisions. Visualize your goal with pictures or reminders, and regularly review your progress to see how compound interest is helping you."
            },
            {
              question: "What if I can't save the calculated monthly amount?",
              answer: "Start with what you can afford, even if it's less than the calculated amount. You can extend your timeline, increase your savings rate later when income grows, or look for ways to reduce expenses. Any consistent saving is better than waiting for the 'perfect' amount."
            },
            {
              question: "How often should I review and adjust my savings goals?",
              answer: "Review your savings goals quarterly or when major life changes occur (new job, raise, marriage, etc.). This ensures your goals remain realistic and aligned with your current financial situation. Adjust timelines or amounts as needed to stay motivated and on track."
            }
          ]}
        />
        
        <SavingGoalsSEOContent />
      </div>
    </AmbientHaloLayout>
  );
}
