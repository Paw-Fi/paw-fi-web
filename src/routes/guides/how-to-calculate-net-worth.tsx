import { createFileRoute } from '@tanstack/react-router';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { StructuredData } from '@/components/seo/structured-data';
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips } from '@/components/seo/content-blocks';
import { useState } from 'react';

export const Route = createFileRoute('/guides/how-to-calculate-net-worth')({
  component: NetWorthGuide,
  head: () => {
    const pageUrl = getCanonicalUrl('/guides/how-to-calculate-net-worth');
    const title = 'How to Calculate Net Worth | Complete Guide with Examples | Moneko';
    const description = 'Learn how to calculate your net worth step-by-step. Understand what counts as assets and liabilities, and track your financial progress over time.';
    const keywords = 'net worth calculator, how to calculate net worth, assets minus liabilities, personal finance net worth, wealth calculation';

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

function NetWorthGuide() {
  const [assets, setAssets] = useState({
    cashSavings: '',
    checkingAccount: '',
    investments: '',
    retirement: '',
    realEstate: '',
    vehicle: '',
    other: ''
  });

  const [liabilities, setLiabilities] = useState({
    mortgage: '',
    creditCards: '',
    studentLoans: '',
    autoLoans: '',
    personalLoans: '',
    other: ''
  });

  const calculateNetWorth = () => {
    const totalAssets = Object.values(assets).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
    const totalLiabilities = Object.values(liabilities).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
    return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
  };

  const { totalAssets, totalLiabilities, netWorth } = calculateNetWorth();

  const getNetWorthCategory = (netWorth: number) => {
    if (netWorth >= 1000000) return { category: 'High Net Worth', color: 'text-green-600 dark:text-green-400', description: '$1M+ - Excellent financial position' };
    if (netWorth >= 100000) return { category: 'Strong Position', color: 'text-blue-600 dark:text-blue-400', description: 'Building substantial wealth' };
    if (netWorth >= 0) return { category: 'Positive Net Worth', color: 'text-purple-600 dark:text-purple-400', description: 'Assets exceed debts - good foundation' };
    return { category: 'Negative Net Worth', color: 'text-red-600 dark:text-red-400', description: 'Focus on debt reduction and asset building' };
  };

  return (
    <AmbientHaloLayout>
      {/* HowTo Schema for Net Worth Calculation */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Calculate Your Personal Net Worth",
          description: "Complete guide to calculating net worth by listing assets, liabilities, and understanding what counts in each category.",
          totalTime: "PT15M",
          estimatedCost: {
            currency: "USD",
            value: "0"
          },
          steps: [
            {
              name: "List All Your Assets",
              text: "Calculate the current value of everything you own including cash, investments, real estate, vehicles, and personal property."
            },
            {
              name: "List All Your Liabilities",
              text: "Add up all your debts including mortgages, credit cards, student loans, auto loans, and personal loans."
            },
            {
              name: "Apply the Net Worth Formula",
              text: "Subtract total liabilities from total assets to get your net worth: Assets - Liabilities = Net Worth."
            },
            {
              name: "Track Changes Over Time",
              text: "Calculate your net worth regularly (monthly or quarterly) to monitor your financial progress and wealth building."
            }
          ]
        }}
      />

      {/* FAQ Schema */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "What is net worth and why does it matter?",
            answer: "Net worth is the difference between what you own (assets) and what you owe (liabilities). It's the best single measure of your overall financial health and wealth-building progress."
          },
          {
            question: "What counts as assets in net worth calculation?",
            answer: "Assets include cash, savings accounts, investments, retirement accounts, real estate, vehicles, jewelry, art, and other valuable items you could sell for money."
          },
          {
            question: "Should I include my home in net worth calculation?",
            answer: "Yes, include your home's current market value as an asset, and include any remaining mortgage balance as a liability. Use recent comparable sales or online estimates for valuation."
          },
          {
            question: "What is a good net worth for my age?",
            answer: "A common rule of thumb is that your net worth should equal your age times your annual income divided by 10. For example, a 30-year-old earning $50,000 should aim for a net worth of $150,000."
          },
          {
            question: "How often should I calculate my net worth?",
            answer: "Calculate your net worth monthly or quarterly to track progress. Annual calculations are minimum for monitoring long-term wealth building and financial goal achievement."
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
            How to Calculate Your Net Worth
          </h1>
          <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
            Master the fundamental calculation that shows your true financial position and wealth-building progress.
          </p>

          {/* Content Attribution */}
          <div className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <p className="mb-1"><strong>Last Updated:</strong> September 7, 2025 | <strong>Reviewed by:</strong> Yifan Lim, CTO & Financial Systems Expert</p>
            <p><strong>Data Sources:</strong> Federal Reserve Survey of Consumer Finances, FDIC National Survey, Financial Planning Standards</p>
          </div>

          {/* Interactive Net Worth Calculator */}
          <div className="mb-12 p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-foreground dark:text-dark-foreground">
              Net Worth Calculator
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Assets Section */}
              <div>
                <h3 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
                  Assets (What You Own)
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground">
                      Cash & Savings ($)
                    </label>
                    <input
                      type="number"
                      value={assets.cashSavings}
                      onChange={(e) => setAssets({...assets, cashSavings: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground text-sm"
                      placeholder="25,000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground">
                      Checking Account ($)
                    </label>
                    <input
                      type="number"
                      value={assets.checkingAccount}
                      onChange={(e) => setAssets({...assets, checkingAccount: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground text-sm"
                      placeholder="5,000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground">
                      Investments ($)
                    </label>
                    <input
                      type="number"
                      value={assets.investments}
                      onChange={(e) => setAssets({...assets, investments: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground text-sm"
                      placeholder="50,000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground">
                      Retirement Accounts ($)
                    </label>
                    <input
                      type="number"
                      value={assets.retirement}
                      onChange={(e) => setAssets({...assets, retirement: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground text-sm"
                      placeholder="75,000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground">
                      Real Estate Value ($)
                    </label>
                    <input
                      type="number"
                      value={assets.realEstate}
                      onChange={(e) => setAssets({...assets, realEstate: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground text-sm"
                      placeholder="300,000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground">
                      Vehicle Value ($)
                    </label>
                    <input
                      type="number"
                      value={assets.vehicle}
                      onChange={(e) => setAssets({...assets, vehicle: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground text-sm"
                      placeholder="15,000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground">
                      Other Assets ($)
                    </label>
                    <input
                      type="number"
                      value={assets.other}
                      onChange={(e) => setAssets({...assets, other: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground text-sm"
                      placeholder="10,000"
                    />
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-lg font-semibold text-green-700 dark:text-green-400">
                    Total Assets: ${totalAssets.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Liabilities Section */}
              <div>
                <h3 className="text-xl font-semibold mb-4 text-red-600 dark:text-red-400">
                  Liabilities (What You Owe)
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground">
                      Mortgage Balance ($)
                    </label>
                    <input
                      type="number"
                      value={liabilities.mortgage}
                      onChange={(e) => setLiabilities({...liabilities, mortgage: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground text-sm"
                      placeholder="250,000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground">
                      Credit Card Debt ($)
                    </label>
                    <input
                      type="number"
                      value={liabilities.creditCards}
                      onChange={(e) => setLiabilities({...liabilities, creditCards: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground text-sm"
                      placeholder="8,000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground">
                      Student Loans ($)
                    </label>
                    <input
                      type="number"
                      value={liabilities.studentLoans}
                      onChange={(e) => setLiabilities({...liabilities, studentLoans: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground text-sm"
                      placeholder="35,000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground">
                      Auto Loans ($)
                    </label>
                    <input
                      type="number"
                      value={liabilities.autoLoans}
                      onChange={(e) => setLiabilities({...liabilities, autoLoans: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground text-sm"
                      placeholder="12,000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground">
                      Personal Loans ($)
                    </label>
                    <input
                      type="number"
                      value={liabilities.personalLoans}
                      onChange={(e) => setLiabilities({...liabilities, personalLoans: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground text-sm"
                      placeholder="5,000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground">
                      Other Debts ($)
                    </label>
                    <input
                      type="number"
                      value={liabilities.other}
                      onChange={(e) => setLiabilities({...liabilities, other: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground text-sm"
                      placeholder="3,000"
                    />
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-lg font-semibold text-red-700 dark:text-red-400">
                    Total Liabilities: ${totalLiabilities.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Net Worth Result */}
            <div className="mt-8 p-6 border rounded-xl bg-gray-50 dark:bg-gray-800">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary dark:text-dark-primary mb-2">
                  ${netWorth.toLocaleString()}
                </div>
                <div className="text-xl font-semibold mb-2 text-foreground dark:text-dark-foreground">
                  Your Net Worth
                </div>
                {netWorth !== 0 && (
                  <div>
                    <div className={`text-lg font-semibold mb-2 ${getNetWorthCategory(netWorth).color}`}>
                      {getNetWorthCategory(netWorth).category}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {getNetWorthCategory(netWorth).description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI-Optimized Content Blocks */}
          <div className="mt-12 space-y-8">
            <KeyTakeaways
              title="Net Worth Calculation Key Takeaways"
              points={[
                "Net worth equals total assets minus total liabilities - it's your true financial position",
                "Include all assets at current market value: cash, investments, real estate, vehicles, personal property",
                "Count all debts as liabilities: mortgages, credit cards, loans, and other outstanding balances",
                "A positive net worth means your assets exceed your debts - you're building wealth",
                "Track net worth monthly or quarterly to monitor your financial progress over time",
                "Focus on increasing assets and decreasing liabilities to grow your net worth"
              ]}
            />

            <QuickFacts
              title="Net Worth Benchmarks by Age"
              facts={[
                {
                  label: "Age 25-34",
                  value: "Median: $8,000",
                  description: "Starting career, building foundation"
                },
                {
                  label: "Age 35-44",
                  value: "Median: $91,000", 
                  description: "Peak earning years, family building"
                },
                {
                  label: "Age 45-54",
                  value: "Median: $168,000",
                  description: "Pre-retirement wealth accumulation"
                },
                {
                  label: "Age 55-64",
                  value: "Median: $212,000",
                  description: "Final retirement preparation phase"
                }
              ]}
            />

            <AtAGlance
              title="Net Worth Building at a Glance"
              items={[
                {
                  category: "What It Measures",
                  details: "Your total wealth - the difference between what you own and what you owe"
                },
                {
                  category: "Key Assets to Include",
                  details: "Cash, savings, investments, retirement accounts, real estate, vehicles, valuable items"
                },
                {
                  category: "Key Liabilities to Include",
                  details: "All debts - mortgages, credit cards, student loans, auto loans, personal loans"
                },
                {
                  category: "Improvement Strategy",
                  details: "Increase savings and investments, pay down high-interest debt, build equity in assets"
                },
                {
                  category: "Tracking Frequency",
                  details: "Monthly or quarterly monitoring to see progress and adjust financial strategy"
                }
              ]}
            />

            <FinancialTips
              title="Smart Ways to Increase Your Net Worth"
              level="intermediate"
              tips={[
                "Automate savings and investments to consistently build assets over time",
                "Pay down high-interest debt first - it provides a guaranteed 'return' equal to the interest rate",
                "Maximize employer 401(k) matching - it's free money that instantly boosts your net worth",
                "Invest in appreciating assets like stocks, real estate, or your own education and skills",
                "Track your net worth monthly to stay motivated and spot trends early",
                "Avoid lifestyle inflation - as income grows, save the difference rather than spending it"
              ]}
            />
          </div>

          {/* Call to Action */}
          <div className="mt-12 p-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Build Your Wealth?</h2>
            <p className="mb-6">
              Use our financial calculators to create a plan for growing your net worth over time.
            </p>
            <div className="space-x-4">
              <a href="/calculators/compound-calculator" className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Compound Calculator
              </a>
              <a href="/calculators/retirement-calculator" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold border border-white hover:bg-blue-700 transition-colors">
                Retirement Calculator
              </a>
            </div>
          </div>
        </div>
      </div>
    </AmbientHaloLayout>
  );
}