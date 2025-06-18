'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { PieChart } from '../../ui/pie-chart';

interface AmortizationRow {
  paymentNumber: number;
  paymentAmount: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
  totalInterestPaid: number;
}

export function MortgageCalculator() {
  const prefersReducedMotion = usePrefersReducedMotion();

  const columnVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: prefersReducedMotion ? 0 : 0.5, delay: custom * 0.1 }
    }),
  };

  const tableVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: prefersReducedMotion ? 0 : 0.5, delay: 0.3 }
    },
  };

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
    const _homePrice = typeof homePrice === 'number' ? homePrice : 0;
    if (value === '' || _homePrice === 0) {
      setDownPayment('');
      setDownPaymentPercent('');
      setLoanAmount(_homePrice === 0 ? '' : _homePrice);
      setIncludePMI(false);
      return;
    }
    const newDownPayment = Math.min(value, _homePrice);
    setDownPayment(newDownPayment);
    setDownPaymentPercent(parseFloat(((newDownPayment / _homePrice) * 100).toFixed(2)));
    setLoanAmount(_homePrice - newDownPayment);
    // Auto-toggle PMI based on down payment percentage
    if ((newDownPayment / _homePrice) < 0.2) {
      setIncludePMI(true);
    } else {
      setIncludePMI(false);
    }
  };

  // Handle down payment percentage changes
  const handleDownPaymentPercentChange = (value: number | '') => {
    const _homePrice = typeof homePrice === 'number' ? homePrice : 0;
    if (value === '' || _homePrice === 0) {
      setDownPaymentPercent('');
      setDownPayment('');
      setLoanAmount(_homePrice === 0 ? '' : _homePrice);
      setIncludePMI(false);
      return;
    }
    const percentage = Math.min(value, 100);
    setDownPaymentPercent(percentage);
    const newDownPayment = Math.round(_homePrice * (percentage / 100));
    setDownPayment(newDownPayment);
    setLoanAmount(_homePrice - newDownPayment);
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
    const newHomePrice = Math.max(value, 0); // newHomePrice is number
    setHomePrice(newHomePrice);
    
    const percent = typeof downPaymentPercent === 'number' ? downPaymentPercent : 0; // Coerce
    const newDownPayment = Math.round(newHomePrice * (percent / 100)); // newHomePrice is number, percent is number
    setDownPayment(newDownPayment);
    setLoanAmount(newHomePrice - newDownPayment); // Both are numbers
  };

  // Calculate mortgage details
  const mortgageDetails = useMemo(() => {
    const _homePrice = typeof homePrice === 'number' && homePrice > 0 ? homePrice : 0;
    const _downPayment = typeof downPayment === 'number' ? downPayment : 0;
    const _loanAmountCalc = Math.max(0, _homePrice - _downPayment);
    const _interestRate = typeof interestRate === 'number' && interestRate > 0 ? interestRate : 0;
    const _loanTermYears = typeof loanTerm === 'number' && loanTerm > 0 ? loanTerm : 0;

    const _propertyTaxRate = typeof propertyTaxRate === 'number' && propertyTaxRate > 0 ? propertyTaxRate : 0;
    const _homeInsuranceMonthly = typeof homeInsurance === 'number' && homeInsurance > 0 ? homeInsurance / 12 : 0;
    const _pmiRateAnnual = typeof pmiRate === 'number' && pmiRate > 0 ? pmiRate : 0;
    // Monthly interest rate
    const monthlyRate = _interestRate / 100 / 12;
    // Total number of payments
    const totalPayments = _loanTermYears * 12;
    // Monthly principal and interest payment using the formula:
    // M = P [ i(1 + i)^n ] / [ (1 + i)^n - 1]
    // Where:
    // M = monthly payment
    // P = loan amount
    const monthlyInterestRate = (_interestRate / 100) / 12;
    const numberOfPayments = _loanTermYears * 12;

    const principalAndInterest = _loanAmountCalc * 
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) || 0;
    // Calculate additional costs
    let propertyTax = 0;
    if (includePropertyTax && _homePrice > 0 && _propertyTaxRate > 0) {
      propertyTax = (_homePrice * (_propertyTaxRate / 100)) / 12;
    }
    const monthlyHomeInsurance = includeHomeInsurance ? 
      _homeInsuranceMonthly : 0;
    let pmi = 0;
    if (includePMI && _homePrice > 0 && _pmiRateAnnual > 0 && (_downPayment / _homePrice) < 0.20) {
      pmi = (_loanAmountCalc * (_pmiRateAnnual / 100)) / 12;
    }
    // Total monthly payment
    const totalMonthlyPayment = principalAndInterest + propertyTax + 
      monthlyHomeInsurance + pmi;
    // Generate amortization schedule
    const amortizationSchedule: AmortizationRow[] = [];
    let remainingBalance = _loanAmountCalc;
    let totalInterestPaid = 0;
    for (let i = 1; i <= totalPayments; i++) {
      // Calculate interest for this period
      const interestForThisPeriod = remainingBalance * monthlyRate;
      totalInterestPaid += interestForThisPeriod;
      // Calculate principal for this period
      const principalForThisPeriod = principalAndInterest - interestForThisPeriod;
      // Update remaining balance
      remainingBalance -= principalForThisPeriod;
      // Add row to amortization schedule
      amortizationSchedule.push({
        paymentNumber: i,
        paymentAmount: principalAndInterest,
        principalPaid: principalForThisPeriod,
        interestPaid: interestForThisPeriod,
        remainingBalance: Math.max(0, remainingBalance),
        totalInterestPaid: totalInterestPaid
      });
    }
    return {
      monthlyPrincipalAndInterest: principalAndInterest,
      monthlyPropertyTax: propertyTax,
      monthlyHomeInsurance: monthlyHomeInsurance,
      monthlyPMI: pmi,
      totalMonthlyPayment: totalMonthlyPayment,
      totalInterestPaid: totalInterestPaid,
      totalCostOfLoan: _loanAmountCalc + totalInterestPaid,
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
<div className="w-full max-w-5xl mx-auto">
      {/* Outer container for animations, matching AmbientHaloLayout style if needed */}
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-10">
        {/* Input Form Column */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={columnVariants} className="space-y-6 p-4 md:p-6 bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-xl">
          <div>
            <label htmlFor="homePrice" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Home Price</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-500 dark:text-slate-400 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                name="homePrice"
                id="homePrice"
                className="block w-full pl-7 pr-3 px-3 py-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out"
                placeholder="0.00"
                value={homePrice === '' ? '' : homePrice}
                onChange={(e) => handleHomePriceChange(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="downPayment" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Down Payment</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 dark:text-slate-400 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="downPayment"
                  id="downPayment"
                  className="block w-full pl-7 pr-12 px-3 py-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out"
                  placeholder="0.00"
                  value={downPayment === '' ? '' : downPayment}
                  onChange={(e) => handleDownPaymentChange(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-slate-500 dark:text-slate-400 sm:text-sm">or</span>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="downPaymentPercent" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Down Payment %</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  name="downPaymentPercent"
                  id="downPaymentPercent"
                  className="block w-full pr-12 px-3 py-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out"
                  placeholder="0.00"
                  value={downPaymentPercent}
                  onChange={(e) => handleDownPaymentPercentChange(Number(e.target.value))}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-slate-500 dark:text-slate-400 sm:text-sm">%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="loanAmount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Loan Amount</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-500 dark:text-slate-400 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                name="loanAmount"
                id="loanAmount"
                className="block w-full pl-7 pr-3 px-3 py-2.5 bg-slate-100/70 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out cursor-not-allowed"
                placeholder="0.00"
                value={loanAmount}
                readOnly
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="interestRate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Interest Rate</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                name="interestRate"
                id="interestRate"
                className="block w-full pr-12 px-3 py-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out"
                placeholder="0.00"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <span className="text-slate-500 dark:text-slate-400 sm:text-sm">%</span>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="loanTerm" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Loan Term</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                name="loanTerm"
                id="loanTerm"
                className="block w-full pr-[4.5rem] px-3 py-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out"
                placeholder="0"
                value={loanTerm}
                onChange={(e) => setLoanTerm(Number(e.target.value))}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <span className="text-slate-500 dark:text-slate-400 sm:text-sm">years</span>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Start Date</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="month"
                name="startDate"
                id="startDate"
                className="block w-full px-3 py-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
          
          {/* Additional Options */}
          <motion.div 
            variants={sectionVariants} 
            initial="hidden" 
            animate="visible" 
            className="mt-6 pt-6 border-t border-slate-300/70 dark:border-slate-600/50"
          >
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Additional Costs</h3>
            
            <label className="flex items-center space-x-3 p-1">
              <input
                type="checkbox"
                className="h-4 w-4 text-purple-600 bg-slate-100/50 border-slate-400/70 rounded focus:ring-purple-500 focus:ring-offset-0 dark:bg-slate-700/50 dark:border-slate-500/70 dark:focus:ring-offset-slate-900 transition-colors duration-150"
                checked={includePropertyTax}
                onChange={() => setIncludePropertyTax(!includePropertyTax)}
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Include Property Tax</span>
            </label>
            
            {includePropertyTax && (
              <div className="ml-6 mb-3">
                <label htmlFor="propertyTaxRate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Property Tax Rate</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    name="propertyTaxRate"
                    id="propertyTaxRate"
                    className="block w-full pr-12 px-3 py-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out"
                    placeholder="0.00"
                    value={propertyTaxRate}
                    onChange={(e) => setPropertyTaxRate(Number(e.target.value))}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span className="text-slate-500 dark:text-slate-400 sm:text-sm">%</span>
                  </div>
                </div>
              </div>
            )}
            
            <label className="flex items-center space-x-3 p-1">
              <input
                type="checkbox"
                className="h-4 w-4 text-purple-600 bg-slate-100/50 border-slate-400/70 rounded focus:ring-purple-500 focus:ring-offset-0 dark:bg-slate-700/50 dark:border-slate-500/70 dark:focus:ring-offset-slate-900 transition-colors duration-150"
                checked={includeHomeInsurance}
                onChange={() => setIncludeHomeInsurance(!includeHomeInsurance)}
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Include Home Insurance</span>
            </label>
            
            {includeHomeInsurance && (
              <div className="ml-6 mb-3">
                <label htmlFor="homeInsurance" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Annual Home Insurance</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 dark:text-slate-400 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    name="homeInsurance"
                    id="homeInsurance"
                    className="block w-full pl-7 pr-3 px-3 py-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out"
                    placeholder="0.00"
                    value={homeInsurance}
                    onChange={(e) => setHomeInsurance(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
            
            <label className="flex items-center space-x-3 p-1">
              <input
                type="checkbox"
                className="h-4 w-4 text-purple-600 bg-slate-100/50 border-slate-400/70 rounded focus:ring-purple-500 focus:ring-offset-0 dark:bg-slate-700/50 dark:border-slate-500/70 dark:focus:ring-offset-slate-900 transition-colors duration-150"
                checked={includePMI}
                onChange={() => setIncludePMI(!includePMI)}
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Include PMI (Private Mortgage Insurance)</span>
            </label>
            
            {includePMI && (
              <div className="ml-7 mt-2 mb-4 space-y-1.5">
                <label htmlFor="pmiRate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">PMI Rate</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    name="pmiRate"
                    id="pmiRate"
                    className="block w-full pr-12 px-3 py-2.5 bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors duration-150 ease-in-out"
                    placeholder="0.00"
                    value={pmiRate}
                    onChange={(e) => setPmiRate(Number(e.target.value))}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span className="text-slate-500 dark:text-slate-400 sm:text-sm">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Closing Input Form Column div */}
        </motion.div>

        {/* Results & Visualization Column */}
        <motion.div custom={1} initial="hidden" animate="visible" variants={columnVariants} className="space-y-8 p-4 md:p-6 bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-xl">
          <div className="bg-purple-50/60 dark:bg-purple-900/40 backdrop-blur-md border border-purple-200/50 dark:border-purple-700/50 rounded-xl shadow-lg p-4 md:p-6">
            <h3 className="text-xl font-semibold text-purple-800 dark:text-purple-200 mb-5">Monthly Payment Breakdown</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Principal & Interest</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(mortgageDetails.monthlyPrincipalAndInterest)}</span>
              </div>
              
              {includePropertyTax && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Property Tax</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(mortgageDetails.monthlyPropertyTax)}</span>
                </div>
              )}
              
              {includeHomeInsurance && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Home Insurance</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(mortgageDetails.monthlyHomeInsurance)}</span>
                </div>
              )}
              
              {includePMI && (downPaymentPercent === '' ? 0 : downPaymentPercent) < 20 && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">PMI</span>
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300">{formatCurrency(mortgageDetails.monthlyPMI)}</span>
                </div>
              )}
              
              <div className="pt-3 border-t border-indigo-300/70 dark:border-indigo-600/50 flex justify-between items-baseline">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Total Monthly Payment</span>
                <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(mortgageDetails.totalMonthlyPayment)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 bg-purple-50/60 dark:bg-purple-900/40 backdrop-blur-md border border-purple-200/50 dark:border-purple-700/50 rounded-xl shadow-lg p-4 md:p-6">
            <h3 className="text-xl font-semibold text-purple-800 dark:text-purple-200 mb-5">Loan Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Loan Amount</span>
                <span className="font-semibold text-purple-700 dark:text-purple-300">{formatCurrency(loanAmount === '' ? 0 : loanAmount)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Interest Paid</span>
                <span className="font-semibold text-red-500 dark:text-red-400">{formatCurrency(mortgageDetails.totalInterestPaid)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Cost of Loan</span>
                <span className="font-semibold text-purple-700 dark:text-purple-300">{formatCurrency(mortgageDetails.totalCostOfLoan)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Loan Payoff Date</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">{formatDate(startDate, (loanTerm === '' ? 0 : loanTerm) * 12)}</span>
              </div>
            </div>
          </div>
          
          {/* Total Payment Distribution Pie Chart - part of results column */}
          <div className="mt-8 bg-slate-100/50 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/70 dark:border-slate-700/50 rounded-xl shadow-lg p-4 md:p-6">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Total Payment Distribution</h3>
            <PieChart
              labels={["Principal", "Interest"]}
              data={[loanAmount === '' ? 0 : loanAmount, mortgageDetails.totalInterestPaid]}
              title="Principal vs. Interest Paid"
            />
            <div className="flex justify-center gap-x-6 mt-4 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex items-center">
                <span style={{ backgroundColor: 'var(--chart-color-1, #3b82f6)' }} className="w-3 h-3 rounded-full mr-1.5"></span> Principal
              </div>
              <div className="flex items-center">
                <span style={{ backgroundColor: 'var(--chart-color-2, #ef4444)' }} className="w-3 h-3 rounded-full mr-1.5"></span> Interest
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Closing Results & Visualization Column div */}
      </motion.div>
    </div> {/* Closing grid div */}

      {/* Amortization Schedule Toggle and Table */}
      <motion.div variants={tableVariants} initial="hidden" animate="visible" className="mt-8 p-4 md:p-6 bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-xl">
        <button
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-all duration-150 ease-in-out"
          onClick={() => setShowAmortizationTable((v) => !v)}
          {showAmortizationTable ? 'Hide' : 'Show'} Amortization Schedule
        </button>
        
        {showAmortizationTable && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }} 
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            className="mt-6 overflow-x-auto bg-slate-50/30 dark:bg-slate-900/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/40 rounded-xl shadow-md p-0.5"
          >
            <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-700/70">
              <thead className="bg-slate-100/70 dark:bg-slate-800/70 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    #
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Payment
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Principal
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Interest
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                {/* Only show first year, then every 12th payment */}
                {mortgageDetails.amortizationSchedule
                  .filter(row => row.paymentNumber <= 12 || row.paymentNumber % 12 === 0 || row.paymentNumber === (loanTerm === '' ? 0 : loanTerm) * 12)
                  .map((row) => (
                    <tr key={row.paymentNumber} className={`transition-colors duration-100 ease-in-out ${row.paymentNumber % 12 === 0 ? 'bg-slate-100/50 dark:bg-slate-800/50' : 'hover:bg-slate-100/40 dark:hover:bg-slate-800/30'}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {row.paymentNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(startDate, row.paymentNumber - 1)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 font-medium">
                        {formatCurrency(row.paymentAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-sky-600 dark:text-sky-400">
                        {formatCurrency(row.principalPaid)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-rose-600 dark:text-rose-400">
                        {formatCurrency(row.interestPaid)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 font-medium">
                        {formatCurrency(row.remainingBalance)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </motion.div>
    </div> {/* Closing grid div */}
    </div> /* Closing main w-full container div */
  )
}
