import { createFileRoute } from '@tanstack/react-router';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { StructuredData } from '@/components/seo/structured-data';
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips, ComparisonBlock } from '@/components/seo/content-blocks';
import { useState } from 'react';

export const Route = createFileRoute('/guides/should-i-pay-off-debt-or-save-first')({
  component: DebtVsSavingsGuide,
  head: () => {
    const pageUrl = getCanonicalUrl('/guides/should-i-pay-off-debt-or-save-first');
    const title = 'Pay Off Debt or Save First? | Decision Guide 2025 | Moneko';
    const description = 'Use our interactive decision tree to determine whether to pay off debt or build savings first. Expert guidance for credit cards and emergency funds.';
    const keywords = 'pay off debt or save first, debt vs savings, emergency fund vs debt, financial priority decision tree, debt payoff strategy';

    const meta = seo({
      title,
      description,
      keywords,
      image: 'https://moneko.io/og-img.png',
      url: pageUrl,
    });

    return {
      meta,
      links: [
        {
          rel: 'canonical',
          href: pageUrl,
        },
      ],
    };
  },
});

function DebtVsSavingsGuide() {
  const [currentStep, setCurrentStep] = useState('start');
  const [userAnswers, setUserAnswers] = useState({});

  const decisionTree = {
    start: {
      question: "Do you have any emergency fund saved (even $500)?",
      options: [
        { answer: "No emergency fund at all", next: "no_emergency" },
        { answer: "Have some emergency savings", next: "has_some_emergency" },
        { answer: "Have 3+ months of expenses saved", next: "has_full_emergency" }
      ]
    },
    no_emergency: {
      question: "What type of debt do you have?",
      options: [
        { answer: "High-interest debt (credit cards 20%+)", next: "high_interest_no_emergency" },
        { answer: "Medium-interest debt (10-19%)", next: "medium_interest_no_emergency" },
        { answer: "Low-interest debt (under 10%)", next: "low_interest_no_emergency" }
      ]
    },
    has_some_emergency: {
      question: "How much emergency savings do you have?",
      options: [
        { answer: "Less than $1,000", next: "small_emergency" },
        { answer: "$1,000 - 1 month expenses", next: "one_month_emergency" },
        { answer: "1-2 months of expenses", next: "partial_emergency" }
      ]
    },
    has_full_emergency: {
      question: "What's your highest interest debt rate?",
      options: [
        { answer: "20%+ (credit cards)", next: "high_interest_good_emergency" },
        { answer: "10-19% (personal loans)", next: "medium_interest_good_emergency" },
        { answer: "Under 10% (student loans, mortgage)", next: "low_interest_good_emergency" }
      ]
    }
  };

  const recommendations = {
    high_interest_no_emergency: {
      priority: "Split Approach - Emergency First, Then Debt",
      explanation: "With no emergency fund and high-interest debt, you're in a precarious position. Build a small emergency fund ($500-1000) first, then attack the high-interest debt aggressively.",
      action_plan: [
        "Save $500-1000 for mini emergency fund immediately",
        "Pay minimums on all debts while building emergency fund",
        "Once mini emergency fund is complete, throw everything at highest interest debt",
        "Consider debt consolidation if it lowers interest rates"
      ],
      reasoning: "High-interest debt costs you 20%+ annually, but having zero emergency savings forces you to create more debt when emergencies happen."
    },
    medium_interest_no_emergency: {
      priority: "Emergency Fund First",
      explanation: "Build your emergency fund to $1,000 before focusing on medium-interest debt. This prevents you from going further into debt during emergencies.",
      action_plan: [
        "Build $1,000 emergency fund as fast as possible",
        "Pay minimum payments on all debts during this phase",
        "After emergency fund, focus extra money on highest interest debt",
        "Continue building emergency fund to 3 months expenses gradually"
      ],
      reasoning: "Medium-interest debt (10-19%) is costly but not as urgent as having zero financial safety net."
    },
    low_interest_no_emergency: {
      priority: "Emergency Fund Strongly Prioritized",
      explanation: "Low-interest debt can wait. With no emergency savings, you're one car repair away from high-interest debt. Build emergency fund first.",
      action_plan: [
        "Build full 3-6 month emergency fund before extra debt payments",
        "Pay minimum payments on all debts",
        "Consider if low-interest debt payments are tax-deductible (student loans)",
        "After full emergency fund, evaluate investment vs. debt payoff"
      ],
      reasoning: "Low-interest debt (under 10%) costs less than emergency situations typically create in new high-interest debt."
    },
    high_interest_good_emergency: {
      priority: "Attack High-Interest Debt Aggressively",
      explanation: "With a solid emergency fund and high-interest debt, focus all extra money on debt elimination. The guaranteed 20%+ return from debt payoff beats most investments.",
      action_plan: [
        "Pay minimums on everything except highest interest debt",
        "Throw all extra money at highest interest debt first",
        "Use debt avalanche method (highest interest first)",
        "Don't add to emergency fund until high-interest debt is gone"
      ],
      reasoning: "You have financial security with your emergency fund, and 20%+ guaranteed returns from debt payoff exceed expected market returns."
    },
    medium_interest_good_emergency: {
      priority: "Focus on Debt Payoff",
      explanation: "With good emergency savings, focus on eliminating medium-interest debt. The guaranteed return from debt payoff is attractive in current market conditions.",
      action_plan: [
        "Pay extra toward highest interest debt first",
        "Consider debt consolidation to lower rates",
        "Don't add to emergency fund until debt under 10% interest",
        "Evaluate investment vs. debt payoff for rates under 10%"
      ],
      reasoning: "Medium-interest debt guaranteed return often beats volatile market returns, especially with emergency fund already established."
    },
    low_interest_good_emergency: {
      priority: "Consider Investing Instead",
      explanation: "With low-interest debt and solid emergency savings, investing extra money might provide better long-term returns than debt payoff.",
      action_plan: [
        "Compare debt interest rate to expected investment returns",
        "If debt rate under 7%, consider investing instead of extra payments",
        "Max out employer 401(k) match first (free money)",
        "Consider tax implications (mortgage interest deduction, student loan interest deduction)"
      ],
      reasoning: "Low-interest debt (under 10%) combined with solid emergency fund puts you in position to optimize for growth rather than debt elimination."
    }
  };

  const currentRecommendation = recommendations[currentStep];
  const currentQuestion = decisionTree[currentStep];

  const handleAnswer = (option) => {
    setUserAnswers({...userAnswers, [currentStep]: option.answer});
    setCurrentStep(option.next);
  };

  const resetDecisionTree = () => {
    setCurrentStep('start');
    setUserAnswers({});
  };

  return (
    <AmbientHaloLayout>
      {/* HowTo Schema for Debt vs Savings Decision */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Decide Whether to Pay Off Debt or Save Money First",
          description: "Step-by-step decision tree to determine your optimal financial strategy based on emergency fund status, debt interest rates, and risk tolerance.",
          totalTime: "PT15M",
          estimatedCost: {
            currency: "USD",
            value: "0"
          },
          steps: [
            {
              name: "Assess Your Emergency Fund Status",
              text: "Determine if you have 0, partial, or full emergency savings (3-6 months of expenses) as this impacts your risk level."
            },
            {
              name: "Identify Your Debt Interest Rates",
              text: "List all debts by interest rate: high (20%+), medium (10-19%), or low (under 10%) to prioritize effectively."
            },
            {
              name: "Apply the Decision Framework",
              text: "Use emergency fund status and debt rates to determine optimal strategy: emergency first, debt first, or balanced approach."
            },
            {
              name: "Create Your Action Plan",
              text: "Implement specific steps based on your situation: build emergency fund, attack highest interest debt, or consider investing."
            },
            {
              name: "Monitor and Adjust Strategy",
              text: "Review your strategy as circumstances change - emergency fund grows, debt decreases, or interest rates change."
            }
          ]
        }}
      />

      {/* FAQ Schema */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "Should I pay off debt or save for emergencies first?",
            answer: "It depends on your emergency fund status and debt interest rates. If you have no emergency fund and high-interest debt (20%+), build a $500-1000 mini emergency fund first, then attack the debt. If you have some emergency savings, focus on high-interest debt first."
          },
          {
            question: "What if I have credit card debt but no emergency fund?",
            answer: "Build a small emergency fund ($500-1000) first to prevent creating more debt during emergencies, then aggressively pay off credit cards. Without an emergency fund, you'll likely end up in more debt when unexpected expenses arise."
          },
          {
            question: "Should I invest or pay off student loans?",
            answer: "If student loan rates are under 7% and you have a solid emergency fund, investing may provide better returns. Consider tax implications - student loan interest may be tax-deductible. For rates above 7%, debt payoff typically provides better guaranteed returns."
          },
          {
            question: "How much should I save in my emergency fund?",
            answer: "Aim for 3-6 months of essential expenses. Start with $500-1000 if you have high-interest debt, then build to one month, then gradually to 3-6 months. Self-employed individuals should target 6-12 months due to irregular income."
          },
          {
            question: "What counts as high-interest debt?",
            answer: "Debt with interest rates above 15-20% is typically considered high-interest, including most credit cards, payday loans, and some personal loans. These should be eliminated before focusing on investing or building large emergency funds."
          },
          {
            question: "Should I stop 401k contributions to pay off debt?",
            answer: "Never stop contributing enough to get your full employer match - it's free money with immediate 50-100% returns. For high-interest debt (20%+), consider temporarily reducing contributions beyond the match to accelerate debt payoff."
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
            Should I Pay Off Debt or Save First?
          </h1>
          <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
            Use our interactive decision tree to find your optimal financial strategy based on your emergency fund and debt situation.
          </p>

          {/* Content Attribution */}
          <div className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <p className="mb-1"><strong>Last Updated:</strong> September 7, 2025 | <strong>Reviewed by:</strong> Yifan Lim, CTO & Financial Systems Expert</p>
            <p><strong>Expert Sources:</strong> <a href="https://www.consumerfinance.gov/about-us/blog/building-emergency-savings/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">CFPB Emergency Savings Guidelines</a>, <a href="https://www.ramseysolutions.com/debt/debt-snowball-vs-debt-avalanche" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Ramsey Solutions Debt Strategies</a>, <a href="https://www.investopedia.com/articles/personal-finance/040715/when-pay-debt-vs-invest.asp" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Investopedia Debt vs Investment Analysis</a></p>
          </div>

          {/* Interactive Decision Tree */}
          <div className="mb-12 p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-foreground dark:text-dark-foreground">
              Interactive Financial Decision Tree
            </h2>

            {currentQuestion ? (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-blue-800 dark:text-blue-300">
                    {currentQuestion.question}
                  </h3>
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswer(option)}
                        className="w-full p-3 text-left border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {option.answer}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show path taken */}
                {Object.keys(userAnswers).length > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Your Path:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {Object.entries(userAnswers).map(([step, answer], index) => (
                        <li key={step}>
                          {index + 1}. {answer}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : currentRecommendation ? (
              <div className="space-y-6">
                <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="text-2xl font-bold mb-3 text-green-800 dark:text-green-300">
                    Recommendation: {currentRecommendation.priority}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {currentRecommendation.explanation}
                  </p>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Your Action Plan:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
                      {currentRecommendation.action_plan.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Why this strategy?</strong> {currentRecommendation.reasoning}
                    </p>
                  </div>
                </div>

                <button
                  onClick={resetDecisionTree}
                  className="w-full p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Start Over with Different Scenario
                </button>
              </div>
            ) : null}
          </div>

          {/* Expert Framework */}
          <div className="mb-12 p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-foreground dark:text-dark-foreground">
              The Financial Expert Framework
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h3 className="font-bold text-lg mb-3 text-yellow-800 dark:text-yellow-300">Emergency Fund Priority</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Financial experts agree: some emergency savings is crucial before aggressive debt payoff.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Prevents new debt during emergencies</li>
                  <li>• Provides psychological financial security</li>
                  <li>• Start with $500-1000 minimum</li>
                  <li>• Build to 3-6 months expenses gradually</li>
                </ul>
              </div>
              
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <h3 className="font-bold text-lg mb-3 text-red-800 dark:text-red-300">High-Interest Debt Priority</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Credit card debt averaging 22% APR in 2025 demands urgent attention after basic emergency fund.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Guaranteed "return" of 20%+ by paying off</li>
                  <li>• Compounds monthly, not annually</li>
                  <li>• Limits borrowing capacity for opportunities</li>
                  <li>• Creates stress affecting other decisions</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Current 2025 Market Context */}
          <div className="mb-12 p-6 border border-purple-200 dark:border-purple-700 rounded-xl bg-purple-50/50 dark:bg-purple-900/20 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-purple-800 dark:text-purple-300">
              2025 Financial Context for Your Decision
            </h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                <h3 className="font-bold text-sm mb-2 text-gray-800 dark:text-gray-200">High-Yield Savings</h3>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">4.8%</div>
                <p className="text-xs text-gray-500">Current top online bank rates</p>
              </div>
              
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                <h3 className="font-bold text-sm mb-2 text-gray-800 dark:text-gray-200">Credit Card Average</h3>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">22.1%</div>
                <p className="text-xs text-gray-500">National average credit card APR</p>
              </div>
              
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                <h3 className="font-bold text-sm mb-2 text-gray-800 dark:text-gray-200">Student Loans</h3>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">6.8%</div>
                <p className="text-xs text-gray-500">Federal undergrad rate 2024-25</p>
              </div>
            </div>
            
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
              Source: <a href="https://www.federalreserve.gov/releases/g19/current/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Federal Reserve G.19 Consumer Credit Report</a>, <a href="https://studentaid.gov/understand-aid/types/loans/interest-rates" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Federal Student Aid Interest Rates</a>
            </p>
          </div>

          {/* Comparison Blocks */}
          <div className="mt-12 space-y-8">
            <ComparisonBlock
              title="Debt Payoff vs. Emergency Fund Priority"
              leftTitle="Debt Payoff First"
              rightTitle="Emergency Fund First"
              comparisons={[
                {
                  category: "Best For",
                  left: "High-interest debt (20%+) with existing emergency savings",
                  right: "No emergency fund or unstable income situation"
                },
                {
                  category: "Financial Return",
                  left: "Guaranteed return equal to debt interest rate",
                  right: "Low return but prevents high-interest debt creation"
                },
                {
                  category: "Risk Level",
                  left: "Higher risk - vulnerable to emergencies creating new debt",
                  right: "Lower risk - protected from unexpected expenses"
                },
                {
                  category: "Psychological Impact",
                  left: "Motivating to see debt balances decrease monthly",
                  right: "Peace of mind from financial security buffer"
                },
                {
                  category: "Time Horizon",
                  left: "Faster wealth building once debt eliminated",
                  right: "Slower initial progress but steadier foundation"
                }
              ]}
            />

            <KeyTakeaways
              title="Debt vs. Savings Decision Key Takeaways"
              points={[
                "Build $500-1000 emergency fund before attacking high-interest debt - prevents debt spiral during emergencies",
                "After mini emergency fund, aggressively pay off debt above 15-20% interest rates for guaranteed returns",
                "Low-interest debt (under 7%) can be paid minimally while building full 3-6 month emergency fund",
                "Never stop employer 401(k) match contributions - it's immediate 50-100% return on investment",
                "Your strategy should evolve - reassess as emergency fund grows and debt balances decrease",
                "Consider your income stability - irregular income requires larger emergency funds before debt focus"
              ]}
            />

            <QuickFacts
              title="Debt vs. Savings Quick Facts"
              facts={[
                {
                  label: "Emergency Fund Priority",
                  value: "$500-1000",
                  description: "Minimum emergency fund before aggressive debt payoff"
                },
                {
                  label: "High-Interest Threshold",
                  value: "15-20%",
                  description: "Interest rates above this prioritize debt payoff over investing"
                },
                {
                  label: "Full Emergency Fund",
                  value: "3-6 months",
                  description: "Complete emergency fund covers 3-6 months essential expenses"
                },
                {
                  label: "Investment vs. Debt Payoff",
                  value: "7% break-even",
                  description: "Debt rates under 7% may favor investing over extra payments"
                }
              ]}
            />

            <AtAGlance
              title="Debt vs. Savings Strategy at a Glance"
              items={[
                {
                  category: "Step 1: Emergency Mini-Fund",
                  details: "Build $500-1000 emergency fund regardless of debt situation to prevent debt spiral"
                },
                {
                  category: "Step 2: High-Interest Debt Attack",
                  details: "Pay minimum on everything, attack highest interest debt (usually credit cards) first"
                },
                {
                  category: "Step 3: Build Full Emergency Fund",
                  details: "Once high-interest debt eliminated, build 3-6 month emergency fund"
                },
                {
                  category: "Step 4: Medium Interest Debt vs. Investing",
                  details: "Evaluate 7-15% debt payoff vs. investing based on risk tolerance and time horizon"
                },
                {
                  category: "Step 5: Low Interest Debt Strategy",
                  details: "Pay minimums on sub-7% debt while maximizing investments and retirement contributions"
                }
              ]}
            />

            <FinancialTips
              title="Advanced Debt vs. Savings Strategies"
              level="advanced"
              tips={[
                "Use the debt avalanche method (highest interest first) for mathematically optimal payoff, or debt snowball (smallest balance first) for psychological motivation",
                "Consider debt consolidation or balance transfer to 0% APR cards if you qualify and can pay off within promotional period",
                "Automate your strategy - set up automatic transfers for both emergency fund building and debt payments to maintain consistency",
                "Account for tax implications: mortgage interest and student loan interest may be tax-deductible, affecting your real cost of debt",
                "Build your emergency fund in high-yield savings accounts earning 4.5%+ to maximize returns while maintaining liquidity",
                "Review and adjust quarterly - as your emergency fund grows and debt decreases, your optimal strategy may shift toward investing"
              ]}
            />
          </div>

          {/* Call to Action */}
          <div className="mt-12 p-6 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Implement Your Strategy?</h2>
            <p className="mb-6">
              Use our financial calculators to create specific plans for debt payoff and emergency fund building.
            </p>
            <div className="space-x-4">
              <a href="/calculators/compound-calculator" className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Emergency Fund Calculator
              </a>
              <a href="/calculators/compound-calculator" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold border border-white hover:bg-blue-700 transition-colors">
                Debt Payoff Calculator
              </a>
            </div>
          </div>
        </div>
      </div>
    </AmbientHaloLayout>
  );
}