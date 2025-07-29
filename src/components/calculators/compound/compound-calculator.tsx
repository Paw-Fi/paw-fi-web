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

  const styles = () => (
    <style>{`
      .interest-bar {
        /* Default height, will be overridden by dynamic style */
      }

      .contribution-bar {
        /* Default height, will be overridden by dynamic style */
        opacity: 0.8;
      }
    `}</style>
  );

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <label htmlFor="initialInvestment" className="block text-sm font-medium mb-1">
              Initial Investment
            </label>
            <input
              id="initialInvestment"
              type="number"
              value={initialInvestment === '' ? '' : initialInvestment}
              onChange={e => setInitialInvestment(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              min={0}
            />
          </div>
          
          <div>
            <label htmlFor="annualContribution" className="block text-sm font-medium mb-1">
              Annual Contribution
            </label>
            <input
              id="annualContribution"
              type="number"
              value={annualContribution === '' ? '' : annualContribution}
              onChange={e => setAnnualContribution(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              min={0}
            />
          </div>
          
          <div>
            <label htmlFor="annualReturn" className="block text-sm font-medium mb-1">
              Annual Return (%)
            </label>
            <input
              id="annualReturn"
              type="number"
              value={annualReturn === '' ? '' : annualReturn}
              onChange={e => setAnnualReturn(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              min={0}
              step={0.01}
            />
          </div>
          
          <div>
            <label htmlFor="years" className="block text-sm font-medium mb-1">
              Investment Period (Years)
            </label>
            <input
              id="years"
              type="number"
              value={years === '' ? '' : years}
              onChange={e => setYears(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              min={1}
            />
          </div>
          
          <div>
            <label htmlFor="compoundingFrequency" className="block text-sm font-medium mb-1">
              Compounding Frequency
            </label>
            <select
              id="compoundingFrequency"
              value={compoundingFrequency}
              onChange={(e) => setCompoundingFrequency(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
          
          {/* Results Summary */}
          <div className="bg-blue-50 p-4 rounded-lg mt-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Results</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Final Balance</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(calculationResult.finalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Contributions</p>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(calculationResult.contributions)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Interest</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(calculationResult.interest)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Interest / Contribution Ratio</p>
                <p className="text-lg font-bold text-purple-600">
                  {(calculationResult.interest / calculationResult.contributions).toFixed(2)}x
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Chart & Visualization */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Growth Visualization</h3>
          <div 
            ref={chartContainerRef} 
            className="h-[300px] border border-gray-200 rounded-lg p-4 relative"
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
          <div className="mt-6">            
            
           
              <div className="mt-2 p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold mb-2">The Shocking Power of Compounding</h4>
                <p className="text-sm mb-2">
                  If you invest $1 with a <strong>1% daily return</strong> for 365 days, 
                  your investment would grow to <strong>${exampleCalculation.finalAmount}</strong>!
                </p>
                <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                  Formula: $1 × (1 + 0.01)<sup>365</sup> = ${exampleCalculation.finalAmount}
                </p>
                <p className="text-sm mt-2 text-gray-600 italic">
                  This extreme example illustrates how compounding can create exponential growth over time.
                  While 1% daily returns aren't realistic, even modest returns can lead to significant growth 
                  over long periods.
                </p>
              </div>
            
          </div>
        </div>
      </div>
      {styles()}
    </div>
  );
};

export default CompoundCalculator;
