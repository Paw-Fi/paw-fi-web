import { createFileRoute } from '@tanstack/react-router';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { StructuredData } from '@/components/seo/structured-data';
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips } from '@/components/seo/content-blocks';
import { useState } from 'react';

export const Route = createFileRoute('/guides/how-to-calculate-emergency-fund')({
  // Enable Static Site Generation for this content-heavy guide page  
  ssr: 'static',
  component: EmergencyFundGuide,
  head: () => {
    const pageUrl = getCanonicalUrl('/guides/how-to-calculate-emergency-fund');
    const title = 'How to Calculate Emergency Fund Amount | Complete Guide 2025 | Moneko';
    const description = 'Learn how to calculate the right emergency fund amount for your situation. Discover the 3-6 month rule, factors to consider, and calculation methods.';
    const keywords = 'emergency fund calculator, how much emergency fund, emergency savings amount, 3 months expenses, 6 months emergency fund';

    const meta = seo({
      title,
      description,
      keywords,
      image: 'https://moneko.io/og-img.png',
      url: pageUrl,
    });

    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl,
        },
      ],
    };
  },
});

function EmergencyFundGuide() {
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [emergencyMonths, setEmergencyMonths] = useState('3');
  const [incomeStability, setIncomeStability] = useState('stable');
  const [dependents, setDependents] = useState('0');
  const [currentSavings, setCurrentSavings] = useState('');

  const calculateEmergencyFund = () => {
    const expenses = parseFloat(monthlyExpenses);
    let months = parseFloat(emergencyMonths);
    
    if (expenses > 0) {
      // Adjust months based on factors
      if (incomeStability === 'unstable') months += 1;
      if (incomeStability === 'self-employed') months += 2;
      if (parseInt(dependents) > 0) months += 0.5 * parseInt(dependents);
      
      const targetAmount = expenses * months;
      const current = parseFloat(currentSavings) || 0;
      const remaining = Math.max(0, targetAmount - current);
      
      return {
        targetAmount,
        currentSavings: current,
        remaining,
        monthsNeeded: months,
        percentComplete: current > 0 ? (current / targetAmount) * 100 : 0
      };
    }
    return null;
  };

  const calculation = calculateEmergencyFund();

  const getProgressCategory = (percent: number) => {
    if (percent >= 100) return { category: 'Fully Funded', color: 'text-green-600 dark:text-green-400', description: 'Excellent - your emergency fund is complete!' };
    if (percent >= 75) return { category: 'Nearly Complete', color: 'text-blue-600 dark:text-blue-400', description: 'Great progress - almost there!' };
    if (percent >= 50) return { category: 'Halfway There', color: 'text-yellow-600 dark:text-yellow-400', description: 'Good progress - keep going!' };
    if (percent >= 25) return { category: 'Getting Started', color: 'text-orange-600 dark:text-orange-400', description: 'Good start - stay consistent!' };
    return { category: 'Just Beginning', color: 'text-red-600 dark:text-red-400', description: 'Time to start building your safety net' };
  };

  return (
    <AmbientHaloLayout>
      {/* HowTo Schema for Emergency Fund Calculation */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Calculate Your Emergency Fund Amount",
          description: "Complete guide to calculating the right emergency fund size based on your monthly expenses, income stability, and personal circumstances.",
          totalTime: "PT15M",
          estimatedCost: {
            currency: "USD",
            value: "0"
          },
          steps: [
            {
              name: "Calculate Monthly Essential Expenses",
              text: "Add up all necessary monthly expenses including housing, food, utilities, minimum debt payments, and essential transportation costs."
            },
            {
              name: "Determine Your Target Months",
              text: "Choose 3-6 months based on job stability: 3 months for stable employment, 6+ months for unstable income or self-employment."
            },
            {
              name: "Apply Personal Risk Factors",
              text: "Increase target months if you have dependents, work in a volatile industry, or have irregular income patterns."
            },
            {
              name: "Calculate Target Amount and Track Progress",
              text: "Multiply monthly expenses by target months to get your goal. Track progress monthly and adjust as expenses change."
            }
          ]
        }}
      />

      {/* FAQ Schema */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "How much should I have in my emergency fund?",
            answer: "Most financial experts recommend 3-6 months of essential expenses. If you have stable employment and dual income, 3 months may suffice. Self-employed individuals or those with unstable income should aim for 6-9 months."
          },
          {
            question: "Should I include all expenses or just essentials?",
            answer: "Base your emergency fund on essential expenses only: housing, food, utilities, minimum debt payments, insurance, and basic transportation. Exclude discretionary spending like dining out, entertainment, and luxury purchases."
          },
          {
            question: "Where should I keep my emergency fund?",
            answer: "Keep emergency funds in easily accessible accounts like high-yield savings accounts, money market accounts, or short-term CDs. Avoid investment accounts where values can fluctuate."
          },
          {
            question: "What if I can't save 3-6 months right away?",
            answer: "Start with a mini emergency fund of $500-1,000, then gradually build to your full target. Any amount is better than nothing - even $500 can cover many unexpected expenses."
          },
          {
            question: "When should I use my emergency fund?",
            answer: "Use emergency funds only for true emergencies: job loss, medical emergencies, major home repairs, or car breakdowns. Avoid using it for planned expenses, vacations, or wants vs. needs."
          }
        ]}
      />

      <div className="container mx-auto px-4 py-4 md:px-8 lg:px-12">
        <HomeHeader />
        <div className="mt-4 mb-8">
          <BreadCrumbsHeader />
        </div>

        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-3xl font-bold text-center text-foreground dark:text-dark-foreground">
            How to Calculate Your Emergency Fund Amount
          </h1>
          <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
            Build financial security with the right emergency fund size for your unique situation and risk factors.
          </p>

          {/* Content Attribution */}
          <div className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <p className="mb-1"><strong>Last Updated:</strong> September 7, 2025 | <strong>Reviewed by:</strong> Sabina Shao, CEO & Financial Education Expert</p>
            <p><strong>Data Sources:</strong> Federal Reserve Emergency Savings Data, Consumer Financial Protection Bureau, Financial Planning Association</p>
          </div>

          {/* Interactive Emergency Fund Calculator */}
          <div className="mb-12 p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-foreground dark:text-dark-foreground">
              Emergency Fund Calculator
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Monthly Essential Expenses ($)
                  </label>
                  <input
                    type="number"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="3,500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Housing, food, utilities, minimum debt payments, insurance</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Base Target Months
                  </label>
                  <select
                    value={emergencyMonths}
                    onChange={(e) => setEmergencyMonths(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  >
                    <option value="3">3 months</option>
                    <option value="4">4 months</option>
                    <option value="5">5 months</option>
                    <option value="6">6 months</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Income Stability
                  </label>
                  <select
                    value={incomeStability}
                    onChange={(e) => setIncomeStability(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  >
                    <option value="stable">Stable employment</option>
                    <option value="unstable">Unstable/seasonal work</option>
                    <option value="self-employed">Self-employed/freelance</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Number of Dependents
                  </label>
                  <select
                    value={dependents}
                    onChange={(e) => setDependents(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  >
                    <option value="0">No dependents</option>
                    <option value="1">1 dependent</option>
                    <option value="2">2 dependents</option>
                    <option value="3">3+ dependents</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Current Emergency Savings ($)
                  </label>
                  <input
                    type="number"
                    value={currentSavings}
                    onChange={(e) => setCurrentSavings(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="5,000"
                  />
                </div>
              </div>
            </div>

            {calculation && (
              <div className="mt-8 grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-blue-800 dark:text-blue-300">Your Emergency Fund Target</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Adjusted Target Months:</span>
                      <span className="font-semibold">{calculation.monthsNeeded.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target Amount:</span>
                      <span className="font-semibold">${calculation.targetAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Savings:</span>
                      <span className="font-semibold">${calculation.currentSavings.toLocaleString()}</span>
                    </div>
                    <hr className="my-2 border-blue-200 dark:border-blue-700" />
                    <div className="flex justify-between text-base font-bold">
                      <span>Remaining Needed:</span>
                      <span className="text-blue-600 dark:text-blue-400">${calculation.remaining.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-green-800 dark:text-green-300">Progress Status</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Progress</span>
                        <span className="text-sm font-semibold">{calculation.percentComplete.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min(100, calculation.percentComplete)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className={`text-center ${getProgressCategory(calculation.percentComplete).color}`}>
                      <div className="font-semibold">{getProgressCategory(calculation.percentComplete).category}</div>
                      <p className="text-xs mt-1">{getProgressCategory(calculation.percentComplete).description}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI-Optimized Content Blocks */}
          <div className="mt-12 space-y-8">
            <KeyTakeaways
              title="Emergency Fund Calculation Key Takeaways"
              points={[
                "Base emergency fund on essential monthly expenses, not total income or all expenses",
                "Target 3-6 months for stable employment, 6-9 months for self-employed or unstable income",
                "Add extra months if you have dependents or work in volatile industries",
                "Start with $500-1,000 mini emergency fund, then build to full target gradually",
                "Keep emergency funds in easily accessible, low-risk accounts like high-yield savings",
                "Review and adjust target amount annually as expenses and circumstances change"
              ]}
            />

            <QuickFacts
              title="Emergency Fund Quick Facts"
              facts={[
                {
                  label: "Recommended Amount",
                  value: "3-6 months expenses",
                  description: "Based on job stability and dependents"
                },
                {
                  label: "Essential Expenses Only",
                  value: "$2,500-4,500/month",
                  description: "Average for housing, food, utilities, minimum payments"
                },
                {
                  label: "Time to Build",
                  value: "12-24 months",
                  description: "Saving $200-500 monthly toward emergency fund"
                },
                {
                  label: "Best Account Type",
                  value: "High-yield savings",
                  description: "4.0-5.0% APY with easy access in 2025"
                }
              ]}
            />

            <AtAGlance
              title="Emergency Fund Building at a Glance"
              items={[
                {
                  category: "What to Include",
                  details: "Housing, food, utilities, minimum debt payments, insurance, transportation, basic healthcare costs"
                },
                {
                  category: "What to Exclude", 
                  details: "Dining out, entertainment, subscriptions, hobbies, travel, luxury purchases, extra debt payments"
                },
                {
                  category: "Target Timeline",
                  details: "Build $1,000 starter fund first, then 3-6 months expenses over 12-24 months"
                },
                {
                  category: "Storage Location",
                  details: "High-yield savings account, money market account, or short-term CD for accessibility"
                },
                {
                  category: "When to Use",
                  details: "Job loss, medical emergencies, major home/car repairs, unexpected essential expenses only"
                }
              ]}
            />

            <FinancialTips
              title="Smart Emergency Fund Building Strategies"
              level="beginner"
              tips={[
                "Automate savings to build your emergency fund consistently - set up automatic transfers after each paycheck",
                "Start with any amount you can afford, even $25/week adds up to $1,300 per year",
                "Use windfalls like tax refunds, bonuses, or gifts to jumpstart your emergency fund",
                "Keep emergency funds separate from checking accounts to avoid temptation to spend",
                "Reassess your target amount annually - life changes may require adjusting your goal",
                "Consider a high-yield savings account earning 4-5% APY to help your fund grow while accessible"
              ]}
            />
          </div>

          {/* Call to Action */}
          <div className="mt-12 p-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Start Building Your Emergency Fund Today</h2>
            <p className="mb-6">
              Use our savings goal calculator to create a plan for building your emergency fund systematically.
            </p>
            <div className="space-x-4">
              <a href="/calculators/saving-goals-calculator" className="inline-block bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Savings Goal Calculator
              </a>
              <a href="/calculators/compound-calculator" className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold border border-white hover:bg-orange-700 transition-colors">
                Growth Calculator
              </a>
            </div>
          </div>
        </div>
      </div>
    </AmbientHaloLayout>
  );
}