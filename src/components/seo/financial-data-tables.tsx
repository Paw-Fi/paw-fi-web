// Financial Data Tables Component
// Provides current 2025 market rates and benchmarks for SEO and user context

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Current market data as of September 2025
export const FINANCIAL_DATA_2025 = {
  mortgageRates: {
    lastUpdated: '2025-09-05',
    rates: [
      { term: '30-year fixed', rate: 6.50, change: '-0.54%', period: 'from Jan 2025' },
      { term: '15-year fixed', rate: 5.60, change: '-0.67%', period: 'from Jan 2025' },
      { term: '30-year jumbo', rate: 6.75, change: '-0.45%', period: 'from Jan 2025' },
      { term: 'FHA 30-year', rate: 6.25, change: '-0.62%', period: 'from Jan 2025' }
    ]
  },
  savingsRates: {
    lastUpdated: '2025-09-05',
    accounts: [
      { type: 'High-yield savings', rate: 4.46, institution: 'Top online banks', min: '$0' },
      { type: 'Money market', rate: 4.35, institution: 'Top rates', min: '$1,000' },
      { type: 'Traditional savings', rate: 0.45, institution: 'National average', min: '$0' },
      { type: '6-month CD', rate: 4.60, institution: 'Top rates', min: '$1,000' },
      { type: '1-year CD', rate: 4.45, institution: 'Top rates', min: '$1,000' },
      { type: '5-year CD', rate: 4.20, institution: 'Top rates', min: '$1,000' }
    ]
  },
  autoLoanRates: {
    lastUpdated: '2025-09-05',
    rates: [
      { category: 'New cars (excellent credit)', rate: 5.25, creditRange: '781-850' },
      { category: 'New cars (good credit)', rate: 6.73, creditRange: '661-780' },
      { category: 'New cars (fair credit)', rate: 9.89, creditRange: '601-660' },
      { category: 'Used cars (excellent credit)', rate: 7.89, creditRange: '781-850' },
      { category: 'Used cars (average)', rate: 11.87, creditRange: 'All credit types' },
      { category: 'Used cars (poor credit)', rate: 21.32, creditRange: '300-500' }
    ]
  },
  investmentReturns: {
    lastUpdated: '2025-09-05',
    returns: [
      { asset: 'S&P 500 (2025 forecast)', return: 10.0, period: 'Annual total return' },
      { asset: 'S&P 500 (historical avg)', return: 10.0, period: '1957-2024 average' },
      { asset: 'S&P 500 (2024 actual)', return: 23.0, period: '2024 total return' },
      { asset: 'Total Stock Market', return: 9.8, period: 'Historical average' },
      { asset: 'Corporate bonds', return: 5.2, period: 'Current yield' },
      { asset: 'Treasury 10-year', return: 4.1, period: 'Current yield' }
    ]
  },
  economicIndicators: {
    lastUpdated: '2025-09-05',
    indicators: [
      { metric: 'Federal funds rate', value: '4.25-4.50%', trend: 'Expected cut Sept 2025' },
      { metric: 'Inflation (CPI)', value: '2.7%', period: 'June 2025 year-over-year' },
      { metric: 'Unemployment rate', value: '4.3%', period: 'August 2025' },
      { metric: 'GDP growth', value: '2.8%', period: 'Q2 2025 annualized' }
    ]
  }
}

interface FinancialTableProps {
  title: string
  description?: string
  dataType: keyof typeof FINANCIAL_DATA_2025
  className?: string
  compact?: boolean
}

export function FinancialDataTable({ 
  title, 
  description, 
  dataType, 
  className = '',
  compact = false 
}: FinancialTableProps) {
  const data = FINANCIAL_DATA_2025[dataType]
  
  if (!data) return null

  const renderMortgageRates = () => (
    <div className={`overflow-x-auto ${compact ? 'text-sm' : ''}`}>
      <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-left font-semibold">Loan Type</th>
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">Rate</th>
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">Change</th>
          </tr>
        </thead>
        <tbody>
          {data.rates.map((rate: any, index: number) => (
            <tr key={index} className="even:bg-gray-50 dark:even:bg-gray-800/50">
              <td className="border border-gray-300 dark:border-gray-600 p-3">{rate.term}</td>
              <td className="border border-gray-300 dark:border-gray-600 p-3 text-center font-mono">
                {rate.rate}%
              </td>
              <td className="border border-gray-300 dark:border-gray-600 p-3 text-center">
                <span className="text-green-600 dark:text-green-400 text-sm">
                  {rate.change} {rate.period}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Last updated: {data.lastUpdated} | Source: Freddie Mac, Federal Reserve
      </p>
    </div>
  )

  const renderSavingsRates = () => (
    <div className={`overflow-x-auto ${compact ? 'text-sm' : ''}`}>
      <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-left font-semibold">Account Type</th>
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">APY</th>
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">Min. Balance</th>
          </tr>
        </thead>
        <tbody>
          {data.accounts.map((account: any, index: number) => (
            <tr key={index} className="even:bg-gray-50 dark:even:bg-gray-800/50">
              <td className="border border-gray-300 dark:border-gray-600 p-3">{account.type}</td>
              <td className="border border-gray-300 dark:border-gray-600 p-3 text-center font-mono font-semibold text-green-600 dark:text-green-400">
                {account.rate}%
              </td>
              <td className="border border-gray-300 dark:border-gray-600 p-3 text-center text-sm">
                {account.min}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Last updated: {data.lastUpdated} | Source: Bankrate, NerdWallet, FDIC
      </p>
    </div>
  )

  const renderAutoLoanRates = () => (
    <div className={`overflow-x-auto ${compact ? 'text-sm' : ''}`}>
      <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-left font-semibold">Loan Category</th>
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">Avg Rate</th>
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">Credit Range</th>
          </tr>
        </thead>
        <tbody>
          {data.rates.map((rate: any, index: number) => (
            <tr key={index} className="even:bg-gray-50 dark:even:bg-gray-800/50">
              <td className="border border-gray-300 dark:border-gray-600 p-3">{rate.category}</td>
              <td className="border border-gray-300 dark:border-gray-600 p-3 text-center font-mono">
                {rate.rate}%
              </td>
              <td className="border border-gray-300 dark:border-gray-600 p-3 text-center text-sm">
                {rate.creditRange}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Last updated: {data.lastUpdated} | Source: Experian, U.S. News
      </p>
    </div>
  )

  const renderInvestmentReturns = () => (
    <div className={`overflow-x-auto ${compact ? 'text-sm' : ''}`}>
      <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-left font-semibold">Investment Type</th>
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">Return</th>
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">Period</th>
          </tr>
        </thead>
        <tbody>
          {data.returns.map((investment: any, index: number) => (
            <tr key={index} className="even:bg-gray-50 dark:even:bg-gray-800/50">
              <td className="border border-gray-300 dark:border-gray-600 p-3">{investment.asset}</td>
              <td className="border border-gray-300 dark:border-gray-600 p-3 text-center font-mono font-semibold text-blue-600 dark:text-blue-400">
                {investment.return}%
              </td>
              <td className="border border-gray-300 dark:border-gray-600 p-3 text-center text-sm">
                {investment.period}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Last updated: {data.lastUpdated} | Source: Goldman Sachs, S&P Global, Federal Reserve
      </p>
    </div>
  )

  const renderEconomicIndicators = () => (
    <div className={`overflow-x-auto ${compact ? 'text-sm' : ''}`}>
      <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-left font-semibold">Economic Metric</th>
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">Current</th>
            <th className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">Context</th>
          </tr>
        </thead>
        <tbody>
          {data.indicators.map((indicator: any, index: number) => (
            <tr key={index} className="even:bg-gray-50 dark:even:bg-gray-800/50">
              <td className="border border-gray-300 dark:border-gray-600 p-3">{indicator.metric}</td>
              <td className="border border-gray-300 dark:border-gray-600 p-3 text-center font-mono font-semibold">
                {indicator.value}
              </td>
              <td className="border border-gray-300 dark:border-gray-600 p-3 text-center text-sm">
                {indicator.trend || indicator.period}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Last updated: {data.lastUpdated} | Source: Federal Reserve, Bureau of Labor Statistics, Bureau of Economic Analysis
      </p>
    </div>
  )

  const renderTable = () => {
    switch (dataType) {
      case 'mortgageRates': return renderMortgageRates()
      case 'savingsRates': return renderSavingsRates()
      case 'autoLoanRates': return renderAutoLoanRates()
      case 'investmentReturns': return renderInvestmentReturns()
      case 'economicIndicators': return renderEconomicIndicators()
      default: return null
    }
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className={compact ? 'pb-3' : ''}>
        <CardTitle className={compact ? 'text-lg' : 'text-xl'}>{title}</CardTitle>
        {description && (
          <CardDescription className={compact ? 'text-sm' : ''}>
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {renderTable()}
      </CardContent>
    </Card>
  )
}

// Pre-configured table components for common use cases
export function CurrentMortgageRates({ compact = false }: { compact?: boolean }) {
  return (
    <FinancialDataTable
      title="Current Mortgage Rates (September 2025)"
      description="Latest mortgage rates showing significant drops from early 2025 highs"
      dataType="mortgageRates"
      compact={compact}
    />
  )
}

export function HighYieldSavingsRates({ compact = false }: { compact?: boolean }) {
  return (
    <FinancialDataTable
      title="High-Yield Savings & CD Rates (September 2025)"
      description="Current rates offering positive real returns above inflation (2.7%)"
      dataType="savingsRates"
      compact={compact}
    />
  )
}

export function AutoLoanRatesTable({ compact = false }: { compact?: boolean }) {
  return (
    <FinancialDataTable
      title="Auto Loan Rates by Credit Score (September 2025)"
      description="Average auto loan rates varying significantly by credit score and vehicle type"
      dataType="autoLoanRates"
      compact={compact}
    />
  )
}

export function InvestmentReturnsBenchmarks({ compact = false }: { compact?: boolean }) {
  return (
    <FinancialDataTable
      title="Investment Returns & Benchmarks (2025)"
      description="Historical and projected returns for major asset classes and market indices"
      dataType="investmentReturns"
      compact={compact}
    />
  )
}

export function EconomicIndicatorsTable({ compact = false }: { compact?: boolean }) {
  return (
    <FinancialDataTable
      title="Key Economic Indicators (September 2025)"
      description="Current economic data providing context for financial planning decisions"
      dataType="economicIndicators"
      compact={compact}
    />
  )
}