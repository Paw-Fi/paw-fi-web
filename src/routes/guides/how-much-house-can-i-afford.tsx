import { createFileRoute } from '@tanstack/react-router';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { StructuredData } from '@/components/seo/structured-data';
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips } from '@/components/seo/content-blocks';
import { CurrentMortgageRates } from '@/components/seo/financial-data-tables';
import { useState } from 'react';

export const Route = createFileRoute('/guides/how-much-house-can-i-afford')(({
  component: HouseAffordabilityGuide,
  head: () => {
    const pageUrl = getCanonicalUrl('/guides/how-much-house-can-i-afford');
    const title = 'How Much House Can I Afford? | Home Affordability Calculator 2025 | Moneko';
    const description = 'Calculate exactly how much house you can afford with your salary and budget. Use the 28/36 rule, debt-to-income ratios, and current market rates for accurate home buying guidance.';
    const keywords = 'how much house can I afford, home affordability calculator, house affordability, mortgage affordability, home buying budget';

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

function HouseAffordabilityGuide() {
  const [annualIncome, setAnnualIncome] = useState('');
  const [monthlyDebts, setMonthlyDebts] = useState('');
  const [downPaymentPercent, setDownPaymentPercent] = useState('20');
  const [interestRate, setInterestRate] = useState('6.75');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [creditScore, setCreditScore] = useState('740+');

  const calculateAffordability = () => {
    const income = parseFloat(annualIncome);
    const debts = parseFloat(monthlyDebts) || 0;
    const expenses = parseFloat(monthlyExpenses) || 0;
    const downPercent = parseFloat(downPaymentPercent) / 100;
    const rate = parseFloat(interestRate) / 100 / 12;
    
    if (income > 0) {
      const monthlyIncome = income / 12;
      
      // 28/36 rule calculations
      const maxHousingPayment = monthlyIncome * 0.28;
      const maxTotalDebtPayment = monthlyIncome * 0.36;
      const availableForHousing = Math.min(maxHousingPayment, maxTotalDebtPayment - debts);
      
      // Conservative calculation - assume 25% of payment goes to taxes/insurance
      const availableForPrincipalInterest = availableForHousing * 0.75;
      
      // Calculate maximum loan amount using mortgage formula
      const months = 30 * 12; // 30-year loan
      const maxLoanAmount = rate > 0 ? 
        (availableForPrincipalInterest * (Math.pow(1 + rate, months) - 1)) / 
        (rate * Math.pow(1 + rate, months)) : 
        availableForPrincipalInterest * months;
      
      const maxHomePrice = maxLoanAmount / (1 - downPercent);
      const requiredDownPayment = maxHomePrice * downPercent;
      const estimatedClosingCosts = maxHomePrice * 0.03; // 3% of home price
      const totalUpfrontCosts = requiredDownPayment + estimatedClosingCosts;
      
      // Alternative calculation using 5x income rule
      const incomeMultiplierPrice = income * 5;
      
      // Use more conservative of the two calculations
      const recommendedHomePrice = Math.min(maxHomePrice, incomeMultiplierPrice);
      const adjustedDownPayment = recommendedHomePrice * downPercent;
      const adjustedClosingCosts = recommendedHomePrice * 0.03;
      const adjustedTotalCosts = adjustedDownPayment + adjustedClosingCosts;
      
      return {
        monthlyIncome,
        maxHousingPayment,
        availableForHousing,
        maxHomePrice: recommendedHomePrice,
        downPaymentNeeded: adjustedDownPayment,
        closingCosts: adjustedClosingCosts,
        totalUpfrontCosts: adjustedTotalCosts,
        monthlyPaymentEstimate: availableForHousing,
        remainingMonthlyBudget: monthlyIncome - availableForHousing - debts - expenses
      };
    }
    return null;
  };

  const calculation = calculateAffordability();

  const getAffordabilityCategory = (homePrice: number, income: number) => {
    const ratio = homePrice / income;
    if (ratio <= 3) return { category: 'Conservative Range', color: 'text-green-600 dark:text-green-400', description: 'Very affordable with room for other goals' };
    if (ratio <= 4) return { category: 'Moderate Range', color: 'text-blue-600 dark:text-blue-400', description: 'Comfortable affordability' };
    if (ratio <= 5) return { category: 'Aggressive Range', color: 'text-yellow-600 dark:text-yellow-400', description: 'At upper limit of affordability' };
    return { category: 'Overextended', color: 'text-red-600 dark:text-red-400', description: 'Consider a lower price range' };
  };

  return (
    <AmbientHaloLayout>
      {/* HowTo Schema for Home Affordability Calculation */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Calculate How Much House You Can Afford",
          description: "Complete guide to determining your home buying budget using the 28/36 rule, debt-to-income ratios, and down payment considerations.",
          totalTime: "PT15M",
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
              name: "Apply the 28/36 Rule",
              text: "Housing costs shouldn't exceed 28% of gross monthly income, and total debt payments shouldn't exceed 36% of gross income."
            },
            {
              name: "Factor in Existing Debts",
              text: "Subtract current monthly debt payments (credit cards, loans, etc.) from your total available debt capacity."
            },
            {
              name: "Account for Down Payment and Closing Costs",
              text: "Determine how much you can put down (typically 3-20%) and budget for closing costs (2-5% of home price)."
            },
            {
              name: "Consider Your Complete Financial Picture",
              text: "Include property taxes, insurance, maintenance costs, and emergency fund to ensure true affordability."
            }
          ]
        }}
      />

      {/* FAQ Schema for Home Affordability */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "How much house can I afford with my salary?",
            answer: "Generally, you can afford a house that costs 3-5 times your annual salary, depending on your debts and down payment. Use the 28/36 rule: spend no more than 28% of gross monthly income on housing and 36% on total debt payments."
          },
          {
            question: "What is the 28/36 rule for home affordability?",
            answer: "The 28/36 rule says housing costs shouldn't exceed 28% of gross monthly income, and total debt payments shouldn't exceed 36%. For example, with $75,000 annual income ($6,250 monthly), housing should be under $1,750 and total debts under $2,250."
          },
          {
            question: "How much down payment do I need to afford a house?",
            answer: "Down payments range from 0% (VA loans) to 20% (conventional without PMI). FHA loans require 3.5%, conventional loans start at 3%. Higher down payments reduce monthly costs but require more upfront cash."
          },
          {
            question: "Should I use 3x or 5x my income to determine affordability?",
            answer: "Use 3x income for conservative affordability with room for other financial goals. Use up to 5x income if you have minimal debt, excellent credit, and stable income. Consider your complete financial picture, not just income multiples."
          },
          {
            question: "What if I have student loans or credit card debt?",
            answer: "Existing debt reduces how much house you can afford. Lenders count minimum monthly debt payments against your 36% total debt ratio. Pay down high-interest debt before buying to increase your home buying power."
          },
          {
            question: "How much should I save for closing costs?",
            answer: "Budget 2-5% of home price for closing costs. On a $300,000 home, expect $6,000-15,000 in closing costs including loan origination, title insurance, appraisal, inspection, and prepaid taxes and insurance."
          },
          {
            question: "Can I afford a house if I'm self-employed?",
            answer: "Self-employed buyers can qualify but need 2 years of tax returns and consistent income documentation. Lenders may average your income over 2 years, so stable earnings history is crucial for determining affordability."
          },
          {
            question: "What other costs should I consider beyond the mortgage?",
            answer: "Budget for property taxes (1-2% annually), homeowner's insurance ($1,200+ annually), maintenance (1-3% of home value annually), utilities, and potential HOA fees. These add $300-800+ monthly to your housing costs."
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
            How Much House Can I Afford?
          </h1>
          <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
            Calculate your true home buying budget using proven affordability rules and current market conditions.
          </p>

          {/* Content Attribution */}
          <div className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <p className="mb-1"><strong>Last Updated:</strong> September 7, 2025 | <strong>Reviewed by:</strong> Sabina Shao, CEO & Financial Education Expert</p>
            <p><strong>Data Sources:</strong> Federal Housing Administration Guidelines, Consumer Financial Protection Bureau, National Association of Realtors</p>
          </div>

          {/* Interactive Home Affordability Calculator */}
          <div className="mb-12 p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-foreground dark:text-dark-foreground">
              Home Affordability Calculator
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Annual Gross Income ($)
                  </label>
                  <input
                    type="number"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="75000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Before taxes - all income sources</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Monthly Debt Payments ($)
                  </label>
                  <input
                    type="number"
                    value={monthlyDebts}
                    onChange={(e) => setMonthlyDebts(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Credit cards, loans, minimum payments only</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Other Monthly Expenses ($)
                  </label>
                  <input
                    type="number"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="1200"
                  />
                  <p className="text-xs text-gray-500 mt-1">Food, utilities, transportation, etc.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Down Payment (%)
                  </label>
                  <select
                    value={downPaymentPercent}
                    onChange={(e) => setDownPaymentPercent(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  >
                    <option value="3">3% (Minimum conventional)</option>
                    <option value="3.5">3.5% (FHA loan)</option>
                    <option value="5">5% (Good option)</option>
                    <option value="10">10% (Strong position)</option>
                    <option value="20">20% (No PMI)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="6.75"
                  />
                  <p className="text-xs text-gray-500 mt-1">Current 30-year fixed rates</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Credit Score Range
                  </label>
                  <select
                    value={creditScore}
                    onChange={(e) => setCreditScore(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  >
                    <option value="740+">740+ (Excellent)</option>
                    <option value="680-739">680-739 (Good)</option>
                    <option value="620-679">620-679 (Fair)</option>
                    <option value="580-619">580-619 (Poor)</option>
                  </select>
                </div>
              </div>
            </div>

            {calculation && (
              <div className="mt-8 grid lg:grid-cols-3 gap-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-blue-800 dark:text-blue-300">Affordability Analysis</h3>
                  <div className="text-center mb-3">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      ${calculation.maxHomePrice.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Maximum home price</p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Monthly housing budget:</span>
                      <span className="font-semibold">${calculation.maxHousingPayment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Home price to income:</span>
                      <span className="font-semibold">{(calculation.maxHomePrice / parseFloat(annualIncome)).toFixed(1)}x</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-green-800 dark:text-green-300">Upfront Costs</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Down payment needed:</span>
                      <span className="font-semibold">${calculation.downPaymentNeeded.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Closing costs (est.):</span>
                      <span className="font-semibold">${calculation.closingCosts.toLocaleString()}</span>
                    </div>
                    <hr className="my-2 border-green-200 dark:border-green-700" />
                    <div className="flex justify-between text-base font-bold">
                      <span>Total upfront needed:</span>
                      <span className="text-green-600 dark:text-green-400">${calculation.totalUpfrontCosts.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-purple-800 dark:text-purple-300">Budget Assessment</h3>
                  <div className="space-y-3">
                    <div className={`text-center ${getAffordabilityCategory(calculation.maxHomePrice, parseFloat(annualIncome)).color}`}>
                      <div className="font-semibold">{getAffordabilityCategory(calculation.maxHomePrice, parseFloat(annualIncome)).category}</div>
                      <p className="text-xs mt-1">{getAffordabilityCategory(calculation.maxHomePrice, parseFloat(annualIncome)).description}</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm text-gray-600 dark:text-gray-300">Remaining monthly budget</div>
                      <div className="font-semibold text-purple-600 dark:text-purple-400">
                        ${calculation.remainingMonthlyBudget.toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-500">For savings, emergencies, and lifestyle</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Mortgage Rates */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center text-foreground dark:text-dark-foreground mb-6">
              Current Mortgage Rates (September 2025)
            </h2>
            <CurrentMortgageRates />
          </div>

          {/* AI-Optimized Content Blocks */}
          <div className="mt-12 space-y-8">
            <KeyTakeaways
              title="Home Affordability Key Takeaways"
              points={[
                "The 28/36 rule: housing costs ≤28% of gross income, total debt ≤36% of gross income",
                "Home price should typically be 3-5 times your annual salary depending on debt and down payment",
                "Higher down payments reduce monthly costs but require more upfront cash - find your balance",
                "Don't forget closing costs (2-5% of home price) and ongoing expenses like maintenance and taxes",
                "Pre-approval gives you exact buying power and strengthens your offers in competitive markets",
                "Consider your complete financial picture, not just what lenders approve - leave room for other goals"
              ]}
            />

            <QuickFacts
              title="Home Affordability Quick Facts"
              facts={[
                {
                  label: "Average Home Price 2025",
                  value: "$420,000",
                  description: "National median home price"
                },
                {
                  label: "Minimum Down Payment",
                  value: "3-3.5%",
                  description: "Conventional (3%) or FHA (3.5%) loans"
                },
                {
                  label: "Closing Cost Range",
                  value: "2-5%",
                  description: "Of home purchase price"
                },
                {
                  label: "Good Debt-to-Income",
                  value: "≤36%",
                  description: "Total monthly debt payments to gross income"
                }
              ]}
            />

            <AtAGlance
              title="Home Affordability at a Glance"
              items={[
                {
                  category: "Income Requirements",
                  details: "Generally need 25-33% of home price as annual income. Higher for expensive areas, lower with minimal debt."
                },
                {
                  category: "Down Payment Options",
                  details: "VA: 0%, USDA: 0%, FHA: 3.5%, Conventional: 3-20%. Higher down = lower monthly payment."
                },
                {
                  category: "Monthly Budget Breakdown",
                  details: "Principal & Interest (~75%), Property Taxes (~15%), Insurance (~7%), PMI if <20% down (~3%)"
                },
                {
                  category: "Additional Costs",
                  details: "Moving expenses, immediate repairs, furniture, utility setup, maintenance fund (1% of home value annually)"
                },
                {
                  category: "Timing Considerations",
                  details: "Buy when: stable job, 5+ year timeline, emergency fund intact, debt manageable, down payment saved"
                }
              ]}
            />

            <FinancialTips
              title="Smart Home Affordability Strategies"
              level="intermediate"
              tips={[
                "Get pre-approved early to know your exact budget and strengthen offers - it's free and helps you shop confidently",
                "Save 25% above your target budget for unexpected costs, repairs, or better opportunities",
                "Consider total commuting costs when comparing home prices - a cheaper home far from work may cost more overall",
                "Factor in property taxes and insurance early - they can add $300-800+ monthly and vary significantly by location",
                "Don't max out your approval amount - leave room for rate increases, job changes, and other financial goals",
                "Consider the 1% rule for maintenance: budget 1% of home value annually for upkeep and repairs"
              ]}
            />
          </div>

          {/* Call to Action */}
          <div className="mt-12 p-6 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Calculate Your Exact Mortgage Payment?</h2>
            <p className="mb-6">
              Now that you know how much house you can afford, calculate your exact monthly payments and compare loan options.
            </p>
            <div className="space-x-4">
              <a href="/calculators/mortgage-calculator" className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Mortgage Calculator
              </a>
              <a href="/guides/how-to-calculate-debt-to-income-ratio" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold border border-white hover:bg-blue-700 transition-colors">
                Check Your DTI Ratio
              </a>
            </div>
          </div>
        </div>
      </div>
    </AmbientHaloLayout>
  );
}