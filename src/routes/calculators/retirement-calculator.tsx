import { RetirementCalculator } from '@/components/calculators/retirement/retirement-calculator';
import { RetirementCalculatorSEOContent } from '@/components/calculators/retirement/retirement-seo-contents';
import { createFileRoute } from '@tanstack/react-router';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { useNavigate } from '@tanstack/react-router';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { StructuredData } from '@/components/seo/structured-data';
import { getCalculatorScreenshotData } from '@/utils/responsive-screenshots';
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips, ComparisonBlock } from '@/components/seo/content-blocks';
import { useState } from 'react';

// Age-based retirement scenarios component
function AgeBasedScenarios() {
  const [selectedAge, setSelectedAge] = useState('30s');

  const ageScenarios = {
    '20s': {
      title: 'Starting in Your 20s',
      advantages: [
        'Maximum time for compound growth (40+ years)',
        'Can take higher investment risks for higher returns',
        'Lower savings rate needed due to long timeline',
        'Time to recover from market downturns'
      ],
      challenges: [
        'Lower starting salaries and competing priorities',
        'Student loans and debt management',
        'Building emergency fund simultaneously'
      ],
      actionItems: [
        'Start with employer 401(k) match if available',
        'Open and max out Roth IRA ($7,000 annually for 2025)',
        'Aim for 10-15% savings rate including employer match',
        'Choose low-cost index funds for growth'
      ],
      catchUpInfo: 'No catch-up contributions needed - regular limits apply'
    },
    '30s': {
      title: 'Building in Your 30s',
      advantages: [
        'Higher income to increase savings rate',
        '30+ years of growth potential remaining',
        'Career stabilization and earning growth',
        'Still time to recover from setbacks'
      ],
      challenges: [
        'Home buying and family expenses',
        'Childcare costs and education planning',
        'Balancing multiple financial goals'
      ],
      actionItems: [
        'Increase savings rate to 15-20% of income',
        'Maximize both 401(k) and IRA contributions',
        'Consider increasing risk tolerance for growth',
        'Review and optimize investment allocations annually'
      ],
      catchUpInfo: 'No catch-up contributions needed - regular limits apply'
    },
    '40s': {
      title: 'Accelerating in Your 40s', 
      advantages: [
        'Peak earning years beginning',
        'Children becoming more financially independent',
        'Clearer picture of retirement needs',
        '20+ years of growth time remaining'
      ],
      challenges: [
        'College expenses for children',
        'Caring for aging parents',
        'Higher lifestyle inflation'
      ],
      actionItems: [
        'Aim for 20-25% savings rate if possible',
        'Focus on debt elimination before retirement',
        'Consider Roth IRA conversions during lower income years',
        'Reassess risk tolerance and time horizon'
      ],
      catchUpInfo: 'No catch-up contributions needed until age 50'
    },
    '50s': {
      title: 'Catch-Up Phase: 50s and Beyond',
      advantages: [
        'Catch-up contribution eligibility at age 50',
        'Potentially highest earning years',
        'Children likely financially independent',
        'Clear retirement timeline emerging'
      ],
      challenges: [
        'Limited time for market recovery',
        'Health care planning becomes critical',
        'Potential for job market discrimination'
      ],
      actionItems: [
        'Maximize all catch-up contributions immediately',
        'Shift to more conservative investment allocation',
        'Create detailed retirement income plan',
        'Consider Social Security timing strategies'
      ],
      catchUpInfo: '2025 Catch-up Contribution Limits (Age 50+): 401(k) additional $7,500, IRA additional $1,000'
    }
  };

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-center text-foreground dark:text-dark-foreground mb-6">
        Age-Based Retirement Planning Strategies
      </h2>
      
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {Object.keys(ageScenarios).map((age) => (
          <button
            key={age}
            onClick={() => setSelectedAge(age)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedAge === age
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {age === '20s' ? 'In Your 20s' : age === '30s' ? 'In Your 30s' : age === '40s' ? 'In Your 40s' : '50+ (Catch-Up)'}
          </button>
        ))}
      </div>

      <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <h3 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">
          {ageScenarios[selectedAge].title}
        </h3>
        
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-green-700 dark:text-green-400 mb-3">✅ Advantages</h4>
            <ul className="space-y-2 mb-4">
              {ageScenarios[selectedAge].advantages.map((advantage, index) => (
                <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                  • {advantage}
                </li>
              ))}
            </ul>

            <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3">⚠️ Challenges</h4>
            <ul className="space-y-2">
              {ageScenarios[selectedAge].challenges.map((challenge, index) => (
                <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                  • {challenge}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3">📋 Action Items</h4>
            <ul className="space-y-2 mb-4">
              {ageScenarios[selectedAge].actionItems.map((action, index) => (
                <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                  • {action}
                </li>
              ))}
            </ul>

            <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-3">💰 Catch-Up Contributions</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              {ageScenarios[selectedAge].catchUpInfo}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RetirementCalculatorPage() {
  const navigate = useNavigate();
  const screenshotData = getCalculatorScreenshotData('retirement-calculator');
  
  return (
    <AmbientHaloLayout>
      {/* HowTo Schema for Retirement Planning */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Plan for Retirement and Calculate Your Savings Needs",
          description: "Comprehensive guide to retirement planning including calculating retirement needs, setting savings goals, and developing withdrawal strategies for financial independence.",
          totalTime: "PT15M",
          estimatedCost: {
            currency: "USD",
            value: "0"
          },
          image: screenshotData.screenshot,
          steps: [
            {
              name: "Determine Your Current Age and Retirement Age",
              text: "Enter your current age and target retirement age. This establishes your investment timeline and helps calculate how long you have to save.",
              url: "https://moneko.io/calculators/retirement-calculator#age-inputs"
            },
            {
              name: "Estimate Your Annual Retirement Income Needs",
              text: "Calculate how much annual income you'll need in retirement. Use the 70-80% rule (70-80% of pre-retirement income) as a starting point.",
              url: "https://moneko.io/calculators/retirement-calculator#income-needs"
            },
            {
              name: "Input Your Current Retirement Savings",
              text: "Enter your existing retirement savings from 401k, IRA, and other retirement accounts. This is your starting point for growth projections.",
              url: "https://moneko.io/calculators/retirement-calculator#current-savings"
            },
            {
              name: "Set Your Monthly Retirement Contributions",
              text: "Plan your ongoing monthly contributions to retirement accounts. Aim to save at least 10-15% of your income for retirement.",
              url: "https://moneko.io/calculators/retirement-calculator#monthly-contributions"
            },
            {
              name: "Choose Your Expected Investment Return Rate",
              text: "Set a realistic annual return rate (typically 6-8% for diversified portfolios). Conservative estimates help ensure adequate savings.",
              url: "https://moneko.io/calculators/retirement-calculator#return-rate"
            },
            {
              name: "Factor in Social Security Benefits",
              text: "Include estimated Social Security benefits in your retirement income planning. Use the SSA benefits calculator for accurate estimates.",
              url: "https://moneko.io/calculators/retirement-calculator#social-security"
            },
            {
              name: "Plan Your Retirement Withdrawal Strategy",
              text: "Determine your annual withdrawal rate in retirement. The 4% rule suggests withdrawing 4% annually to preserve capital long-term.",
              url: "https://moneko.io/calculators/retirement-calculator#withdrawal-strategy"
            },
            {
              name: "Review and Adjust Your Retirement Plan",
              text: "Analyze the results and adjust contributions, retirement age, or lifestyle expectations to meet your retirement goals. Review annually.",
              url: "https://moneko.io/calculators/retirement-calculator#plan-review"
            }
          ]
        }}
      />

      {/* Software Application Schema */}
      <StructuredData
        type="software"
        data={{
          name: "Retirement Planning Calculator",
          description: "Comprehensive retirement calculator to plan savings needs, estimate retirement income, and develop withdrawal strategies for financial independence.",
          url: "https://moneko.io/calculators/retirement-calculator",
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
            ratingValue: "4.7",
            bestRating: "5",
            worstRating: "1",
            ratingCount: "2,193",
            reviewCount: "1,547"
          }
        }}
      />

      <div className="container mx-auto px-4 py-4 md:px-8 lg:px-12">
        <HomeHeader/>
        <div className="mt-4 mb-8">
          <BreadCrumbsHeader/>
        </div>
        <h1 className="mb-8 text-3xl font-bold text-center text-foreground dark:text-dark-foreground">Retirement Calculator</h1>
        <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
          Calculate your retirement savings needs with age-based strategies and catch-up contribution planning for financial independence.
        </p>
        
        {/* Content Attribution & Credibility */}
        <div className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-4">
          <p className="mb-1"><strong>Last Updated:</strong> September 7, 2025 | <strong>Reviewed by:</strong> Yifan Lim, CTO & Financial Systems Expert</p>
          <p><strong>Data Sources:</strong> <a href="https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-contributions" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">IRS Retirement Plan Limits</a>, <a href="https://www.ssa.gov/benefits/retirement/planner/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Social Security Administration</a>, <a href="https://www.dol.gov/agencies/ebsa" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Department of Labor</a></p>
        </div>
        
        <RetirementCalculator />
        
        <AgeBasedScenarios />
        
        {/* 2025 IRS Retirement Contribution Limits */}
        <div className="mb-12 p-6 border border-blue-200 dark:border-blue-700 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-center text-blue-800 dark:text-blue-300 mb-6">
            2025 IRS Retirement Contribution Limits
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <h3 className="font-bold text-lg mb-3 text-blue-700 dark:text-blue-400">Standard Contributions</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>401(k), 403(b), 457(b):</span>
                  <span className="font-semibold">$23,500</span>
                </div>
                <div className="flex justify-between">
                  <span>Traditional/Roth IRA:</span>
                  <span className="font-semibold">$7,000</span>
                </div>
                <div className="flex justify-between">
                  <span>SIMPLE IRA:</span>
                  <span className="font-semibold">$16,000</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <h3 className="font-bold text-lg mb-3 text-purple-700 dark:text-purple-400">Catch-Up (Age 50+)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>401(k) additional:</span>
                  <span className="font-semibold">+$7,500</span>
                </div>
                <div className="flex justify-between">
                  <span>IRA additional:</span>
                  <span className="font-semibold">+$1,000</span>
                </div>
                <div className="flex justify-between">
                  <span>SIMPLE IRA additional:</span>
                  <span className="font-semibold">+$3,500</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-4">
            Source: <a href="https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-contributions" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">IRS Publication 560 - Retirement Plans for Small Business</a>
          </p>
        </div>

        {/* AI-Optimized Content Blocks */}
        <div className="mt-12 space-y-8">
          <KeyTakeaways
            title="Retirement Planning Key Takeaways"
            points={[
              "Start saving as early as possible - a 25-year-old needs to save half as much monthly as a 35-year-old for the same retirement goal",
              "Maximize employer 401(k) matching first - it's an immediate 50-100% return on your contribution",
              "Use catch-up contributions at age 50+ to save an extra $8,500 annually ($7,500 in 401k + $1,000 in IRA)",
              "The 4% withdrawal rule requires 25x your annual expenses - needing $40K/year means saving $1 million",
              "Diversify across Traditional and Roth accounts to manage future tax liability in retirement",
              "Plan for healthcare costs averaging $300,000+ per couple in retirement according to Fidelity estimates"
            ]}
          />

          <ComparisonBlock
            title="Traditional vs Roth Retirement Accounts"
            leftTitle="Traditional 401(k)/IRA"
            rightTitle="Roth 401(k)/IRA"
            comparisons={[
              {
                category: "Tax Treatment",
                left: "Tax deduction now, taxed in retirement",
                right: "No deduction now, tax-free in retirement"
              },
              {
                category: "Best For",
                left: "Higher tax bracket now than in retirement",
                right: "Lower tax bracket now or young savers"
              },
              {
                category: "Required Distributions",
                left: "Must start at age 73",
                right: "No RMDs for Roth IRA (401k has RMDs)"
              },
              {
                category: "Income Limits",
                left: "401(k): None, IRA: Phases out at higher incomes",
                right: "401(k): None, IRA: Phases out $138K-$153K (single)"
              },
              {
                category: "Strategy",
                left: "Reduce current tax bill, defer taxes",
                right: "Lock in current tax rate, hedge against future increases"
              }
            ]}
          />
          
          <QuickFacts
            title="Retirement Planning Quick Facts (2025)"
            facts={[
              {
                label: "Full Retirement Age",
                value: "67 (born 1960+)",
                description: "Age for full Social Security benefits - check ssa.gov for your specific age"
              },
              {
                label: "Social Security Max Benefit",
                value: "$3,822/month",
                description: "Maximum monthly benefit at full retirement age in 2025"
              },
              {
                label: "Medicare Eligibility",
                value: "Age 65",
                description: "Sign up during initial enrollment period to avoid penalties"
              },
              {
                label: "Life Expectancy Planning",
                value: "85-90 years",
                description: "Plan for 20-25 years in retirement, with potential longevity risk"
              }
            ]}
          />
          
          <AtAGlance
            title="Retirement Planning at a Glance"
            items={[
              {
                category: "Savings Priority Order",
                details: "Emergency fund → Employer match → High-interest debt → Max IRA → Max 401(k) → Taxable investments"
              },
              {
                category: "Asset Allocation by Age",
                details: "20s-30s: 80-90% stocks, 40s: 70-80% stocks, 50s: 60-70% stocks, 60s+: 50-60% stocks"
              },
              {
                category: "Social Security Strategy",
                details: "Can claim at 62 (reduced), full benefits 67, delayed until 70 (132% of full benefit)"
              },
              {
                category: "Healthcare Costs",
                details: "Plan $300K+ per couple lifetime, consider HSA for triple tax advantage if eligible"
              },
              {
                category: "Withdrawal Strategy",
                details: "4% rule as starting point, adjust for inflation, market conditions, and spending flexibility"
              }
            ]}
          />
          
          <FinancialTips
            title="Advanced Retirement Strategies"
            level="advanced"
            tips={[
              "Use the 'mega backdoor Roth' if your 401(k) allows after-tax contributions - potential for $69,000 total annual contributions",
              "Consider Roth IRA conversions during market downturns or low-income years to minimize taxes on conversions",
              "Implement tax-location strategies - hold tax-inefficient investments in tax-advantaged accounts",
              "Plan Social Security claiming strategy with spousal benefits - higher earner may delay to age 70 for maximum family benefit",
              "Use HSA as stealth retirement account - triple tax advantage and no RMDs if used for qualified medical expenses",
              "Create a retirement income 'bucket' strategy - short-term safety, medium-term growth, long-term aggressive growth"
            ]}
          />
        </div>
        
        {/* Real-Time Market Data Sources */}
        <div className="mt-12 p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-center text-foreground dark:text-dark-foreground mb-6">
            Current Market Data & Research Sources
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Access current market data and retirement planning research from official government and financial industry sources:
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-blue-700 dark:text-blue-400">Government Sources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://www.ssa.gov/OACT/TR/TRassum.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    • Social Security Trustees Report - Economic Assumptions
                  </a>
                </li>
                <li>
                  <a href="https://www.bls.gov/cpi/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    • Bureau of Labor Statistics - Current Inflation Data
                  </a>
                </li>
                <li>
                  <a href="https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    • U.S. Treasury - Daily Yield Curve Rates
                  </a>
                </li>
                <li>
                  <a href="https://www.federalreserve.gov/monetarypolicy/fomc.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    • Federal Reserve - Current Interest Rates
                  </a>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-blue-700 dark:text-blue-400">Investment Research</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://www.morningstar.com/markets" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    • Morningstar - Market Data & Fund Analysis
                  </a>
                </li>
                <li>
                  <a href="https://finance.yahoo.com/quote/%5EGSPC/history/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    • S&P 500 Historical Performance Data
                  </a>
                </li>
                <li>
                  <a href="https://personal.vanguard.com/us/insights/saving-investing/model-portfolio-allocations" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    • Vanguard - Model Portfolio Allocations
                  </a>
                </li>
                <li>
                  <a href="https://www.fidelity.com/about-fidelity/individual-investing/fidelity-retirement-score-plus" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    • Fidelity - Retirement Planning Research
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-6">
            These sources provide current, authoritative data for retirement planning. Always consult multiple sources and consider professional advice for your specific situation.
          </p>
        </div>
        
        {/* Comprehensive Voice Search Optimized FAQ Schema */}
        <StructuredData
          type="faq"
          data={[
            // Age-Based Retirement Questions
            {
              question: "How much should I save for retirement in my 20s?",
              answer: "In your 20s, aim to save 10-15% of your income for retirement. Start with employer 401(k) match, then maximize IRA contributions ($7,000 limit in 2025). With 40+ years of compound growth, even $200-300 monthly can grow to over $1 million by retirement."
            },
            {
              question: "Is it too late to start saving for retirement in my 40s or 50s?",
              answer: "It's never too late to start saving for retirement. At age 50+, you can make catch-up contributions: extra $7,500 in 401(k) and $1,000 in IRA annually. Focus on maximizing savings rate (20-25% of income) and consider working a few years longer to dramatically improve your retirement security."
            },
            {
              question: "What are catch-up contributions and when can I make them?",
              answer: "Catch-up contributions allow people age 50 and older to save beyond standard limits. In 2025, you can contribute an extra $7,500 to 401(k) ($31,000 total) and extra $1,000 to IRA ($8,000 total). These help make up for lost time if you started saving later."
            },
            
            // 4% Rule and Withdrawal Strategy
            {
              question: "What's the 4% rule and is it still valid?",
              answer: "The 4% rule suggests withdrawing 4% of your retirement portfolio annually, adjusted for inflation. Based on historical data, this should make money last 30+ years. With $1 million saved, that's $40,000 first year. Some experts now suggest 3-3.5% for longer retirements."
            },
            {
              question: "How much money do I need to retire comfortably?",
              answer: "A common rule is 25 times your annual expenses (4% rule). If you need $60,000 annually, you'd need $1.5 million saved. However, this depends on Social Security benefits, healthcare costs, lifestyle, and other income sources. Many people retire comfortably on less with proper planning."
            },
            
            // Traditional vs Roth Questions
            {
              question: "Should I choose Traditional or Roth 401(k) and IRA?",
              answer: "Choose Traditional if you're in a higher tax bracket now than you expect in retirement - you get immediate tax deductions. Choose Roth if you're in a lower bracket now or young - you pay taxes now for tax-free growth and withdrawals later. Many experts recommend diversifying across both."
            },
            {
              question: "Can I contribute to both Traditional and Roth IRA?",
              answer: "Yes, but your total contributions across all IRAs cannot exceed $7,000 annually ($8,000 if 50+). However, Roth IRA contributions phase out at higher incomes: $138,000-$153,000 for singles, $218,000-$228,000 for married couples in 2025."
            },
            
            // Social Security Questions
            {
              question: "When should I start claiming Social Security benefits?",
              answer: "Full retirement age is 67 for people born 1960 or later. You can claim as early as 62 (reduced benefits) or delay until 70 (132% of full benefit). For many people, delaying until full retirement age or later maximizes lifetime benefits, especially if you have longevity in your family."
            },
            {
              question: "How much will Social Security replace of my income?",
              answer: "Social Security replaces about 40% of pre-retirement income for average earners, less for high earners. The maximum monthly benefit at full retirement age is $3,822 in 2025. Check your personalized estimate at ssa.gov by creating a my Social Security account."
            },
            
            // Healthcare and Advanced Planning
            {
              question: "How much should I budget for healthcare in retirement?",
              answer: "Fidelity estimates the average couple will spend over $300,000 on healthcare in retirement. Medicare covers many costs starting at 65, but not everything. Consider a Health Savings Account (HSA) for triple tax advantages if eligible - it's like a retirement account for medical expenses."
            },
            {
              question: "What happens to my 401(k) when I retire?",
              answer: "You have several options: leave money in your employer's plan, roll it to an IRA for more investment choices, convert to a Roth IRA (taxable event), or take withdrawals. You must start required minimum distributions (RMDs) at age 73, except for Roth IRAs which have no RMDs."
            },
            
            // Investment Strategy Questions
            {
              question: "How should I invest my retirement savings by age?",
              answer: "A common rule is 100 minus your age in stocks (rest in bonds). So at 30, consider 70% stocks/30% bonds; at 60, consider 40% stocks/60% bonds. However, with longer lifespans, many experts suggest more aggressive allocations. Adjust based on risk tolerance and retirement timeline."
            },
            {
              question: "Should I pay off my mortgage before retiring?",
              answer: "This depends on your mortgage rate, other debts, and investment returns. If your mortgage rate is below 4-5%, you might invest extra money instead. However, having a paid-off home reduces required retirement income and provides peace of mind. Consider your complete financial picture and risk tolerance."
            }
          ]}
        />
        
        {/* Speakable Schema for Voice Assistants */}
        <StructuredData
          type="speakable"
          data={{
            "@type": "SpeakableSpecification",
            "cssSelector": [".key-takeaways", ".quick-facts", ".comparison-block", ".age-scenarios"],
            "xpath": [
              "//div[contains(@class, 'key-takeaways')]",
              "//div[contains(@class, 'quick-facts')]", 
              "//div[contains(@class, 'comparison-block')]",
              "//div[contains(@class, 'age-scenarios')]"
            ]
          }}
        />
        
        <RetirementCalculatorSEOContent />
      </div>  
    </AmbientHaloLayout>
  );
}



export const Route = createFileRoute('/calculators/retirement-calculator')({
  component: RetirementCalculatorPage,
  head: () => {
    // Use the canonical helper to ensure consistent URLs
    const routePath = '/calculators/retirement-calculator';
    const pageUrl = getCanonicalUrl(routePath);
    const meta = seo({
      title: 'Retirement Calculator - 401k & IRA Planner | Moneko',
      description: 'Plan your retirement savings with our comprehensive calculator. Calculate 401k contributions, IRA limits, catch-up contributions, and get personalized retirement strategies by age.',
      keywords: 'retirement calculator, 401k calculator, IRA calculator, retirement planning calculator, catch-up contributions, retirement savings calculator, 401k contribution limits, retirement planner',
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
