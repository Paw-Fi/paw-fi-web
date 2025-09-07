import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

interface FinancialTooltipProps {
  term: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  variant?: 'question' | 'info';
  className?: string;
}

// Comprehensive financial terms glossary with real definitions
export const FINANCIAL_GLOSSARY = {
  // Investment Terms
  'initial investment': {
    definition: 'The starting amount of money you invest, also called principal. This is the base amount that will grow through compound interest over time.',
    example: 'Starting with $1,000 initial investment at 7% annual return grows to $1,070 after one year, then compounds on the larger amount.',
    sources: ['SEC Investor.gov', 'Investopedia']
  },
  'annual contribution': {
    definition: 'Additional money added to your investment account each year beyond the initial investment. Regular contributions significantly boost long-term growth.',
    example: 'Adding $1,200 annually ($100 monthly) to your initial $1,000 investment dramatically increases your final balance through dollar-cost averaging.',
    sources: ['Bogleheads Investment Guide', 'Vanguard Research']
  },
  'annual return': {
    definition: 'The percentage gain or loss on an investment over a 12-month period, including dividends and capital appreciation. Used to project future growth.',
    example: 'The S&P 500 has averaged about 10.5% annual return since 1957, though individual years vary widely from -37% to +54%.',
    sources: ['Morningstar Direct', 'S&P Dow Jones Indices']
  },
  'compounding frequency': {
    definition: 'How often interest is calculated and added to your account balance. More frequent compounding results in slightly higher returns over time.',
    example: 'Daily compounding at 7% annually yields 7.25% effective rate, while annual compounding yields exactly 7%.',
    sources: ['Federal Reserve Education', 'Mathematics of Finance Textbooks']
  },
  'compound interest': {
    definition: 'Interest calculated on the initial principal and accumulated interest from previous periods. Einstein allegedly called it "the eighth wonder of the world."',
    example: 'If you invest $1,000 at 7% annually, you earn $70 in year 1. In year 2, you earn 7% on $1,070 = $74.90.',
    sources: ['Federal Reserve Education', 'SEC Investor.gov']
  },
  'asset allocation': {
    definition: 'The strategic distribution of investments across different asset classes (stocks, bonds, real estate) to balance risk and return based on goals and timeline.',
    example: 'A 30-year-old might use 80% stocks, 20% bonds, while a 60-year-old might use 50% stocks, 50% bonds.',
    sources: ['Morningstar', 'Vanguard Research']
  },
  'expense ratio': {
    definition: 'The annual fee charged by mutual funds or ETFs, expressed as a percentage of your investment. Lower is better for long-term returns.',
    example: 'A 0.05% expense ratio means you pay $5 annually for every $10,000 invested, vs. $200 for a 2% ratio.',
    sources: ['SEC Investment Company Fact Sheet', 'Morningstar Direct']
  },
  'diversification': {
    definition: 'Spreading investments across different assets, sectors, and geographies to reduce overall portfolio risk without sacrificing expected returns.',
    example: 'Instead of buying one stock, buy an S&P 500 index fund that owns 500+ companies across industries.',
    sources: ['SEC Investor Publications', 'CFA Institute']
  },
  'dollar cost averaging': {
    definition: 'Investing a fixed amount regularly regardless of market conditions, reducing the impact of market volatility on your average cost per share.',
    example: 'Investing $500 monthly buys more shares when prices are low, fewer when high, averaging out cost over time.',
    sources: ['Bogleheads Investment Guide', 'Vanguard Research']
  },

  // Retirement Terms
  '401k': {
    definition: 'Employer-sponsored retirement plan allowing pre-tax contributions up to $23,500 (2025), often with employer matching. Named after IRS tax code section.',
    example: 'If employer matches 50% up to 6% of salary, contributing 6% of $60,000 salary gets you $1,800 in free matching.',
    sources: ['IRS Publication 560', 'Department of Labor']
  },
  'roth ira': {
    definition: 'Individual retirement account funded with after-tax dollars, allowing tax-free growth and withdrawals in retirement. No required distributions.',
    example: 'Contribute $7,000 after-tax in 2025. If it grows to $70,000 by retirement, all withdrawals are tax-free.',
    sources: ['IRS Publication 590-A', 'Social Security Administration']
  },
  'vesting': {
    definition: 'The process by which employees earn the right to employer retirement contributions over time, preventing job-hopping to collect benefits.',
    example: '25% vested per year for 4 years means you keep 25% after 1 year, 50% after 2 years, 100% after 4 years.',
    sources: ['Department of Labor ERISA', 'IRS Regulations']
  },
  'required minimum distribution': {
    definition: 'IRS-mandated withdrawals from traditional retirement accounts starting at age 73 to ensure taxes are eventually paid on deferred income.',
    example: 'At age 73 with $500,000 in traditional IRA, you must withdraw about $18,500 (3.65%) and pay taxes on it.',
    sources: ['IRS Publication 590-B', 'Social Security Administration']
  },

  // Mortgage Terms
  'amortization': {
    definition: 'The process of paying off debt through regular payments that cover both principal and interest, with more going to interest early in the loan.',
    example: 'On a $300,000 30-year mortgage at 7%, your first payment of $1,996 includes $1,750 interest and $246 principal.',
    sources: ['CFPB Mortgage Guide', 'Federal Housing Finance Agency']
  },
  'apr': {
    definition: 'Annual Percentage Rate includes not just interest rate but also loan fees, providing the true cost of borrowing money annually.',
    example: 'A 6.5% interest rate might have a 6.8% APR when fees for origination, points, and insurance are included.',
    sources: ['Truth in Lending Act', 'CFPB Regulations']
  },
  'loan to value': {
    definition: 'The ratio of loan amount to property value, used by lenders to assess risk. Higher LTV ratios typically require mortgage insurance.',
    example: 'Borrowing $240,000 on a $300,000 home = 80% LTV. Above 80% usually requires PMI costing 0.5-1% annually.',
    sources: ['Fannie Mae Guidelines', 'Freddie Mac Standards']
  },
  'points': {
    definition: 'Prepaid interest paid at closing to reduce the mortgage rate. One point equals 1% of loan amount and typically reduces rate by 0.25%.',
    example: 'Paying $3,000 (1 point) on $300,000 loan might reduce rate from 7% to 6.75%, saving $45/month.',
    sources: ['CFPB Points and Credits', 'Mortgage Bankers Association']
  },
  'pmi': {
    definition: 'Private Mortgage Insurance required on conventional loans with less than 20% down payment, protecting lenders against default risk.',
    example: 'PMI costs 0.5-1% of loan amount annually. On $250,000 loan, expect $1,250-$2,500 per year until 20% equity.',
    sources: ['Homeowners Protection Act', 'CFPB PMI Guide']
  },

  // Debt Terms
  'debt to income ratio': {
    definition: 'Monthly debt payments divided by gross monthly income, used by lenders to evaluate borrowing capacity and financial stability.',
    example: 'With $5,000 monthly income and $1,500 debt payments, your DTI is 30% (1,500 ÷ 5,000 = 0.30).',
    sources: ['CFPB Debt-to-Income Guidelines', 'Qualified Mortgage Standards']
  },
  'credit utilization': {
    definition: 'The percentage of available credit you\'re using, significantly impacting credit scores. Keep below 30%, ideally under 10%.',
    example: 'With $10,000 credit limit, keeping balances under $1,000 (10%) helps maintain excellent credit scores.',
    sources: ['Fair Credit Reporting Act', 'myFICO Educational Materials']
  },
  'debt avalanche': {
    definition: 'Debt repayment strategy prioritizing highest interest rate debts first to minimize total interest paid over time.',
    example: 'Pay minimums on all debts, then extra payments on 22% credit card before 6% student loan for maximum savings.',
    sources: ['Harvard Business School Research', 'National Endowment for Financial Education']
  },
  'debt snowball': {
    definition: 'Debt repayment method focusing on smallest balances first for psychological momentum, potentially costing more but increasing success rates.',
    example: 'Pay off $500 store card before $5,000 car loan, building confidence and motivation to continue.',
    sources: ['Ramsey Solutions Research', 'Behavioral Economics Studies']
  },

  // Insurance Terms
  'deductible': {
    definition: 'The amount you pay out-of-pocket before insurance coverage begins. Higher deductibles typically mean lower monthly premiums.',
    example: 'With $1,000 deductible, you pay first $1,000 of covered expenses, then insurance pays remaining covered costs.',
    sources: ['National Association of Insurance Commissioners', 'Department of Health and Human Services']
  },
  'term life insurance': {
    definition: 'Temporary life insurance providing death benefit for specific period (10-30 years). Much cheaper than permanent life insurance.',
    example: '35-year-old non-smoker might pay $30/month for $500,000 20-year term vs. $400/month for whole life.',
    sources: ['Society of Actuaries', 'Insurance Information Institute']
  },

  // Tax Terms
  'tax bracket': {
    definition: 'The percentage rate at which your last dollar of income is taxed. The US uses progressive taxation with marginal brackets.',
    example: 'In 22% bracket, only income above $44,725 (2025) is taxed at 22%, not your entire income.',
    sources: ['IRS Publication 15', 'Tax Foundation Analysis']
  },
  'standard deduction': {
    definition: 'Fixed dollar amount that reduces taxable income, claimed by taxpayers who don\'t itemize deductions. Adjusted annually for inflation.',
    example: 'For 2025, single filers get $15,000 standard deduction, reducing taxable income without tracking expenses.',
    sources: ['IRS Revenue Procedures', 'Treasury Department']
  },

  // Emergency Fund Terms
  'emergency fund': {
    definition: 'Liquid savings covering 3-6 months of essential expenses, providing financial stability during job loss, medical emergencies, or major repairs.',
    example: 'With $4,000 monthly expenses, aim for $12,000-$24,000 in high-yield savings earning 4.5-5% annually.',
    sources: ['Federal Reserve Survey of Consumer Finances', 'CFPB Emergency Savings Guidelines']
  },
  'high yield savings': {
    definition: 'Savings accounts offering significantly higher interest rates than traditional banks, typically through online banks with lower overhead costs.',
    example: 'Online banks offer 4.5-5% vs. 0.01% at traditional banks, earning $450 vs. $1 annually on $10,000.',
    sources: ['FDIC Interest Rate Statistics', 'Bankrate Market Analysis']
  }
};

export function FinancialTooltip({ 
  term, 
  children, 
  position = 'top',
  variant = 'question',
  className = '' 
}: FinancialTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const termLower = term.toLowerCase();
  const glossaryEntry = FINANCIAL_GLOSSARY[termLower];

  if (!glossaryEntry) {
    // If term not found in glossary, return children without tooltip
    return <>{children}</>;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800'
  };

  const icon = variant === 'question' ? faQuestionCircle : faInfoCircle;

  return (
    <div className={`relative inline-block ${className}`}>
      <span 
        className="relative cursor-help inline-flex items-center group"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        {children}
        <FontAwesomeIcon 
          icon={icon}
          className="ml-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-xs opacity-70 hover:opacity-100 transition-opacity"
          aria-label={`Definition of ${term}`}
        />
      </span>

      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]} w-80 max-w-sm`}>
          <div className="bg-gray-800 text-white text-sm rounded-lg p-4 shadow-lg border border-gray-700">
            {/* Arrow */}
            <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}></div>
            
            {/* Term Title */}
            <div className="font-semibold text-blue-300 mb-2 capitalize">
              {term}
            </div>
            
            {/* Definition */}
            <div className="mb-3 leading-relaxed">
              {glossaryEntry.definition}
            </div>
            
            {/* Example */}
            {glossaryEntry.example && (
              <div className="mb-3 text-gray-300">
                <span className="font-medium text-green-300">Example: </span>
                {glossaryEntry.example}
              </div>
            )}
            
            {/* Sources */}
            {glossaryEntry.sources && (
              <div className="text-xs text-gray-400 border-t border-gray-600 pt-2">
                <span className="font-medium">Sources: </span>
                {glossaryEntry.sources.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for common financial terms with predefined styling
export function FinancialTerm({ 
  term, 
  className = "border-b border-dotted border-blue-400 hover:border-blue-600" 
}: { 
  term: keyof typeof FINANCIAL_GLOSSARY;
  className?: string;
}) {
  return (
    <FinancialTooltip term={term} className={className}>
      <span className="cursor-help">{term}</span>
    </FinancialTooltip>
  );
}

// Pre-configured tooltips for common calculator terms
export const CommonTooltips = {
  CompoundInterest: ({ children }: { children: React.ReactNode }) => (
    <FinancialTooltip term="compound interest">{children}</FinancialTooltip>
  ),
  
  APR: ({ children }: { children: React.ReactNode }) => (
    <FinancialTooltip term="apr">{children}</FinancialTooltip>
  ),
  
  DebtToIncome: ({ children }: { children: React.ReactNode }) => (
    <FinancialTooltip term="debt to income ratio">{children}</FinancialTooltip>
  ),
  
  EmergencyFund: ({ children }: { children: React.ReactNode }) => (
    <FinancialTooltip term="emergency fund">{children}</FinancialTooltip>
  ),
  
  AssetAllocation: ({ children }: { children: React.ReactNode }) => (
    <FinancialTooltip term="asset allocation">{children}</FinancialTooltip>
  ),
  
  ExpenseRatio: ({ children }: { children: React.ReactNode }) => (
    <FinancialTooltip term="expense ratio">{children}</FinancialTooltip>
  )
};

export default FinancialTooltip;