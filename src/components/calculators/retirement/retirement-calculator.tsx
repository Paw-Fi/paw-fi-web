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
  const data = [];
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
      <h3 className="text-lg font-semibold mb-2">Year-by-Year Projection</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 font-medium border-b">Year</th>
              <th className="px-2 py-2 font-medium border-b">Age</th>
              <th className="px-2 py-2 font-medium border-b text-right">Start Balance</th>
              <th className="px-2 py-2 font-medium border-b text-right">Contribution</th>
              <th className="px-2 py-2 font-medium border-b text-right">Growth</th>
              <th className="px-2 py-2 font-medium border-b text-right">End Balance</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.year} className="even:bg-gray-50">
                <td className="px-2 py-1 text-center">{row.year}</td>
                <td className="px-2 py-1 text-center">{row.age}</td>
                <td className="px-2 py-1 text-right">${row.startBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td className="px-2 py-1 text-right">${row.contribution.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td className="px-2 py-1 text-right">${row.growth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td className="px-2 py-1 text-right">${row.endBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
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
    <div className="mt-8 bg-blue-50 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Results Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="font-medium">Years to Retirement:</span>
            <span>{yearsToRetirement}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Years in Retirement:</span>
            <span>{yearsInRetirement}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Annual Income Needed at Retirement:</span>
            <span>${retirementIncomeNeeded.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <span>Projected Savings at Retirement:</span>
            <span>${projectedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Estimated Safe Monthly Withdrawal:</span>
            <span>${safeWithdrawal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Status:</span>
            <span className={status === 'On Track' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RetirementCalculator() {
  // State for main inputs
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(67);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);
  const [currentIncome, setCurrentIncome] = useState(70000);
  // Assumptions
  const [incomeIncrease, setIncomeIncrease] = useState(3);
  const [incomeNeededPct, setIncomeNeededPct] = useState(75);
  const [investmentReturn, setInvestmentReturn] = useState(6);
  // Optional
  const [otherIncome, setOtherIncome] = useState(0);
  const [retirementSavings, setRetirementSavings] = useState(30000);
  const [futureSavingsPct, setFutureSavingsPct] = useState(10);

  const data = getRetirementProjection(
    currentAge,
    retirementAge,
    currentIncome,
    investmentReturn,
    retirementSavings,
    futureSavingsPct
  );

  const chartData = {
    labels: data.map((item) => item.age.toString()),
    datasets: [
      {
        label: 'Projected Savings',
        data: data.map((item) => item.endBalance),
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f620',
      },
    ],
  };


  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Retirement Calculator</h2>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="currentAge">Your current age</label>
          <input id="currentAge" type="number" min={0} value={currentAge} onChange={e => setCurrentAge(Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-gray-700 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="retirementAge">Your planned retirement age</label>
          <input id="retirementAge" type="number" min={0} value={retirementAge} onChange={e => setRetirementAge(Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-gray-700 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="lifeExpectancy">Your life expectancy</label>
          <input id="lifeExpectancy" type="number" min={0} value={lifeExpectancy} onChange={e => setLifeExpectancy(Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-gray-700 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="currentIncome">Your current pre-tax income</label>
          <input id="currentIncome" type="number" min={0} value={currentIncome} onChange={e => setCurrentIncome(Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-gray-700 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
          <span className="text-xs text-gray-500">/year</span>
        </div>
        {/* Assumptions */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="incomeIncrease">Your current income increase</label>
          <input id="incomeIncrease" type="number" min={0} value={incomeIncrease} onChange={e => setIncomeIncrease(Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-gray-700 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
          <span className="text-xs text-gray-500">%/year</span>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="incomeNeededPct">Income needed after retirement</label>
          <input id="incomeNeededPct" type="number" min={0} value={incomeNeededPct} onChange={e => setIncomeNeededPct(Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-gray-700 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
          <span className="text-xs text-gray-500">% of income</span>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="investmentReturn">Average investment return</label>
          <input id="investmentReturn" type="number" min={0} value={investmentReturn} onChange={e => setInvestmentReturn(Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-gray-700 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
          <span className="text-xs text-gray-500">%/year</span>
        </div>
        {/* Optional inputs */}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="otherIncome">Other income sources</label>
          <input id="otherIncome" type="number" min={0} value={otherIncome} onChange={e => setOtherIncome(Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-gray-700 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
          <span className="text-xs text-gray-500">/year</span>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="retirementSavings">Current retirement savings</label>
          <input id="retirementSavings" type="number" min={0} value={retirementSavings} onChange={e => setRetirementSavings(Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-gray-700 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="futureSavingsPct">Future savings percentage</label>
          <input id="futureSavingsPct" type="number" min={0} value={futureSavingsPct} onChange={e => setFutureSavingsPct(Number(e.target.value))} className="block w-full p-2 pl-10 text-sm text-gray-700 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
          <span className="text-xs text-gray-500">% of income</span>
        </div>
      </form>

      <div className="mt-8">
        <LineChart labels={chartData.labels} datasets={chartData.datasets} />
      </div>

      <div className="mt-8">
        <RetirementProjectionTable
          currentAge={currentAge}
          retirementAge={retirementAge}
          currentIncome={currentIncome}
          investmentReturn={investmentReturn}
          retirementSavings={retirementSavings}
          futureSavingsPct={futureSavingsPct}
        />
      </div>

      <div className="mt-8">
        <RetirementResults
          currentAge={currentAge}
          retirementAge={retirementAge}
          lifeExpectancy={lifeExpectancy}
          currentIncome={currentIncome}
          incomeIncrease={incomeIncrease}
          incomeNeededPct={incomeNeededPct}
          investmentReturn={investmentReturn}
          otherIncome={otherIncome}
          retirementSavings={retirementSavings}
          futureSavingsPct={futureSavingsPct}
        />
      </div>
    </div>
  );
}
