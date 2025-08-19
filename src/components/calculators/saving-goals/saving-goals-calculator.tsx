import { useState } from 'react';
import { LineChart } from '@/components/ui/line-chart';

interface SavingGoalsInputs {
  targetAmount: number | '';
  currentSavings: number | '';
  years: number | '';
  returnRate: number | '';
  compound: 'annually' | 'quarterly' | 'monthly' | 'daily';
  contributionFrequency: 'month' | 'year';
}

interface SavingGoalsResult {
  requiredContribution: number;
  schedule: number[];
}

function calculateRequiredContribution(inputs: SavingGoalsInputs): SavingGoalsResult {
  // Convert inputs to numbers
  const targetAmount = typeof inputs.targetAmount === 'number' ? inputs.targetAmount : 0;
  const currentSavings = typeof inputs.currentSavings === 'number' ? inputs.currentSavings : 0;
  const years = typeof inputs.years === 'number' ? inputs.years : 0;
  const returnRate = typeof inputs.returnRate === 'number' ? inputs.returnRate : 0;

  const compoundMap = { annually: 1, quarterly: 4, monthly: 12, daily: 365 };
  const n = compoundMap[inputs.compound];
  const periods = years * n;
  const rate = returnRate / 100 / n;
  const contribPeriods = inputs.contributionFrequency === 'month' ? 12 : 1;
  // Future Value of a series formula rearranged for payment (PMT)
  // FV = PV*(1+r)^n + PMT*(((1+r)^n-1)/r)
  // Solve for PMT (required contribution)
  const fv = targetAmount;
  const pv = currentSavings;
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
    setInputs((prev) => ({
      ...prev,
      [name]: name === 'compound' || name === 'contributionFrequency'
        ? value
        : value === '' ? '' : Number(value)
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHasError(false);
    // Coerce '' to 0 for validation
    const targetAmount = typeof inputs.targetAmount === 'number' ? inputs.targetAmount : 0;
    const years = typeof inputs.years === 'number' ? inputs.years : 0;
    if (targetAmount <= 0 || years <= 0) {
      setHasError(true);
      setResult(null);
      return;
    }
    // Coerce '' to 0 for calculation
    const safeInputs = {
      ...inputs,
      targetAmount: typeof inputs.targetAmount === 'number' ? inputs.targetAmount : 0,
      currentSavings: typeof inputs.currentSavings === 'number' ? inputs.currentSavings : 0,
      years: typeof inputs.years === 'number' ? inputs.years : 0,
      returnRate: typeof inputs.returnRate === 'number' ? inputs.returnRate : 0,
    } as SavingGoalsInputs;
    setResult(calculateRequiredContribution(safeInputs));
  }

  return (
    <div className="py-8 px-4 md:px-0">
    <section className="w-full max-w-3xl mx-auto bg-card dark:bg-dark-card p-6 md:p-8 rounded-xl shadow-xl border border-subtle-border dark:border-dark-subtle-border">
      <form className="space-y-6" onSubmit={handleSubmit} aria-label="Savings Goal Calculator Form">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground dark:text-dark-foreground text-center mb-8">Savings Goal Calculator</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-foreground dark:text-dark-foreground mb-1">
            Target Amount ($)
            <input type="number" name="targetAmount" value={inputs.targetAmount === '' ? '' : inputs.targetAmount} min={0} step={100} onChange={handleChange} className="mt-1 block w-full px-4 py-3 bg-card dark:bg-dark-card border border-subtle-border dark:border-dark-subtle-border text-foreground dark:text-dark-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary sm:text-sm" required />
          </label>
          <label className="block text-sm font-medium text-foreground dark:text-dark-foreground mb-1">
            Current Savings ($)
            <input type="number" name="currentSavings" value={inputs.currentSavings === '' ? '' : inputs.currentSavings} min={0} step={100} onChange={handleChange} className="mt-1 block w-full px-4 py-3 bg-card dark:bg-dark-card border border-subtle-border dark:border-dark-subtle-border text-foreground dark:text-dark-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary sm:text-sm" required />
          </label>
          <label className="block text-sm font-medium text-foreground dark:text-dark-foreground mb-1">
            Time Horizon (years)
            <input type="number" name="years" value={inputs.years === '' ? '' : inputs.years} min={1} step={1} onChange={handleChange} className="mt-1 block w-full px-4 py-3 bg-card dark:bg-dark-card border border-subtle-border dark:border-dark-subtle-border text-foreground dark:text-dark-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary sm:text-sm" required />
          </label>
          <label className="block text-sm font-medium text-foreground dark:text-dark-foreground mb-1">
            Expected Return Rate (%)
            <input type="number" name="returnRate" value={inputs.returnRate === '' ? '' : inputs.returnRate} min={0} step={0.1} onChange={handleChange} className="mt-1 block w-full px-4 py-3 bg-card dark:bg-dark-card border border-subtle-border dark:border-dark-subtle-border text-foreground dark:text-dark-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary sm:text-sm" required />
          </label>
          <label className="block text-sm font-medium text-foreground dark:text-dark-foreground mb-1">
            Compounding
            <select name="compound" value={inputs.compound} onChange={handleChange} className="mt-1 block w-full px-4 py-3 bg-card dark:bg-dark-card border border-subtle-border dark:border-dark-subtle-border text-foreground dark:text-dark-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary sm:text-sm">
              <option value="annually">Annually</option>
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-foreground dark:text-dark-foreground mb-1">
            Contribution Frequency
            <select name="contributionFrequency" value={inputs.contributionFrequency} onChange={handleChange} className="mt-1 block w-full px-4 py-3 bg-card dark:bg-dark-card border border-subtle-border dark:border-dark-subtle-border text-foreground dark:text-dark-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary sm:text-sm">
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </label>
        </div>
        <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white dark:text-dark-background bg-primary dark:bg-dark-primary hover:bg-primary/80 dark:hover:bg-dark-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-dark-primary transition-colors duration-150 ease-in-out mt-8">Calculate</button>
        {hasError && <p className="text-danger dark:text-dark-danger text-sm mt-2 text-center">Please ensure all fields have valid positive values.</p>}
      </form>

      {result && (
        <div className="mt-10 bg-primary/10 dark:bg-dark-primary/10 rounded-lg p-6 shadow-md border border-primary/20 dark:border-dark-primary/20">
          <h3 className="text-xl font-semibold text-foreground dark:text-dark-foreground mb-4 text-center">Your Savings Plan</h3>
          <p className="text-center text-foreground dark:text-dark-foreground mb-6">To reach your goal of <strong className="text-primary dark:text-dark-primary">${inputs.targetAmount.toLocaleString()}</strong> in <strong className="text-primary dark:text-dark-primary">{inputs.years} {inputs.years === 1 ? 'year' : 'years'}</strong>, you need to save <strong className="text-primary dark:text-dark-primary">${result.requiredContribution.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</strong> per {inputs.contributionFrequency}.</p>
          <div className="w-full mt-4">
            <LineChart
              labels={[...Array(result.schedule.length).keys()].map(i => (i === 0 ? 'Now' : i === result.schedule.length - 1 ? 'Goal' : i.toString()))}
              datasets={[{
                label: 'Projected Savings',
                data: result.schedule,
                borderColor: document.documentElement.classList.contains('dark') ? '#8B70FF' : '#7458FF',
                backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(139,112,255,0.15)' : 'rgba(116,88,255,0.15)',
                fill: true,
              }]}
            />
          </div>
        </div>
      )}

      </section>
    <aside className="mt-12 w-full max-w-3xl mx-auto bg-subtle-background dark:bg-dark-subtle-background p-6 md:p-8 rounded-xl shadow-xl border border-subtle-border dark:border-dark-subtle-border">
        <h2 className="text-2xl font-bold text-foreground dark:text-dark-foreground mb-6 text-center">Understanding Your Savings Goal</h2>
        <p className="text-muted-foreground dark:text-dark-muted-foreground leading-relaxed mb-4">Setting a savings goal is a powerful way to build wealth and prepare for future expenses. This calculator helps you determine the regular contributions needed to reach your target, considering the impact of compound interest.</p>
        <ul>
          <li className="mb-1"><strong className="font-semibold text-foreground dark:text-dark-foreground">Target Amount:</strong> <span className="text-muted-foreground dark:text-dark-muted-foreground">The total amount of money you aim to save.</span></li>
          <li className="mb-1"><strong className="font-semibold text-foreground dark:text-dark-foreground">Current Savings:</strong> <span className="text-muted-foreground dark:text-dark-muted-foreground">The amount you have already saved towards this goal.</span></li>
          <li className="mb-1"><strong className="font-semibold text-foreground dark:text-dark-foreground">Time Horizon:</strong> <span className="text-muted-foreground dark:text-dark-muted-foreground">The number of years you plan to save for.</span></li>
          <li className="mb-1"><strong className="font-semibold text-foreground dark:text-dark-foreground">Return Rate:</strong> <span className="text-muted-foreground dark:text-dark-muted-foreground">The anticipated annual percentage growth of your savings or investments.</span></li>
        </ul>
        <p className="text-muted-foreground dark:text-dark-muted-foreground leading-relaxed mt-4 mb-4">Consistent contributions combined with the power of compounding interest can significantly accelerate your progress. It's wise to review your savings plan periodically and make adjustments as your financial situation or goals change.</p>
        <h3 className="text-xl font-semibold text-foreground dark:text-dark-foreground mt-6 mb-3">Frequently Asked Questions</h3>
        <ul>
          <li className="mb-1"><strong className="font-semibold text-foreground dark:text-dark-foreground">What if my return rate is 0%?</strong> <span className="text-muted-foreground dark:text-dark-muted-foreground">The calculator will still determine the necessary contributions, but without factoring in any growth from interest.</span></li>
          <li className="mb-1"><strong className="font-semibold text-foreground dark:text-dark-foreground">How often should I contribute?</strong> <span className="text-muted-foreground dark:text-dark-muted-foreground">You can choose to make contributions monthly or yearly. Monthly contributions often align better with typical income schedules.</span></li>
        </ul>
        <p className="text-muted-foreground dark:text-dark-muted-foreground leading-relaxed mt-6">Explore more financial planning tools in our <a href="/calculators" className="text-primary dark:text-dark-primary hover:text-primary/80 dark:hover:text-dark-primary/80 font-semibold underline">Financial Calculators Hub</a>.</p>
      </aside>
    </div>
  );
}

export default SavingGoalsCalculator;
