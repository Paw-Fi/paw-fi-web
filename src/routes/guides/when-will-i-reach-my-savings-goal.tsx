import { createFileRoute } from '@tanstack/react-router';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { StructuredData } from '@/components/seo/structured-data';
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips } from '@/components/seo/content-blocks';
import { useState } from 'react';

export const Route = createFileRoute('/guides/when-will-i-reach-my-savings-goal')(({
  component: SavingsGoalTimelineGuide,
  head: () => {
    const pageUrl = getCanonicalUrl('/guides/when-will-i-reach-my-savings-goal');
    const title = 'When Will I Reach My Savings Goal? | Timeline Calculator 2025 | Moneko';
    const description = 'Calculate exactly when you\'ll reach your savings goal with compound interest. Learn how to accelerate your timeline with higher contributions and better returns.';
    const keywords = 'savings goal calculator, when will I save, savings timeline, compound interest calculator, financial goal planning';

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

function SavingsGoalTimelineGuide() {
  const [savingsGoal, setSavingsGoal] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [interestRate, setInterestRate] = useState('5');
  const [goalType, setGoalType] = useState('general');

  const calculateTimeToGoal = () => {
    const goal = parseFloat(savingsGoal);
    const current = parseFloat(currentSavings) || 0;
    const monthly = parseFloat(monthlyContribution);
    const rate = parseFloat(interestRate) / 100 / 12; // Monthly interest rate

    if (goal > 0 && monthly > 0) {
      const remainingAmount = Math.max(0, goal - current);
      
      if (remainingAmount === 0) {
        return {
          monthsToGoal: 0,
          yearsToGoal: 0,
          targetDate: new Date(),
          totalContributions: current,
          totalInterest: 0,
          finalAmount: current
        };
      }

      if (rate > 0) {
        // With compound interest formula: FV = PMT * [((1 + r)^n - 1) / r] + PV * (1 + r)^n
        // Solving for n (number of periods)
        const futureValueCurrent = current; // Current amount grows with compound interest
        let months = 0;
        
        // Use iterative approach for accuracy with compound interest
        let balance = current;
        while (balance < goal && months < 600) { // Cap at 50 years
          balance = balance * (1 + rate) + monthly;
          months++;
        }
        
        const years = months / 12;
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + months);
        
        const totalContributions = current + (monthly * months);
        const totalInterest = goal - totalContributions;
        
        return {
          monthsToGoal: months,
          yearsToGoal: years,
          targetDate,
          totalContributions,
          totalInterest: Math.max(0, totalInterest),
          finalAmount: goal
        };
      } else {
        // Without interest (simple savings)
        const months = Math.ceil(remainingAmount / monthly);
        const years = months / 12;
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + months);
        
        return {
          monthsToGoal: months,
          yearsToGoal: years,
          targetDate,
          totalContributions: current + (monthly * months),
          totalInterest: 0,
          finalAmount: current + (monthly * months)
        };
      }
    }
    return null;
  };

  const calculation = calculateTimeToGoal();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTimelineCategory = (years: number) => {
    if (years <= 1) return { category: 'Very Soon', color: 'text-green-600 dark:text-green-400', description: 'Goal within reach this year!' };
    if (years <= 3) return { category: 'Short Term', color: 'text-blue-600 dark:text-blue-400', description: 'Achievable in the near future' };
    if (years <= 7) return { category: 'Medium Term', color: 'text-yellow-600 dark:text-yellow-400', description: 'Solid timeline for your goal' };
    if (years <= 15) return { category: 'Long Term', color: 'text-orange-600 dark:text-orange-400', description: 'Requires patience and consistency' };
    return { category: 'Very Long Term', color: 'text-red-600 dark:text-red-400', description: 'Consider increasing contributions' };
  };

  return (
    <AmbientHaloLayout>
      {/* HowTo Schema for Savings Goal Timeline Calculation */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Calculate When You'll Reach Your Savings Goal",
          description: "Step-by-step guide to calculating your savings goal timeline using compound interest, monthly contributions, and current savings balance.",
          totalTime: "PT10M",
          estimatedCost: {
            currency: "USD",
            value: "0"
          },
          steps: [
            {
              name: "Define Your Savings Goal",
              text: "Set a specific dollar amount for your goal whether it's an emergency fund, vacation, down payment, or other financial objective."
            },
            {
              name: "Calculate Starting Position",
              text: "Determine your current savings balance toward this specific goal and how much you can realistically save monthly."
            },
            {
              name: "Factor in Interest or Returns",
              text: "Include the interest rate or investment return you expect to earn on your savings over time."
            },
            {
              name: "Apply Compound Interest Formula",
              text: "Use compound interest calculations to determine exactly when your growing balance will reach your target amount."
            }
          ]
        }}
      />

      {/* FAQ Schema */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "How do I calculate when I'll reach my savings goal?",
            answer: "Divide your remaining savings goal by your monthly contribution for simple savings, or use compound interest formulas if earning returns. The formula accounts for your current savings, monthly additions, and interest rate to project your timeline."
          },
          {
            question: "What interest rate should I use for calculations?",
            answer: "Use conservative estimates: 4-5% for high-yield savings accounts, 3-4% for CDs, 7-8% for diversified stock investments. For short-term goals (under 2 years), use savings account rates around 4-5%."
          },
          {
            question: "How can I reach my savings goal faster?",
            answer: "Increase monthly contributions, reduce expenses to save more, earn higher returns through appropriate investments, use windfalls like bonuses or tax refunds, or consider a side income to boost savings."
          },
          {
            question: "Should I adjust my timeline for inflation?",
            answer: "For long-term goals (5+ years), consider inflation's impact. A $50,000 goal today might need to be $60,000+ in 10 years. Factor in 2-3% annual inflation for more accurate planning."
          },
          {
            question: "What if I can't maintain consistent monthly savings?",
            answer: "Focus on what you can consistently afford rather than an ambitious amount you can't sustain. It's better to save $200 monthly consistently than $500 sporadically. Build flexibility into your plan."
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
            When Will I Reach My Savings Goal?
          </h1>
          <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
            Calculate your exact timeline to reach any savings goal with compound interest and realistic planning.
          </p>

          {/* Content Attribution */}
          <div className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <p className="mb-1"><strong>Last Updated:</strong> September 7, 2025 | <strong>Reviewed by:</strong> Sabina Shao, CEO & Financial Education Expert</p>
            <p><strong>Data Sources:</strong> Federal Reserve Interest Rate Data, High-Yield Savings Account Surveys, Investment Return Benchmarks</p>
          </div>

          {/* Interactive Savings Goal Calculator */}
          <div className="mb-12 p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-foreground dark:text-dark-foreground">
              Savings Goal Timeline Calculator
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Goal Type
                  </label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  >
                    <option value="general">General Savings</option>
                    <option value="emergency">Emergency Fund</option>
                    <option value="vacation">Vacation Fund</option>
                    <option value="house">House Down Payment</option>
                    <option value="car">Car Purchase</option>
                    <option value="education">Education Fund</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Savings Goal Amount ($)
                  </label>
                  <input
                    type="number"
                    value={savingsGoal}
                    onChange={(e) => setSavingsGoal(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="25000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Current Savings ($)
                  </label>
                  <input
                    type="number"
                    value={currentSavings}
                    onChange={(e) => setCurrentSavings(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="5000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Amount already saved toward this goal</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Monthly Contribution ($)
                  </label>
                  <input
                    type="number"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Amount you can consistently save monthly</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Expected Annual Return (%)
                  </label>
                  <select
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  >
                    <option value="0">0% (No interest)</option>
                    <option value="4">4% (High-yield savings)</option>
                    <option value="5">5% (CD/Conservative)</option>
                    <option value="7">7% (Balanced investments)</option>
                    <option value="9">9% (Stock market average)</option>
                  </select>
                </div>
              </div>
            </div>

            {calculation && (
              <div className="mt-8 grid lg:grid-cols-3 gap-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-blue-800 dark:text-blue-300">Timeline</h3>
                  <div className="space-y-2 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {calculation.yearsToGoal < 1 ? 
                          `${calculation.monthsToGoal} months` : 
                          `${calculation.yearsToGoal.toFixed(1)} years`
                        }
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Time to reach goal</p>
                    </div>
                    <hr className="my-2 border-blue-200 dark:border-blue-700" />
                    <div className="text-center">
                      <div className="font-semibold">Target Date</div>
                      <div className="text-blue-600 dark:text-blue-400">{formatDate(calculation.targetDate)}</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-green-800 dark:text-green-300">Contributions</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Monthly Amount:</span>
                      <span className="font-semibold">${parseFloat(monthlyContribution).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Contributions:</span>
                      <span className="font-semibold">${calculation.totalContributions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interest Earned:</span>
                      <span className="font-semibold">${calculation.totalInterest.toLocaleString()}</span>
                    </div>
                    <hr className="my-2 border-green-200 dark:border-green-700" />
                    <div className="flex justify-between text-base font-bold">
                      <span>Final Amount:</span>
                      <span className="text-green-600 dark:text-green-400">${calculation.finalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-purple-800 dark:text-purple-300">Assessment</h3>
                  <div className="space-y-3">
                    <div className={`text-center ${getTimelineCategory(calculation.yearsToGoal).color}`}>
                      <div className="font-semibold">{getTimelineCategory(calculation.yearsToGoal).category}</div>
                      <p className="text-xs mt-1">{getTimelineCategory(calculation.yearsToGoal).description}</p>
                    </div>
                    
                    {calculation.totalInterest > 0 && (
                      <div className="text-center">
                        <div className="text-sm text-gray-600 dark:text-gray-300">Interest Power</div>
                        <div className="font-semibold text-purple-600 dark:text-purple-400">
                          {((calculation.totalInterest / calculation.totalContributions) * 100).toFixed(1)}%
                        </div>
                        <p className="text-xs text-gray-500">of final amount from compound interest</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI-Optimized Content Blocks */}
          <div className="mt-12 space-y-8">
            <KeyTakeaways
              title="Savings Goal Timeline Key Takeaways"
              points={[
                "Compound interest significantly accelerates your timeline - even small rates make a big difference",
                "Consistent monthly contributions are more important than large occasional deposits",
                "Higher returns help but don't chase risky investments for short-term goals",
                "Starting with any amount is better than waiting for the 'perfect' contribution amount",
                "Review and adjust your timeline quarterly as your income and expenses change",
                "Consider inflation for long-term goals - prices increase about 2-3% annually"
              ]}
            />

            <QuickFacts
              title="Savings Goal Planning Quick Facts"
              facts={[
                {
                  label: "Rule of 72",
                  value: "72 ÷ interest rate",
                  description: "Years to double your money (e.g., 72÷6% = 12 years)"
                },
                {
                  label: "Average Savings Rate 2025",
                  value: "4.5-5.0%",
                  description: "High-yield savings accounts currently available"
                },
                {
                  label: "Stock Market Average",
                  value: "7-8% annually",
                  description: "Historical long-term average before inflation"
                },
                {
                  label: "Recommended Timeline",
                  value: "Under 5 years",
                  description: "For major financial goals to maintain motivation"
                }
              ]}
            />

            <AtAGlance
              title="Savings Goal Strategy at a Glance"
              items={[
                {
                  category: "Short-term Goals (1-2 years)",
                  details: "Use high-yield savings or CDs earning 4-5%. Prioritize safety over returns. Examples: vacation, emergency fund."
                },
                {
                  category: "Medium-term Goals (3-7 years)",
                  details: "Consider balanced investments or target-date funds earning 5-7%. Mix of safety and growth. Examples: house down payment."
                },
                {
                  category: "Long-term Goals (8+ years)",
                  details: "Focus on growth investments like stock index funds earning 7-8%. Accept volatility for higher returns. Examples: retirement, education."
                },
                {
                  category: "Acceleration Strategies",
                  details: "Increase contributions with raises, use bonuses/windfalls, reduce expenses, earn side income, optimize tax advantages."
                },
                {
                  category: "Common Mistakes",
                  details: "Unrealistic contribution amounts, chasing high-risk returns, not adjusting for inflation, giving up after setbacks."
                }
              ]}
            />

            <FinancialTips
              title="Smart Ways to Reach Your Goals Faster"
              level="beginner"
              tips={[
                "Automate your savings so contributions happen without thinking - set up automatic transfers on payday",
                "Use the '52-week challenge' approach - start small and gradually increase your monthly contributions",
                "Round up purchases and save the difference using apps or bank programs",
                "Redirect windfalls like tax refunds, bonuses, or gifts directly toward your goal",
                "Track progress monthly and celebrate milestones to maintain motivation over time",
                "Consider the 'pay yourself first' approach - save before paying discretionary expenses"
              ]}
            />
          </div>

          {/* Call to Action */}
          <div className="mt-12 p-6 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Start Saving Systematically?</h2>
            <p className="mb-6">
              Use our detailed savings goal calculator to create a personalized plan with automatic progress tracking.
            </p>
            <div className="space-x-4">
              <a href="/calculators/saving-goals-calculator" className="inline-block bg-white text-teal-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Detailed Savings Calculator
              </a>
              <a href="/calculators/compound-calculator" className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold border border-white hover:bg-teal-700 transition-colors">
                Compound Interest Calculator
              </a>
            </div>
          </div>
        </div>
      </div>
    </AmbientHaloLayout>
  );
}