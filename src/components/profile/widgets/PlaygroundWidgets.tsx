"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCoffee,
  faCalendarDays,
  faHome,
  faCalculator,
  faArrowRight,
  faUser,
  faInfoCircle,
  faCoins,
  faDollarSign,
  faUtensils,
  faGamepad,
  faPiggyBank,
  faMagic,
  faLightbulb,
  faPercent,
} from "@fortawesome/free-solid-svg-icons";
import { Widget } from "./Widget";
import { IDailyHabitCalculatorWidget, IPensionHeadStartWidget, IMortgageDepositTimelineWidget, ISalarySlicerWidget } from "../types/dashboard-data.typings";
import RangeSlider from "@/components/ui/RangeSlider";
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  ChartOptions 
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register ChartJS components for pie chart
ChartJS.register(ArcElement, Tooltip, Legend);

// Daily Habit Future Value Calculator
export function DailyHabitCalculatorWidget({ widget }: { widget: IDailyHabitCalculatorWidget }) {
  const [dailySpend, setDailySpend] = useState(5);
  const [timeframe, setTimeframe] = useState(20);
  
  // Calculate future value assuming 6% annual return
  const calculateFutureValue = () => {
    const monthlyInvestment = (dailySpend * 365) / 12;
    const monthlyRate = 0.06 / 12;
    const totalMonths = timeframe * 12;
    
    // Future value of ordinary annuity formula
    const futureValue = monthlyInvestment * (((1 + monthlyRate) ** totalMonths - 1) / monthlyRate);
    return Math.round(futureValue);
  };

  const futureValue = calculateFutureValue();

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
            What's a small daily habit you have?
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            See how much your small expenses could grow if invested instead
          </p>
        </div>

        {/* Daily Spend Slider */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <FontAwesomeIcon icon={faCoffee} className="text-amber-600 text-lg" />
            <div className="flex-1">
              <RangeSlider
                label="Daily Spend"
                value={dailySpend}
                onChange={(value) => setDailySpend(Number(value))}
                min={1}
                max={20}
                step={1}
                unit="$"
                className="mb-4"
              />
            </div>
          </div>

          {/* Timeframe Slider */}
          <div className="flex items-center space-x-4">
            <FontAwesomeIcon icon={faCalendarDays} className="text-blue-600 text-lg" />
            <div className="flex-1">
              <RangeSlider
                label="Timeframe"
                value={timeframe}
                onChange={(value) => setTimeframe(Number(value))}
                min={1}
                max={30}
                step={1}
                formatValue={(value) => `${value} years`}
                className="mb-4"
              />
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
            ${futureValue.toLocaleString()}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Your ${dailySpend} daily spend on coffee or lunches, if invested, could be worth{" "}
            <span className="font-semibold text-green-600 dark:text-green-400">
              ${futureValue.toLocaleString()}
            </span>{" "}
            in {timeframe} years.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
            Calculation assumes 6% annual return
          </p>
        </div>
      </div>
    </Widget>
  );
}

// 401(k) Head Start Visualizer
export function PensionHeadStartWidget({ widget }: { widget: IPensionHeadStartWidget }) {
  const [startAge, setStartAge] = useState(25);
  const [annualSalary, setAnnualSalary] = useState(60000);
  const [includeMatch, setIncludeMatch] = useState(true);
  
  const retirementAge = 67;
  const monthlyContribution = 200;
  const annualReturn = 0.06;
  
  const calculatePensionPot = () => {
    const yearsToRetirement = retirementAge - startAge;
    if (yearsToRetirement <= 0) return 0;
    
    const monthlyRate = annualReturn / 12;
    const totalMonths = yearsToRetirement * 12;
    
    // Calculate employer match if enabled
    let totalMonthlyContribution = monthlyContribution;
    if (includeMatch) {
      const maxMatchableAmount = (annualSalary * 0.06) / 12; // 6% of salary per month
      const matchableContribution = Math.min(monthlyContribution, maxMatchableAmount);
      const employerMatch = matchableContribution * 0.5; // 50% match
      totalMonthlyContribution = monthlyContribution + employerMatch;
    }
    
    // Future value of ordinary annuity formula
    const futureValue = totalMonthlyContribution * (((1 + monthlyRate) ** totalMonths - 1) / monthlyRate);
    return Math.round(futureValue);
  };

  const pensionPot = calculatePensionPot();

  // Data for comparison visualization (updated for US market with employer match)
  const comparisonData = [
    { age: 22, pot: includeMatch ? 510000 : 340000 },
    { age: 25, pot: includeMatch ? 442500 : 295000 },
    { age: 30, pot: includeMatch ? 330000 : 220000 },
    { age: 35, pot: includeMatch ? 255000 : 170000 },
    { age: 40, pot: includeMatch ? 187500 : 125000 },
    { age: 45, pot: includeMatch ? 127500 : 85000 },
  ];

  const maxPot = Math.max(...comparisonData.map(d => d.pot));

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
            The Power of Your 401(k) Head Start
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            See the power of starting early with a ${monthlyContribution} monthly contribution to your 401(k)
          </p>
        </div>

        {/* Employer Match Toggle */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Include Employer Match?
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                50% match on first 6% of salary
              </p>
            </div>
            <input
              type="checkbox"
              checked={includeMatch}
              onChange={(e) => setIncludeMatch(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          
          {includeMatch && (
            <div className="mt-4">
              <RangeSlider
                label="Annual Salary"
                value={annualSalary}
                onChange={(value) => setAnnualSalary(Number(value))}
                min={40000}
                max={120000}
                step={5000}
                formatValue={(value) => `$${Number(value).toLocaleString()}`}
                className="mb-2"
              />
            </div>
          )}
        </div>

        {/* Age Slider */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <FontAwesomeIcon icon={faUser} className="text-blue-600 text-lg" />
            <div className="flex-1">
              <RangeSlider
                label="Starting Age"
                value={startAge}
                onChange={(value) => setStartAge(Number(value))}
                min={22}
                max={45}
                step={1}
                className="mb-4"
              />
            </div>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 text-center">
            Pension Pot at Retirement (Age 67)
          </h4>
          <div className="space-y-2">
            {comparisonData.map((data) => (
              <div key={data.age} className="flex items-center">
                <div className="w-8 text-xs text-slate-600 dark:text-slate-400">
                  {data.age}
                </div>
                <div className="flex-1 mx-2">
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded relative">
                    <div
                      className={`h-full rounded transition-all duration-500 ${
                        data.age === startAge
                          ? "bg-gradient-to-r from-blue-500 to-purple-600"
                          : "bg-gradient-to-r from-slate-400 to-slate-500"
                      }`}
                      style={{ width: `${(data.pot / maxPot) * 100}%` }}
                    />
                    {data.age === startAge && (
                      <div className="absolute right-2 top-0 h-full flex items-center">
                        <FontAwesomeIcon
                          icon={faArrowRight}
                          className="text-white text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-20 text-xs text-slate-600 dark:text-slate-400 text-right">
                  €{data.pot.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Result */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            ${pensionPot.toLocaleString()}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {startAge <= 25
              ? `Starting now could result in a 401(k) balance of $${pensionPot.toLocaleString()}.`
              : `Starting at ${startAge} gives you $${pensionPot.toLocaleString()}. Starting at 25 would give you $${comparisonData.find(d => d.age === 25)?.pot.toLocaleString()}.`}
          </p>
          {includeMatch && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              <FontAwesomeIcon icon={faCoins} className="mr-1" />
              Including employer match - that's free money!
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
            Assumes 6% annual return, retiring at 67
          </p>
        </div>
      </div>
    </Widget>
  );
}

// Mortgage Down Payment Timeline
export function MortgageDepositTimelineWidget({ widget }: { widget: IMortgageDepositTimelineWidget }) {
  const [homePrice, setHomePrice] = useState(350000);
  const [monthlySavings, setMonthlySavings] = useState(800);
  const [downPaymentPercentage, setDownPaymentPercentage] = useState(10);
  const [showPMIInfo, setShowPMIInfo] = useState(false);
  
  const requiredDeposit = homePrice * (downPaymentPercentage / 100);
  const monthsToSave = Math.ceil(requiredDeposit / monthlySavings);
  const years = Math.floor(monthsToSave / 12);
  const remainingMonths = monthsToSave % 12;

  const getDownPaymentLabel = (percentage: number) => {
    switch (percentage) {
      case 3.5: return "3.5% (FHA loan)";
      case 5: return "5% (Conventional)";
      case 10: return "10% (Strong start)";
      case 20: return "20% (Avoid PMI)";
      default: return `${percentage}%`;
    }
  };

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
            Your Down Payment Timeline
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Calculate your timeline for your home down payment
          </p>
        </div>

        {/* Home Price Input */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <FontAwesomeIcon icon={faHome} className="text-green-600 text-lg" />
            <div className="flex-1">
              <RangeSlider
                label="Home Price"
                value={homePrice}
                onChange={(value) => setHomePrice(Number(value))}
                min={250000}
                max={800000}
                step={25000}
                formatValue={(value) => `$${Number(value).toLocaleString()}`}
                className="mb-4"
              />
            </div>
          </div>

          {/* Down Payment Percentage Slider */}
          <div className="flex items-center space-x-4">
            <FontAwesomeIcon icon={faCalculator} className="text-blue-600 text-lg" />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <label className="text-lg font-medium text-slate-700 dark:text-slate-300">
                  Down Payment Percentage
                </label>
                <div className="relative">
                  <FontAwesomeIcon 
                    icon={faInfoCircle} 
                    className="text-slate-400 cursor-pointer hover:text-slate-600"
                    onMouseEnter={() => setShowPMIInfo(true)}
                    onMouseLeave={() => setShowPMIInfo(false)}
                  />
                  {showPMIInfo && (
                    <div className="absolute z-10 w-64 p-2 mt-1 text-xs bg-slate-800 text-white rounded shadow-lg -right-32">
                      In the US, a down payment of less than 20% usually requires you to pay Private Mortgage Insurance (PMI), which is an extra monthly cost.
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[3.5, 5, 10, 20].map(percentage => (
                  <button
                    key={percentage}
                    onClick={() => setDownPaymentPercentage(percentage)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                      downPaymentPercentage === percentage
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {getDownPaymentLabel(percentage)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Savings Slider */}
          <div className="flex items-center space-x-4">
            <FontAwesomeIcon icon={faCoins} className="text-yellow-600 text-lg" />
            <div className="flex-1">
              <RangeSlider
                label="Monthly Savings"
                value={monthlySavings}
                onChange={(value) => setMonthlySavings(Number(value))}
                min={200}
                max={3000}
                step={100}
                unit="$"
                className="mb-4"
              />
            </div>
          </div>
        </div>

        {/* Down Payment Calculation */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Required Down Payment</p>
              <p className="text-xl font-bold text-slate-700 dark:text-slate-200">
                ${requiredDeposit.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {downPaymentPercentage}% of home price
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Monthly Progress</p>
              <p className="text-xl font-bold text-slate-700 dark:text-slate-200">
                {((monthlySavings / requiredDeposit) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                of total needed
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>Progress per month</span>
            <span>{((monthlySavings / requiredDeposit) * 100).toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-500"
              style={{ width: `${Math.min(((monthlySavings / requiredDeposit) * 100), 100)}%` }}
            />
          </div>
        </div>

        {/* Result */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
            {years > 0 ? `${years} years` : ""} {remainingMonths > 0 ? `${remainingMonths} months` : ""}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            To save your ${requiredDeposit.toLocaleString()} down payment by putting aside ${monthlySavings} a month,
            it will take you{" "}
            <span className="font-semibold text-green-600 dark:text-green-400">
              {years > 0 && `${years} years`}
              {years > 0 && remainingMonths > 0 && " and "}
              {remainingMonths > 0 && `${remainingMonths} months`}
            </span>.
          </p>
          {downPaymentPercentage < 20 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
              Note: Less than 20% down payment typically requires PMI
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
            Based on US mortgage requirements
          </p>
        </div>
      </div>
    </Widget>
  );
}

// Salary Slicer - Interactive Budget Allocation Widget
export function SalarySlicerWidget({ widget }: { widget: ISalarySlicerWidget }) {
  const [monthlyIncome, setMonthlyIncome] = useState(4000);
  const [showInsight, setShowInsight] = useState(false);
  
  // Budget categories with default percentages
  const [budget, setBudget] = useState({
    housing: 30,
    food: 15,
    transportation: 10,
    fun: 20,
    savings: 15,
    other: 10
  });

  const categories = [
    { key: 'housing', label: 'Housing', icon: faHome, color: 'rgba(59, 130, 246, 0.8)' },
    { key: 'food', label: 'Food', icon: faUtensils, color: 'rgba(16, 185, 129, 0.8)' },
    { key: 'transportation', label: 'Transportation', icon: faCalculator, color: 'rgba(245, 158, 11, 0.8)' },
    { key: 'fun', label: 'Fun & Entertainment', icon: faGamepad, color: 'rgba(239, 68, 68, 0.8)' },
    { key: 'savings', label: 'Savings', icon: faPiggyBank, color: 'rgba(139, 92, 246, 0.8)' },
    { key: 'other', label: 'Other', icon: faCoins, color: 'rgba(156, 163, 175, 0.8)' }
  ];

  // Calculate dollar amounts
  const getDollarAmount = (percentage: number) => {
    return Math.round((percentage / 100) * monthlyIncome);
  };

  // Handle slider changes while maintaining 100% constraint
  const handleSliderChange = (category: string, newValue: number) => {
    const currentTotal = Object.values(budget).reduce((sum, val) => sum + val, 0);
    const currentValue = budget[category as keyof typeof budget];
    const difference = newValue - currentValue;
    
    // If increasing this category, decrease others proportionally
    if (difference > 0) {
      const otherCategories = Object.keys(budget).filter(key => key !== category);
      const otherTotal = currentTotal - currentValue;
      
      if (otherTotal > 0) {
        const newBudget = { ...budget };
        newBudget[category as keyof typeof budget] = newValue;
        
        // Distribute the reduction proportionally among other categories
        const reductionFactor = (100 - newValue) / otherTotal;
        
        otherCategories.forEach(key => {
          newBudget[key as keyof typeof budget] = Math.max(0, Math.round(budget[key as keyof typeof budget] * reductionFactor));
        });
        
        // Ensure total equals 100%
        const newTotal = Object.values(newBudget).reduce((sum, val) => sum + val, 0);
        if (newTotal !== 100) {
          newBudget.other = Math.max(0, newBudget.other + (100 - newTotal));
        }
        
        setBudget(newBudget);
      }
    } else {
      // If decreasing this category, distribute the increase to others
      const newBudget = { ...budget };
      newBudget[category as keyof typeof budget] = newValue;
      
      const increase = Math.abs(difference);
      const otherCategories = Object.keys(budget).filter(key => key !== category);
      const increasePerCategory = Math.floor(increase / otherCategories.length);
      const remainder = increase % otherCategories.length;
      
      otherCategories.forEach((key, index) => {
        newBudget[key as keyof typeof budget] += increasePerCategory + (index < remainder ? 1 : 0);
      });
      
      setBudget(newBudget);
    }
  };

  // Generate insight based on budget allocation
  const generateInsight = () => {
    const savingsAmount = getDollarAmount(budget.savings);
    
    if (budget.fun > 15) {
      // Calculate the exact dollar amount if shifting 2% from Fun to Savings
      const twoPercentOfIncome = getDollarAmount(2); // 2% of monthly income
      const annualSavingsIncrease = twoPercentOfIncome * 12;
      return (
        <span>
          By shifting just <span className="text-primary font-bold">2%</span> from 'Fun' to 'Savings,' you'd add an extra{' '}
          <span className="text-primary font-bold">${Math.round(annualSavingsIncrease)}</span> to your annual savings!
        </span>
      );
    } else if (budget.savings < 20) {
      // Calculate the exact increase to get to 20% savings
      const targetSavingsAmount = getDollarAmount(20);
      const annualIncrease = (targetSavingsAmount - savingsAmount) * 12;
      return (
        <span>
          Increasing your savings rate to <span className="text-primary font-bold">20%</span> would add{' '}
          <span className="text-primary font-bold">${Math.round(annualIncrease)}</span> to your annual savings!
        </span>
      );
    } else {
      // Congratulate them on their good savings rate
      const annualSavings = savingsAmount * 12;
      return (
        <span>
          Great job! You're saving <span className="text-primary font-bold">{budget.savings}%</span> of your income - that's{' '}
          <span className="text-primary font-bold">${Math.round(annualSavings)}</span> annually!
        </span>
      );
    }
  };

  // Prepare chart data
  const chartData = {
    labels: categories.map(cat => cat.label),
    datasets: [{
      data: categories.map(cat => budget[cat.key as keyof typeof budget]),
      backgroundColor: categories.map(cat => cat.color),
      borderColor: categories.map(cat => cat.color.replace('0.8', '1')),
      borderWidth: 2,
    }]
  };

  const chartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const percentage = context.parsed;
            const amount = getDollarAmount(percentage);
            return `${context.label}: ${percentage}% ($${amount.toLocaleString()})`;
          }
        }
      }
    }
  };

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="">       
        {/* Monthly Income Input */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <RangeSlider
                label="Monthly Take-Home Pay"
                value={monthlyIncome}
                onChange={(value) => setMonthlyIncome(Number(value))}
                min={500}
                max={20000}
                step={100}
                formatValue={(value) => `$${Number(value).toLocaleString()}`}
                className="mb-4"
              />
            </div>
          </div>        
        </div>

       

        {/* Pie Chart */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <div className="h-32 w-full flex items-center justify-center">
            <Pie data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Budget Sliders */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium mt-2 text-center">
          {generateInsight()}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {categories.map((category) => (
              <div key={category.key} className="space-y-2">             
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                   <div className="flex items-center space-x-2">
                    <FontAwesomeIcon icon={category.icon} className="text-slate-600 dark:text-slate-400" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {category.label} {budget[category.key as keyof typeof budget]}%
                    </span>
                  </div>  
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    ${getDollarAmount(budget[category.key as keyof typeof budget]).toLocaleString()}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={budget[category.key as keyof typeof budget]}
                    onChange={(e) => handleSliderChange(category.key, Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${category.color} 0%, ${category.color} ${budget[category.key as keyof typeof budget] * 100/60}%, #e2e8f0 ${budget[category.key as keyof typeof budget] * 100/60}%, #e2e8f0 100%)`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Widget>
  );
}