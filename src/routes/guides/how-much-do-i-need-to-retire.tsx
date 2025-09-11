import { createFileRoute } from '@tanstack/react-router';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { StructuredData } from '@/components/seo/structured-data';
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips } from '@/components/seo/content-blocks';
import { useState } from 'react';

export const Route = createFileRoute('/guides/how-much-do-i-need-to-retire')({
  component: RetirementNeedsGuide,
  head: () => {
    const pageUrl = getCanonicalUrl('/guides/how-much-do-i-need-to-retire');
    const title = 'How Much Do I Need to Retire? | Calculator 2025 | Moneko';
    const description = 'Calculate how much money you need to retire comfortably. Learn the 4% rule, replacement ratios, and retirement planning strategies for 2025.';
    const keywords = 'how much to retire, retirement calculator, retirement savings needed, 4% rule retirement, retirement planning 2025';

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

function RetirementNeedsGuide() {
  const [currentAge, setCurrentAge] = useState('');
  const [retirementAge, setRetirementAge] = useState('65');
  const [currentIncome, setCurrentIncome] = useState('');
  const [replacementRatio, setReplacementRatio] = useState('80');
  const [currentSavings, setCurrentSavings] = useState('');
  const [socialSecurity, setSocialSecurity] = useState('');
  const [pensionBenefit, setPensionBenefit] = useState('');

  const calculateRetirementNeeds = () => {
    const income = parseFloat(currentIncome);
    const replacement = parseFloat(replacementRatio) / 100;
    const current = parseFloat(currentSavings) || 0;
    const ss = parseFloat(socialSecurity) || 0;
    const pension = parseFloat(pensionBenefit) || 0;
    const age = parseFloat(currentAge);
    const retAge = parseFloat(retirementAge);
    
    if (income > 0 && age > 0 && retAge > age) {
      // Calculate needed annual retirement income
      const annualNeed = income * replacement;
      
      // Subtract guaranteed income sources
      const incomeGap = Math.max(0, annualNeed - (ss * 12) - (pension * 12));
      
      // Use 4% rule to calculate needed savings
      const neededSavings = incomeGap / 0.04;
      
      // Calculate additional savings needed
      const additionalNeeded = Math.max(0, neededSavings - current);
      
      // Calculate years to retirement
      const yearsToRetirement = retAge - age;
      
      // Calculate monthly savings needed (assuming 7% annual return)
      const monthlyRate = 0.07 / 12;
      const months = yearsToRetirement * 12;
      let monthlySavingsNeeded = 0;
      
      if (months > 0 && additionalNeeded > 0) {
        // Future value of current savings
        const futureValueCurrent = current * Math.pow(1.07, yearsToRetirement);
        const adjustedAdditional = Math.max(0, neededSavings - futureValueCurrent);
        
        if (adjustedAdditional > 0) {
          monthlySavingsNeeded = (adjustedAdditional * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);
        }
      }
      
      return {
        annualIncomeNeed: annualNeed,
        incomeGap,
        totalSavingsNeeded: neededSavings,
        currentSavings: current,
        additionalNeeded,
        yearsToRetirement,
        monthlySavingsNeeded,
        socialSecurityAnnual: ss * 12,
        pensionAnnual: pension * 12
      };
    }
    return null;
  };

  const calculation = calculateRetirementNeeds();

  const getReadinessCategory = (current: number, needed: number) => {
    const percentage = needed > 0 ? (current / needed) * 100 : 100;
    if (percentage >= 100) return { category: 'On Track', color: 'text-green-600 dark:text-green-400', description: 'You\'re ready for retirement!' };
    if (percentage >= 75) return { category: 'Nearly Ready', color: 'text-blue-600 dark:text-blue-400', description: 'Close to your retirement goal' };
    if (percentage >= 50) return { category: 'Making Progress', color: 'text-yellow-600 dark:text-yellow-400', description: 'Halfway to your retirement goal' };
    if (percentage >= 25) return { category: 'Getting Started', color: 'text-orange-600 dark:text-orange-400', description: 'Good start on retirement savings' };
    return { category: 'Just Beginning', color: 'text-red-600 dark:text-red-400', description: 'Time to accelerate retirement savings' };
  };

  return (
    <AmbientHaloLayout>
      {/* HowTo Schema for Retirement Needs Calculation */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Calculate How Much You Need to Retire",
          description: "Complete guide to calculating retirement savings needs using income replacement ratios, the 4% rule, and accounting for Social Security and pension benefits.",
          totalTime: "PT20M",
          estimatedCost: {
            currency: "USD",
            value: "0"
          },
          steps: [
            {
              name: "Determine Income Replacement Ratio",
              text: "Calculate what percentage of current income you'll need in retirement, typically 70-90% depending on lifestyle and expenses."
            },
            {
              name: "Account for Guaranteed Income Sources",
              text: "Estimate annual Social Security benefits and any pension payments you'll receive in retirement."
            },
            {
              name: "Calculate Income Gap",
              text: "Subtract guaranteed income from total retirement income needs to find the gap your savings must fill."
            },
            {
              name: "Apply the 4% Rule",
              text: "Divide your annual income gap by 4% (0.04) to determine total retirement savings needed using the safe withdrawal rate."
            }
          ]
        }}
      />

      {/* FAQ Schema */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "How much money do I need to retire comfortably?",
            answer: "Most financial experts recommend having 10-12 times your final working year's salary saved for retirement. Using the 4% rule, if you need $50,000 annual income, you'd need $1.25 million saved. However, this varies based on lifestyle, healthcare costs, and other income sources."
          },
          {
            question: "What is the 4% rule for retirement?",
            answer: "The 4% rule suggests you can safely withdraw 4% of your retirement savings annually without running out of money. For example, $1 million in savings would provide $40,000 per year. This rule assumes a balanced portfolio and 30-year retirement period."
          },
          {
            question: "How much of my income should I replace in retirement?",
            answer: "Financial planners typically recommend replacing 70-90% of pre-retirement income. You may need less due to no mortgage payments, reduced taxes, and lower work-related expenses. However, healthcare costs often increase with age."
          },
          {
            question: "When should I start saving for retirement?",
            answer: "Start as early as possible to benefit from compound growth. Even small amounts in your 20s can grow significantly over 40+ years. If you're starting later, you'll need to save more aggressively to catch up."
          },
          {
            question: "Will Social Security be enough for retirement?",
            answer: "Social Security typically replaces only 30-40% of pre-retirement income for average earners. It's designed as a foundation, not a complete retirement solution. Most people need additional savings and employer benefits."
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
            How Much Do I Need to Retire?
          </h1>
          <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
            Calculate your personalized retirement savings target using proven methods and current 2025 data.
          </p>

          {/* Content Attribution */}
          <div className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <p className="mb-1"><strong>Last Updated:</strong> September 7, 2025 | <strong>Reviewed by:</strong> Yifan Lim, CTO & Financial Systems Expert</p>
            <p><strong>Data Sources:</strong> Social Security Administration, Department of Labor, Employee Benefit Research Institute</p>
          </div>

          {/* Interactive Retirement Needs Calculator */}
          <div className="mb-12 p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-foreground dark:text-dark-foreground">
              Retirement Needs Calculator
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Current Age
                  </label>
                  <input
                    type="number"
                    value={currentAge}
                    onChange={(e) => setCurrentAge(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="35"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Planned Retirement Age
                  </label>
                  <select
                    value={retirementAge}
                    onChange={(e) => setRetirementAge(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  >
                    <option value="62">62 (Early retirement)</option>
                    <option value="65">65 (Traditional)</option>
                    <option value="67">67 (Full Social Security)</option>
                    <option value="70">70 (Delayed retirement)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Current Annual Income ($)
                  </label>
                  <input
                    type="number"
                    value={currentIncome}
                    onChange={(e) => setCurrentIncome(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="75000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Income Replacement Ratio (%)
                  </label>
                  <select
                    value={replacementRatio}
                    onChange={(e) => setReplacementRatio(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  >
                    <option value="70">70% (Modest lifestyle)</option>
                    <option value="80">80% (Comfortable)</option>
                    <option value="90">90% (Maintain lifestyle)</option>
                    <option value="100">100% (No reduction)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Current Retirement Savings ($)
                  </label>
                  <input
                    type="number"
                    value={currentSavings}
                    onChange={(e) => setCurrentSavings(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="150000"
                  />
                  <p className="text-xs text-gray-500 mt-1">401k, IRA, other retirement accounts</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Expected Monthly Social Security ($)
                  </label>
                  <input
                    type="number"
                    value={socialSecurity}
                    onChange={(e) => setSocialSecurity(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="2000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Check your Social Security statement</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Expected Monthly Pension ($)
                  </label>
                  <input
                    type="number"
                    value={pensionBenefit}
                    onChange={(e) => setPensionBenefit(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave blank if no pension</p>
                </div>
              </div>
            </div>

            {calculation && (
              <div className="mt-8 grid lg:grid-cols-3 gap-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-blue-800 dark:text-blue-300">Retirement Income Plan</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Annual Income Need:</span>
                      <span className="font-semibold">${calculation.annualIncomeNeed.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Social Security:</span>
                      <span className="font-semibold">${calculation.socialSecurityAnnual.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pension Benefits:</span>
                      <span className="font-semibold">${calculation.pensionAnnual.toLocaleString()}</span>
                    </div>
                    <hr className="my-2 border-blue-200 dark:border-blue-700" />
                    <div className="flex justify-between text-base font-bold">
                      <span>Income Gap:</span>
                      <span className="text-blue-600 dark:text-blue-400">${calculation.incomeGap.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-green-800 dark:text-green-300">Savings Needed</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Needed (4% Rule):</span>
                      <span className="font-semibold">${calculation.totalSavingsNeeded.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Savings:</span>
                      <span className="font-semibold">${calculation.currentSavings.toLocaleString()}</span>
                    </div>
                    <hr className="my-2 border-green-200 dark:border-green-700" />
                    <div className="flex justify-between text-base font-bold">
                      <span>Additional Needed:</span>
                      <span className="text-green-600 dark:text-green-400">${calculation.additionalNeeded.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-purple-800 dark:text-purple-300">Action Plan</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Years to Retirement:</span>
                      <span className="font-semibold">{calculation.yearsToRetirement}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly Savings Needed:</span>
                      <span className="font-semibold">${calculation.monthlySavingsNeeded.toLocaleString()}</span>
                    </div>
                    <hr className="my-2 border-purple-200 dark:border-purple-700" />
                    <div className={`text-center ${getReadinessCategory(calculation.currentSavings, calculation.totalSavingsNeeded).color}`}>
                      <div className="font-semibold">{getReadinessCategory(calculation.currentSavings, calculation.totalSavingsNeeded).category}</div>
                      <p className="text-xs mt-1">{getReadinessCategory(calculation.currentSavings, calculation.totalSavingsNeeded).description}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI-Optimized Content Blocks */}
          <div className="mt-12 space-y-8">
            <KeyTakeaways
              title="Retirement Planning Key Takeaways"
              points={[
                "The 4% rule suggests you can safely withdraw 4% of retirement savings annually",
                "Most people need 70-90% of pre-retirement income to maintain their lifestyle",
                "Social Security typically replaces only 30-40% of income for average earners",
                "Starting early allows compound growth to work in your favor over decades",
                "Having 10-12 times your final salary saved is a common retirement target",
                "Healthcare costs often increase significantly in retirement and should be factored in"
              ]}
            />

            <QuickFacts
              title="Retirement Savings Quick Facts"
              facts={[
                {
                  label: "Average Retirement Length",
                  value: "18-20 years",
                  description: "Life expectancy after age 65 continues to increase"
                },
                {
                  label: "Social Security Replacement",
                  value: "30-40%",
                  description: "Of pre-retirement income for median earners"
                },
                {
                  label: "Recommended Savings Rate",
                  value: "10-15%",
                  description: "Of income including employer match throughout career"
                },
                {
                  label: "Maximum 401k Contribution 2025",
                  value: "$23,500",
                  description: "Plus $7,500 catch-up if age 50+"
                }
              ]}
            />

            <AtAGlance
              title="Retirement Planning at a Glance"
              items={[
                {
                  category: "Income Sources",
                  details: "Social Security, employer retirement plans (401k/403b), personal savings (IRA), pensions, part-time work"
                },
                {
                  category: "Key Rules of Thumb",
                  details: "4% withdrawal rule, 10-12x final salary target, 70-90% income replacement ratio"
                },
                {
                  category: "Starting Timeline",
                  details: "20s: Start with any amount; 30s: Increase contributions; 40s: Maximize savings; 50s: Catch-up contributions"
                },
                {
                  category: "Investment Strategy",
                  details: "Age-appropriate asset allocation: stocks for growth when young, bonds for stability near retirement"
                },
                {
                  category: "Common Mistakes",
                  details: "Starting too late, underestimating healthcare costs, ignoring inflation, withdrawing early from retirement accounts"
                }
              ]}
            />

            <FinancialTips
              title="Smart Retirement Saving Strategies"
              level="intermediate"
              tips={[
                "Take full advantage of employer 401k matching - it's free money that instantly doubles your return",
                "Increase retirement contributions by 1% annually or whenever you get a raise",
                "Use tax-advantaged accounts strategically: traditional for high income years, Roth for growth",
                "Diversify retirement savings across different account types and investment options",
                "Consider working a few extra years if behind on savings - it dramatically improves retirement security",
                "Plan for healthcare costs with HSAs and Medicare supplement insurance research"
              ]}
            />
          </div>

          {/* Call to Action */}
          <div className="mt-12 p-6 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Start Planning Your Retirement Today</h2>
            <p className="mb-6">
              Use our detailed retirement calculator to create a personalized savings strategy and track your progress.
            </p>
            <div className="space-x-4">
              <a href="/calculators/retirement-calculator" className="inline-block bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Detailed Retirement Calculator
              </a>
              <a href="/calculators/compound-calculator" className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold border border-white hover:bg-purple-700 transition-colors">
                Compound Growth Calculator
              </a>
            </div>
          </div>
        </div>
      </div>
    </AmbientHaloLayout>
  );
}