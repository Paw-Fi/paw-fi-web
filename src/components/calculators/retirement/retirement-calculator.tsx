import { useState } from 'react';
import { LineChart } from '@/components/ui/line-chart';

// --- Projection Table ---
interface RetirementProjectionTableProps {
  currentAge: number;
  retirementAge: number;
  currentIncome: number;
  investmentReturn: number;
  retirementSavings: number;
  futureSavingsPct: number;
}

function getRetirementProjection(
  currentAge: number,
  retirementAge: number,
  currentIncome: number,
  investmentReturn: number,
  retirementSavings: number,
  futureSavingsPct: number
) {
  const years = Math.max(0, retirementAge - currentAge);
  let balance = retirementSavings;
  let income = currentIncome;
  const data: Array<{
    year: number;
    age: number;
    startBalance: number;
    contribution: number;
    growth: number;
    endBalance: number;
  }> = [];
  for (let i = 0; i <= years; i++) {
    const contribution = income * (futureSavingsPct / 100);
    const growth = balance * (investmentReturn / 100);
    const endBalance = balance + contribution + growth;
    data.push({
      year: i,
      age: currentAge + i,
      startBalance: balance,
      contribution,
      growth,
      endBalance,
    });
    balance = endBalance;
    // Optional: income could grow here if desired
  }
  return data;
}

function RetirementProjectionTable({
  currentAge,
  retirementAge,
  currentIncome,
  investmentReturn,
  retirementSavings,
  futureSavingsPct,
}: RetirementProjectionTableProps) {
  const data = getRetirementProjection(
    currentAge,
    retirementAge,
    currentIncome,
    investmentReturn,
    retirementSavings,
    futureSavingsPct
  );

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-foreground dark:text-dark-foreground">Year-by-Year Projection</h3>
      <div className="overflow-x-auto rounded-lg border border-subtle-border dark:border-dark-subtle-border">
        <table className="min-w-full text-sm">
          <thead className="bg-table-header dark:bg-dark-table-header">
            <tr>
              <th className="px-2 py-2 font-medium text-muted-foreground dark:text-dark-muted-foreground border-b border-subtle-border dark:border-dark-subtle-border">Year</th>
              <th className="px-2 py-2 font-medium text-muted-foreground dark:text-dark-muted-foreground border-b border-subtle-border dark:border-dark-subtle-border">Age</th>
              <th className="px-2 py-2 font-medium text-muted-foreground dark:text-dark-muted-foreground border-b border-subtle-border dark:border-dark-subtle-border text-right">Start Balance</th>
              <th className="px-2 py-2 font-medium text-muted-foreground dark:text-dark-muted-foreground border-b border-subtle-border dark:border-dark-subtle-border text-right">Contribution</th>
              <th className="px-2 py-2 font-medium text-muted-foreground dark:text-dark-muted-foreground border-b border-subtle-border dark:border-dark-subtle-border text-right">Growth</th>
              <th className="px-2 py-2 font-medium text-muted-foreground dark:text-dark-muted-foreground border-b border-subtle-border dark:border-dark-subtle-border text-right">End Balance</th>
            </tr>
          </thead>
          <tbody className="bg-card dark:bg-dark-card">
            {data.map((row) => (
              <tr key={row.year} className="even:bg-table-row-even dark:even:bg-dark-table-row-even">
                <td className="px-2 py-1 text-center text-foreground dark:text-dark-foreground">{row.year}</td>
                <td className="px-2 py-1 text-center text-foreground dark:text-dark-foreground">{row.age}</td>
                <td className="px-2 py-1 text-right text-foreground dark:text-dark-foreground">${row.startBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td className="px-2 py-1 text-right text-foreground dark:text-dark-foreground">${row.contribution.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td className="px-2 py-1 text-right text-foreground dark:text-dark-foreground">${row.growth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td className="px-2 py-1 text-right text-foreground dark:text-dark-foreground">${row.endBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Results Summary ---
interface RetirementResultsProps {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  currentIncome: number;
  incomeIncrease: number;
  incomeNeededPct: number;
  investmentReturn: number;
  otherIncome: number;
  retirementSavings: number;
  futureSavingsPct: number;
}

function RetirementResults({
  currentAge,
  retirementAge,
  lifeExpectancy,
  currentIncome,
  incomeIncrease,
  incomeNeededPct,
  investmentReturn,
  otherIncome,
  retirementSavings,
  futureSavingsPct,
}: RetirementResultsProps) {
  // Years to retirement and in retirement
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const yearsInRetirement = Math.max(0, lifeExpectancy - retirementAge);

  // Projected income needed at retirement (future value with inflation)
  const retirementIncomeNeeded = currentIncome * (incomeNeededPct / 100) * Math.pow(1 + incomeIncrease / 100, yearsToRetirement);

  // Projected savings at retirement (future value of current + annual savings)
  let fv = retirementSavings * Math.pow(1 + investmentReturn / 100, yearsToRetirement);
  for (let i = 0; i < yearsToRetirement; i++) {
    fv += (currentIncome * (futureSavingsPct / 100)) * Math.pow(1 + investmentReturn / 100, yearsToRetirement - i - 1);
  }
  const projectedSavings = fv;

  // Simple 4% rule for safe withdrawal
  const safeWithdrawal = projectedSavings * 0.04 / 12;

  // Status indicator
  const status = safeWithdrawal * 12 + otherIncome * 12 >= retirementIncomeNeeded ? 'On Track' : 'Shortfall';

  return (
    <div className="mt-8 bg-primary/10 dark:bg-dark-primary/10 rounded-lg p-6 border border-primary/20 dark:border-dark-primary/20">
      <h3 className="text-xl font-semibold mb-4 text-foreground dark:text-dark-foreground">Results Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="font-medium text-foreground dark:text-dark-foreground">Years to Retirement:</span>
            <span className="text-foreground dark:text-dark-foreground">{yearsToRetirement}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground dark:text-dark-muted-foreground">Years in Retirement:</span>
            <span className="text-foreground dark:text-dark-foreground">{yearsInRetirement}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground dark:text-dark-muted-foreground">Annual Income Needed at Retirement:</span>
            <span className="text-foreground dark:text-dark-foreground">${retirementIncomeNeeded.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground dark:text-dark-muted-foreground">Projected Savings at Retirement:</span>
            <span className="text-foreground dark:text-dark-foreground">${projectedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground dark:text-dark-muted-foreground">Estimated Safe Monthly Withdrawal:</span>
            <span className="text-foreground dark:text-dark-foreground">${safeWithdrawal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground dark:text-dark-muted-foreground">Status:</span>
            <span className={status === 'On Track' ? 'text-success dark:text-dark-success font-semibold' : 'text-danger dark:text-dark-danger font-semibold'}>{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RetirementCalculator() {
  // State for main inputs
  const [currentAge, setCurrentAge] = useState<number | ''>(35);
  const [retirementAge, setRetirementAge] = useState<number | ''>(67);
  const [lifeExpectancy, setLifeExpectancy] = useState<number | ''>(85);
  const [currentIncome, setCurrentIncome] = useState<number | ''>(70000);
  // Assumptions
  const [incomeIncrease, setIncomeIncrease] = useState<number | ''>(3);
  const [incomeNeededPct, setIncomeNeededPct] = useState<number | ''>(75);
  const [investmentReturn, setInvestmentReturn] = useState<number | ''>(6);
  // Optional
  const [otherIncome, setOtherIncome] = useState<number | ''>(0);
  const [retirementSavings, setRetirementSavings] = useState<number | ''>(30000);
  const [futureSavingsPct, setFutureSavingsPct] = useState<number | ''>(10);

  const data = getRetirementProjection(
    typeof currentAge === 'number' ? currentAge : 0,
    typeof retirementAge === 'number' ? retirementAge : 0,
    typeof currentIncome === 'number' ? currentIncome : 0,
    typeof investmentReturn === 'number' ? investmentReturn : 0,
    typeof retirementSavings === 'number' ? retirementSavings : 0,
    typeof futureSavingsPct === 'number' ? futureSavingsPct : 0
  );

  const chartData = {
    labels: data.map((item) => item.age.toString()),
    datasets: [
      {
        label: 'Projected Savings',
        data: data.map((item) => item.endBalance),
        borderColor: typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? '#8B70FF' : '#7458FF',
        backgroundColor: typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'rgba(139,112,255,0.1)' : 'rgba(116,88,255,0.1)',
      },
    ],
  };


  return (
    <div className="max-w-4xl mx-auto p-6 bg-card dark:bg-dark-card rounded-lg shadow-md border border-subtle-border dark:border-dark-subtle-border">
      <h2 className="text-2xl font-bold mb-6 text-center text-foreground dark:text-dark-foreground">Retirement Calculator</h2>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground" htmlFor="currentAge">Your current age</label>
          <input id="currentAge" type="number" min={0} value={currentAge === '' ? '' : currentAge} onChange={e => setCurrentAge(e.target.value === '' ? '' : Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-foreground dark:text-dark-foreground bg-card dark:bg-dark-card rounded-lg border border-subtle-border dark:border-dark-subtle-border focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground" htmlFor="retirementAge">Your planned retirement age</label>
          <input id="retirementAge" type="number" min={0} value={retirementAge === '' ? '' : retirementAge} onChange={e => setRetirementAge(e.target.value === '' ? '' : Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-foreground dark:text-dark-foreground bg-card dark:bg-dark-card rounded-lg border border-subtle-border dark:border-dark-subtle-border focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground" htmlFor="lifeExpectancy">Your life expectancy</label>
          <input id="lifeExpectancy" type="number" min={0} value={lifeExpectancy === '' ? '' : lifeExpectancy} onChange={e => setLifeExpectancy(e.target.value === '' ? '' : Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-foreground dark:text-dark-foreground bg-card dark:bg-dark-card rounded-lg border border-subtle-border dark:border-dark-subtle-border focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground" htmlFor="currentIncome">Your current pre-tax income</label>
          <input id="currentIncome" type="number" min={0} value={currentIncome === '' ? '' : currentIncome} onChange={e => setCurrentIncome(e.target.value === '' ? '' : Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-foreground dark:text-dark-foreground bg-card dark:bg-dark-card rounded-lg border border-subtle-border dark:border-dark-subtle-border focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary" />
          <span className="text-xs text-muted-foreground dark:text-dark-muted-foreground">/year</span>
        </div>
        {/* Assumptions */}
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground" htmlFor="incomeIncrease">Your current income increase</label>
          <input id="incomeIncrease" type="number" min={0} value={incomeIncrease === '' ? '' : incomeIncrease} onChange={e => setIncomeIncrease(e.target.value === '' ? '' : Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-foreground dark:text-dark-foreground bg-card dark:bg-dark-card rounded-lg border border-subtle-border dark:border-dark-subtle-border focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary" />
          <span className="text-xs text-muted-foreground dark:text-dark-muted-foreground">%/year</span>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground" htmlFor="incomeNeededPct">Income needed after retirement</label>
          <input id="incomeNeededPct" type="number" min={0} value={incomeNeededPct === '' ? '' : incomeNeededPct} onChange={e => setIncomeNeededPct(e.target.value === '' ? '' : Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-foreground dark:text-dark-foreground bg-card dark:bg-dark-card rounded-lg border border-subtle-border dark:border-dark-subtle-border focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary" />
          <span className="text-xs text-muted-foreground dark:text-dark-muted-foreground">% of income</span>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground" htmlFor="investmentReturn">Average investment return</label>
          <input id="investmentReturn" type="number" min={0} value={investmentReturn === '' ? '' : investmentReturn} onChange={e => setInvestmentReturn(e.target.value === '' ? '' : Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-foreground dark:text-dark-foreground bg-card dark:bg-dark-card rounded-lg border border-subtle-border dark:border-dark-subtle-border focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary" />
          <span className="text-xs text-muted-foreground dark:text-dark-muted-foreground">%/year</span>
        </div>
        {/* Optional inputs */}
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground" htmlFor="otherIncome">Other income sources</label>
          <input id="otherIncome" type="number" min={0} value={otherIncome === '' ? '' : otherIncome} onChange={e => setOtherIncome(e.target.value === '' ? '' : Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-foreground dark:text-dark-foreground bg-card dark:bg-dark-card rounded-lg border border-subtle-border dark:border-dark-subtle-border focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary" />
          <span className="text-xs text-muted-foreground dark:text-dark-muted-foreground">/year</span>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground" htmlFor="retirementSavings">Current retirement savings</label>
          <input id="retirementSavings" type="number" min={0} value={retirementSavings === '' ? '' : retirementSavings} onChange={e => setRetirementSavings(e.target.value === '' ? '' : Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-foreground dark:text-dark-foreground bg-card dark:bg-dark-card rounded-lg border border-subtle-border dark:border-dark-subtle-border focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground dark:text-dark-foreground" htmlFor="futureSavingsPct">Future savings percentage</label>
          <input id="futureSavingsPct" type="number" min={0} value={futureSavingsPct === '' ? '' : futureSavingsPct} onChange={e => setFutureSavingsPct(e.target.value === '' ? '' : Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-foreground dark:text-dark-foreground bg-card dark:bg-dark-card rounded-lg border border-subtle-border dark:border-dark-subtle-border focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary" />
          <span className="text-xs text-muted-foreground dark:text-dark-muted-foreground">% of income</span>
        </div>
      </form>

      <div className="mt-8">
        <LineChart labels={chartData.labels} datasets={chartData.datasets} />
      </div>

      <div className="mt-8">
        <RetirementProjectionTable
          currentAge={typeof currentAge === 'number' ? currentAge : 0}
          retirementAge={typeof retirementAge === 'number' ? retirementAge : 0}
          currentIncome={typeof currentIncome === 'number' ? currentIncome : 0}
          investmentReturn={typeof investmentReturn === 'number' ? investmentReturn : 0}
          retirementSavings={typeof retirementSavings === 'number' ? retirementSavings : 0}
          futureSavingsPct={typeof futureSavingsPct === 'number' ? futureSavingsPct : 0}
        />
      </div>

      <div className="mt-8">
        <RetirementResults
          currentAge={typeof currentAge === 'number' ? currentAge : 0}
          retirementAge={typeof retirementAge === 'number' ? retirementAge : 0}
          lifeExpectancy={typeof lifeExpectancy === 'number' ? lifeExpectancy : 0}
          currentIncome={typeof currentIncome === 'number' ? currentIncome : 0}
          incomeIncrease={typeof incomeIncrease === 'number' ? incomeIncrease : 0}
          incomeNeededPct={typeof incomeNeededPct === 'number' ? incomeNeededPct : 0}
          investmentReturn={typeof investmentReturn === 'number' ? investmentReturn : 0}
          otherIncome={typeof otherIncome === 'number' ? otherIncome : 0}
          retirementSavings={typeof retirementSavings === 'number' ? retirementSavings : 0}
          futureSavingsPct={typeof futureSavingsPct === 'number' ? futureSavingsPct : 0}
        />
      </div>
    </div>
  );
}
