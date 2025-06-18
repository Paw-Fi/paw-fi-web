'use client';

import { useState, useMemo, useRef } from 'react';
import { BarChart } from '@/components/ui/bar-chart';

interface CalculationResult {
  finalAmount: number;
  contributions: number;
  interest: number;
  yearlyData: {
    year: number;
    totalAmount: number;
    totalContributions: number;
    yearlyInterest: number;
    totalInterest: number;
  }[];
}

const CompoundCalculator = () => {
  // Form state
  const [initialInvestment, setInitialInvestment] = useState<number | ''>(1000);
  const [annualContribution, setAnnualContribution] = useState<number | ''>(1200);
  const [annualReturn, setAnnualReturn] = useState<number | ''>(7);
  const [years, setYears] = useState<number | ''>(40);
  const [compoundingFrequency, setCompoundingFrequency] = useState<string>('monthly');
  
  // Chart container ref for sizing
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Calculate compound interest
  const calculationResult = useMemo<CalculationResult>(() => {
    const frequencyMap: Record<string, number> = {
      'daily': 365,
      'monthly': 12,
      'quarterly': 4,
      'annually': 1
    };
    // Coerce '' to 0 for calculations
    const initialInvestmentNum = typeof initialInvestment === 'number' ? initialInvestment : 0;
    const annualContributionNum = typeof annualContribution === 'number' ? annualContribution : 0;
    const annualReturnNum = typeof annualReturn === 'number' ? annualReturn : 0;
    const yearsNum = typeof years === 'number' ? years : 0;

    const periods = frequencyMap[compoundingFrequency];
    const periodicRate = annualReturnNum / 100 / periods;
    const totalPeriods = yearsNum * periods;

    let balance = initialInvestmentNum;
    let totalContributions = initialInvestmentNum;
    const periodicContribution = annualContributionNum / periods;

    // Store yearly data for chart
    const yearlyData = [];

    for (let period = 1; period <= totalPeriods; period++) {
      // Add periodic contribution
      balance += periodicContribution;
      totalContributions += periodicContribution;

      // Apply interest
      const interestEarned = balance * periodicRate;
      balance += interestEarned;

      // Record yearly data
      if (period % periods === 0) {
        const year = period / periods;
        const yearlyInterest: number = balance - (year === 1 ? initialInvestmentNum : yearlyData[year - 2].totalAmount) - periodicContribution * periods;
        const totalInterest = balance - totalContributions;

        yearlyData.push({
          year,
          totalAmount: balance,
          totalContributions,
          yearlyInterest,
          totalInterest
        });
      }
    }

    return {
      finalAmount: balance,
      contributions: totalContributions,
      interest: balance - totalContributions,
      yearlyData
    };
  }, [initialInvestment, annualContribution, annualReturn, years, compoundingFrequency]);
  
  // Compound example calculation (1% daily for 365 days)
  const exampleCalculation = useMemo(() => {
    const initialAmount = 1;
    const dailyRate = 0.01; // 1%
    const days = 365;
    
    const finalAmount = initialAmount * Math.pow(1 + dailyRate, days);
    
    return {
      initialAmount,
      finalAmount: parseFloat(finalAmount.toFixed(2)),
      pureFormula: `$1 × (1 + 0.01)^{365} = $${finalAmount.toFixed(2)}`
    };
  }, []);
  
  // Format currency value
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // No longer needed as we're using the BarChart component

  

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-xl p-6 md:p-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <label htmlFor="initialInvestment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Initial Investment ($)</label>
            <input
              type="number"
              id="initialInvestment"
              value={initialInvestment === '' ? '' : initialInvestment}
              onChange={(e) => setInitialInvestment(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="block w-full px-3 py-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out"
              placeholder="e.g., 1000"
              min={0}
            />
          </div>
          
          <div>
            <label htmlFor="annualContribution" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Annual Contribution ($)</label>
            <input
              type="number"
              id="annualContribution"
              value={annualContribution === '' ? '' : annualContribution}
              onChange={(e) => setAnnualContribution(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="block w-full px-3 py-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out"
              placeholder="e.g., 1200"
              min={0}
            />
          </div>
          
          <div>
            <label htmlFor="annualReturn" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Expected Annual Return (%)</label>
            <input
              type="number"
              id="annualReturn"
              value={annualReturn === '' ? '' : annualReturn}
              onChange={(e) => setAnnualReturn(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="block w-full px-3 py-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out"
              placeholder="e.g., 7"
              min={0}
              step={0.01}
            />
          </div>
          
          <div>
            <label htmlFor="years" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Number of Years</label>
            <input
              type="number"
              id="years"
              value={years === '' ? '' : years}
              onChange={(e) => setYears(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="block w-full px-3 py-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out"
              placeholder="e.g., 10"
              min={1}
            />
          </div>
          
          <div>
            <label htmlFor="compoundingFrequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Compounding Frequency</label>
            <select
              id="compoundingFrequency"
              value={compoundingFrequency}
              onChange={(e) => setCompoundingFrequency(e.target.value)}
              className="block w-full px-3 py-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out"
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
          
          {/* Results Summary */}
          <div className="bg-purple-50/50 dark:bg-purple-900/30 p-4 md:p-6 rounded-xl mt-6 md:mt-8">
            <h3 className="text-xl font-semibold text-purple-800 dark:text-purple-200 mb-4">Calculation Results</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">Final Balance</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(calculationResult.finalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">Total Contributions</p>
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(calculationResult.contributions)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">Total Interest Earned</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(calculationResult.interest)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">Interest vs Contributions</p>
                <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                  {calculationResult.contributions > 0 ? (calculationResult.interest / calculationResult.contributions).toFixed(2) : 'N/A'}x
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Chart & Visualization */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Growth Visualization</h3>
          <div 
            ref={chartContainerRef} 
            className="h-[300px] sm:h-[350px] md:h-[400px] bg-slate-100/30 dark:bg-slate-800/30 border border-slate-200/70 dark:border-slate-700/50 rounded-xl p-3 md:p-4 relative"
          >
            <BarChart
              labels={calculationResult.yearlyData.map(d => d.year.toString())}
              datasets={[
                {
                  label: 'Contributions',
                  data: calculationResult.yearlyData.map(d => d.totalContributions),
                  backgroundColor: '#3B82F6',
                  stack: 'total',
                },
                {
                  label: 'Interest',
                  data: calculationResult.yearlyData.map(d => d.totalInterest),
                  backgroundColor: '#22C55E',
                  stack: 'total',
                },
              ]}
              title="Compound Growth Over Time"
              stacked
            />
          </div>
          
          {/* Power of Compounding Example */}
          <div className="mt-8 md:mt-10">
            <div className="p-4 md:p-6 bg-indigo-50/50 dark:bg-indigo-900/30 rounded-xl">
              <h4 className="text-lg font-semibold text-indigo-800 dark:text-indigo-200 mb-3">The Shocking Power of Compounding</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                If you invest $1 with a <strong>1% daily return</strong> for 365 days, 
                your investment would grow to <strong className="text-indigo-600 dark:text-indigo-400">${exampleCalculation.finalAmount}</strong>!
              </p>
              <p className="text-sm font-mono bg-slate-200/70 dark:bg-slate-700/70 p-2 rounded-md my-2 text-gray-800 dark:text-gray-200">
                Formula: $1 × (1 + 0.01)<sup>365</sup> = ${exampleCalculation.finalAmount}
              </p>
              <p className="text-xs sm:text-sm mt-3 text-gray-600 dark:text-gray-400 italic">
                This extreme example illustrates how compounding can create exponential growth over time. 
                While 1% daily returns aren't realistic, even modest returns can lead to significant growth over long periods.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompoundCalculator;
