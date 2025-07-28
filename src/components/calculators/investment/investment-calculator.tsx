import React, { useState } from "react";
import { LineChart } from '@/components/ui/line-chart';

// --- Types ---
interface InvestmentCalculatorTab {
  key: string;
  label: string;
  icon?: string;
}

const TABS: InvestmentCalculatorTab[] = [
  { key: "end-amount", label: "End Amount", icon: "📈" },
  { key: "additional-contribution", label: "Contribution", icon: "💰" },
  { key: "return-rate", label: "Return Rate", icon: "📊" },
  { key: "starting-amount", label: "Starting Amount", icon: "🏦" },
  { key: "investment-length", label: "Time Period", icon: "⏱️" },
];

export function InvestmentCalculator() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0].key);

  return (
    <section className="w-full max-w-4xl mx-auto bg-card dark:bg-dark-card rounded-2xl shadow-lg p-5 md:p-8 mt-8 transition-all duration-300 border border-subtle-border dark:border-dark-subtle-border">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-3 text-foreground dark:text-dark-foreground">Investment Calculator</h1>
        <p className="text-muted-foreground dark:text-dark-muted-foreground max-w-2xl">
          Plan your financial future by calculating investment growth, required contributions, rates of return, and more.
        </p>
      </header>
      
      <nav className="flex overflow-x-auto pb-2 mb-8 scrollbar-thin scrollbar-thumb-muted-foreground dark:scrollbar-thumb-dark-muted-foreground" aria-label="Calculator modes">
        <div className="flex gap-2 md:gap-3 w-full">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-3 rounded-xl font-medium text-sm md:text-base flex items-center gap-2 transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-primary dark:bg-dark-primary text-white shadow-md transform scale-105"
                  : "bg-subtle-background dark:bg-dark-subtle-background text-foreground dark:text-dark-foreground hover:bg-subtle-background/80 dark:hover:bg-dark-subtle-background/80"
              } flex-shrink-0`}
              onClick={() => setActiveTab(tab.key)}
              aria-current={activeTab === tab.key ? "page" : undefined}
              type="button"
            >
              <span className="hidden md:inline">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
      
      <div className="py-4 transition-all duration-300">
        <InvestmentTabContent tab={activeTab} />
      </div>
    </section>
  );
}

function InvestmentTabContent({ tab }: { tab: string }) {
  return (
    <div className="animate-fadeIn">
      {tab === "end-amount" && <EndAmountTab />}
      {tab === "additional-contribution" && <AdditionalContributionTab />}
      {tab === "return-rate" && <ReturnRateTab />}
      {tab === "starting-amount" && <StartingAmountTab />}
      {tab === "investment-length" && <InvestmentLengthTab />}
      {!TABS.some(t => t.key === tab) && (
        <div className="text-center text-muted-foreground dark:text-dark-muted-foreground py-12 rounded-xl bg-subtle-background dark:bg-dark-subtle-background">
          <span className="italic">{tab.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} mode coming soon...</span>
        </div>
      )}
    </div>
  );
}

// --- Return Rate Tab ---
function ReturnRateTab() {
  const [inputs, setInputs] = React.useState({
    startingAmount: 10000,
    targetAmount: 50000,
    years: 10,
    contribution: 200,
    contributionFrequency: 'month',
    compound: 'monthly',
  });
  const handleChange = (key: string, value: number | string) => setInputs((prev) => ({ ...prev, [key]: value }));
  // Newton-Raphson method for IRR
  function solveRate(P: number, F: number, n: number, PMT: number, freq: string, comp: string) {
    const periods = freq === 'year' ? n : n * 12;
    const guess = 0.07;
    let r = guess;
    let iter = 0;
    while (iter++ < 100) {
      const f = (r: number) => {
        const c = comp === 'monthly' ? 12 : 1;
        const rp = r / c;
        const np = periods * c / (freq === 'year' ? 1 : 12);
        return P * Math.pow(1 + rp, np) + PMT * ((Math.pow(1 + rp, np) - 1) / rp) - F;
      };
      const df = (r: number) => {
        const c = comp === 'monthly' ? 12 : 1;
        const rp = r / c;
        const np = periods * c / (freq === 'year' ? 1 : 12);
        return P * np * Math.pow(1 + rp, np - 1) + PMT * (np * Math.pow(1 + rp, np - 1) / rp - ((Math.pow(1 + rp, np) - 1) / (rp * rp)));
      };
      const fval = f(r);
      const dfval = df(r);
      if (Math.abs(dfval) < 1e-8) break;
      const next = r - fval / dfval;
      if (Math.abs(next - r) < 1e-8) break;
      r = next;
    }
    return r * (comp === 'monthly' ? 12 : 1) * 100;
  }
  const requiredRate = React.useMemo(() => solveRate(
    Number(inputs.startingAmount),
    Number(inputs.targetAmount),
    Number(inputs.years),
    Number(inputs.contribution),
    inputs.contributionFrequency,
    inputs.compound
  ), [inputs]);
  function buildSchedule(rate: number) {
    const c = inputs.compound === 'monthly' ? 12 : 1;
    const n = inputs.years * c;
    const r = rate / 100 / c;
    let balance = Number(inputs.startingAmount);
    const schedule = [];
    for (let i = 1; i <= n; i++) {
      balance += Number(inputs.contribution);
      balance *= 1 + r;
      if (i % c === 0) schedule.push({ year: i / c, balance });
    }
    return schedule;
  }
  const schedule = React.useMemo(() => buildSchedule(requiredRate), [inputs, requiredRate]);
  return (
    <div className="bg-card dark:bg-dark-card rounded-lg shadow-md p-6 border border-subtle-border dark:border-dark-subtle-border">
      <h2 className="text-xl font-semibold mb-2 text-foreground dark:text-dark-foreground">Required Return Rate</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <InputField label="Starting Amount" type="number" value={inputs.startingAmount} min={0} onChange={v => handleChange('startingAmount', Number(v))} prefix="$" />
          <InputField label="Target Amount" type="number" value={inputs.targetAmount} min={0} onChange={v => handleChange('targetAmount', Number(v))} prefix="$" />
          <InputField label="Years" type="number" value={inputs.years} min={1} max={100} onChange={v => handleChange('years', Number(v))} />
          <InputField label="Contribution" type="number" value={inputs.contribution} min={0} onChange={v => handleChange('contribution', Number(v))} prefix="$" />
          <SelectField label="Contribution Frequency" value={inputs.contributionFrequency} options={[{ value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }]} onChange={v => handleChange('contributionFrequency', v)} />
          <SelectField label="Compounding" value={inputs.compound} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annually', label: 'Annually' }]} onChange={v => handleChange('compound', v)} />
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="bg-primary/10 dark:bg-dark-primary/10 rounded-lg p-4 w-full text-center mb-4">
            <div className="text-lg font-semibold mb-1 text-foreground dark:text-dark-foreground">Required Return Rate</div>
            <div className="text-2xl font-bold text-primary dark:text-dark-primary">{requiredRate.toFixed(2)}%</div>
            <div className="text-sm text-muted-foreground dark:text-dark-muted-foreground mt-1">per year to reach your goal</div>
          </div>
          <div className="w-full mt-2">
            <LineChart
              labels={schedule.map((s) => s.year.toString())}
              datasets={[{
                label: 'Projected Balance',
                data: schedule.map((s) => s.balance),
                borderColor: document.documentElement.classList.contains('dark') ? '#8B70FF' : '#7458FF',
                backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(139,112,255,0.1)' : 'rgba(116,88,255,0.1)',
                fill: true,
              }]}
              title="Balance Growth Over Time"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Starting Amount Tab ---
function StartingAmountTab() {
  const [inputs, setInputs] = React.useState({
    targetAmount: 50000,
    years: 10,
    rate: 7,
    contribution: 200,
    contributionFrequency: 'month',
    compound: 'monthly',
  });
  const handleChange = (key: string, value: number | string) => setInputs((prev) => ({ ...prev, [key]: value }));
  function solveStart(F: number, n: number, r: number, PMT: number, freq: string, comp: string) {
    const c = comp === 'monthly' ? 12 : 1;
    const totalPeriods = n * c;
    const rp = r / 100 / c;
    const PMTper = freq === 'year' ? PMT / c : PMT;
    const denom = Math.pow(1 + rp, totalPeriods);
    const requiredStart = (F - PMTper * (denom - 1) / rp) / denom;
    return requiredStart;
  }
  const requiredStart = React.useMemo(() => solveStart(
    Number(inputs.targetAmount),
    Number(inputs.years),
    Number(inputs.rate),
    Number(inputs.contribution),
    inputs.contributionFrequency,
    inputs.compound
  ), [inputs]);
  function buildSchedule(start: number) {
    const c = inputs.compound === 'monthly' ? 12 : 1;
    const n = inputs.years * c;
    const r = Number(inputs.rate) / 100 / c;
    let balance = start;
    const schedule = [];
    for (let i = 1; i <= n; i++) {
      balance += Number(inputs.contribution);
      balance *= 1 + r;
      if (i % c === 0) schedule.push({ year: i / c, balance });
    }
    return schedule;
  }
  const schedule = React.useMemo(() => buildSchedule(requiredStart), [inputs, requiredStart]);
  return (
    <div className="bg-card dark:bg-dark-card rounded-lg shadow-md p-6 border border-subtle-border dark:border-dark-subtle-border">
      <h2 className="text-xl font-semibold mb-2 text-foreground dark:text-dark-foreground">Required Starting Amount</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <InputField label="Target Amount" type="number" value={inputs.targetAmount} min={0} onChange={v => handleChange('targetAmount', Number(v))} prefix="$" />
          <InputField label="Years" type="number" value={inputs.years} min={1} max={100} onChange={v => handleChange('years', Number(v))} />
          <InputField label="Return Rate (%)" type="number" value={inputs.rate} min={0} max={100} step={0.01} onChange={v => handleChange('rate', Number(v))} suffix="%" />
          <InputField label="Contribution" type="number" value={inputs.contribution} min={0} onChange={v => handleChange('contribution', Number(v))} prefix="$" />
          <SelectField label="Contribution Frequency" value={inputs.contributionFrequency} options={[{ value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }]} onChange={v => handleChange('contributionFrequency', v)} />
          <SelectField label="Compounding" value={inputs.compound} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annually', label: 'Annually' }]} onChange={v => handleChange('compound', v)} />
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="bg-primary/10 dark:bg-dark-primary/10 rounded-lg p-4 w-full text-center mb-4">
            <div className="text-lg font-semibold mb-1 text-foreground dark:text-dark-foreground">Required Starting Amount</div>
            <div className="text-2xl font-bold text-primary dark:text-dark-primary">${requiredStart.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div className="text-sm text-muted-foreground dark:text-dark-muted-foreground mt-1">needed to reach your goal</div>
          </div>
          <div className="w-full mt-2">
            <LineChart
              labels={schedule.map((s) => s.year.toString())}
              datasets={[{
                label: 'Projected Balance',
                data: schedule.map((s) => s.balance),
                borderColor: document.documentElement.classList.contains('dark') ? '#8B70FF' : '#7458FF',
                backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(139,112,255,0.1)' : 'rgba(116,88,255,0.1)',
                fill: true,
              }]}
              title="Balance Growth Over Time"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Investment Length Tab ---
function InvestmentLengthTab() {
  const [inputs, setInputs] = React.useState({
    startingAmount: 10000,
    targetAmount: 50000,
    rate: 7,
    contribution: 200,
    contributionFrequency: 'month',
    compound: 'monthly',
  });
  const handleChange = (key: string, value: number | string) => setInputs((prev) => ({ ...prev, [key]: value }));
  function solveYears(P: number, F: number, r: number, PMT: number, freq: string, comp: string) {
    const c = comp === 'monthly' ? 12 : 1;
    const rp = r / 100 / c;
    const PMTper = freq === 'year' ? PMT / c : PMT;
    // FV = P*(1+rp)^N + PMTper*((1+rp)^N - 1)/rp
    // Solve for N
    const a = Math.log((F * rp + PMTper) / (P * rp + PMTper));
    const b = Math.log(1 + rp);
    const N = a / b;
    return N / c;
  }
  const requiredYears = React.useMemo(() => solveYears(
    Number(inputs.startingAmount),
    Number(inputs.targetAmount),
    Number(inputs.rate),
    Number(inputs.contribution),
    inputs.contributionFrequency,
    inputs.compound
  ), [inputs]);
  function buildSchedule(years: number) {
    const c = inputs.compound === 'monthly' ? 12 : 1;
    const n = Math.ceil(years * c);
    const r = Number(inputs.rate) / 100 / c;
    let balance = Number(inputs.startingAmount);
    const schedule = [];
    for (let i = 1; i <= n; i++) {
      balance += Number(inputs.contribution);
      balance *= 1 + r;
      if (i % c === 0) schedule.push({ year: i / c, balance });
    }
    return schedule;
  }
  const schedule = React.useMemo(() => buildSchedule(requiredYears), [inputs, requiredYears]);
  return (
    <div className="bg-card dark:bg-dark-card rounded-lg shadow-md p-6 border border-subtle-border dark:border-dark-subtle-border">
      <h2 className="text-xl font-semibold mb-2 text-foreground dark:text-dark-foreground">Required Investment Length</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <InputField label="Starting Amount" type="number" value={inputs.startingAmount} min={0} onChange={v => handleChange('startingAmount', Number(v))} prefix="$" />
          <InputField label="Target Amount" type="number" value={inputs.targetAmount} min={0} onChange={v => handleChange('targetAmount', Number(v))} prefix="$" />
          <InputField label="Return Rate (%)" type="number" value={inputs.rate} min={0} max={100} step={0.01} onChange={v => handleChange('rate', Number(v))} suffix="%" />
          <InputField label="Contribution" type="number" value={inputs.contribution} min={0} onChange={v => handleChange('contribution', Number(v))} prefix="$" />
          <SelectField label="Contribution Frequency" value={inputs.contributionFrequency} options={[{ value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }]} onChange={v => handleChange('contributionFrequency', v)} />
          <SelectField label="Compounding" value={inputs.compound} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annually', label: 'Annually' }]} onChange={v => handleChange('compound', v)} />
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="bg-primary/10 dark:bg-dark-primary/10 rounded-lg p-4 w-full text-center mb-4">
            <div className="text-lg font-semibold mb-1 text-foreground dark:text-dark-foreground">Required Investment Length</div>
            <div className="text-2xl font-bold text-primary dark:text-dark-primary">{requiredYears.toFixed(2)} years</div>
            <div className="text-sm text-muted-foreground dark:text-dark-muted-foreground mt-1">needed to reach your goal</div>
          </div>
          <div className="w-full mt-2">
            <LineChart
              labels={schedule.map((s) => s.year.toString())}
              datasets={[{
                label: 'Projected Balance',
                data: schedule.map((s) => s.balance),
                borderColor: document.documentElement.classList.contains('dark') ? '#8B70FF' : '#7458FF',
                backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(139,112,255,0.1)' : 'rgba(116,88,255,0.1)',
                fill: true,
              }]}
              title="Balance Growth Over Time"
            />
          </div>
        </div>
      </div>
    </div>
  );
}


// --- SEO/Educational Section ---
export function InvestmentCalculatorSEOContent() {
  return (
    <section className="max-w-4xl mx-auto mt-12 px-4 md:px-0 text-foreground dark:text-dark-foreground" aria-labelledby="investment-education-title">
      <h2 id="investment-education-title" className="text-2xl font-bold mb-4 text-foreground dark:text-dark-foreground">Investment Calculator Guide &amp; FAQs</h2>
      <article className="prose prose-blue max-w-none">
        <h3>How Do Investment Calculators Work?</h3>
        <p>Investment calculators use compound interest formulas to project how your money can grow over time. You can solve for the ending amount, required contribution, return rate, starting amount, or investment length—each mode helps answer a different financial question.</p>

        <h3>Modes Explained</h3>
        <ul>
          <li><strong>End Amount:</strong> See how much your investments will grow based on your inputs.</li>
          <li><strong>Additional Contribution:</strong> Find out how much you need to contribute to reach a target.</li>
          <li><strong>Return Rate:</strong> Calculate the annual return rate required to hit your goal.</li>
          <li><strong>Starting Amount:</strong> Determine the lump sum needed to reach your target.</li>
          <li><strong>Investment Length:</strong> See how long it will take to reach your goal.</li>
        </ul>

        <h3>Common Questions</h3>
        <dl>
          <dt><strong>What is compound interest?</strong></dt>
          <dd>Compound interest is interest calculated on both the initial principal and the accumulated interest from previous periods.</dd>
          <dt><strong>How often should I contribute?</strong></dt>
          <dd>Monthly contributions are common, but the calculator supports both monthly and yearly options for flexibility.</dd>
          <dt><strong>What is a realistic return rate?</strong></dt>
          <dd>Historical stock market returns average 6-8% after inflation, but actual returns can vary. Adjust the rate to match your risk tolerance and investment type.</dd>
          <dt><strong>How accurate are the results?</strong></dt>
          <dd>Calculations are based on mathematical formulas and your inputs. Actual investment performance may differ due to market fluctuations, fees, and taxes.</dd>
        </dl>

        <h3>Related Calculators</h3>
        <ul>
          <li><a href="/compound-interest-calculator">Compound Interest Calculator</a></li>
          <li><a href="/auto-loan-calculator">Auto Loan Calculator</a></li>
          <li><a href="/mortgage-calculator">Mortgage Calculator</a></li>
          <li><a href="/retirement-calculator">Retirement Calculator</a></li>
        </ul>
      </article>
    </section>
  );
}


// --- Additional Contribution Mode ---
interface AdditionalContributionInputs {
  targetAmount: number;
  startingAmount: number;
  years: number;
  returnRate: number;
  compound: "annually" | "quarterly" | "monthly" | "daily";
  contributionTiming: "beginning" | "end";
  contributionFrequency: "month" | "year";
}

function AdditionalContributionTab() {
  const [inputs, setInputs] = useState<AdditionalContributionInputs>({
    targetAmount: 1000000,
    startingAmount: 20000,
    years: 10,
    returnRate: 6,
    compound: "annually",
    contributionTiming: "end",
    contributionFrequency: "month",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange<T extends keyof AdditionalContributionInputs>(key: T, value: AdditionalContributionInputs[T]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setSubmitted(false);
  }

  // Calculation logic
  const result = submitted ? calculateAdditionalContribution(inputs) : null;

  return (
    <form
      className="space-y-6"
      onSubmit={e => {
        e.preventDefault();
        setSubmitted(true);
      }}
      aria-labelledby="additional-contribution-form-title"
    >
      <h2 id="additional-contribution-form-title" className="text-xl font-semibold mb-2 text-foreground dark:text-dark-foreground">Required Contribution Calculator</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          label="Your Target"
          type="number"
          value={inputs.targetAmount}
          min={0}
          step={1000}
          onChange={v => handleChange("targetAmount", Number(v))}
          prefix="$"
        />
        <InputField
          label="Starting Amount"
          type="number"
          value={inputs.startingAmount}
          min={0}
          step={100}
          onChange={v => handleChange("startingAmount", Number(v))}
          prefix="$"
        />
        <InputField
          label="Years"
          type="number"
          value={inputs.years}
          min={1}
          max={100}
          step={1}
          onChange={v => handleChange("years", Number(v))}
        />
        <InputField
          label="Return Rate"
          type="number"
          value={inputs.returnRate}
          min={0}
          max={100}
          step={0.01}
          onChange={v => handleChange("returnRate", Number(v))}
          suffix="%"
        />
        <SelectField
          label="Compound"
          value={inputs.compound}
          options={[
            { value: "annually", label: "Annually" },
            { value: "quarterly", label: "Quarterly" },
            { value: "monthly", label: "Monthly" },
            { value: "daily", label: "Daily" },
          ]}
          onChange={v => handleChange("compound", v as AdditionalContributionInputs["compound"])}
        />
        <SelectField
          label="Contribution Frequency"
          value={inputs.contributionFrequency}
          options={[
            { value: "month", label: "Monthly" },
            { value: "year", label: "Yearly" },
          ]}
          onChange={v => handleChange("contributionFrequency", v as AdditionalContributionInputs["contributionFrequency"])}
        />
        <RadioGroup
          label="Contribute at the"
          options={[
            { value: "beginning", label: "Beginning" },
            { value: "end", label: "End" },
          ]}
          value={inputs.contributionTiming}
          onChange={v => handleChange("contributionTiming", v as AdditionalContributionInputs["contributionTiming"])}
        />
      </div>
      <button
        type="submit"
        className="mt-2 px-6 py-2 bg-primary dark:bg-dark-primary text-white rounded font-semibold shadow hover:bg-secondary dark:hover:bg-dark-secondary transition-colors"
      >
        Calculate
      </button>
      {submitted && result && (
        <div className="mt-8 space-y-8">
          <AdditionalContributionResults {...result} />
          <EndAmountDonutChart {...result} />
          <EndAmountBarChart schedule={result.schedule} />
          <EndAmountScheduleTable schedule={result.schedule} />
        </div>
      )}
    </form>
  );
}

// --- Calculation Logic ---
interface AdditionalContributionResult {
  requiredContribution: number;
  endBalance: number;
  startingAmount: number;
  totalContributions: number;
  totalInterest: number;
  schedule: Array<{ year: number; deposit: number; interest: number; endingBalance: number }>;
}
function calculateAdditionalContribution(inputs: AdditionalContributionInputs): AdditionalContributionResult {
  const compoundMap = { annually: 1, quarterly: 4, monthly: 12, daily: 365 };
  const n = compoundMap[inputs.compound];
  const periods = inputs.years * n;
  const rate = inputs.returnRate / 100 / n;
  const contribPeriods = inputs.contributionFrequency === "month" ? 12 : 1;
  // Solve for payment (contribution per period)
  // FV = P*(1+r)^n + PMT*[(1+r)^n - 1]/r * (1+r) if begin
  let pmt = 0;
  if (rate === 0) {
    pmt = (inputs.targetAmount - inputs.startingAmount) / periods;
  } else {
    const factor = Math.pow(1 + rate, periods);
    if (inputs.contributionTiming === "beginning") {
      pmt = (inputs.targetAmount - inputs.startingAmount * factor) / ((factor - 1) / rate * (1 + rate));
    } else {
      pmt = (inputs.targetAmount - inputs.startingAmount * factor) / ((factor - 1) / rate);
    }
  }
  // Adjust for frequency (user expects monthly/yearly)
  const userPmt = pmt * (n / contribPeriods);
  // Now simulate to get schedule, contributions, interest
  let balance = inputs.startingAmount;
  let totalContrib = 0;
  let totalInterest = 0;
  const schedule = [];
  for (let i = 1; i <= periods; i++) {
    if (inputs.contributionTiming === "beginning") balance += pmt;
    const interest = balance * rate;
    balance += interest;
    if (inputs.contributionTiming === "end") balance += pmt;
    totalContrib += pmt;
    totalInterest += interest;
    if (i % n === 0 || i === periods) {
      schedule.push({
        year: Math.ceil(i / n),
        deposit: totalContrib * (n / contribPeriods), // user-expected total
        interest: totalInterest,
        endingBalance: balance,
      });
    }
  }
  return {
    requiredContribution: userPmt,
    endBalance: balance,
    startingAmount: inputs.startingAmount,
    totalContributions: totalContrib * (n / contribPeriods),
    totalInterest,
    schedule,
  };
}

// --- Results Summary ---
function AdditionalContributionResults({ requiredContribution, endBalance, startingAmount, totalContributions, totalInterest }: AdditionalContributionResult) {
  return (
    <div className="bg-success/10 dark:bg-dark-success/10 rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div>
        <h3 className="font-semibold text-lg mb-2 text-foreground dark:text-dark-foreground">Results</h3>
        <div className="flex flex-col gap-1">
          <div><span className="font-medium text-foreground dark:text-dark-foreground">Required Contribution:</span> <span className="text-success dark:text-dark-success font-bold">${requiredContribution.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
          <div><span className="font-medium text-foreground dark:text-dark-foreground">End Balance:</span> <span className="text-foreground dark:text-dark-foreground">${endBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
          <div><span className="font-medium text-foreground dark:text-dark-foreground">Starting Amount:</span> <span className="text-foreground dark:text-dark-foreground">${startingAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
          <div><span className="font-medium text-foreground dark:text-dark-foreground">Total Contributions:</span> <span className="text-foreground dark:text-dark-foreground">${totalContributions.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
          <div><span className="font-medium text-foreground dark:text-dark-foreground">Total Interest:</span> <span className="text-foreground dark:text-dark-foreground">${totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
        </div>
      </div>
    </div>
  );
}


// --- End Amount Mode ---
interface EndAmountInputs {
  startingAmount: number | '';
  years: number | '';
  returnRate: number | '';
  compound: "annually" | "quarterly" | "monthly" | "daily";
  additionalContribution: number | '';
  contributionTiming: "beginning" | "end";
  contributionFrequency: "month" | "year";
}

function EndAmountTab() {
  const [inputs, setInputs] = useState<EndAmountInputs>({
    startingAmount: 20000,
    years: 10,
    returnRate: 6,
    compound: "annually",
    additionalContribution: 1000,
    contributionTiming: "end",
    contributionFrequency: "month",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange<T extends keyof EndAmountInputs>(key: T, value: EndAmountInputs[T]) {
    setInputs((prev) => ({ ...prev, [key]: value === '' ? '' : value }));
    setSubmitted(false);
  }

  // Auto-calculate on input change approach for better UX
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSubmitted(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputs]);

  // Calculation logic
  const result = submitted ? calculateEndAmount(inputs) : null;

  return (
    <div className="animate-fadeIn">
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-dark-primary/5 dark:to-dark-primary/10 rounded-xl p-6 mb-8 shadow-sm border border-subtle-border dark:border-dark-subtle-border">
        <h2 id="end-amount-form-title" className="text-xl font-semibold mb-4 text-foreground dark:text-dark-foreground">Investment Growth Calculator</h2>
        <p className="text-muted-foreground dark:text-dark-muted-foreground mb-6">See how your investments will grow over time with compound interest and regular contributions.</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Basic inputs */}
          <div className="space-y-5 lg:col-span-1">
            <div className="bg-card dark:bg-dark-card rounded-lg p-5 shadow-sm border border-subtle-border dark:border-dark-subtle-border">
              <h3 className="text-md font-medium mb-4 text-foreground dark:text-dark-foreground">Initial Investment</h3>
              <div className="space-y-4">
                <InputField
                  label="Starting Amount"
                  type="number"
                  value={inputs.startingAmount === '' ? '' : inputs.startingAmount}
                  min={0}
                  step={1000}
                  onChange={v => handleChange("startingAmount", v === '' ? '' : Number(v))}
                  prefix="$"
                  description="Your initial investment amount"
                />
                <InputField
                  label="Investment Period"
                  type="number"
                  value={inputs.years === '' ? '' : inputs.years}
                  min={1}
                  max={100}
                  step={1}
                  onChange={v => handleChange("years", v === '' ? '' : Number(v))}
                  suffix="years"
                  description="How long you plan to invest"
                />
              </div>
            </div>
          </div>
          
          {/* Middle column - Return details */}
          <div className="space-y-5 lg:col-span-1">
            <div className="bg-card dark:bg-dark-card rounded-lg p-5 shadow-sm border border-subtle-border dark:border-dark-subtle-border">
              <h3 className="text-md font-medium mb-4 text-foreground dark:text-dark-foreground">Return Details</h3>
              <div className="space-y-4">
                <InputField
                  label="Annual Return Rate"
                  type="number"
                  value={inputs.returnRate === '' ? '' : inputs.returnRate}
                  min={0}
                  max={100}
                  step={0.1}
                  onChange={v => handleChange("returnRate", v === '' ? '' : Number(v))}
                  suffix="%"
                  description="Expected annual return percentage"
                />
                <SelectField
                  label="Compounding Frequency"
                  value={inputs.compound}
                  options={[
                    { value: "annually", label: "Annually" },
                    { value: "quarterly", label: "Quarterly" },
                    { value: "monthly", label: "Monthly" },
                    { value: "daily", label: "Daily" },
                  ]}
                  onChange={v => handleChange("compound", v as EndAmountInputs["compound"])}
                  description="How often interest is calculated"
                />
              </div>
            </div>
          </div>
          
          {/* Right column - Contribution details */}
          <div className="space-y-5 lg:col-span-1">
            <div className="bg-card dark:bg-dark-card rounded-lg p-5 shadow-sm border border-subtle-border dark:border-dark-subtle-border">
              <h3 className="text-md font-medium mb-4 text-foreground dark:text-dark-foreground">Regular Contributions</h3>
              <div className="space-y-4">
                <InputField
                  label="Contribution Amount"
                  type="number"
                  value={inputs.additionalContribution === '' ? '' : inputs.additionalContribution}
                  min={0}
                  step={100}
                  onChange={v => handleChange("additionalContribution", v === '' ? '' : Number(v))}
                  prefix="$"
                  description="Amount added regularly"
                />
                <div className="grid grid-cols-2 gap-4">
                  <SelectField
                    label="Frequency"
                    value={inputs.contributionFrequency}
                    options={[
                      { value: "month", label: "Monthly" },
                      { value: "year", label: "Yearly" },
                    ]}
                    onChange={v => handleChange("contributionFrequency", v as EndAmountInputs["contributionFrequency"])}
                  />
                  <RadioGroup
                    label="Timing"
                    options={[
                      { value: "beginning", label: "Beginning" },
                      { value: "end", label: "End" },
                    ]}
                    value={inputs.contributionTiming}
                    onChange={v => handleChange("contributionTiming", v as EndAmountInputs["contributionTiming"])}
                    description="When contributions are made"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {result ? (
        <div className="space-y-8 animate-fadeIn">
          <EndAmountResults {...result} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-750 rounded-xl p-6 shadow-sm">
              <EndAmountDonutChart {...result} />
            </div>
            <div className="bg-white dark:bg-gray-750 rounded-xl p-6 shadow-sm">
              <EndAmountBarChart schedule={result.schedule} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-750 rounded-xl p-6 shadow-sm">
            <EndAmountScheduleTable schedule={result.schedule} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

// --- Input Components ---
interface InputFieldProps {
  label: string;
  type: string;
  value: number | string;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  onChange: (v: string) => void;
  description?: string;
}
function InputField({ label, type, value, min, max, step, prefix, suffix, onChange, description }: InputFieldProps) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium text-foreground dark:text-dark-foreground">
        {label}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground dark:text-dark-muted-foreground -mt-1">{description}</p>
      )}
      <div className="relative">
        {prefix && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <span className="text-muted-foreground dark:text-dark-muted-foreground">{prefix}</span>
          </div>
        )}
        <input
          id={id}
          className={`w-full rounded-lg border border-subtle-border dark:border-dark-subtle-border bg-card dark:bg-dark-card text-foreground dark:text-dark-foreground focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary transition-all duration-200 py-2.5 ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-7' : 'pr-3'}`}
          type={type}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(e.target.value)}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="text-muted-foreground dark:text-dark-muted-foreground">{suffix}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  description?: string;
}
function SelectField({ label, value, options, onChange, description }: SelectFieldProps) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium text-foreground dark:text-dark-foreground">
        {label}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground dark:text-dark-muted-foreground -mt-1">{description}</p>
      )}
      <div className="relative">
        <select
          id={id}
          className="w-full rounded-lg border border-subtle-border dark:border-dark-subtle-border bg-card dark:bg-dark-card text-foreground dark:text-dark-foreground focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary transition-all duration-200 py-2.5 pl-3 pr-10 appearance-none"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-4 h-4 text-muted-foreground dark:text-dark-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

interface RadioGroupProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  description?: string;
}
function RadioGroup({ label, options, value, onChange, description }: RadioGroupProps) {
  const groupName = React.useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-medium text-foreground dark:text-dark-foreground mb-1">{label}</legend>
      {description && (
        <p className="text-xs text-muted-foreground dark:text-dark-muted-foreground -mt-1 mb-1">{description}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {options.map(opt => {
          const id = `${groupName}-${opt.value}`;
          return (
            <label key={opt.value} htmlFor={id} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 cursor-pointer ${value === opt.value ? 'bg-primary/10 dark:bg-dark-primary/10 border-primary dark:border-dark-primary text-primary dark:text-dark-primary' : 'border-subtle-border dark:border-dark-subtle-border hover:bg-subtle-background/50 dark:hover:bg-dark-subtle-background/50'}`}>
              <input
                id={id}
                type="radio"
                name={groupName}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              {value === opt.value && (
                <span className="text-primary dark:text-dark-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// --- Calculation Logic ---
interface EndAmountResult {
  endBalance: number;
  startingAmount: number;
  totalContributions: number;
  totalInterest: number;
  schedule: Array<{ year: number; deposit: number; interest: number; endingBalance: number }>;
}
function calculateEndAmount(inputs: EndAmountInputs): EndAmountResult {
  const compoundMap = { annually: 1, quarterly: 4, monthly: 12, daily: 365 };
  const n = compoundMap[inputs.compound];
  // Coerce '' to 0 for calculations
  const years = typeof inputs.years === 'number' ? inputs.years : 0;
  const returnRate = typeof inputs.returnRate === 'number' ? inputs.returnRate : 0;
  const additionalContribution = typeof inputs.additionalContribution === 'number' ? inputs.additionalContribution : 0;
  const startingAmount = typeof inputs.startingAmount === 'number' ? inputs.startingAmount : 0;
  const periods = years * n;
  const rate = returnRate / 100 / n;
  const contribPeriods = inputs.contributionFrequency === "month" ? 12 : 1;
  const contribPerPeriod = additionalContribution / (n / contribPeriods);
  let balance = startingAmount;
  let totalContrib = 0;
  let totalInterest = 0;
  const schedule = [];
  for (let i = 1; i <= periods; i++) {
    if (inputs.contributionTiming === "beginning") balance += contribPerPeriod;
    const interest = balance * rate;
    balance += interest;
    if (inputs.contributionTiming === "end") balance += contribPerPeriod;
    totalContrib += contribPerPeriod;
    totalInterest += interest;
    if (i % n === 0 || i === periods) {
      schedule.push({
        year: Math.ceil(i / n),
        deposit: totalContrib,
        interest: totalInterest,
        endingBalance: balance,
      });
    }
  }
  return {
    endBalance: balance,
    startingAmount,
    totalContributions: totalContrib,
    totalInterest,
    schedule,
  };
}

// --- Results Summary ---
function EndAmountResults({ endBalance, startingAmount, totalContributions, totalInterest }: EndAmountResult) {
  const totalInvested = startingAmount + totalContributions;
  const roi = ((endBalance - totalInvested) / totalInvested) * 100;
  
  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-dark-primary/5 dark:to-dark-primary/10 rounded-xl p-6 shadow-sm border border-subtle-border dark:border-dark-subtle-border">
      <h3 className="font-semibold text-xl mb-4 text-foreground dark:text-dark-foreground">Investment Summary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card dark:bg-dark-card rounded-lg p-4 shadow-sm transition-all hover:shadow-md border border-subtle-border dark:border-dark-subtle-border">
          <div className="text-sm text-muted-foreground dark:text-dark-muted-foreground mb-1">Final Balance</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${endBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-muted-foreground dark:text-dark-muted-foreground mt-1">After {Math.round(totalContributions / startingAmount * 10) / 10}x your initial investment</div>
        </div>
        
        <div className="bg-card dark:bg-dark-card rounded-lg p-4 shadow-sm transition-all hover:shadow-md border border-subtle-border dark:border-dark-subtle-border">
          <div className="text-sm text-muted-foreground dark:text-dark-muted-foreground mb-1">Total Invested</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            ${totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-muted-foreground dark:text-dark-muted-foreground mt-1">Principal + Contributions</div>
        </div>
        
        <div className="bg-card dark:bg-dark-card rounded-lg p-4 shadow-sm transition-all hover:shadow-md border border-subtle-border dark:border-dark-subtle-border">
          <div className="text-sm text-muted-foreground dark:text-dark-muted-foreground mb-1">Interest Earned</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            ${totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-muted-foreground dark:text-dark-muted-foreground mt-1">From compound growth</div>
        </div>
        
        <div className="bg-card dark:bg-dark-card rounded-lg p-4 shadow-sm transition-all hover:shadow-md border border-subtle-border dark:border-dark-subtle-border">
          <div className="text-sm text-muted-foreground dark:text-dark-muted-foreground mb-1">Return on Investment</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {roi.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground dark:text-dark-muted-foreground mt-1">Total ROI over period</div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-subtle-border dark:border-dark-subtle-border grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground dark:text-dark-muted-foreground">Starting Amount:</span> 
          <span className="ml-2 font-medium text-foreground dark:text-dark-foreground">${startingAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Total Contributions:</span> 
          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">${totalContributions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Growth Multiplier:</span> 
          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{(endBalance / totalInvested).toFixed(2)}x</span>
        </div>
      </div>
    </div>
  );
}

// --- Donut Chart ---
function EndAmountDonutChart({ startingAmount, totalContributions, totalInterest }: EndAmountResult) {
  const total = startingAmount + totalContributions + totalInterest;
  const principalPct = (startingAmount / total) * 100;
  const contribPct = (totalContributions / total) * 100;
  const interestPct = (totalInterest / total) * 100;
  
  // Format percentages for display
  const principalDisplay = principalPct.toFixed(1);
  const contribDisplay = contribPct.toFixed(1);
  const interestDisplay = interestPct.toFixed(1);
  
  // SVG donut chart with modern styling
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  const p1 = (principalPct / 100) * circ;
  const p2 = (contribPct / 100) * circ;
  const p3 = (interestPct / 100) * circ;
  
  return (
    <div className="flex flex-col items-center">
      <h4 className="font-semibold mb-4 text-gray-800 dark:text-gray-200 text-center">Investment Breakdown</h4>
      
      <div className="relative">
        <svg width={180} height={180} viewBox="0 0 180 180" className="transform transition-transform duration-500 hover:scale-105">
          {/* Background circle */}
          <circle cx={90} cy={90} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={16} className="dark:opacity-20" />
          
          {/* Data segments with rounded line caps */}
          <circle 
            cx={90} cy={90} r={radius} fill="none" 
            stroke="#4f46e5" strokeWidth={16} 
            strokeDasharray={`${p1} ${circ - p1}`} 
            strokeDashoffset={0} 
            strokeLinecap="round"
            className="drop-shadow-md transition-all duration-300 hover:stroke-opacity-90"
          />
          <circle 
            cx={90} cy={90} r={radius} fill="none" 
            stroke="#0ea5e9" strokeWidth={16} 
            strokeDasharray={`${p2} ${circ - p2}`} 
            strokeDashoffset={-p1} 
            strokeLinecap="round"
            className="drop-shadow-md transition-all duration-300 hover:stroke-opacity-90"
          />
          <circle 
            cx={90} cy={90} r={radius} fill="none" 
            stroke="#10b981" strokeWidth={16} 
            strokeDasharray={`${p3} ${circ - p3}`} 
            strokeDashoffset={-p1 - p2} 
            strokeLinecap="round"
            className="drop-shadow-md transition-all duration-300 hover:stroke-opacity-90"
          />
          
          {/* Center text */}
          <text x={90} y={85} textAnchor="middle" fontSize="1.5rem" fontWeight="bold" fill="#4b5563" className="dark:fill-white">
            ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </text>
          <text x={90} y={105} textAnchor="middle" fontSize="0.8rem" fill="#6b7280" className="dark:fill-gray-300">
            Total Value
          </text>
        </svg>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 w-full">
        <div className="flex flex-col items-center p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
            <span className="text-sm text-gray-600 dark:text-gray-300">Principal</span>
          </div>
          <div className="font-semibold text-indigo-700 dark:text-indigo-300">${startingAmount.toLocaleString()}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{principalDisplay}%</div>
        </div>
        
        <div className="flex flex-col items-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-600 dark:bg-blue-400"></span>
            <span className="text-sm text-gray-600 dark:text-gray-300">Contributions</span>
          </div>
          <div className="font-semibold text-blue-700 dark:text-blue-300">${totalContributions.toLocaleString()}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{contribDisplay}%</div>
        </div>
        
        <div className="flex flex-col items-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-3 h-3 rounded-full bg-green-600 dark:bg-green-400"></span>
            <span className="text-sm text-gray-600 dark:text-gray-300">Interest</span>
          </div>
          <div className="font-semibold text-green-700 dark:text-green-300">${totalInterest.toLocaleString()}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{interestDisplay}%</div>
        </div>
      </div>
    </div>
  );
}

// --- Bar Chart ---
function EndAmountBarChart({ schedule }: { schedule: EndAmountResult["schedule"] }) {
  const width = 500;
  const height = 240;
  const padding = { top: 30, right: 30, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Calculate max values for scaling
  const maxY = Math.max(...schedule.map(s => s.endingBalance)) * 1.1; // Add 10% padding
  
  // Calculate bar width and spacing
  const barWidth = chartWidth / schedule.length * 0.7;
  const barSpacing = chartWidth / schedule.length * 0.3;
  
  // Generate grid lines
  const gridLines = [];
  const numGridLines = 5;
  for (let i = 0; i <= numGridLines; i++) {
    const y = padding.top + chartHeight - (i / numGridLines) * chartHeight;
    gridLines.push(
      <line 
        key={`grid-${i}`} 
        x1={padding.left} 
        y1={y} 
        x2={width - padding.right} 
        y2={y} 
        stroke="#e5e7eb" 
        strokeWidth={1} 
        strokeDasharray="3,3"
        className="dark:stroke-gray-700"
      />
    );
  }
  
  // Generate Y-axis labels
  const yAxisLabels = [];
  for (let i = 0; i <= numGridLines; i++) {
    const y = padding.top + chartHeight - (i / numGridLines) * chartHeight;
    const value = (i / numGridLines) * maxY;
    yAxisLabels.push(
      <text 
        key={`y-label-${i}`} 
        x={padding.left - 10} 
        y={y + 4} 
        fontSize="0.75rem" 
        fill="#6b7280" 
        textAnchor="end"
        className="dark:fill-gray-400"
      >
        ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </text>
    );
  }
  
  // Generate bars with stacked components
  const bars = schedule.map((row, i) => {
    const x = padding.left + (i * (barWidth + barSpacing));
    const depositHeight = (row.deposit / maxY) * chartHeight;
    const interestHeight = (row.interest / maxY) * chartHeight;
    const totalHeight = depositHeight + interestHeight;
    
    return (
      <g key={`bar-${i}`} className="group">
        {/* Deposit portion */}
        <rect
          x={x}
          y={padding.top + chartHeight - depositHeight}
          width={barWidth}
          height={depositHeight}
          fill="url(#depositGradient)"
          rx={2}
          className="transition-all duration-300 opacity-80 hover:opacity-100"
        />
        
        {/* Interest portion */}
        <rect
          x={x}
          y={padding.top + chartHeight - totalHeight}
          width={barWidth}
          height={interestHeight}
          fill="url(#interestGradient)"
          rx={2}
          className="transition-all duration-300 opacity-80 hover:opacity-100"
        />
        
        {/* Year label */}
        <text 
          x={x + barWidth/2} 
          y={height - padding.bottom/2} 
          fontSize="0.75rem" 
          fill="#6b7280" 
          textAnchor="middle"
          className="dark:fill-gray-400"
        >
          {row.year}
        </text>
        
        {/* Hover tooltip */}
        <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <rect 
            x={x - 20} 
            y={padding.top + chartHeight - totalHeight - 50} 
            width={barWidth + 40} 
            height={40} 
            rx={4} 
            fill="#1f2937" 
            fillOpacity="0.9"
          />
          <text 
            x={x + barWidth/2} 
            y={padding.top + chartHeight - totalHeight - 35} 
            fontSize="0.7rem" 
            fill="white" 
            textAnchor="middle"
          >
            ${row.endingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </text>
          <text 
            x={x + barWidth/2} 
            y={padding.top + chartHeight - totalHeight - 20} 
            fontSize="0.6rem" 
            fill="#9ca3af" 
            textAnchor="middle"
          >
            Year {row.year}
          </text>
        </g>
      </g>
    );
  });

  return (
    <div className="w-full mx-auto">
      <h4 className="font-semibold mb-4 text-gray-800 dark:text-gray-200">Growth Over Time</h4>
      <div className="overflow-x-auto pb-2">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Investment growth chart" role="img" className="mx-auto">
          {/* Gradients */}
          <defs>
            <linearGradient id="depositGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="interestGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="1" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {gridLines}
          
          {/* Y axis */}
          <line 
            x1={padding.left} 
            y1={padding.top} 
            x2={padding.left} 
            y2={height - padding.bottom} 
            stroke="#9ca3af" 
            strokeWidth={1.5}
            className="dark:stroke-gray-600"
          />
          
          {/* X axis */}
          <line 
            x1={padding.left} 
            y1={height - padding.bottom} 
            x2={width - padding.right} 
            y2={height - padding.bottom} 
            stroke="#9ca3af" 
            strokeWidth={1.5}
            className="dark:stroke-gray-600"
          />
          
          {/* Y axis labels */}
          {yAxisLabels}
          
          {/* Bars */}
          {bars}
          
          {/* Legend */}
          <g transform={`translate(${width - padding.right - 100}, ${padding.top})`}>
            <rect x="0" y="0" width="12" height="12" fill="url(#depositGradient)" rx="2" />
            <text x="20" y="10" fontSize="0.75rem" fill="#6b7280" className="dark:fill-gray-400">Deposits</text>
            
            <rect x="0" y="20" width="12" height="12" fill="url(#interestGradient)" rx="2" />
            <text x="20" y="30" fontSize="0.75rem" fill="#6b7280" className="dark:fill-gray-400">Interest</text>
          </g>
        </svg>
      </div>
    </div>
  );
}

// --- Schedule Table ---
function EndAmountScheduleTable({ schedule }: { schedule: EndAmountResult["schedule"] }) {
  // Calculate growth rates between years
  const growthRates = schedule.map((row, index) => {
    if (index === 0) return null;
    const prevBalance = schedule[index - 1].endingBalance;
    const growth = ((row.endingBalance - prevBalance) / prevBalance) * 100;
    return growth.toFixed(1);
  });
  
  return (
    <div>
      <h4 className="font-semibold mb-4 text-gray-800 dark:text-gray-200">Year-by-Year Breakdown</h4>
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 text-left">Year</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 text-right">Deposits</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 text-right">Interest</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 text-right">Balance</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 text-right">Growth</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-750 divide-y divide-gray-200 dark:divide-gray-700">
            {schedule.map((row, index) => (
              <tr 
                key={row.year} 
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.year}</td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                  ${row.deposit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                  ${row.interest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 text-right font-medium text-blue-600 dark:text-blue-400">
                  ${row.endingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 text-right">
                  {index === 0 ? (
                    <span className="text-gray-500 dark:text-gray-400">-</span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">
                      +{growthRates[index]}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
        Tip: The table shows your investment growth year by year, including deposits made and interest earned.
      </p>
    </div>
  );
}
