import { useState } from 'react';
import { PieChart } from '../../../components/ui/pie-chart';
import { LineChart } from '../../../components/ui/line-chart';

export function AutoLoanCalculator() {
  const [autoPrice, setAutoPrice] = useState(30000);
  const [loanTermMonths, setLoanTermMonths] = useState(60);
  const [interestRate, setInterestRate] = useState(5.0);
  const [cashIncentives, setCashIncentives] = useState(0);
  const [downPayment, setDownPayment] = useState(5000);
  const [tradeInValue, setTradeInValue] = useState(0);
  const [amountOwedOnTradeIn, setAmountOwedOnTradeIn] = useState(0);
  const [salesTax, setSalesTax] = useState(7.0);
  const [titleFees, setTitleFees] = useState(2000);
  const [includeFeesInLoan, setIncludeFeesInLoan] = useState(false);
  const [state, setState] = useState('');
  const [showAmortizationSchedule, setShowAmortizationSchedule] = useState(false);

  // Calculation logic
  // Sale Tax
  const saleTax = Math.max(0, (autoPrice - cashIncentives - tradeInValue) * (salesTax / 100));

  // Loan Amount
  const baseLoan = autoPrice - cashIncentives - downPayment - tradeInValue + amountOwedOnTradeIn;
  const loanAmount = includeFeesInLoan ? baseLoan + saleTax + titleFees : baseLoan;

  // Upfront Payment
  const upfrontPayment = includeFeesInLoan
    ? downPayment + tradeInValue + cashIncentives
    : downPayment + tradeInValue + cashIncentives + saleTax + titleFees;

  // Monthly Payment (Standard Amortization Formula)
  const principal = loanAmount;
  const monthlyRate = interestRate / 100 / 12;
  const n = loanTermMonths;
  const monthlyPayment = monthlyRate === 0
    ? principal / n
    : (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);

  // Total of All Payments
  const totalPayments = monthlyPayment * loanTermMonths;

  // Total Interest
  const totalInterest = totalPayments - loanAmount;

  // Total Cost
  const totalCost = totalPayments + upfrontPayment;

  return (
    <div className="w-full max-w-full md:max-w-3xl lg:max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Auto Loan Calculator</h2>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="autoPrice">Auto Price</label>
          <input id="autoPrice" type="number" min={0} value={autoPrice} onChange={e => setAutoPrice(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="loanTermMonths">Loan Term</label>
          <input id="loanTermMonths" type="number" min={1} value={loanTermMonths} onChange={e => setLoanTermMonths(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 p-2" />
          <span className="text-xs text-gray-500">months</span>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="interestRate">Interest Rate</label>
          <input id="interestRate" type="number" min={0} step={0.01} value={interestRate} onChange={e => setInterestRate(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 p-2" />
          <span className="text-xs text-gray-500">%</span>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="cashIncentives">Cash Incentives</label>
          <input id="cashIncentives" type="number" min={0} value={cashIncentives} onChange={e => setCashIncentives(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="downPayment">Down Payment</label>
          <input id="downPayment" type="number" min={0} value={downPayment} onChange={e => setDownPayment(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="tradeInValue">Trade-In Value</label>
          <input id="tradeInValue" type="number" min={0} value={tradeInValue} onChange={e => setTradeInValue(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="amountOwedOnTradeIn">Amount Owed on Trade-In</label>
          <input id="amountOwedOnTradeIn" type="number" min={0} value={amountOwedOnTradeIn} onChange={e => setAmountOwedOnTradeIn(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="salesTax">Sales Tax</label>
          <input id="salesTax" type="number" min={0} step={0.01} value={salesTax} onChange={e => setSalesTax(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 p-2" />
          <span className="text-xs text-gray-500">%</span>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="titleFees">Title Fees</label>
          <input id="titleFees" type="number" min={0} value={titleFees} onChange={e => setTitleFees(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 p-2" />
        </div>
        <div className="flex items-center">
          <input id="includeFeesInLoan" type="checkbox" checked={includeFeesInLoan} onChange={e => setIncludeFeesInLoan(e.target.checked)} className="mr-2" />
          <label htmlFor="includeFeesInLoan" className="text-sm">Include taxes and fees in loan</label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="state">State</label>
          <input id="state" type="text" value={state} onChange={e => setState(e.target.value)} className="w-full rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 p-2" />
        </div>
      </form>
      {/* Results summary goes here */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Loan Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">Monthly Payment:</span>
              <span>${monthlyPayment.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Total Loan Amount:</span>
              <span>${loanAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Sale Tax:</span>
              <span>${saleTax.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Upfront Payment:</span>
              <span>${upfrontPayment.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span>Total of {loanTermMonths} Payments:</span>
              <span>${totalPayments.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Total Loan Interest:</span>
              <span>${totalInterest.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Total Cost (price, interest, tax, fees):</span>
              <span>${totalCost.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>
      </div>
      {/* Loan breakdown chart goes here */}
      <div className="mt-10 flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-2">Loan Breakdown</h3>
        <LoanBreakdownPieChart principal={loanAmount} interest={totalInterest} />
      </div>
      {/* Amortization schedule goes here */}
      <div className="mt-12">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg" onClick={() => setShowAmortizationSchedule(!showAmortizationSchedule)}>{showAmortizationSchedule ? 'Hide' : 'Show'} Amortization Schedule</button>
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
      <h3 className="text-lg font-semibold mb-2">Amortization Schedule</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Period</th>
              <th className="px-4 py-2 text-left">Payment</th>
              <th className="px-4 py-2 text-left">Principal</th>
              <th className="px-4 py-2 text-left">Interest</th>
              <th className="px-4 py-2 text-left">Balance</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((row, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-blue-50' : 'bg-yellow-50'}>
                <td className="px-4 py-2">{row.period}</td>
                <td className="px-4 py-2">{row.interestPaid + row.principalPaid}</td>
                <td className="px-4 py-2">{row.principalPaid}</td>
                <td className="px-4 py-2">{row.interestPaid}</td>
                <td className="px-4 py-2">{row.endingBalance}</td>
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
      <h3 className="text-lg font-semibold mb-2">Loan Breakdown</h3>
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

  const datasets = [
    {
      label: 'Interest Paid',
      data: interestPaid,
      backgroundColor: 'rgba(247, 210, 196, 0.2)',
      borderColor: '#f7d2c4',
      fill: false
    },
    {
      label: 'Principal Paid',
      data: principalPaid,
      backgroundColor: 'rgba(52, 199, 89, 0.2)',
      borderColor: '#34c759',
      fill: false
    },
    {
      label: 'Ending Balance',
      data: endingBalance,
      backgroundColor: 'rgba(79, 70, 229, 0.2)',
      borderColor: '#4f46e5',
      fill: false
    }
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Loan Progress Over Time</h3>
      <LineChart 
        labels={labels}
        datasets={datasets}
        title="Amortization Schedule"
      />
    </div>
  );
}
