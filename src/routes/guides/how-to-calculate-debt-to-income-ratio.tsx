import { createFileRoute } from '@tanstack/react-router';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { StructuredData } from '@/components/seo/structured-data';
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips } from '@/components/seo/content-blocks';
import { useState } from 'react';

export const Route = createFileRoute('/guides/how-to-calculate-debt-to-income-ratio')({
  component: DebtToIncomeGuide,
  head: () => {
    const pageUrl = getCanonicalUrl('/guides/how-to-calculate-debt-to-income-ratio');
    const title = 'How to Calculate Debt-to-Income Ratio | Step-by-Step Guide | Moneko';
    const description = 'Learn how to calculate your debt-to-income ratio (DTI) with our step-by-step guide. Understand what lenders look for and how to improve your DTI for loan approval.';
    const keywords = 'debt to income ratio, DTI calculator, how to calculate DTI, debt income ratio formula, loan approval requirements';

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

function DebtToIncomeGuide() {
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [totalMonthlyDebts, setTotalMonthlyDebts] = useState('');

  const calculateDTI = () => {
    const income = parseFloat(monthlyIncome);
    const debts = parseFloat(totalMonthlyDebts);
    if (income > 0 && debts >= 0) {
      return ((debts / income) * 100).toFixed(1);
    }
    return null;
  };

  const dtiRatio = calculateDTI();

  const getDTICategory = (ratio: number) => {
    if (ratio <= 36) return { category: 'Excellent', color: 'text-green-600 dark:text-green-400', description: 'Most lenders prefer this range' };
    if (ratio <= 43) return { category: 'Good', color: 'text-yellow-600 dark:text-yellow-400', description: 'Generally acceptable for most loans' };
    if (ratio <= 50) return { category: 'Fair', color: 'text-orange-600 dark:text-orange-400', description: 'May limit loan options' };
    return { category: 'High Risk', color: 'text-red-600 dark:text-red-400', description: 'Difficult to qualify for new credit' };
  };

  return (
    <AmbientHaloLayout>
      {/* HowTo Schema for DTI Calculation */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Calculate Your Debt-to-Income Ratio (DTI)",
          description: "Step-by-step guide to calculating your debt-to-income ratio to understand your financial health and loan eligibility.",
          totalTime: "PT10M",
          estimatedCost: {
            currency: "USD",
            value: "0"
          },
          steps: [
            {
              name: "Calculate Your Gross Monthly Income",
              text: "Add up all sources of monthly income before taxes including salary, bonuses, rental income, and other regular income sources."
            },
            {
              name: "List All Monthly Debt Payments",
              text: "Include minimum payments for credit cards, loans, mortgages, student loans, and other recurring debt obligations."
            },
            {
              name: "Apply the DTI Formula",
              text: "Divide total monthly debt payments by gross monthly income, then multiply by 100 to get your percentage."
            },
            {
              name: "Interpret Your Results",
              text: "Compare your DTI ratio to lender requirements: 36% or lower is excellent, 37-43% is good, above 43% may limit options."
            }
          ]
        }}
      />

      {/* FAQ Schema */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "What is a good debt-to-income ratio?",
            answer: "Most lenders prefer a debt-to-income ratio of 36% or lower. A ratio between 37-43% is generally acceptable for most loans, while anything above 43% may limit your borrowing options and indicate financial strain."
          },
          {
            question: "What counts as debt in DTI calculation?",
            answer: "Include all minimum monthly debt payments: credit cards, student loans, auto loans, mortgages, personal loans, and other recurring debt obligations. Do not include utilities, insurance, or groceries."
          },
          {
            question: "Should I use gross or net income for DTI?",
            answer: "Always use gross monthly income (before taxes) when calculating debt-to-income ratio. This is what lenders use to assess your borrowing capacity."
          },
          {
            question: "How can I improve my debt-to-income ratio?",
            answer: "You can improve DTI by increasing income through raises or side jobs, paying down existing debts faster, or avoiding new debt. Focus on high-interest debt first for maximum impact."
          },
          {
            question: "What DTI ratio do I need for a mortgage?",
            answer: "For conventional mortgages, most lenders prefer DTI ratios of 43% or lower, though some may accept up to 45%. FHA loans may allow higher ratios with compensating factors."
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
            How to Calculate Your Debt-to-Income Ratio
          </h1>
          <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
            Learn the step-by-step process to calculate your DTI ratio and understand what lenders look for.
          </p>

          {/* Content Attribution */}
          <div className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <p className="mb-1"><strong>Last Updated:</strong> September 7, 2025 | <strong>Reviewed by:</strong> Sabina Shao, CEO & Financial Education Expert</p>
            <p><strong>Data Sources:</strong> Consumer Financial Protection Bureau, Fannie Mae Guidelines, Freddie Mac Standards</p>
          </div>

          {/* Interactive DTI Calculator */}
          <div className="mb-12 p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-foreground dark:text-dark-foreground">
              Quick DTI Calculator
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                  Gross Monthly Income ($)
                </label>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  placeholder="e.g., 5000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                  Total Monthly Debt Payments ($)
                </label>
                <input
                  type="number"
                  value={totalMonthlyDebts}
                  onChange={(e) => setTotalMonthlyDebts(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  placeholder="e.g., 1500"
                />
              </div>
            </div>

            {dtiRatio && (
              <div className="mt-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary dark:text-dark-primary mb-2">
                    {dtiRatio}%
                  </div>
                  <div className={`text-lg font-semibold mb-2 ${getDTICategory(parseFloat(dtiRatio)).color}`}>
                    {getDTICategory(parseFloat(dtiRatio)).category}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {getDTICategory(parseFloat(dtiRatio)).description}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Step-by-step Guide */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-foreground dark:text-dark-foreground">
              Step-by-Step DTI Calculation
            </h2>

            <div className="space-y-6">
              <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="text-xl font-semibold mb-3 text-foreground dark:text-dark-foreground flex items-center">
                  <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">1</span>
                  Calculate Your Gross Monthly Income
                </h3>
                <p className="mb-3 text-gray-700 dark:text-gray-300">
                  Add up all your monthly income sources before taxes:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>Base salary or wages</li>
                  <li>Bonuses and commissions</li>
                  <li>Rental income</li>
                  <li>Investment income</li>
                  <li>Alimony or child support</li>
                  <li>Other regular income sources</li>
                </ul>
              </div>

              <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="text-xl font-semibold mb-3 text-foreground dark:text-dark-foreground flex items-center">
                  <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">2</span>
                  List All Monthly Debt Payments
                </h3>
                <p className="mb-3 text-gray-700 dark:text-gray-300">
                  Include minimum monthly payments for:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>Credit card minimum payments</li>
                  <li>Student loan payments</li>
                  <li>Auto loan payments</li>
                  <li>Mortgage or rent payments</li>
                  <li>Personal loan payments</li>
                  <li>Home equity loan payments</li>
                </ul>
                <p className="mt-3 text-sm text-yellow-600 dark:text-yellow-400">
                  <strong>Note:</strong> Don't include utilities, insurance, groceries, or other living expenses.
                </p>
              </div>

              <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="text-xl font-semibold mb-3 text-foreground dark:text-dark-foreground flex items-center">
                  <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">3</span>
                  Apply the DTI Formula
                </h3>
                <div className="mb-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-center text-lg font-mono">
                    DTI = (Total Monthly Debt Payments ÷ Gross Monthly Income) × 100
                  </p>
                </div>
                <p className="text-gray-700 dark:text-gray-300">
                  Example: If you earn $5,000/month and have $1,500 in debt payments:<br/>
                  DTI = ($1,500 ÷ $5,000) × 100 = 30%
                </p>
              </div>
            </div>
          </div>

          {/* AI-Optimized Content Blocks */}
          <div className="mt-12 space-y-8">
            <KeyTakeaways
              title="Debt-to-Income Ratio Key Takeaways"
              points={[
                "DTI ratio is calculated as total monthly debt payments divided by gross monthly income",
                "Lenders prefer DTI ratios of 36% or lower for the best loan terms and approval odds",
                "Include all minimum debt payments but exclude living expenses like utilities and groceries",
                "You can improve DTI by increasing income, paying down debt, or avoiding new debt",
                "Different loan types have different DTI requirements - mortgages typically allow up to 43%",
                "A lower DTI ratio indicates better financial health and borrowing capacity"
              ]}
            />

            <QuickFacts
              title="DTI Ratio Quick Facts"
              facts={[
                {
                  label: "Excellent DTI Range",
                  value: "0-36%",
                  description: "Preferred range for most lenders and best loan terms"
                },
                {
                  label: "Good DTI Range", 
                  value: "37-43%",
                  description: "Generally acceptable for most loan types"
                },
                {
                  label: "Maximum for Mortgages",
                  value: "43-45%",
                  description: "Conventional mortgage limit, FHA may allow higher with compensating factors"
                },
                {
                  label: "High Risk Threshold",
                  value: "50%+",
                  description: "Indicates potential financial stress and limited borrowing options"
                }
              ]}
            />

            <AtAGlance
              title="DTI Ratio at a Glance"
              items={[
                {
                  category: "What It Measures",
                  details: "Your monthly debt burden relative to income - a key indicator of financial health"
                },
                {
                  category: "Income to Use",
                  details: "Gross monthly income (before taxes) including all regular income sources"
                },
                {
                  category: "Debts to Include", 
                  details: "All minimum monthly debt payments - credit cards, loans, mortgages"
                },
                {
                  category: "Improvement Strategy",
                  details: "Increase income, pay down high-interest debt, avoid new debt obligations"
                },
                {
                  category: "Lender Preferences",
                  details: "36% or lower preferred, up to 43% acceptable, above 43% limits options"
                }
              ]}
            />

            <FinancialTips
              title="Tips to Improve Your DTI Ratio"
              level="intermediate"
              tips={[
                "Focus on paying down high-interest debt first to reduce monthly payments most efficiently",
                "Consider a debt consolidation loan to potentially lower monthly payments and interest rates",
                "Avoid taking on new debt while working to improve your DTI ratio",
                "Increase your income through side hustles, overtime, or asking for a raise",
                "Make bi-weekly payments on loans to pay them off faster and reduce monthly averages",
                "Consider the debt avalanche or debt snowball method for systematic debt reduction"
              ]}
            />
          </div>

          {/* Call to Action */}
          <div className="mt-12 p-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Improve Your Financial Health?</h2>
            <p className="mb-6">
              Use our comprehensive calculators to create a debt payoff plan and improve your DTI ratio.
            </p>
            <div className="space-x-4">
              <a href="/calculators/compound-calculator" className="inline-block bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Compound Calculator
              </a>
              <a href="/calculators/mortgage-calculator" className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold border border-white hover:bg-purple-700 transition-colors">
                Mortgage Calculator
              </a>
            </div>
          </div>
        </div>
      </div>
    </AmbientHaloLayout>
  );
}