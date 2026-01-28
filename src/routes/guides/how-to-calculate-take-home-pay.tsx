import { createFileRoute } from '@tanstack/react-router';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { StructuredData } from '@/components/seo/structured-data';
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips } from '@/components/seo/content-blocks';
import { useState } from 'react';

export const Route = createFileRoute('/guides/how-to-calculate-take-home-pay')({
  component: TakeHomePayGuide,
  head: () => {
    const pageUrl = getCanonicalUrl('/guides/how-to-calculate-take-home-pay');
    const title = 'How to Calculate Take-Home Pay | Calculator 2025 | Moneko';
    const description = 'Calculate your exact take-home pay after taxes, deductions, and benefits. Understand federal taxes, state taxes, Social Security, and Medicare.';
    const keywords = 'take home pay calculator, net pay calculator, after tax income, paycheck calculator, salary after deductions';

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

function TakeHomePayGuide() {
  const [grossSalary, setGrossSalary] = useState('');
  const [payFrequency, setPayFrequency] = useState('monthly');
  const [filingStatus, setFilingStatus] = useState('single');
  const [state, setState] = useState('no-tax');
  const [healthInsurance, setHealthInsurance] = useState('');
  const [retirement401k, setRetirement401k] = useState('');
  const [otherDeductions, setOtherDeductions] = useState('');

  const calculateTakeHomePay = () => {
    let grossAnnual = parseFloat(grossSalary);
    if (!grossAnnual) return null;

    // Convert to annual if needed
    if (payFrequency === 'monthly') grossAnnual *= 12;
    if (payFrequency === 'biweekly') grossAnnual *= 26;
    if (payFrequency === 'weekly') grossAnnual *= 52;

    // Pre-tax deductions
    const retirement = parseFloat(retirement401k) || 0;
    const healthIns = parseFloat(healthInsurance) || 0;
    const otherPretax = parseFloat(otherDeductions) || 0;
    
    const annualRetirement = payFrequency === 'annual' ? retirement : 
                            payFrequency === 'monthly' ? retirement * 12 : 
                            payFrequency === 'biweekly' ? retirement * 26 : 
                            retirement * 52;
    
    const annualHealthIns = payFrequency === 'annual' ? healthIns :
                           payFrequency === 'monthly' ? healthIns * 12 :
                           payFrequency === 'biweekly' ? healthIns * 26 :
                           healthIns * 52;
    
    const annualOtherPretax = payFrequency === 'annual' ? otherPretax :
                             payFrequency === 'monthly' ? otherPretax * 12 :
                             payFrequency === 'biweekly' ? otherPretax * 26 :
                             otherPretax * 52;

    const totalPretaxDeductions = annualRetirement + annualHealthIns + annualOtherPretax;
    const taxableIncome = grossAnnual - totalPretaxDeductions;

    // FICA taxes (Social Security + Medicare)
    const socialSecurityTax = Math.min(taxableIncome * 0.062, 176400 * 0.062); // 2025 SS wage base
    const medicareTax = taxableIncome * 0.0145;
    const additionalMedicareTax = Math.max(0, (taxableIncome - (filingStatus === 'married' ? 250000 : 200000)) * 0.009);
    
    // Federal income tax (simplified brackets for 2025)
    let federalTax = 0;
    const brackets = filingStatus === 'single' 
      ? [[0, 0.10], [11600, 0.12], [47150, 0.22], [100525, 0.24], [191675, 0.32], [243725, 0.35], [609350, 0.37]]
      : [[0, 0.10], [23200, 0.12], [94300, 0.22], [201050, 0.24], [383350, 0.32], [487450, 0.35], [731200, 0.37]];
    
    let remainingIncome = taxableIncome;
    for (let i = 0; i < brackets.length; i++) {
      const [threshold, rate] = brackets[i];
      const nextThreshold = i < brackets.length - 1 ? brackets[i + 1][0] : Infinity;
      
      if (remainingIncome > 0 && taxableIncome > threshold) {
        const taxableAtThisBracket = Math.min(remainingIncome, nextThreshold - threshold);
        federalTax += taxableAtThisBracket * rate;
        remainingIncome -= taxableAtThisBracket;
      }
    }

    // State tax (simplified - using average rates)
    const stateTaxRates = {
      'no-tax': 0,
      'low-tax': 0.03,
      'medium-tax': 0.06,
      'high-tax': 0.10
    };
    const stateTax = taxableIncome * (stateTaxRates[state as keyof typeof stateTaxRates] || 0);

    // Total taxes
    const totalTaxes = federalTax + stateTax + socialSecurityTax + medicareTax + additionalMedicareTax;
    
    // Net pay
    const annualTakeHome = grossAnnual - totalPretaxDeductions - totalTaxes;
    
    // Convert back to pay frequency
    const takeHomeAmount = payFrequency === 'annual' ? annualTakeHome :
                          payFrequency === 'monthly' ? annualTakeHome / 12 :
                          payFrequency === 'biweekly' ? annualTakeHome / 26 :
                          annualTakeHome / 52;

    const grossAmount = parseFloat(grossSalary);

    return {
      grossPay: grossAmount,
      pretaxDeductions: payFrequency === 'annual' ? totalPretaxDeductions :
                       payFrequency === 'monthly' ? totalPretaxDeductions / 12 :
                       payFrequency === 'biweekly' ? totalPretaxDeductions / 26 :
                       totalPretaxDeductions / 52,
      federalTax: payFrequency === 'annual' ? federalTax :
                 payFrequency === 'monthly' ? federalTax / 12 :
                 payFrequency === 'biweekly' ? federalTax / 26 :
                 federalTax / 52,
      stateTax: payFrequency === 'annual' ? stateTax :
               payFrequency === 'monthly' ? stateTax / 12 :
               payFrequency === 'biweekly' ? stateTax / 26 :
               stateTax / 52,
      socialSecurityTax: payFrequency === 'annual' ? socialSecurityTax :
                        payFrequency === 'monthly' ? socialSecurityTax / 12 :
                        payFrequency === 'biweekly' ? socialSecurityTax / 26 :
                        socialSecurityTax / 52,
      medicareTax: payFrequency === 'annual' ? (medicareTax + additionalMedicareTax) :
                  payFrequency === 'monthly' ? (medicareTax + additionalMedicareTax) / 12 :
                  payFrequency === 'biweekly' ? (medicareTax + additionalMedicareTax) / 26 :
                  (medicareTax + additionalMedicareTax) / 52,
      totalDeductions: grossAmount - takeHomeAmount,
      takeHomePay: takeHomeAmount,
      effectiveTaxRate: (totalTaxes / grossAnnual) * 100,
      annualTakeHome,
      annualGross: grossAnnual
    };
  };

  const calculation = calculateTakeHomePay();

  const getEffectiveRateCategory = (rate: number) => {
    if (rate <= 15) return { category: 'Low Tax Burden', color: 'text-green-600 dark:text-green-400', description: 'Favorable tax situation' };
    if (rate <= 22) return { category: 'Moderate Tax Burden', color: 'text-yellow-600 dark:text-yellow-400', description: 'Typical tax rate' };
    if (rate <= 30) return { category: 'High Tax Burden', color: 'text-orange-600 dark:text-orange-400', description: 'Consider tax optimization strategies' };
    return { category: 'Very High Tax Burden', color: 'text-red-600 dark:text-red-400', description: 'Tax planning recommended' };
  };

  return (
    <AmbientHaloLayout>
      {/* HowTo Schema for Take-Home Pay Calculation */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Calculate Your Take-Home Pay",
          description: "Step-by-step guide to calculating net pay after federal taxes, state taxes, Social Security, Medicare, and pre-tax deductions.",
          totalTime: "PT15M",
          estimatedCost: {
            currency: "USD",
            value: "0"
          },
          steps: [
            {
              name: "Start with Gross Pay",
              text: "Begin with your gross salary before any taxes or deductions - this is your base amount for calculations."
            },
            {
              name: "Subtract Pre-Tax Deductions",
              text: "Deduct 401k contributions, health insurance premiums, and other pre-tax benefits to get your taxable income."
            },
            {
              name: "Calculate Federal Income Tax",
              text: "Apply federal tax brackets based on your filing status and taxable income using current IRS tax tables."
            },
            {
              name: "Add FICA and State Taxes",
              text: "Calculate Social Security (6.2%), Medicare (1.45%), additional Medicare if applicable, and state income taxes."
            },
            {
              name: "Calculate Net Pay",
              text: "Subtract all taxes and deductions from gross pay to determine your actual take-home amount."
            }
          ]
        }}
      />

      {/* FAQ Schema */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "How do I calculate my take-home pay from salary?",
            answer: "Start with gross salary, subtract pre-tax deductions (401k, health insurance), then subtract taxes: federal income tax (varies by bracket), Social Security (6.2%), Medicare (1.45%), and state taxes. The remainder is your net take-home pay."
          },
          {
            question: "What percentage of my salary will I take home?",
            answer: "Most people take home 70-80% of gross salary. This varies by income level, state, deductions, and filing status. Higher earners typically keep a smaller percentage due to progressive tax brackets."
          },
          {
            question: "What deductions reduce my taxable income?",
            answer: "Pre-tax deductions include 401k contributions, health insurance premiums, dental/vision insurance, FSA/HSA contributions, life insurance premiums, and commuter benefits. These reduce taxable income before calculating taxes."
          },
          {
            question: "How much Social Security and Medicare tax do I pay?",
            answer: "You pay 6.2% for Social Security (up to $176,400 in 2025) and 1.45% for Medicare on all income. High earners pay additional 0.9% Medicare tax on income over $200,000 (single) or $250,000 (married)."
          },
          {
            question: "Do I pay the same tax rate on all my income?",
            answer: "No, the US uses progressive tax brackets. You pay 10% on the first portion, 12% on the next portion, and so on. Only income above each bracket threshold is taxed at the higher rate."
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
            How to Calculate Take-Home Pay
          </h1>
          <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
            Understand exactly how much you'll actually receive after all taxes and deductions in 2025.
          </p>

          {/* Content Attribution */}
          <div className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <p className="mb-1"><strong>Last Updated:</strong> September 7, 2025 | <strong>Reviewed by:</strong> Sabina Shao, CEO & Financial Education Expert</p>
            <p><strong>Data Sources:</strong> IRS Tax Tables 2025, Social Security Administration, State Tax Authorities</p>
          </div>

          {/* Interactive Take-Home Pay Calculator */}
          <div className="mb-12 p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-foreground dark:text-dark-foreground">
              Take-Home Pay Calculator
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Gross Salary/Wage
                  </label>
                  <input
                    type="number"
                    value={grossSalary}
                    onChange={(e) => setGrossSalary(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="75000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Pay Frequency
                  </label>
                  <select
                    value={payFrequency}
                    onChange={(e) => setPayFrequency(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  >
                    <option value="annual">Annual</option>
                    <option value="monthly">Monthly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Filing Status
                  </label>
                  <select
                    value={filingStatus}
                    onChange={(e) => setFilingStatus(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  >
                    <option value="single">Single</option>
                    <option value="married">Married Filing Jointly</option>
                    <option value="head">Head of Household</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    State Tax Level
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  >
                    <option value="no-tax">No state income tax</option>
                    <option value="low-tax">Low tax state (3%)</option>
                    <option value="medium-tax">Medium tax state (6%)</option>
                    <option value="high-tax">High tax state (10%)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground dark:text-dark-foreground">
                  Pre-Tax Deductions
                </h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    401k Contribution
                  </label>
                  <input
                    type="number"
                    value={retirement401k}
                    onChange={(e) => setRetirement401k(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Per pay period</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Health Insurance Premium
                  </label>
                  <input
                    type="number"
                    value={healthInsurance}
                    onChange={(e) => setHealthInsurance(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="200"
                  />
                  <p className="text-xs text-gray-500 mt-1">Per pay period</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Other Pre-Tax Deductions
                  </label>
                  <input
                    type="number"
                    value={otherDeductions}
                    onChange={(e) => setOtherDeductions(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Dental, vision, FSA, etc. per pay period</p>
                </div>
              </div>
            </div>

            {calculation && (
              <div className="mt-8 grid lg:grid-cols-2 gap-6">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-red-800 dark:text-red-300">Deductions Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Gross Pay:</span>
                      <span className="font-semibold">${calculation.grossPay.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pre-tax Deductions:</span>
                      <span className="font-semibold">-${calculation.pretaxDeductions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Federal Income Tax:</span>
                      <span className="font-semibold">-${calculation.federalTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>State Tax:</span>
                      <span className="font-semibold">-${calculation.stateTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Social Security (6.2%):</span>
                      <span className="font-semibold">-${calculation.socialSecurityTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Medicare (1.45%+):</span>
                      <span className="font-semibold">-${calculation.medicareTax.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-green-800 dark:text-green-300">Net Pay Results</h3>
                  <div className="space-y-2 text-sm">
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        ${calculation.takeHomePay.toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Take-home pay per {payFrequency === 'biweekly' ? 'bi-weekly period' : payFrequency}
                      </p>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Annual Take-Home:</span>
                      <span className="font-semibold">${calculation.annualTakeHome.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Deductions:</span>
                      <span className="font-semibold">${calculation.totalDeductions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Pay Percentage:</span>
                      <span className="font-semibold">{((calculation.takeHomePay / calculation.grossPay) * 100).toFixed(1)}%</span>
                    </div>
                    <hr className="my-2 border-green-200 dark:border-green-700" />
                    <div className={`text-center ${getEffectiveRateCategory(calculation.effectiveTaxRate).color}`}>
                      <div className="font-semibold">
                        {calculation.effectiveTaxRate.toFixed(1)}% Effective Tax Rate
                      </div>
                      <p className="text-xs mt-1">{getEffectiveRateCategory(calculation.effectiveTaxRate).description}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI-Optimized Content Blocks */}
          <div className="mt-12 space-y-8">
            <KeyTakeaways
              title="Take-Home Pay Calculation Key Takeaways"
              points={[
                "Take-home pay is gross income minus all taxes and pre-tax deductions",
                "Pre-tax deductions like 401k and health insurance reduce your taxable income",
                "FICA taxes (Social Security 6.2% + Medicare 1.45%) apply to almost all income",
                "Federal income tax uses progressive brackets - higher income pays higher rates",
                "Most people keep 70-80% of gross salary after all deductions and taxes",
                "State tax rates vary significantly - some states have no income tax"
              ]}
            />

            <QuickFacts
              title="Take-Home Pay Quick Facts"
              facts={[
                {
                  label: "Average Take-Home %",
                  value: "75-78%",
                  description: "Percentage of gross salary most people keep"
                },
                {
                  label: "FICA Tax Rate",
                  value: "7.65%",
                  description: "Social Security (6.2%) + Medicare (1.45%)"
                },
                {
                  label: "Top Federal Rate 2025",
                  value: "37%",
                  description: "Highest marginal tax bracket for high earners"
                },
                {
                  label: "States with No Income Tax",
                  value: "9 states",
                  description: "Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington, Wyoming"
                }
              ]}
            />

            <AtAGlance
              title="Payroll Deductions at a Glance"
              items={[
                {
                  category: "Pre-Tax Deductions",
                  details: "401k contributions, health/dental/vision insurance, FSA/HSA, life insurance, commuter benefits - reduce taxable income"
                },
                {
                  category: "Federal Taxes",
                  details: "Income tax (progressive brackets 10%-37%), Social Security (6.2% up to $176,400), Medicare (1.45% all income + 0.9% high earners)"
                },
                {
                  category: "State & Local Taxes",
                  details: "State income tax (0%-13.3% varies by state), local taxes, State Disability Insurance in some states"
                },
                {
                  category: "Post-Tax Deductions",
                  details: "Roth 401k contributions, union dues, garnishments, voluntary life insurance - taken from net pay"
                },
                {
                  category: "Optimization Strategies",
                  details: "Maximize pre-tax deductions, understand tax brackets, consider state tax implications when relocating"
                }
              ]}
            />

            <FinancialTips
              title="Smart Strategies to Optimize Take-Home Pay"
              level="intermediate"
              tips={[
                "Maximize pre-tax deductions like 401k contributions and health insurance to reduce taxable income",
                "Use FSA or HSA accounts for medical expenses to save on taxes - these reduce both income and FICA taxes",
                "Consider Roth vs traditional 401k based on current vs expected future tax brackets",
                "If you're getting large tax refunds, adjust withholdings to increase monthly take-home pay",
                "Understand how bonuses are taxed - they're often withheld at higher rates but reconciled at year-end",
                "Factor in take-home pay changes when evaluating job offers or salary increases"
              ]}
            />
          </div>

          {/* Call to Action */}
          <div className="mt-12 p-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Plan Your Budget with Accurate Take-Home Pay</h2>
            <p className="mb-6">
              Now that you know your take-home pay, create a budget and savings plan based on your actual income.
            </p>
            <div className="space-x-4">
              <a href="/budgeting-app" className="inline-block bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Budget Planning Tool
              </a>
              <a href="/guides/how-to-calculate-debt-to-income-ratio" className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold border border-white hover:bg-indigo-700 transition-colors">
                DTI Calculator
              </a>
            </div>
          </div>
        </div>
      </div>
    </AmbientHaloLayout>
  );
}