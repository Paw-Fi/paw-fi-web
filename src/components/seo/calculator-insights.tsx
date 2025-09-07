import React from 'react'
import { CalculatorResults, ComparisonInsight, ActionItems } from './results-enhancement'

// Example integration for Compound Interest Calculator
export function CompoundInterestInsights({ 
  principal, 
  rate, 
  years, 
  futureValue, 
  totalInterest 
}: {
  principal: number
  rate: number
  years: number
  futureValue: number
  totalInterest: number
}) {
  // Calculate some contextual insights
  const monthlyContribution = 0 // This would come from the calculator
  const realRate = rate - 3 // Assuming 3% inflation
  const doubleTime = Math.log(2) / Math.log(1 + rate/100)
  
  // Determine status based on performance
  const getInterestStatus = (interest: number, principal: number) => {
    const multiple = interest / principal
    if (multiple >= 3) return 'excellent'
    if (multiple >= 1.5) return 'good'
    if (multiple >= 0.5) return 'warning'
    return 'poor'
  }

  return (
    <div className="space-y-6">
      <CalculatorResults
        title="Your Compound Interest Analysis"
        results={[
          {
            label: "Future Value",
            value: `$${futureValue.toLocaleString()}`,
            explanation: `Your ${principal.toLocaleString()} investment will grow to this amount over ${years} years`,
            comparison: `This represents a ${((futureValue/principal - 1) * 100).toFixed(1)}% total return`,
            status: futureValue > principal * 2 ? 'excellent' : 'good'
          },
          {
            label: "Total Interest Earned",
            value: `$${totalInterest.toLocaleString()}`,
            explanation: "This is the compound interest earned on top of your principal",
            comparison: `${(totalInterest/principal).toFixed(1)}x your initial investment`,
            status: getInterestStatus(totalInterest, principal)
          },
          {
            label: "Real Return (Inflation-Adjusted)",
            value: `${realRate.toFixed(1)}%`,
            explanation: "Your return after accounting for typical 3% inflation",
            status: realRate > 4 ? 'excellent' : realRate > 2 ? 'good' : 'warning'
          }
        ]}
        insights={[
          `Your money will double approximately every ${doubleTime.toFixed(1)} years at this rate`,
          `The power of compounding means 80% of your growth happens in the final ${Math.round(years * 0.4)} years`,
          `Starting 10 years earlier with the same rate could result in ${(Math.pow(1 + rate/100, 10) * 100 - 100).toFixed(0)}% more wealth`
        ]}
        recommendations={[
          {
            title: "Increase Contribution Frequency",
            description: "Consider monthly contributions instead of annual to maximize compounding effects",
            priority: 'high'
          },
          {
            title: "Tax-Advantaged Accounts",
            description: "Use 401(k), IRA, or Roth IRA to compound returns without tax drag",
            priority: 'high'
          },
          {
            title: "Diversify Investment Types",
            description: "Consider a mix of stocks, bonds, and index funds for optimal risk-adjusted returns",
            priority: 'medium'
          }
        ]}
        nextSteps={[
          "Set up automatic monthly transfers to your investment account",
          "Research low-cost index funds or ETFs for diversified exposure",
          "Consider increasing contributions by 1% annually or with each raise",
          "Review and rebalance your portfolio annually",
          "Stay invested during market downturns to benefit from long-term compounding"
        ]}
      />
      
      <ComparisonInsight
        title="Time vs Money Trade-off"
        userValue={`${years} years investing`}
        comparison={years >= 20 ? "Excellent timeline for compounding" : years >= 10 ? "Good investment horizon" : "Consider longer timeline"}
        interpretation={`With your current timeline, compound interest will contribute ${((totalInterest/futureValue) * 100).toFixed(0)}% of your final wealth. Longer timelines dramatically increase the power of compounding.`}
        status={years >= 20 ? 'excellent' : years >= 10 ? 'good' : 'warning'}
      />
    </div>
  )
}

// Example integration for Mortgage Calculator
export function MortgageInsights({ 
  homePrice, 
  downPayment, 
  loanAmount, 
  monthlyPayment, 
  totalInterest, 
  interestRate 
}: {
  homePrice: number
  downPayment: number
  loanAmount: number
  monthlyPayment: number
  totalInterest: number
  interestRate: number
}) {
  const downPaymentPercent = (downPayment / homePrice) * 100
  const debtToIncomeNeeded = monthlyPayment * 12 / 0.28 // Assuming 28% DTI rule

  return (
    <div className="space-y-6">
      <CalculatorResults
        title="Your Mortgage Analysis"
        results={[
          {
            label: "Monthly Payment (P&I)",
            value: `$${monthlyPayment.toLocaleString()}`,
            explanation: "Principal and interest only - add taxes and insurance for total PITI",
            comparison: `This requires ~$${Math.round(debtToIncomeNeeded/1000)}K annual income using 28% rule`,
            status: monthlyPayment < 2000 ? 'excellent' : monthlyPayment < 3000 ? 'good' : 'warning'
          },
          {
            label: "Down Payment",
            value: `${downPaymentPercent.toFixed(1)}% ($${downPayment.toLocaleString()})`,
            explanation: downPaymentPercent >= 20 ? "Excellent! No PMI required" : "Consider PMI costs in your budget",
            status: downPaymentPercent >= 20 ? 'excellent' : downPaymentPercent >= 10 ? 'good' : 'warning'
          },
          {
            label: "Total Interest Over Life of Loan",
            value: `$${totalInterest.toLocaleString()}`,
            explanation: "Total interest you'll pay if you keep the mortgage for 30 years",
            comparison: `${(totalInterest/loanAmount * 100).toFixed(0)}% of your loan amount`,
            status: totalInterest < loanAmount * 0.5 ? 'excellent' : totalInterest < loanAmount ? 'good' : 'warning'
          }
        ]}
        insights={[
          `Your loan-to-value ratio is ${((loanAmount/homePrice) * 100).toFixed(0)}%`,
          `Making one extra payment per year could save ~$${Math.round(totalInterest * 0.3).toLocaleString()} in interest`,
          `A 15-year mortgage would cost ~$${Math.round(monthlyPayment * 1.3).toLocaleString()}/month but save ~$${Math.round(totalInterest * 0.6).toLocaleString()} in interest`
        ]}
        recommendations={[
          {
            title: "Shop Multiple Lenders",
            description: "Compare rates from at least 3 lenders - even 0.25% difference saves thousands",
            priority: 'high'
          },
          {
            title: "Consider 15-Year Mortgage",
            description: "Higher monthly payment but dramatically less interest over the life of the loan",
            priority: downPaymentPercent >= 20 ? 'medium' : 'low'
          },
          {
            title: "Build Emergency Fund",
            description: "Maintain 3-6 months of expenses before buying to handle homeownership costs",
            priority: 'high'
          }
        ]}
        nextSteps={[
          "Get pre-approved with 2-3 different lenders to compare rates and terms",
          "Factor in property taxes, insurance, HOA, and maintenance costs (~1-3% of home value annually)",
          "Consider making bi-weekly payments to pay off mortgage faster",
          "Set aside funds for closing costs (2-5% of purchase price)",
          "Research first-time homebuyer programs for additional assistance"
        ]}
      />

      <ActionItems
        title="Home Buying Action Plan"
        actions={[
          {
            action: "Improve Credit Score",
            priority: 'high',
            timeframe: '3-6 months',
            description: 'Pay down debts and avoid new credit inquiries to optimize your rate'
          },
          {
            action: "Save for Closing Costs",
            priority: 'high', 
            timeframe: '6-12 months',
            description: 'Budget 2-5% of home price for closing costs beyond your down payment'
          },
          {
            action: "Get Pre-approved",
            priority: 'medium',
            timeframe: '1-2 weeks',
            description: 'Obtain pre-approval letters from multiple lenders to compare options'
          },
          {
            action: "Research Neighborhoods",
            priority: 'medium',
            timeframe: '2-3 months', 
            description: 'Consider commute, schools, property taxes, and long-term value potential'
          }
        ]}
      />
    </div>
  )
}

// Example integration for Retirement Calculator  
export function RetirementInsights({
  currentAge,
  retirementAge,
  currentSavings,
  monthlyContribution,
  expectedReturn,
  projectedSavings,
  monthlyIncomeNeeded
}: {
  currentAge: number
  retirementAge: number
  currentSavings: number
  monthlyContribution: number
  expectedReturn: number
  projectedSavings: number
  monthlyIncomeNeeded: number
}) {
  const yearsToRetirement = retirementAge - currentAge
  const totalContributions = monthlyContribution * 12 * yearsToRetirement
  const interestEarned = projectedSavings - currentSavings - totalContributions
  const safeWithdrawalAmount = projectedSavings * 0.04 / 12 // 4% rule monthly
  
  return (
    <div className="space-y-6">
      <CalculatorResults
        title="Your Retirement Readiness Analysis"
        results={[
          {
            label: "Projected Retirement Savings",
            value: `$${projectedSavings.toLocaleString()}`,
            explanation: `Based on ${yearsToRetirement} years of growth at ${expectedReturn}% annual return`,
            comparison: `This includes $${interestEarned.toLocaleString()} in compound growth`,
            status: projectedSavings >= 1000000 ? 'excellent' : projectedSavings >= 500000 ? 'good' : 'warning'
          },
          {
            label: "Safe Monthly Income (4% Rule)",
            value: `$${safeWithdrawalAmount.toLocaleString()}`,
            explanation: "Monthly income using the 4% safe withdrawal rate",
            comparison: `${safeWithdrawalAmount >= monthlyIncomeNeeded ? 'Meets' : 'Falls short of'} your $${monthlyIncomeNeeded.toLocaleString()} target`,
            status: safeWithdrawalAmount >= monthlyIncomeNeeded ? 'excellent' : safeWithdrawalAmount >= monthlyIncomeNeeded * 0.8 ? 'good' : 'warning'
          },
          {
            label: "Savings Rate Impact",
            value: `$${monthlyContribution}/month`,
            explanation: `Your contributions will total $${totalContributions.toLocaleString()} over ${yearsToRetirement} years`,
            comparison: `Compound interest will contribute ${((interestEarned/projectedSavings) * 100).toFixed(0)}% of your final balance`,
            status: monthlyContribution >= 500 ? 'excellent' : monthlyContribution >= 200 ? 'good' : 'warning'
          }
        ]}
        insights={[
          `Starting 5 years earlier could increase your retirement savings by ~${(Math.pow(1 + expectedReturn/100, 5) * 100 - 100).toFixed(0)}%`,
          `Increasing contributions by just $100/month could add ~$${Math.round(100 * 12 * Math.pow(1 + expectedReturn/100, yearsToRetirement) / 1000)}K to your retirement`,
          `Social Security may provide additional income - create an account at ssa.gov to estimate benefits`
        ]}
        recommendations={[
          {
            title: "Maximize Employer Match",
            description: "Contribute at least enough to get full employer 401(k) match - it's free money",
            priority: 'high'
          },
          {
            title: "Increase Savings Rate",
            description: "Aim to save 10-15% of income for retirement, including employer contributions",
            priority: 'high'
          },
          {
            title: "Diversify Investments",
            description: "Use age-appropriate asset allocation (e.g., 80% stocks, 20% bonds at younger ages)",
            priority: 'medium'
          }
        ]}
        nextSteps={[
          "Set up automatic contributions to maximize consistency",
          "Review and increase contributions annually or with raises", 
          "Consider Roth IRA for tax-free retirement withdrawals",
          "Rebalance portfolio annually to maintain target allocation",
          "Plan for healthcare costs in retirement (Medicare, long-term care)"
        ]}
      />
      
      <ComparisonInsight
        title="Retirement Timeline Assessment"
        userValue={`Retire at ${retirementAge} (${yearsToRetirement} years away)`}
        comparison={yearsToRetirement >= 30 ? "Excellent timeline for compound growth" : yearsToRetirement >= 20 ? "Good investment horizon" : "Consider accelerated savings"}
        interpretation={`Your timeline allows compound interest to contribute ${((interestEarned/projectedSavings) * 100).toFixed(0)}% of your retirement wealth. Consider if retiring earlier or later would better meet your goals.`}
        status={yearsToRetirement >= 30 ? 'excellent' : yearsToRetirement >= 20 ? 'good' : yearsToRetirement >= 10 ? 'warning' : 'poor'}
      />
    </div>
  )
}