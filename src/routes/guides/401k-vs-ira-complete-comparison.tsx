import { createFileRoute } from '@tanstack/react-router';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { StructuredData } from '@/components/seo/structured-data';
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips, ComparisonBlock } from '@/components/seo/content-blocks';
import { useState } from 'react';

export const Route = createFileRoute('/guides/401k-vs-ira-complete-comparison')({
  // Enable Static Site Generation for this content-heavy guide page
  ssr: 'static',
  component: Comparison401kVsIRA,
    head: () => {
      const pageUrl = getCanonicalUrl('/guides/401k-vs-ira-complete-comparison');
      const title = '401(k) vs IRA: Complete 2025 Comparison Guide | Moneko';
      const description = 'Comprehensive comparison of 401(k) vs IRA retirement accounts. Learn contribution limits, tax benefits, investment options, and which is better for your situation in 2025.';
      const keywords = '401k vs IRA, retirement account comparison, 401k contribution limits, IRA contribution limits, traditional vs roth, retirement planning 2025';

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
  }
);

function Comparison401kVsIRA() {
  const [selectedScenario, setSelectedScenario] = useState('young-professional');

  const scenarios = {
    'young-professional': {
      title: 'Young Professional (22-35)',
      recommendation: 'Prioritize 401(k) for employer match, then max Roth IRA',
      strategy: [
        'Contribute enough to 401(k) to get full employer match (typically 3-6%)',
        'Max out Roth IRA ($7,000 annually for 2025)',
        'Return to 401(k) with additional contributions up to limit ($23,500 for 2025)',
        'Consider Roth 401(k) if available and you expect higher future tax rates'
      ],
      reasoning: 'Long time horizon favors tax-free growth of Roth accounts, while employer match provides immediate 50-100% return.'
    },
    'mid-career': {
      title: 'Mid-Career Professional (36-49)', 
      recommendation: 'Balance traditional 401(k) with Roth IRA based on current tax bracket',
      strategy: [
        'Maximize employer 401(k) match first',
        'If in 22%+ tax bracket, prioritize traditional 401(k) for tax deduction',
        'Contribute to Roth IRA if income allows (phases out at $138,000-$153,000 for 2025)',
        'Consider backdoor Roth IRA if income exceeds limits',
        'Aim to max both accounts if financially feasible'
      ],
      reasoning: 'Peak earning years benefit from traditional 401(k) tax deductions, while Roth IRA provides tax diversification.'
    },
    'pre-retirement': {
      title: 'Pre-Retirement (50+)',
      recommendation: 'Maximize catch-up contributions and focus on tax-advantaged growth',
      strategy: [
        'Max 401(k) including catch-up: $31,000 total for 2025 ($23,500 + $7,500 catch-up)',
        'Max IRA including catch-up: $8,000 total for 2025 ($7,000 + $1,000 catch-up)', 
        'Prioritize traditional accounts if expecting lower retirement tax bracket',
        'Consider Roth conversions during lower-income years before retirement',
        'Focus on portfolio allocation and withdrawal strategy planning'
      ],
      reasoning: 'Catch-up contributions provide maximum tax-advantaged savings, while shorter time horizon requires strategic tax planning.'
    }
  };

  return (
    <AmbientHaloLayout>
      {/* Comprehensive Schema Markup */}
      <StructuredData
        type="article"
        data={{
          headline: "401(k) vs IRA: Complete 2025 Comparison Guide",
          description: "Comprehensive analysis comparing 401(k) and IRA retirement accounts, including contribution limits, tax benefits, investment options, and strategic recommendations for 2025.",
          author: {
            "@type": "Person",
            name: "Yifan Lim",
            jobTitle: "CTO & Financial Systems Expert",
            url: "https://moneko.io/team"
          },
          datePublished: "2025-01-07T00:00:00Z",
          dateModified: "2025-01-07T00:00:00Z",
          publisher: {
            "@type": "Organization", 
            name: "Moneko",
            logo: "https://moneko.io/icon.svg"
          },
          mainEntityOfPage: getCanonicalUrl('/guides/401k-vs-ira-complete-comparison'),
          wordCount: 2800,
          timeRequired: "PT12M",
          educationalLevel: "Intermediate",
          isAccessibleForFree: true,
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".key-takeaways", ".comparison-summary", ".recommendation-section"]
          }
        }}
      />

      {/* FAQ Schema */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "What's the main difference between a 401(k) and IRA?",
            answer: "A 401(k) is an employer-sponsored retirement plan with higher contribution limits ($23,500 for 2025) and potential employer matching. An IRA is an individual retirement account you open independently with lower limits ($7,000 for 2025) but more investment flexibility."
          },
          {
            question: "Should I contribute to 401(k) or IRA first?",
            answer: "Always contribute enough to your 401(k) to get the full employer match first - it's free money with immediate 50-100% returns. Then max out your IRA for better investment options, then return to 401(k) for additional contributions."
          },
          {
            question: "Can I have both a 401(k) and IRA?",
            answer: "Yes, you can contribute to both a 401(k) and IRA in the same year. The contribution limits are separate, allowing you to save up to $30,500 total in 2025 ($23,500 in 401k + $7,000 in IRA), plus catch-up contributions if you're 50 or older."
          },
          {
            question: "What are the 2025 contribution limits for 401(k) and IRA?",
            answer: "For 2025: 401(k) limit is $23,500 ($31,000 with $7,500 catch-up if 50+). IRA limit is $7,000 ($8,000 with $1,000 catch-up if 50+). These limits are set annually by the IRS based on inflation adjustments."
          },
          {
            question: "Should I choose traditional or Roth for my retirement accounts?",
            answer: "Choose traditional if you're in a high tax bracket now and expect lower taxes in retirement. Choose Roth if you're in a lower bracket now or expect higher future tax rates. Many experts recommend a mix of both for tax diversification."
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
            401(k) vs IRA: Complete 2025 Comparison Guide
          </h1>
          <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
            Understand the key differences, contribution limits, and strategic decisions to maximize your retirement savings.
          </p>

          {/* Content Attribution */}
          <div className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <p className="mb-1"><strong>Last Updated:</strong> January 7, 2025 | <strong>Reviewed by:</strong> Yifan Lim, CTO & Financial Systems Expert</p>
            <p><strong>Data Sources:</strong> <a href="https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-contributions" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">IRS Publication 560</a>, <a href="https://www.investopedia.com/retirement/401k-vs-ira/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Investopedia Retirement Analysis</a>, <a href="https://www.fidelity.com/retirement-planning/learn-about-iras/ira-vs-401k" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Fidelity Retirement Research</a></p>
          </div>

          {/* 2025 Contribution Limits Quick Reference */}
          <div className="mb-12 p-6 border border-blue-200 dark:border-blue-700 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-blue-800 dark:text-blue-300">
              2025 Retirement Account Limits
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                <h3 className="font-bold text-lg mb-3 text-gray-800 dark:text-gray-200">401(k) Contributions</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Standard Limit:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">$23,500</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Age 50+ Catch-up:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">+$7,500</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span><strong>Total 50+:</strong></span>
                    <span className="font-bold text-green-600 dark:text-green-400">$31,000</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                <h3 className="font-bold text-lg mb-3 text-gray-800 dark:text-gray-200">IRA Contributions</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Standard Limit:</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">$7,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Age 50+ Catch-up:</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">+$1,000</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span><strong>Total 50+:</strong></span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">$8,000</span>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
              Source: <a href="https://www.irs.gov/newsroom/401k-limit-increases-to-23500-for-2024-ira-limit-remains-7000" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">IRS 2025 Contribution Limit Updates</a>
            </p>
          </div>

          {/* Interactive Scenario Selector */}
          <div className="mb-12 p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-foreground dark:text-dark-foreground">
              Strategic Recommendations by Life Stage
            </h2>

            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {Object.entries(scenarios).map(([key, scenario]) => (
                <button
                  key={key}
                  onClick={() => setSelectedScenario(key)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedScenario === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {scenario.title}
                </button>
              ))}
            </div>

            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-200">
                {scenarios[selectedScenario].title}: {scenarios[selectedScenario].recommendation}
              </h3>
              
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Strategic Action Plan:</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
                  {scenarios[selectedScenario].strategy.map((step, index) => (
                    <li key={index} className="leading-relaxed">{step}</li>
                  ))}
                </ol>
              </div>
              
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Why this strategy?</strong> {scenarios[selectedScenario].reasoning}
                </p>
              </div>
            </div>
          </div>

          {/* Comprehensive Comparison Tables */}
          <div className="mb-12 space-y-8">
            <ComparisonBlock
              title="401(k) vs IRA: Complete Feature Comparison"
              leftTitle="401(k)"
              rightTitle="IRA (Traditional & Roth)"
              comparisons={[
                {
                  category: "2025 Contribution Limits",
                  left: "$23,500 annually ($31,000 if 50+)",
                  right: "$7,000 annually ($8,000 if 50+)"
                },
                {
                  category: "Employer Benefits",
                  left: "Employer matching (typically 3-6% of salary)",
                  right: "No employer contributions available"
                },
                {
                  category: "Investment Options",
                  left: "Limited to employer-selected funds (typically 10-30 options)",
                  right: "Unlimited - stocks, bonds, ETFs, mutual funds, REITs"
                },
                {
                  category: "Fees & Expenses",
                  left: "Administrative fees + fund expense ratios (often 0.5-2%)",
                  right: "Account fees + fund expenses (can be 0.03-1%+)"
                },
                {
                  category: "Income Restrictions",
                  left: "No income limits for participation",
                  right: "Traditional: none, Roth: phases out $138K-$153K (2025)"
                },
                {
                  category: "Early Withdrawal",
                  left: "10% penalty + taxes before 59½ (some hardship exceptions)",
                  right: "Traditional: 10% penalty + taxes, Roth: contributions penalty-free"
                },
                {
                  category: "Required Distributions",
                  left: "RMDs start at age 73",
                  right: "Traditional: RMDs at 73, Roth: No RMDs during lifetime"
                },
                {
                  category: "Job Changes",
                  left: "Can roll over to new employer or IRA",
                  right: "Remains with you regardless of job changes"
                }
              ]}
            />

            <ComparisonBlock
              title="Traditional vs Roth: Tax Treatment Comparison"
              leftTitle="Traditional (401k/IRA)"
              rightTitle="Roth (401k/IRA)"
              comparisons={[
                {
                  category: "Tax Deduction",
                  left: "Immediate tax deduction on contributions",
                  right: "No immediate tax deduction"
                },
                {
                  category: "Tax on Growth", 
                  left: "Tax-deferred growth until withdrawal",
                  right: "Tax-free growth forever"
                },
                {
                  category: "Withdrawal Taxation",
                  left: "All withdrawals taxed as ordinary income",
                  right: "Qualified withdrawals completely tax-free"
                },
                {
                  category: "Required Distributions",
                  left: "Must take RMDs starting at age 73",
                  right: "No RMDs during your lifetime"
                },
                {
                  category: "Best For",
                  left: "High earners expecting lower retirement tax rates",
                  right: "Younger savers or those expecting higher future tax rates"
                },
                {
                  category: "Estate Planning",
                  left: "Heirs pay income tax on inherited funds",
                  right: "Heirs receive tax-free inheritance"
                }
              ]}
            />
          </div>

          {/* Decision Framework */}
          <div className="mb-12 p-6 border border-green-200 dark:border-green-700 rounded-xl bg-green-50/50 dark:bg-green-900/20 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-green-800 dark:text-green-300">
              The Ultimate Decision Framework
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">Step 1: Secure the Match</h3>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Priority #1:</strong> Always contribute enough to your 401(k) to get the full employer match.
                  </p>
                  <div className="text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 p-2 rounded">
                    <strong>Example:</strong> If employer matches 50% of contributions up to 6% of salary, contribute at least 6% to get the full match - that's an immediate 50% return.
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">Step 2: Max the IRA</h3>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Priority #2:</strong> Max out your IRA ($7,000 for 2025) for better investment options.
                  </p>
                  <div className="text-xs text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                    <strong>Choose Roth if:</strong> You're young, in lower tax bracket, or expect higher future taxes.
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">Step 3: Return to 401(k)</h3>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Priority #3:</strong> Additional 401(k) contributions up to the $23,500 limit.
                  </p>
                  <div className="text-xs text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 p-2 rounded">
                    <strong>Optimization:</strong> Consider Roth 401(k) if available and you prefer tax-free withdrawals.
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">Step 4: Advanced Strategies</h3>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>High earners:</strong> Backdoor Roth IRA, mega backdoor Roth, HSA maximization.
                  </p>
                  <div className="text-xs text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 p-2 rounded">
                    <strong>Note:</strong> Consult a financial advisor for complex strategies above IRA income limits.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI-Optimized Content Blocks */}
          <div className="mt-12 space-y-8">
            <KeyTakeaways
              title="401(k) vs IRA: Essential Takeaways"
              points={[
                "Always get full employer 401(k) match first - it's guaranteed 50-100% immediate return on investment",
                "401(k) has higher limits ($23,500 vs $7,000 in 2025) but IRA offers unlimited investment flexibility",
                "IRA contributions can be made until tax filing deadline, 401(k) contributions must be made by December 31st",
                "You can have both accounts - contribution limits are separate, allowing up to $30,500 total savings annually",
                "Roth options provide tax-free withdrawals in retirement but no immediate tax deduction",
                "Traditional options give immediate tax deductions but all withdrawals are taxed as ordinary income"
              ]}
            />

            <QuickFacts
              title="401(k) vs IRA Quick Facts"
              facts={[
                {
                  label: "Maximum Annual Savings (2025)",
                  value: "$30,500",
                  description: "Combined 401(k) and IRA limits ($23,500 + $7,000)"
                },
                {
                  label: "Age 50+ Catch-up Total",
                  value: "$39,000", 
                  description: "Total with catch-up contributions ($31,000 + $8,000)"
                },
                {
                  label: "Employer Match Average",
                  value: "4.7%",
                  description: "Average employer 401(k) match as percentage of salary"
                },
                {
                  label: "Early Withdrawal Penalty",
                  value: "10%",
                  description: "IRS penalty for withdrawals before age 59½ (plus taxes)"
                }
              ]}
            />

            <AtAGlance
              title="401(k) vs IRA Decision Matrix"
              items={[
                {
                  category: "Best for High Savers",
                  details: "401(k) - Higher contribution limits allow tax-advantaged savings up to $23,500 annually"
                },
                {
                  category: "Best for Investment Control",
                  details: "IRA - Choose any investments: individual stocks, bonds, ETFs, REITs, mutual funds"
                },
                {
                  category: "Best for Employer Benefits",
                  details: "401(k) - Employer matching provides immediate guaranteed returns of 50-100%"
                },
                {
                  category: "Best for Tax Flexibility",
                  details: "IRA - Both traditional and Roth options with no income limits for traditional"
                },
                {
                  category: "Best for Job Mobility",
                  details: "IRA - Account stays with you regardless of employment changes"
                }
              ]}
            />

            <FinancialTips
              title="Advanced 401(k) vs IRA Optimization Strategies"
              level="advanced"
              tips={[
                "Use the 'bucket strategy': Traditional accounts for current tax savings, Roth accounts for tax-free retirement income, creating tax diversification",
                "Consider Roth conversions during low-income years to move traditional IRA funds to Roth at lower tax rates",
                "If income exceeds Roth IRA limits, use backdoor Roth IRA strategy through non-deductible traditional IRA contributions",
                "Optimize asset location: Hold tax-inefficient investments in tax-advantaged accounts, tax-efficient funds in taxable accounts",
                "Plan withdrawal strategies: Use traditional accounts first in low tax bracket years, preserve Roth for high-expense years",
                "Track cost basis carefully for non-deductible IRA contributions to avoid double taxation on withdrawals"
              ]}
            />
          </div>

          {/* Call to Action */}
          <div className="mt-12 p-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Optimize Your Retirement Strategy?</h2>
            <p className="mb-6">
              Use our retirement calculator to model different 401(k) and IRA contribution scenarios based on your specific situation.
            </p>
            <div className="space-x-4">
              <a href="/calculators/retirement-calculator" className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Retirement Calculator
              </a>
              <a href="/calculators/compound-calculator" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold border border-white hover:bg-blue-700 transition-colors">
                Compound Interest Calculator
              </a>
            </div>
          </div>
        </div>
      </div>
    </AmbientHaloLayout>
  );
}