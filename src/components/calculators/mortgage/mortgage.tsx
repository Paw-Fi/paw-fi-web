'use client';

import { useState, useMemo } from 'react';
import { PieChart } from '../../ui/pie-chart';

interface AmortizationRow {
  paymentNumber: number;
  paymentAmount: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
  totalInterestPaid: number;
}

export const MortgageCalculator = () => {
  // Form state
  const [homePrice, setHomePrice] = useState<number | ''>(300000);
  const [downPayment, setDownPayment] = useState<number | ''>(60000);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number | ''>(20);
  const [loanAmount, setLoanAmount] = useState<number | ''>(240000);
  const [interestRate, setInterestRate] = useState<number | ''>(4.5);
  const [loanTerm, setLoanTerm] = useState<number | ''>(30);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [showAmortizationTable, setShowAmortizationTable] = useState<boolean>(false);
  const [includePropertyTax, setIncludePropertyTax] = useState<boolean>(false);
  const [propertyTaxRate, setPropertyTaxRate] = useState<number | ''>(1.2);
  const [includeHomeInsurance, setIncludeHomeInsurance] = useState<boolean>(false);
  const [homeInsurance, setHomeInsurance] = useState<number | ''>(1200);
  const [includePMI, setIncludePMI] = useState<boolean>(false);
  const [pmiRate, setPmiRate] = useState<number | ''>(0.5);

  // Handle down payment changes
  const handleDownPaymentChange = (value: number | '') => {
    if (value === '' || homePrice === '') {
      setDownPayment('');
      setDownPaymentPercent('');
      setLoanAmount(homePrice === '' ? '' : homePrice);
      setIncludePMI(false);
      return;
    }
    const newDownPayment = Math.min(value, homePrice);
    setDownPayment(newDownPayment);
    setDownPaymentPercent(parseFloat(((newDownPayment / homePrice) * 100).toFixed(2)));
    setLoanAmount(homePrice - newDownPayment);
    // Auto-toggle PMI based on down payment percentage
    if ((newDownPayment / homePrice) < 0.2) {
      setIncludePMI(true);
    } else {
      setIncludePMI(false);
    }
  };

  // Handle down payment percentage changes
  const handleDownPaymentPercentChange = (value: number | '') => {
    if (value === '' || homePrice === '') {
      setDownPaymentPercent('');
      setDownPayment('');
      setLoanAmount(homePrice === '' ? '' : homePrice);
      setIncludePMI(false);
      return;
    }
    const percentage = Math.min(value, 100);
    setDownPaymentPercent(percentage);
    const newDownPayment = Math.round(homePrice * (percentage / 100));
    setDownPayment(newDownPayment);
    setLoanAmount(homePrice - newDownPayment);
    // Auto-toggle PMI based on down payment percentage
    if (percentage < 20) {
      setIncludePMI(true);
    } else {
      setIncludePMI(false);
    }
  };

  // Handle home price changes
  const handleHomePriceChange = (value: number | '') => {
    if (value === '') {
      setHomePrice('');
      setDownPayment('');
      setDownPaymentPercent('');
      setLoanAmount('');
      return;
    }
    const newHomePrice = Math.max(value, 0);
    setHomePrice(newHomePrice);
    // Maintain the same down payment percentage
    const percent = downPaymentPercent === '' ? 0 : downPaymentPercent;
    const newDownPayment = Math.round(newHomePrice * (percent / 100));
    setDownPayment(newDownPayment);
    setLoanAmount(newHomePrice - newDownPayment);
  };

// Calculate mortgage details
  const mortgageDetails = useMemo(() => {
    // Coerce '' to 0 for all calculations
    const _homePrice = typeof homePrice === 'number' ? homePrice : 0;
    const _downPayment = typeof downPayment === 'number' ? downPayment : 0;
    const _downPaymentPercent = typeof downPaymentPercent === 'number' ? downPaymentPercent : 0;
    const _loanAmount = typeof loanAmount === 'number' ? loanAmount : 0;
    const _interestRate = typeof interestRate === 'number' ? interestRate : 0;
    const _loanTerm = typeof loanTerm === 'number' ? loanTerm : 0;
    const _propertyTaxRate = typeof propertyTaxRate === 'number' ? propertyTaxRate : 0;
    const _homeInsurance = typeof homeInsurance === 'number' ? homeInsurance : 0;
    const _pmiRate = typeof pmiRate === 'number' ? pmiRate : 0;
    // Monthly interest rate
    const monthlyRate = _interestRate / 100 / 12;
    // Total number of payments
    const totalPayments = _loanTerm * 12;
    // Monthly principal and interest payment using the formula:
    // M = P [ i(1 + i)^n ] / [ (1 + i)^n - 1]
    // Where:
    // M = monthly payment
    // P = loan amount
    // i = monthly interest rate
    // n = number of payments
    const monthlyPayment = _loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
      (Math.pow(1 + monthlyRate, totalPayments) - 1) || 0;
    // Calculate additional costs
    const monthlyPropertyTax = includePropertyTax ? 
      (_homePrice * (_propertyTaxRate / 100)) / 12 : 0;
    const monthlyHomeInsurance = includeHomeInsurance ? 
      _homeInsurance / 12 : 0;
    const monthlyPMI = includePMI && (_downPaymentPercent < 20) ? 
      (_loanAmount * (_pmiRate / 100)) / 12 : 0;
    // Total monthly payment
    const totalMonthlyPayment = monthlyPayment + monthlyPropertyTax + 
      monthlyHomeInsurance + monthlyPMI;
    // Generate amortization schedule
    const amortizationSchedule: AmortizationRow[] = [];
    let remainingBalance = _loanAmount;
    let totalInterestPaid = 0;
    for (let i = 1; i <= totalPayments; i++) {
      // Calculate interest for this period
      const interestForThisPeriod = remainingBalance * monthlyRate;
      totalInterestPaid += interestForThisPeriod;
      // Calculate principal for this period
      const principalForThisPeriod = monthlyPayment - interestForThisPeriod;
      // Update remaining balance
      remainingBalance -= principalForThisPeriod;
      // Add row to amortization schedule
      amortizationSchedule.push({
        paymentNumber: i,
        paymentAmount: monthlyPayment,
        principalPaid: principalForThisPeriod,
        interestPaid: interestForThisPeriod,
        remainingBalance: Math.max(0, remainingBalance),
        totalInterestPaid: totalInterestPaid
      });
    }
    return {
      monthlyPrincipalAndInterest: monthlyPayment,
      monthlyPropertyTax,
      monthlyHomeInsurance,
      monthlyPMI,
      totalMonthlyPayment,
      totalInterestPaid,
      totalCostOfLoan: _loanAmount + totalInterestPaid,
      amortizationSchedule
    };
  }, [
    loanAmount, 
    interestRate, 
    loanTerm, 
    includePropertyTax, 
    propertyTaxRate, 
    includeHomeInsurance, 
    homeInsurance, 
    includePMI, 
    pmiRate,
    homePrice,
    downPaymentPercent
  ]);

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format date
  const formatDate = (dateString: string, monthsToAdd: number): string => {
    const [year, month] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1);
    date.setMonth(date.getMonth() + monthsToAdd);
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <label htmlFor="homePrice" className="block text-sm font-medium text-foreground dark:text-dark-foreground">Home Price</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                name="homePrice"
                id="homePrice"
                className="appearance-none block w-full pl-7 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground sm:text-sm"
                placeholder="0.00"
                value={homePrice === '' ? '' : homePrice}
                onChange={(e) => handleHomePriceChange(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="downPayment" className="block text-sm font-medium text-foreground dark:text-dark-foreground">Down Payment</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="downPayment"
                  id="downPayment"
                  className="appearance-none block w-full pl-7 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground sm:text-sm"
                  placeholder="0.00"
                  value={downPayment === '' ? '' : downPayment}
                  onChange={(e) => handleDownPaymentChange(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-gray-500 dark:text-gray-400 sm:text-sm">or</span>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="downPaymentPercent" className="block text-sm font-medium text-foreground dark:text-dark-foreground">Down Payment %</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  name="downPaymentPercent"
                  id="downPaymentPercent"
                  className="appearance-none block w-full pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground sm:text-sm"
                  placeholder="0.00"
                  value={downPaymentPercent}
                  onChange={(e) => handleDownPaymentPercentChange(Number(e.target.value))}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-gray-500 dark:text-gray-400 sm:text-sm">%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="loanAmount" className="block text-sm font-medium text-foreground dark:text-dark-foreground">Loan Amount</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                name="loanAmount"
                id="loanAmount"
                className="appearance-none block w-full pl-7 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground sm:text-sm"
                placeholder="0.00"
                value={loanAmount}
                readOnly
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="interestRate" className="block text-sm font-medium text-foreground dark:text-dark-foreground">Interest Rate</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                name="interestRate"
                id="interestRate"
                className="appearance-none block w-full pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground sm:text-sm"
                placeholder="0.00"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <span className="text-gray-500 dark:text-gray-400 sm:text-sm">%</span>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="loanTerm" className="block text-sm font-medium text-foreground dark:text-dark-foreground">Loan Term</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                name="loanTerm"
                id="loanTerm"
                className="appearance-none block w-full pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground sm:text-sm"
                placeholder="0.00"
                value={loanTerm}
                onChange={(e) => setLoanTerm(Number(e.target.value))}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <span className="text-gray-500 dark:text-gray-400 sm:text-sm">years</span>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-foreground dark:text-dark-foreground">Start Date</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="month"
                name="startDate"
                id="startDate"
                className="appearance-none block w-full py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground sm:text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
          
          {/* Additional Options */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-3 text-foreground dark:text-dark-foreground">Additional Costs</h3>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-primary dark:text-dark-primary rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-primary dark:focus:ring-dark-primary"
                checked={includePropertyTax}
                onChange={() => setIncludePropertyTax(!includePropertyTax)}
              />
              <span className="text-foreground dark:text-dark-foreground">Include Property Tax</span>
            </label>
            
            {includePropertyTax && (
              <div className="ml-6 mb-3">
                <label htmlFor="propertyTaxRate" className="block text-sm font-medium text-foreground dark:text-dark-foreground">Property Tax Rate</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    name="propertyTaxRate"
                    id="propertyTaxRate"
                    className="appearance-none block w-full pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground sm:text-sm"
                    placeholder="0.00"
                    value={propertyTaxRate}
                    onChange={(e) => setPropertyTaxRate(Number(e.target.value))}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span className="text-gray-500 dark:text-gray-400 sm:text-sm">%</span>
                  </div>
                </div>
              </div>
            )}
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-primary dark:text-dark-primary rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-primary dark:focus:ring-dark-primary"
                checked={includeHomeInsurance}
                onChange={() => setIncludeHomeInsurance(!includeHomeInsurance)}
              />
              <span className="text-foreground dark:text-dark-foreground">Include Home Insurance</span>
            </label>
            
            {includeHomeInsurance && (
              <div className="ml-6 mb-3">
                <label htmlFor="homeInsurance" className="block text-sm font-medium text-foreground dark:text-dark-foreground">Annual Home Insurance</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    name="homeInsurance"
                    id="homeInsurance"
                    className="appearance-none block w-full pl-7 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground sm:text-sm"
                    placeholder="0.00"
                    value={homeInsurance}
                    onChange={(e) => setHomeInsurance(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-primary dark:text-dark-primary rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-primary dark:focus:ring-dark-primary"
                checked={includePMI}
                onChange={() => setIncludePMI(!includePMI)}
              />
              <span className="text-foreground dark:text-dark-foreground">Include PMI (Private Mortgage Insurance)</span>
            </label>
            
            {includePMI && (
              <div className="ml-6 mt-3">
                <label htmlFor="pmiRate" className="block text-sm font-medium text-foreground dark:text-dark-foreground">PMI Rate</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    name="pmiRate"
                    id="pmiRate"
                    className="appearance-none block w-full pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground sm:text-sm"
                    placeholder="0.00"
                    value={pmiRate}
                    onChange={(e) => setPmiRate(Number(e.target.value))}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span className="text-gray-500 dark:text-gray-400 sm:text-sm">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Results & Visualization */}
        <div>
          <div className="bg-primary/10 dark:bg-dark-primary/10 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-primary dark:text-dark-primary mb-4">Monthly Payment Breakdown</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Principal & Interest</span>
                <span className="font-semibold text-foreground dark:text-dark-foreground">{formatCurrency(mortgageDetails.monthlyPrincipalAndInterest)}</span>
              </div>
              
              {includePropertyTax && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Property Tax</span>
                  <span className="font-semibold text-foreground dark:text-dark-foreground">{formatCurrency(mortgageDetails.monthlyPropertyTax)}</span>
                </div>
              )}
              
              {includeHomeInsurance && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Home Insurance</span>
                  <span className="font-semibold text-foreground dark:text-dark-foreground">{formatCurrency(mortgageDetails.monthlyHomeInsurance)}</span>
                </div>
              )}
              
              {includePMI && downPaymentPercent < 20 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">PMI</span>
                  <span className="font-semibold text-foreground dark:text-dark-foreground">{formatCurrency(mortgageDetails.monthlyPMI)}</span>
                </div>
              )}
              
              <div className="pt-2 border-t border-primary/20 dark:border-dark-primary/20 flex justify-between">
                <span className="text-foreground dark:text-dark-foreground font-medium">Total Monthly Payment</span>
                <span className="text-xl font-bold text-primary dark:text-dark-primary">{formatCurrency(mortgageDetails.totalMonthlyPayment)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Loan Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Loan Amount</span>
                <span className="font-semibold">{formatCurrency(loanAmount)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Total Interest Paid</span>
                <span className="font-semibold text-red-600">{formatCurrency(mortgageDetails.totalInterestPaid)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Total Cost of Loan</span>
                <span className="font-semibold">{formatCurrency(mortgageDetails.totalCostOfLoan)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Payoff Date</span>
                <span className="font-semibold">{formatDate(startDate, loanTerm * 12)}</span>
              </div>
            </div>
          </div>
          
          {/* Total Payment Distribution Pie Chart */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Total Payment Distribution</h3>
            <PieChart
              labels={["Principal", "Interest"]}
              data={[loanAmount, mortgageDetails.totalInterestPaid]}
              title="Principal vs. Interest Paid"
            />
            <div className="flex justify-between mt-2 text-sm">
              <div className="flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span> Principal
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span> Interest
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Amortization Schedule Toggle */}
      <div className="mt-6">
        <button
          className="px-4 py-2 rounded bg-blue-100 text-blue-700 font-semibold mr-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          onClick={() => setShowAmortizationTable((v) => !v)}
        >
          {showAmortizationTable ? 'Hide' : 'Show'} Amortization Schedule
        </button>
        
        {showAmortizationTable && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Principal
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interest
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Only show first year, then every 12th payment */}
                {mortgageDetails.amortizationSchedule
                  .filter(row => row.paymentNumber <= 12 || row.paymentNumber % 12 === 0 || row.paymentNumber === loanTerm * 12)
                  .map((row) => (
                    <tr key={row.paymentNumber} className={row.paymentNumber % 12 === 0 ? 'bg-gray-50' : ''}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {row.paymentNumber}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(startDate, row.paymentNumber - 1)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(row.paymentAmount)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-blue-600">
                        {formatCurrency(row.principalPaid)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-red-600">
                        {formatCurrency(row.interestPaid)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(row.remainingBalance)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
