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

export const Route = createFileRoute('/guides/what-will-my-house-payment-be')({
  component: HousePaymentGuide,
  head: () => {
    const pageUrl = getCanonicalUrl('/guides/what-will-my-house-payment-be');
    const title = 'What Will My House Payment Be? | PITI Calculator | Moneko';
    const description = 'Find out what your house payment will be with our complete guide. Calculate PITI payments with principal, interest, taxes, and insurance for 2025.';
    const keywords = 'what will my house payment be, monthly mortgage payment, PITI calculator, house payment calculator, mortgage payment estimate';

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

function HousePaymentGuide() {
  const [homePrice, setHomePrice] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [interestRate, setInterestRate] = useState('6.5');
  const [loanTerm, setLoanTerm] = useState('30');
  const [propertyTax, setPropertyTax] = useState('');
  const [homeInsurance, setHomeInsurance] = useState('');
  const [pmi, setPmi] = useState('');

  const calculateMonthlyPayment = () => {
    const price = parseFloat(homePrice);
    const down = parseFloat(downPayment) || 0;
    const rate = parseFloat(interestRate) / 100 / 12;
    const months = parseFloat(loanTerm) * 12;
    const loanAmount = price - down;
    
    if (price > 0 && rate > 0 && months > 0) {
      // Monthly P&I calculation
      const monthlyPI = (loanAmount * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
      
      // Additional costs
      const monthlyPropertyTax = parseFloat(propertyTax) || 0;
      const monthlyInsurance = parseFloat(homeInsurance) || 0;
      const monthlyPMI = parseFloat(pmi) || 0;
      
      const totalMonthlyPayment = monthlyPI + monthlyPropertyTax + monthlyInsurance + monthlyPMI;
      
      return {
        principalInterest: monthlyPI,
        propertyTax: monthlyPropertyTax,
        insurance: monthlyInsurance,
        pmi: monthlyPMI,
        total: totalMonthlyPayment,
        loanAmount
      };
    }
    return null;
  };

  const payment = calculateMonthlyPayment();

  return (
    <AmbientHaloLayout>
      {/* HowTo Schema for House Payment Calculation */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Calculate What Your House Payment Will Be",
          description: "Step-by-step guide to calculating your complete monthly house payment including principal, interest, taxes, insurance, and PMI.",
          totalTime: "PT10M",
          estimatedCost: {
            currency: "USD",
            value: "0"
          },
          steps: [
            {
              name: "Determine Your Loan Amount",
              text: "Subtract your down payment from the home purchase price to get your loan amount."
            },
            {
              name: "Calculate Principal and Interest",
              text: "Use the mortgage payment formula with your loan amount, interest rate, and loan term to calculate monthly P&I."
            },
            {
              name: "Add Property Taxes",
              text: "Divide annual property taxes by 12 to get your monthly property tax payment."
            },
            {
              name: "Include Insurance and PMI",
              text: "Add monthly homeowners insurance and private mortgage insurance (if less than 20% down) to get your total PITI payment."
            }
          ]
        }}
      />

      {/* FAQ Schema */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "What will my house payment be with current interest rates?",
            answer: "Your house payment depends on the home price, down payment, interest rate, and additional costs. As of September 2025, 30-year mortgage rates are around 6.50%. A $300,000 home with 20% down would have a monthly payment of approximately $1,517 for principal and interest alone."
          },
          {
            question: "What is included in my total house payment?",
            answer: "Your total house payment (PITI) includes: Principal and Interest, Property Taxes, Homeowners Insurance, and Private Mortgage Insurance (PMI) if you put less than 20% down. HOA fees may also apply."
          },
          {
            question: "How much down payment do I need for a house?",
            answer: "Down payments typically range from 3% to 20%. Conventional loans often require 5-20%, FHA loans allow 3.5%, and VA loans may allow 0% down for qualified veterans. Higher down payments reduce your monthly payment and eliminate PMI."
          },
          {
            question: "What interest rate will I qualify for?",
            answer: "Interest rates depend on your credit score, down payment, debt-to-income ratio, and market conditions. With excellent credit (740+), you'll qualify for the best rates. Current rates in September 2025 range from 6.25% to 7.00% for most borrowers."
          },
          {
            question: "How can I lower my monthly house payment?",
            answer: "You can lower payments by: increasing your down payment, getting a lower interest rate, choosing a longer loan term, buying a less expensive home, or buying in an area with lower property taxes."
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
            What Will My House Payment Be?
          </h1>
          <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
            Calculate your complete monthly house payment including principal, interest, taxes, and insurance (PITI).
          </p>

          {/* Content Attribution */}
          <div className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <p className="mb-1"><strong>Last Updated:</strong> September 7, 2025 | <strong>Reviewed by:</strong> Sabina Shao, CEO & Financial Education Expert</p>
            <p><strong>Data Sources:</strong> Freddie Mac Primary Mortgage Market Survey, National Association of Realtors, Current Market Rates</p>
          </div>

          {/* Interactive House Payment Calculator */}
          <div className="mb-12 p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-foreground dark:text-dark-foreground">
              House Payment Calculator
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Home Price ($)
                  </label>
                  <input
                    type="number"
                    value={homePrice}
                    onChange={(e) => setHomePrice(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="400,000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Down Payment ($)
                  </label>
                  <input
                    type="number"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="80,000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="6.50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Loan Term (years)
                  </label>
                  <select
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                  >
                    <option value="15">15 years</option>
                    <option value="20">20 years</option>
                    <option value="25">25 years</option>
                    <option value="30">30 years</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Monthly Property Tax ($)
                  </label>
                  <input
                    type="number"
                    value={propertyTax}
                    onChange={(e) => setPropertyTax(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Monthly Home Insurance ($)
                  </label>
                  <input
                    type="number"
                    value={homeInsurance}
                    onChange={(e) => setHomeInsurance(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="150"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground">
                    Monthly PMI ($)
                  </label>
                  <input
                    type="number"
                    value={pmi}
                    onChange={(e) => setPmi(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-dark-foreground"
                    placeholder="200"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required if down payment is less than 20%</p>
                </div>
              </div>
            </div>

            {payment && (
              <div className="mt-8 grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-blue-800 dark:text-blue-300">Payment Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Principal & Interest:</span>
                      <span className="font-semibold">${payment.principalInterest.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Property Tax:</span>
                      <span className="font-semibold">${payment.propertyTax.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Insurance:</span>
                      <span className="font-semibold">${payment.insurance.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PMI:</span>
                      <span className="font-semibold">${payment.pmi.toFixed(0)}</span>
                    </div>
                    <hr className="my-2 border-blue-200 dark:border-blue-700" />
                    <div className="flex justify-between text-base font-bold">
                      <span>Total Monthly Payment:</span>
                      <span className="text-blue-600 dark:text-blue-400">${payment.total.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="font-semibold mb-3 text-green-800 dark:text-green-300">Loan Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Home Price:</span>
                      <span className="font-semibold">${parseFloat(homePrice).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Down Payment:</span>
                      <span className="font-semibold">${parseFloat(downPayment || '0').toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Loan Amount:</span>
                      <span className="font-semibold">${payment.loanAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interest Rate:</span>
                      <span className="font-semibold">{interestRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Loan Term:</span>
                      <span className="font-semibold">{loanTerm} years</span>
                    </div>
                    <hr className="my-2 border-green-200 dark:border-green-700" />
                    <div className="flex justify-between text-base">
                      <span>Down Payment %:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {((parseFloat(downPayment || '0') / parseFloat(homePrice)) * 100).toFixed(1)}%
                      </span>
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
              title="House Payment Calculation Key Takeaways"
              points={[
                "Your total house payment (PITI) includes principal, interest, taxes, and insurance",
                "Principal and interest make up the largest portion of most house payments",
                "Property taxes and insurance vary significantly by location and home value",
                "PMI is required if you put less than 20% down and adds $100-300+ monthly",
                "A larger down payment reduces your monthly payment and may eliminate PMI",
                "Current mortgage rates in September 2025 are around 6.25-6.75% for most borrowers"
              ]}
            />

            <QuickFacts
              title="House Payment Quick Facts"
              facts={[
                {
                  label: "Rule of Thumb",
                  value: "28% of gross income",
                  description: "Maximum housing payment most lenders recommend"
                },
                {
                  label: "Average US Home Price",
                  value: "$420,000",
                  description: "National median as of September 2025"
                },
                {
                  label: "PMI Cost",
                  value: "0.3-1.5% annually",
                  description: "Of loan amount, paid monthly until 20% equity reached"
                },
                {
                  label: "Property Tax Average",
                  value: "1.1% annually",
                  description: "National average, varies significantly by state"
                }
              ]}
            />

            <AtAGlance
              title="House Payment Components at a Glance"
              items={[
                {
                  category: "Principal & Interest (P&I)",
                  details: "Loan payment that builds equity - calculated using home price, down payment, rate, and term"
                },
                {
                  category: "Property Tax (T)",
                  details: "Local government tax based on assessed home value - varies by location from 0.3% to 2.5% annually"
                },
                {
                  category: "Insurance (I)",
                  details: "Homeowners insurance protecting against damage - typically $50-300+ monthly depending on coverage"
                },
                {
                  category: "PMI (if applicable)",
                  details: "Private mortgage insurance required with less than 20% down - usually 0.3-1.5% of loan amount annually"
                },
                {
                  category: "Additional Costs",
                  details: "HOA fees, utilities, maintenance not included in PITI but important for budgeting"
                }
              ]}
            />

            <FinancialTips
              title="Smart Strategies to Lower Your House Payment"
              level="beginner"
              tips={[
                "Save for a larger down payment to reduce loan amount and potentially eliminate PMI",
                "Shop around with multiple lenders to find the best interest rate for your situation",
                "Consider a 15-year loan if you can afford higher payments - you'll pay less total interest",
                "Buy in areas with lower property taxes to reduce your monthly payment long-term",
                "Improve your credit score before applying to qualify for better interest rates",
                "Consider buying points to reduce your interest rate if you plan to stay long-term"
              ]}
            />
          </div>

          {/* Call to Action */}
          <div className="mt-12 p-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Calculate Your Mortgage?</h2>
            <p className="mb-6">
              Get a detailed breakdown of your potential house payment with our comprehensive mortgage calculator.
            </p>
            <div className="space-x-4">
              <a href="/calculators/mortgage-calculator" className="inline-block bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Detailed Mortgage Calculator
              </a>
              <a href="/guides/how-to-calculate-debt-to-income-ratio" className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold border border-white hover:bg-green-700 transition-colors">
                Check DTI Ratio
              </a>
            </div>
          </div>
        </div>
      </div>
    </AmbientHaloLayout>
  );
}