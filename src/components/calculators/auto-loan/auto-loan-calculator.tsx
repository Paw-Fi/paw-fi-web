import { useState } from 'react';
import { PieChart } from '../../../components/ui/pie-chart';
import { LineChart } from '../../../components/ui/line-chart';

export function AutoLoanCalculator() {
  const [autoPrice, setAutoPrice] = useState<number | ''>(30000);
  const [loanTermMonths, setLoanTermMonths] = useState<number | ''>(60);
  const [interestRate, setInterestRate] = useState<number | ''>(5.0);
  const [cashIncentives, setCashIncentives] = useState<number | ''>(0);
  const [downPayment, setDownPayment] = useState<number | ''>(5000);
  const [tradeInValue, setTradeInValue] = useState<number | ''>(0);
  const [amountOwedOnTradeIn, setAmountOwedOnTradeIn] = useState<number | ''>(0);
  const [salesTax, setSalesTax] = useState<number | ''>(7.0);
  const [titleFees, setTitleFees] = useState<number | ''>(2000);
  const [includeFeesInLoan, setIncludeFeesInLoan] = useState(false);
  const [state, setState] = useState('');
  const [showAmortizationSchedule, setShowAmortizationSchedule] = useState(false);

  // Calculation logic
  // Sale Tax
  // Coerce '' to 0 for calculations
  const autoPriceNum = typeof autoPrice === 'number' ? autoPrice : 0;
  const loanTermMonthsNum = typeof loanTermMonths === 'number' ? loanTermMonths : 0;
  const interestRateNum = typeof interestRate === 'number' ? interestRate : 0;
  const cashIncentivesNum = typeof cashIncentives === 'number' ? cashIncentives : 0;
  const downPaymentNum = typeof downPayment === 'number' ? downPayment : 0;
  const tradeInValueNum = typeof tradeInValue === 'number' ? tradeInValue : 0;
  const amountOwedOnTradeInNum = typeof amountOwedOnTradeIn === 'number' ? amountOwedOnTradeIn : 0;
  const salesTaxNum = typeof salesTax === 'number' ? salesTax : 0;
  const titleFeesNum = typeof titleFees === 'number' ? titleFees : 0;

  // Sale Tax
  const saleTax = Math.max(0, (autoPriceNum - cashIncentivesNum - tradeInValueNum) * (salesTaxNum / 100));

  // Loan Amount
  const baseLoan = autoPriceNum - cashIncentivesNum - downPaymentNum - tradeInValueNum + amountOwedOnTradeInNum;
  const loanAmount = includeFeesInLoan ? baseLoan + saleTax + titleFeesNum : baseLoan;

  // Upfront Payment
  const upfrontPayment = includeFeesInLoan
    ? downPaymentNum + tradeInValueNum + cashIncentivesNum
    : downPaymentNum + tradeInValueNum + cashIncentivesNum + saleTax + titleFeesNum;

  // Monthly Payment (Standard Amortization Formula)
  const principal = loanAmount;
  const monthlyRate = interestRateNum / 100 / 12;
  const n = loanTermMonthsNum;
  const monthlyPayment = monthlyRate === 0
    ? (n === 0 ? 0 : principal / n)
    : (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);

  // Total of All Payments
  const totalPayments = monthlyPayment * loanTermMonthsNum;

  // Total Interest
  const totalInterest = totalPayments - loanAmount;

  // Total Cost
  const totalCost = totalPayments + upfrontPayment;

  return (
    <div className="w-full max-w-full md:max-w-3xl lg:max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-center text-foreground dark:text-dark-foreground">Auto Loan Calculator</h2>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground" htmlFor="autoPrice">Auto Price</label>
          <input id="autoPrice" type="number" min={0} value={autoPrice === '' ? '' : autoPrice} onChange={e => setAutoPrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground" htmlFor="loanTermMonths">Loan Term</label>
          <input id="loanTermMonths" type="number" min={1} value={loanTermMonths === '' ? '' : loanTermMonths} onChange={e => setLoanTermMonths(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground p-2" />
          <span className="text-xs text-gray-500 dark:text-gray-400">months</span>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground" htmlFor="interestRate">Interest Rate</label>
          <input id="interestRate" type="number" min={0} step={0.01} value={interestRate === '' ? '' : interestRate} onChange={e => setInterestRate(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground p-2" />
          <span className="text-xs text-gray-500 dark:text-gray-400">%</span>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground" htmlFor="cashIncentives">Cash Incentives</label>
          <input id="cashIncentives" type="number" min={0} value={cashIncentives === '' ? '' : cashIncentives} onChange={e => setCashIncentives(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground" htmlFor="downPayment">Down Payment</label>
          <input id="downPayment" type="number" min={0} value={downPayment === '' ? '' : downPayment} onChange={e => setDownPayment(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground" htmlFor="tradeInValue">Trade-In Value</label>
          <input id="tradeInValue" type="number" min={0} value={tradeInValue === '' ? '' : tradeInValue} onChange={e => setTradeInValue(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground" htmlFor="amountOwedOnTradeIn">Amount Owed on Trade-In</label>
          <input id="amountOwedOnTradeIn" type="number" min={0} value={amountOwedOnTradeIn === '' ? '' : amountOwedOnTradeIn} onChange={e => setAmountOwedOnTradeIn(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground" htmlFor="salesTax">Sales Tax</label>
          <input id="salesTax" type="number" min={0} step={0.01} value={salesTax === '' ? '' : salesTax} onChange={e => setSalesTax(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground p-2" />
          <span className="text-xs text-gray-500 dark:text-gray-400">%</span>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground" htmlFor="titleFees">Title Fees</label>
          <input id="titleFees" type="number" min={0} value={titleFees === '' ? '' : titleFees} onChange={e => setTitleFees(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground p-2" />
        </div>
        <div className="flex items-center">
          <input id="includeFeesInLoan" type="checkbox" checked={includeFeesInLoan} onChange={e => setIncludeFeesInLoan(e.target.checked)} className="mr-2 h-4 w-4 text-primary dark:text-dark-primary focus:ring-primary dark:focus:ring-dark-primary border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" />
          <label htmlFor="includeFeesInLoan" className="text-sm text-foreground dark:text-dark-foreground">Include taxes and fees in loan</label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground dark:text-dark-foreground" htmlFor="state">State</label>
          <input id="state" type="text" value={state} onChange={e => setState(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground p-2" />
        </div>
      </form>
      {/* Results summary goes here */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 text-foreground dark:text-dark-foreground">Loan Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="font-medium text-foreground dark:text-dark-foreground">Monthly Payment:</span>
              <span className="text-foreground dark:text-dark-foreground">${monthlyPayment.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-foreground dark:text-dark-foreground">Total Loan Amount:</span>
              <span className="text-foreground dark:text-dark-foreground">${loanAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-foreground dark:text-dark-foreground">Sale Tax:</span>
              <span className="text-foreground dark:text-dark-foreground">${saleTax.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-foreground dark:text-dark-foreground">Upfront Payment:</span>
              <span className="text-foreground dark:text-dark-foreground">${upfrontPayment.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-foreground dark:text-dark-foreground">Total of {loanTermMonths} Payments:</span>
              <span className="text-foreground dark:text-dark-foreground">${totalPayments.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-foreground dark:text-dark-foreground">Total Loan Interest:</span>
              <span className="text-foreground dark:text-dark-foreground">${totalInterest.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-foreground dark:text-dark-foreground">Total Cost (price, interest, tax, fees):</span>
              <span className="text-foreground dark:text-dark-foreground">${totalCost.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>
      </div>
      {/* Loan breakdown chart goes here */}
      <div className="mt-10 flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-2 text-foreground dark:text-dark-foreground">Loan Breakdown</h3>
        <LoanBreakdownPieChart principal={loanAmount} interest={totalInterest} />
      </div>
      {/* Amortization schedule goes here */}
      <div className="mt-12">
        <button className="bg-primary dark:bg-dark-primary hover:bg-secondary dark:hover:bg-dark-secondary text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200" onClick={() => setShowAmortizationSchedule(!showAmortizationSchedule)}>{showAmortizationSchedule ? 'Hide' : 'Show'} Amortization Schedule</button>
        {showAmortizationSchedule && (
          <AmortizationSchedule
            principal={loanAmount}
            interestRate={interestRate}
            months={loanTermMonths}
            monthlyPayment={monthlyPayment}
          />
        )}
      </div>
      <div className="mt-12">
        <AmortizationLineChart
          principal={loanAmount}
          interestRate={interestRate}
          months={loanTermMonths}
          monthlyPayment={monthlyPayment}
        />
      </div>
    </div>
  );
}

// Placeholder for SEO/Educational Section


// --- Amortization Schedule ---
interface AmortizationScheduleProps {
  principal: number;
  interestRate: number;
  months: number;
  monthlyPayment: number;
}

interface AmortizationRow {
  period: number;
  interestPaid: number;
  principalPaid: number;
  endingBalance: number;
}

function generateAmortizationSchedule(
  principal: number,
  interestRate: number,
  months: number,
  monthlyPayment: number
): AmortizationRow[] {
  const schedule: AmortizationRow[] = [];
  let endingBalance = principal;

  for (let i = 1; i <= months; i++) {
    const interestPaid = endingBalance * (interestRate / 100 / 12);
    const principalPaid = monthlyPayment - interestPaid;
    endingBalance = endingBalance - principalPaid;

    schedule.push({
      period: i,
      interestPaid,
      principalPaid,
      endingBalance,
    });

    if (endingBalance < 0) {
      endingBalance = 0;
    }
  }

  return schedule;
}

function AmortizationSchedule({ principal, interestRate, months, monthlyPayment }: AmortizationScheduleProps) {
  const schedule = generateAmortizationSchedule(principal, interestRate, months, monthlyPayment);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-foreground dark:text-dark-foreground">Amortization Schedule</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="px-4 py-2 text-left text-foreground dark:text-dark-foreground">Period</th>
              <th className="px-4 py-2 text-left text-foreground dark:text-dark-foreground">Payment</th>
              <th className="px-4 py-2 text-left text-foreground dark:text-dark-foreground">Principal</th>
              <th className="px-4 py-2 text-left text-foreground dark:text-dark-foreground">Interest</th>
              <th className="px-4 py-2 text-left text-foreground dark:text-dark-foreground">Balance</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((row, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-750' : 'bg-white dark:bg-gray-800'}>
                <td className="px-4 py-2 text-foreground dark:text-dark-foreground">{row.period}</td>
                <td className="px-4 py-2 text-foreground dark:text-dark-foreground">{row.interestPaid + row.principalPaid}</td>
                <td className="px-4 py-2 text-foreground dark:text-dark-foreground">{row.principalPaid}</td>
                <td className="px-4 py-2 text-foreground dark:text-dark-foreground">{row.interestPaid}</td>
                <td className="px-4 py-2 text-foreground dark:text-dark-foreground">{row.endingBalance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Loan Breakdown Pie Chart ---
interface LoanBreakdownPieChartProps {
  principal: number;
  interest: number;
}

function LoanBreakdownPieChart({ principal, interest }: LoanBreakdownPieChartProps) {
  const total = principal + interest;
  const principalPct = total === 0 ? 0 : principal;
  const interestPct = total === 0 ? 0 : interest;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-foreground dark:text-dark-foreground">Loan Breakdown</h3>
      <PieChart 
        labels={['Principal', 'Interest']}
        data={[principalPct, interestPct]}
        title="Loan Breakdown"
      />
    </div>
  );
}

// --- Amortization Line Chart ---
interface AmortizationLineChartProps {
  principal: number;
  interestRate: number;
  months: number;
  monthlyPayment: number;
}

function AmortizationLineChart({ principal, interestRate, months, monthlyPayment }: AmortizationLineChartProps) {
  const schedule = generateAmortizationSchedule(principal, interestRate, months, monthlyPayment);

  const labels = schedule.map(row => `Month ${row.period}`);
  const interestPaid = schedule.map(row => row.interestPaid);
  const principalPaid = schedule.map(row => row.principalPaid);
  const endingBalance = schedule.map(row => row.endingBalance);

  const isDark = document.documentElement.classList.contains('dark');
  
  const datasets = [
    {
      label: 'Interest Paid',
      data: interestPaid,
      backgroundColor: isDark ? 'rgba(255, 122, 122, 0.2)' : 'rgba(239, 68, 68, 0.2)',
      borderColor: isDark ? '#FF7A7A' : '#EF4444',
      fill: false
    },
    {
      label: 'Principal Paid',
      data: principalPaid,
      backgroundColor: isDark ? 'rgba(31, 227, 184, 0.2)' : 'rgba(16, 185, 129, 0.2)',
      borderColor: isDark ? '#1FE3B8' : '#10B981',
      fill: false
    },
    {
      label: 'Ending Balance',
      data: endingBalance,
      backgroundColor: isDark ? 'rgba(139, 112, 255, 0.2)' : 'rgba(116, 88, 255, 0.2)',
      borderColor: isDark ? '#8B70FF' : '#7458FF',
      fill: false
    }
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-foreground dark:text-dark-foreground">Loan Progress Over Time</h3>
      <LineChart 
        labels={labels}
        datasets={datasets}
        title="Amortization Schedule"
      />
    </div>
  );
}
