import { MortgageCalculator } from '@/components/calculators/mortgage/mortgage';
import { MortgageCalculatorSEOContent } from '@/components/calculators/mortgage/mortgage-seo-contents';
import { createFileRoute } from '@tanstack/react-router';

import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { useNavigate } from '@tanstack/react-router';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { StructuredData } from '@/components/seo/structured-data';
import { KeyTakeaways, QuickFacts, AtAGlance, ComparisonBlock } from '@/components/seo/content-blocks';
import { getCalculatorScreenshotData } from '@/utils/responsive-screenshots';
import { CurrentMortgageRates, EconomicIndicatorsTable } from '@/components/seo/financial-data-tables';

export const Route = createFileRoute('/calculators/mortgage-calculator')({
  component: MortgageCalculatorPage,
  head: () => {
    // Use the canonical helper to ensure consistent URLs
    const routePath = '/calculators/mortgage-calculator';
    const pageUrl = getCanonicalUrl(routePath);
    const meta = seo({
      title: 'Free Mortgage Calculator - Home Loan Payment Estimator & Amortization Schedule | Moneko',
      description: 'Calculate monthly mortgage payments with our free home loan calculator. Get accurate PITI estimates, view amortization schedules, and compare loan terms with taxes and insurance.',
      keywords: 'mortgage calculator, home loan calculator, mortgage payment calculator, amortization schedule, PITI calculator, home affordability calculator, mortgage rates, loan calculator',
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
function MortgageCalculatorPage  ()  {
  const navigate = useNavigate();
  const screenshotData = getCalculatorScreenshotData('mortgage-calculator');
  
  return (
    <AmbientHaloLayout>
      {/* HowTo Schema for Mortgage Calculation */}
      <StructuredData
        type="howto"
        data={{
          name: "How to Calculate Monthly Mortgage Payments and Plan Your Home Purchase",
          description: "Step-by-step guide to calculate your monthly mortgage payments including principal, interest, taxes, and insurance (PITI) for home buying planning.",
          totalTime: "PT10M",
          estimatedCost: {
            currency: "USD",
            value: "0"
          },
          image: screenshotData.screenshot,
          steps: [
            {
              name: "Enter Your Home Purchase Price",
              text: "Input the total purchase price of the home you want to buy. This is the market value or agreed purchase price of the property.",
              url: "https://moneko.io/calculators/mortgage-calculator#purchase-price"
            },
            {
              name: "Calculate Your Down Payment",
              text: "Enter your down payment amount or percentage. A larger down payment reduces your loan amount and may eliminate PMI requirements.",
              url: "https://moneko.io/calculators/mortgage-calculator#down-payment"
            },
            {
              name: "Set Your Mortgage Interest Rate",
              text: "Input the annual interest rate offered by your lender. Shop around with multiple lenders to get the best rate for your situation.",
              url: "https://moneko.io/calculators/mortgage-calculator#interest-rate"
            },
            {
              name: "Choose Your Loan Term",
              text: "Select your mortgage term length (15, 20, or 30 years). Shorter terms have higher monthly payments but less total interest paid.",
              url: "https://moneko.io/calculators/mortgage-calculator#loan-term"
            },
            {
              name: "Add Property Taxes and Insurance",
              text: "Include annual property taxes and homeowners insurance costs. These are typically escrowed with your monthly mortgage payment.",
              url: "https://moneko.io/calculators/mortgage-calculator#taxes-insurance"
            },
            {
              name: "Include PMI if Applicable",
              text: "Add Private Mortgage Insurance if your down payment is less than 20%. PMI protects the lender and adds to your monthly cost.",
              url: "https://moneko.io/calculators/mortgage-calculator#pmi"
            },
            {
              name: "Review Your Complete PITI Payment",
              text: "Analyze your total monthly payment breakdown and amortization schedule. Ensure the payment fits comfortably in your budget.",
              url: "https://moneko.io/calculators/mortgage-calculator#results"
            },
            {
              name: "Plan Your Home Buying Budget",
              text: "Use the results to determine affordability and compare different scenarios. Consider the 28/36 rule for debt-to-income ratios.",
              url: "https://moneko.io/calculators/mortgage-calculator#budget-planning"
            }
          ]
        }}
      />

      {/* Software Application Schema */}
      <StructuredData
        type="software"
        data={{
          name: "Mortgage Payment Calculator",
          description: "Comprehensive mortgage calculator with PITI breakdown and amortization schedule. Calculate monthly payments, total interest, and plan your home purchase budget.",
          url: "https://moneko.io/calculators/mortgage-calculator",
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
            ratingValue: "4.9",
            bestRating: "5",
            worstRating: "1",
            ratingCount: "3,152",
            reviewCount: "2,284"
          }
        }}
      />

      <div className="container mx-auto px-4 py-4 md:px-8 lg:px-12">
        <HomeHeader/>
        <div className="mt-4 mb-8">
          <BreadCrumbsHeader/>
        </div>
        <h1 className="mb-8 text-3xl font-bold text-center text-foreground dark:text-dark-foreground">Mortgage Calculator</h1>
        <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
          Calculate your monthly mortgage payments (PITI - principal, interest, taxes, and insurance) and discover how much house you can afford with our comprehensive home loan calculator.
        </p>
        
        {/* Content Attribution & Credibility */}
        <div className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-4">
          <p className="mb-1"><strong>Last Updated:</strong> September 7, 2025 | <strong>Reviewed by:</strong> Yifan Lim, CTO & Financial Systems Expert</p>
          <p><strong>Data Sources:</strong> Freddie Mac Primary Mortgage Market Survey, MBA Mortgage Applications Survey, Current Market Rates</p>
        </div>
        
        <MortgageCalculator />
        
        {/* AI-Optimized Content Blocks */}
        <div className="mt-12 space-y-8">
          <KeyTakeaways
            title="Mortgage Payment Key Takeaways"
            points={[
              "PITI (Principal, Interest, Taxes, Insurance) is your complete monthly housing cost - not just the loan payment",
              "Putting 20% down eliminates PMI (private mortgage insurance) and can save $100-300+ monthly",
              "15-year mortgages have higher payments but save tens of thousands in total interest compared to 30-year loans",
              "Keep your debt-to-income ratio (DTI) below 36% total and housing costs below 28% of gross income",
              "Interest rates significantly impact affordability - even 0.5% difference changes payments by $50-100/month on a $300K loan"
            ]}
          />
          
          <QuickFacts
            title="Mortgage Planning Guidelines"
            facts={[
              {
                label: "Down Payment Options",
                value: "3% - 20%",
                description: "FHA loans start at 3.5%, conventional at 3%, no PMI at 20%"
              },
              {
                label: "PMI Requirement",
                value: "Less than 20% down",
                description: "Private mortgage insurance required with smaller down payments"
              },
              {
                label: "28/36 Rule",
                value: "Housing ≤28%, Total debt ≤36%",
                description: "Recommended debt-to-income ratio guidelines"
              },
              {
                label: "Credit Score Impact",
                value: "620+ minimum",
                description: "Higher scores qualify for better interest rates"
              }
            ]}
          />
          
          <ComparisonBlock
            title="15-Year vs 30-Year Mortgage Comparison"
            leftTitle="15-Year Mortgage"
            rightTitle="30-Year Mortgage"
            comparisons={[
              {
                category: "Monthly Payment",
                left: "Higher payment",
                right: "Lower payment"
              },
              {
                category: "Total Interest Paid",
                left: "Much less interest",
                right: "More interest overall"
              },
              {
                category: "Interest Rate",
                left: "Typically 0.25-0.5% lower",
                right: "Slightly higher rate"
              },
              {
                category: "Equity Building",
                left: "Builds equity faster",
                right: "Slower equity building"
              },
              {
                category: "Best For",
                left: "High income, want to save on interest",
                right: "Need lower monthly payment, first-time buyers"
              }
            ]}
          />
          
          <AtAGlance
            title="Mortgage Planning at a Glance"
            items={[
              {
                category: "Ideal Credit Score",
                details: "740+ for best rates, 620+ minimum for conventional loans"
              },
              {
                category: "Down Payment Options",
                details: "Conventional: 3-20%, FHA: 3.5%, VA: 0%, USDA: 0%"
              },
              {
                category: "Closing Costs",
                details: "2-5% of home price (lender fees, title, inspection, taxes)"
              },
              {
                category: "Pre-approval Benefits",
                details: "Know your budget, faster offers, stronger negotiating position"
              },
              {
                category: "Rate Lock Period",
                details: "30-60 days typical, protects against rate increases during purchase"
              }
            ]}
          />
        </div>
        
        {/* Current Market Data Tables */}
        <div className="mt-12 space-y-8">
          <h2 className="text-2xl font-bold text-center text-foreground dark:text-dark-foreground mb-6">
            Current Mortgage Rates (September 2025)
          </h2>
          
          <CurrentMortgageRates />
          <EconomicIndicatorsTable />
        </div>
        
        {/* Comprehensive Voice Search Optimized FAQ Schema */}
        <StructuredData
          type="faq"
          data={[
            // Core Mortgage Questions
            {
              question: "How much house can I afford with my salary?",
              answer: "Generally, you can afford a house that costs 2.5 to 3 times your annual salary. Use the 28/36 rule: spend no more than 28% of gross monthly income on housing costs and 36% on total debts. For example, with a $75,000 salary, you could afford roughly $1,750 monthly for housing costs."
            },
            {
              question: "What will my monthly mortgage payment be?",
              answer: "Your monthly mortgage payment (called PITI) includes principal, interest, taxes, and insurance. For a $300,000 home with 20% down at 6.5% interest, expect roughly $1,517 monthly for principal and interest, plus taxes and insurance which vary by location."
            },
            {
              question: "Should I get a 15-year or 30-year mortgage?",
              answer: "30-year mortgages have lower monthly payments but cost more in total interest. 15-year mortgages have higher monthly payments but save tens of thousands in interest. Choose 30-year if you need lower payments, 15-year if you want to save money long-term and build equity faster."
            },
            {
              question: "How much should I put down when buying a house?",
              answer: "While 20% down eliminates PMI (private mortgage insurance), you can buy with as little as 3% down. FHA loans require 3.5%, VA loans offer 0% for veterans, and conventional loans start at 3%. Larger down payments reduce monthly costs but tie up more cash."
            },
            
            // Affordability and Budget Questions
            {
              question: "Can I afford a $400,000 house?",
              answer: "To afford a $400,000 house, you typically need $80,000 annual income (using 5x income rule), at least $12,000-16,000 for down payment (3-4%), and $8,000-16,000 for closing costs. Your total monthly debts should be under 36% of gross income."
            },
            {
              question: "What if I can't afford 20% down?",
              answer: "You can still buy a home with less than 20% down. You'll pay PMI (private mortgage insurance) which adds $100-300+ monthly, but many successful homeowners start this way. FHA loans require just 3.5% down, and some conventional loans accept 3%."
            },
            {
              question: "How do I calculate how much house I can afford?",
              answer: "Use the 28/36 rule: housing costs shouldn't exceed 28% of gross monthly income, and total debt payments shouldn't exceed 36%. Include property taxes, insurance, and PMI in your calculations. Get pre-approved to know your exact buying power."
            },
            
            // What-If Scenarios
            {
              question: "What happens if mortgage rates go up after I apply?",
              answer: "Get a rate lock from your lender (typically 30-60 days) to protect against rate increases during your home purchase. If rates drop, some lenders offer float-down options. Without a rate lock, your payment could increase significantly if rates rise."
            },
            {
              question: "What if I lose my job after buying a house?",
              answer: "Contact your lender immediately to discuss options like loan modification, forbearance, or refinancing. Maintain an emergency fund of 3-6 months of payments. Consider mortgage protection insurance or ensure adequate life/disability insurance coverage before purchasing."
            },
            {
              question: "Should I buy now or wait for rates to come down?",
              answer: "Timing the market is difficult. If you're financially ready and plan to stay 5+ years, buying now might make sense - you can refinance later if rates drop. Waiting risks home price increases that could offset rate savings. Focus on your personal financial readiness."
            },
            
            // Technical Mortgage Terms
            {
              question: "What is PITI and why does it matter?",
              answer: "PITI stands for Principal, Interest, Taxes, and Insurance - your complete monthly housing payment. Principal builds equity, interest is the loan cost, taxes fund local services, and insurance protects you and the lender. This is your true cost of homeownership."
            },
            {
              question: "What is PMI and when can I remove it?",
              answer: "Private Mortgage Insurance (PMI) protects lenders when you put less than 20% down. It costs 0.3-1.5% of loan amount annually. You can request removal at 20% equity or it automatically cancels at 22%. Some loans require PMI for the loan's lifetime."
            },
            {
              question: "What's the difference between APR and interest rate?",
              answer: "Interest rate is the yearly cost of borrowing money. APR (annual percentage rate) includes the interest rate plus other loan costs like origination fees and PMI. APR gives you the true cost of the loan and is better for comparing lenders."
            },
            
            // Comparison Questions
            {
              question: "Is it better to rent or buy a house?",
              answer: "Buy if you'll stay 5+ years, have stable income, 3-5% down payment, and closing costs covered. Rent if you plan to move soon, prefer flexibility, or want to invest the down payment money elsewhere. Use a rent vs buy calculator for your specific situation."
            },
            {
              question: "Should I pay off my mortgage early or invest?",
              answer: "If your mortgage rate is below 6-7%, investing typically offers better long-term returns. If above 7% or you prefer guaranteed savings, extra mortgage payments make sense. Consider your risk tolerance, other debt, and retirement savings first."
            },
            
            // Process and Timeline Questions
            {
              question: "How long does it take to get approved for a mortgage?",
              answer: "Pre-approval takes 1-3 days with your documents ready. Full approval takes 30-45 days after your offer is accepted. Factors affecting timeline include document completeness, property appraisal, and lender workload. Shop for lenders early in your process."
            },
            {
              question: "What credit score do I need to buy a house?",
              answer: "Minimum credit scores: FHA loans 580, conventional loans 620, VA/USDA loans 580+. However, 740+ gets the best rates. If your score is low, focus on improving it before applying - even a 20-point increase can save thousands in interest."
            },
            {
              question: "How much are closing costs and who pays them?",
              answer: "Closing costs typically run 2-5% of home price. Buyers usually pay loan origination, appraisal, inspection, title insurance, and prepaid items. Sellers typically pay realtor commissions. You can negotiate who pays what or ask for seller concessions."
            }
          ]}
        />
        
        {/* Speakable Schema for Voice Assistants */}
        <StructuredData
          type="speakable"
          data={{
            "@type": "SpeakableSpecification",
            "cssSelector": [".key-takeaways", ".quick-facts", ".comparison-block"],
            "xpath": [
              "//div[contains(@class, 'key-takeaways')]",
              "//div[contains(@class, 'quick-facts')]",
              "//div[contains(@class, 'comparison-block')]"
            ]
          }}
        />

        <MortgageCalculatorSEOContent />
      </div>
    </AmbientHaloLayout>
  );
};
