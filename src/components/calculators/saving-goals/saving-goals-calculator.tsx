import { useState } from 'react';
import { LineChart } from '@/components/ui/line-chart';

interface SavingGoalsInputs {
  targetAmount: number;
  currentSavings: number;
  years: number;
  returnRate: number;
  compound: 'annually' | 'quarterly' | 'monthly' | 'daily';
  contributionFrequency: 'month' | 'year';
}

interface SavingGoalsResult {
  requiredContribution: number;
  schedule: number[];
}

function calculateRequiredContribution(inputs: SavingGoalsInputs): SavingGoalsResult {
  const compoundMap = { annually: 1, quarterly: 4, monthly: 12, daily: 365 };
  const n = compoundMap[inputs.compound];
  const periods = inputs.years * n;
  const rate = inputs.returnRate / 100 / n;
  const contribPeriods = inputs.contributionFrequency === 'month' ? 12 : 1;
  // Future Value of a series formula rearranged for payment (PMT)
  // FV = PV*(1+r)^n + PMT*(((1+r)^n-1)/r)
  // Solve for PMT (required contribution)
  const fv = inputs.targetAmount;
  const pv = inputs.currentSavings;
  let requiredContribution = 0;
  if (rate === 0) {
    requiredContribution = (fv - pv) / periods;
  } else {
    requiredContribution = (fv - pv * Math.pow(1 + rate, periods)) * rate / (Math.pow(1 + rate, periods) - 1);
  }
  // Generate schedule for chart
  let balance = pv;
  const schedule: number[] = [];
  for (let i = 1; i <= periods; i++) {
    balance = balance * (1 + rate) + requiredContribution;
    if (i % (n / contribPeriods) === 0) {
      schedule.push(balance);
    }
  }
  return { requiredContribution, schedule };
}

export function SavingGoalsCalculator() {
  const [inputs, setInputs] = useState<SavingGoalsInputs>({
    targetAmount: 10000,
    currentSavings: 1000,
    years: 5,
    returnRate: 5,
    compound: 'monthly',
    contributionFrequency: 'month',
  });
  const [result, setResult] = useState<SavingGoalsResult | null>(null);
  const [hasError, setHasError] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: name === 'compound' || name === 'contributionFrequency' ? value : Number(value) }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHasError(false);
    if (inputs.targetAmount <= 0 || inputs.years <= 0) {
      setHasError(true);
      setResult(null);
      return;
    }
    setResult(calculateRequiredContribution(inputs));
  }

  return (
    <div className="py-8 px-4 md:px-0">
    <section className="w-full max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-xl">
      <form className="space-y-6" onSubmit={handleSubmit} aria-label="Savings Goal Calculator Form">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-8">Savings Goal Calculator</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Amount ($)
            <input type="number" name="targetAmount" value={inputs.targetAmount} min={0} step={100} onChange={handleChange} className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" required />
          </label>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Savings ($)
            <input type="number" name="currentSavings" value={inputs.currentSavings} min={0} step={100} onChange={handleChange} className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" required />
          </label>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time Horizon (years)
            <input type="number" name="years" value={inputs.years} min={1} step={1} onChange={handleChange} className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" required />
          </label>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expected Return Rate (%)
            <input type="number" name="returnRate" value={inputs.returnRate} min={0} step={0.1} onChange={handleChange} className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" required />
          </label>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Compounding
            <select name="compound" value={inputs.compound} onChange={handleChange} className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm">
              <option value="annually">Annually</option>
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contribution Frequency
            <select name="contributionFrequency" value={inputs.contributionFrequency} onChange={handleChange} className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm">
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </label>
        </div>
        <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150 ease-in-out mt-8">Calculate</button>
        {hasError && <p className="text-red-500 text-sm mt-2 text-center">Please ensure all fields have valid positive values.</p>}
      </form>

      {result && (
        <div className="mt-10 bg-purple-50 rounded-lg p-6 shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Your Savings Plan</h3>
          <p className="text-center text-gray-700 mb-6">To reach your goal of <strong className="text-purple-700">${inputs.targetAmount.toLocaleString()}</strong> in <strong className="text-purple-700">{inputs.years} {inputs.years === 1 ? 'year' : 'years'}</strong>, you need to save <strong className="text-purple-700">${result.requiredContribution.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</strong> per {inputs.contributionFrequency}.</p>
          <div className="w-full mt-4">
            <LineChart
              labels={[...Array(result.schedule.length).keys()].map(i => (i === 0 ? 'Now' : i === result.schedule.length - 1 ? 'Goal' : i.toString()))}
              datasets={[{
                label: 'Projected Savings',
                data: result.schedule,
                borderColor: '#8B5CF6',
                backgroundColor: 'rgba(139,92,246,0.15)',
                fill: true,
              }]}
            />
          </div>
        </div>
      )}

      </section>
    <aside className="mt-12 w-full max-w-3xl mx-auto bg-gray-50 p-6 md:p-8 rounded-xl shadow-xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Understanding Your Savings Goal</h2>
        <p className="text-gray-600 leading-relaxed mb-4">Setting a savings goal is a powerful way to build wealth and prepare for future expenses. This calculator helps you determine the regular contributions needed to reach your target, considering the impact of compound interest.</p>
        <ul>
          <li className="mb-1"><strong className="font-semibold text-gray-700">Target Amount:</strong> The total amount of money you aim to save.</li>
          <li className="mb-1"><strong className="font-semibold text-gray-700">Current Savings:</strong> The amount you have already saved towards this goal.</li>
          <li className="mb-1"><strong className="font-semibold text-gray-700">Time Horizon:</strong> The number of years you plan to save for.</li>
          <li className="mb-1"><strong className="font-semibold text-gray-700">Return Rate:</strong> The anticipated annual percentage growth of your savings or investments.</li>
        </ul>
        <p className="text-gray-600 leading-relaxed mt-4 mb-4">Consistent contributions combined with the power of compounding interest can significantly accelerate your progress. It's wise to review your savings plan periodically and make adjustments as your financial situation or goals change.</p>
        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Frequently Asked Questions</h3>
        <ul>
          <li className="mb-1"><strong className="font-semibold text-gray-700">What if my return rate is 0%?</strong> The calculator will still determine the necessary contributions, but without factoring in any growth from interest.</li>
          <li className="mb-1"><strong className="font-semibold text-gray-700">How often should I contribute?</strong> You can choose to make contributions monthly or yearly. Monthly contributions often align better with typical income schedules.</li>
        </ul>
        <p className="text-gray-600 leading-relaxed mt-6">Explore more financial planning tools in our <a href="/calculators" className="text-purple-600 hover:text-purple-700 font-semibold underline">Financial Calculators Hub</a>.</p>
      </aside>
    </div>
  );
}

export default SavingGoalsCalculator;
