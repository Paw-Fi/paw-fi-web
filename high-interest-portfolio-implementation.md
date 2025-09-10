# High-Interest Portfolio Implementation Guide

## Overview

This document provides a comprehensive implementation guide for the High-Interest Portfolio System in Moneko. The system focuses on passive income generation through dividend-paying stocks and high-yield investments, targeting users who want to "live on interest" rather than engage in active trading.

## Core Philosophy

- **Education-First Approach**: Teach users about dividend investing fundamentals
- **Passive Income Focus**: Emphasize sustainable, recurring income over capital gains  
- **Simplicity Over Complexity**: Avoid complex trading strategies, focus on buy-and-hold
- **Risk-Aware Growth**: Balance yield with dividend sustainability and growth

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
1. Database schema implementation
2. Core data models and TypeScript interfaces
3. Basic high-interest stock data integration
4. Initial portfolio widget components

### Phase 2: Portfolio Management (Weeks 3-4)
1. Portfolio builder and management interface
2. Income tracking dashboard
3. Basic calculators integration
4. Goal tracker integration

### Phase 3: Intelligence & Analytics (Weeks 5-6)
1. AI-powered stock recommendations
2. Portfolio analytics and optimization
3. Advanced income projections
4. Educational content integration

### Phase 4: Enhancement & Integration (Weeks 7-8)
1. Financial health integration
2. AI chat advisor specialization
3. Advanced reporting and insights
4. Testing and optimization

## Technical Implementation

### 1. Database Schema Implementation

Create the following database tables in Supabase:

```sql
-- High-interest stocks master data
CREATE TABLE high_interest_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    current_price DECIMAL(10,2),
    dividend_yield DECIMAL(5,2),
    dividend_per_share DECIMAL(8,4),
    ex_dividend_date DATE,
    payment_date DATE,
    dividend_frequency VARCHAR(20) CHECK (dividend_frequency IN ('monthly', 'quarterly', 'semi-annual', 'annual')),
    payout_ratio DECIMAL(5,2),
    dividend_growth_rate DECIMAL(5,2),
    market_cap BIGINT,
    sector VARCHAR(100),
    risk_level VARCHAR(20) CHECK (risk_level IN ('conservative', 'moderate', 'growth')),
    dividend_aristocrat BOOLEAN DEFAULT FALSE,
    yield_stability_score INTEGER CHECK (yield_stability_score BETWEEN 1 AND 10),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User portfolio holdings
CREATE TABLE portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES high_interest_stocks(id) ON DELETE CASCADE,
    shares_owned DECIMAL(10,4) NOT NULL CHECK (shares_owned > 0),
    average_cost_basis DECIMAL(10,2) NOT NULL CHECK (average_cost_basis > 0),
    purchase_date DATE NOT NULL,
    current_value DECIMAL(12,2),
    unrealized_gain_loss DECIMAL(12,2),
    annual_dividend_income DECIMAL(10,2),
    quarterly_dividend_income DECIMAL(10,2),
    yield_on_cost DECIMAL(5,2),
    last_dividend_received DATE,
    next_dividend_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User income profiles
CREATE TABLE income_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    target_monthly_income DECIMAL(10,2) NOT NULL CHECK (target_monthly_income > 0),
    target_annual_income DECIMAL(12,2) GENERATED ALWAYS AS (target_monthly_income * 12) STORED,
    current_monthly_income DECIMAL(10,2) DEFAULT 0,
    current_annual_income DECIMAL(12,2) GENERATED ALWAYS AS (current_monthly_income * 12) STORED,
    income_gap DECIMAL(12,2) GENERATED ALWAYS AS ((target_monthly_income * 12) - (current_monthly_income * 12)) STORED,
    required_investment DECIMAL(15,2),
    target_yield DECIMAL(5,2) NOT NULL CHECK (target_yield > 0),
    risk_tolerance VARCHAR(20) NOT NULL CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    time_horizon INTEGER NOT NULL CHECK (time_horizon > 0),
    preferred_sectors TEXT[], -- Array of preferred sectors
    dividend_reinvestment BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dividend payment history
CREATE TABLE dividend_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holding_id UUID REFERENCES portfolio_holdings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES high_interest_stocks(id),
    payment_date DATE NOT NULL,
    shares_owned DECIMAL(10,4) NOT NULL,
    dividend_per_share DECIMAL(8,4) NOT NULL,
    total_dividend DECIMAL(10,2) NOT NULL,
    tax_withheld DECIMAL(10,2) DEFAULT 0,
    net_dividend DECIMAL(10,2) NOT NULL,
    reinvested BOOLEAN DEFAULT FALSE,
    reinvested_shares DECIMAL(10,4) DEFAULT 0,
    reinvestment_price DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio snapshots for historical tracking
CREATE TABLE portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_portfolio_value DECIMAL(15,2) NOT NULL,
    total_annual_income DECIMAL(12,2) NOT NULL,
    weighted_average_yield DECIMAL(5,2) NOT NULL,
    stock_count INTEGER NOT NULL,
    diversification_score DECIMAL(3,2), -- 0-1 scale
    risk_score DECIMAL(3,2), -- 0-1 scale
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_high_interest_stocks_symbol ON high_interest_stocks(symbol);
CREATE INDEX idx_high_interest_stocks_sector ON high_interest_stocks(sector);
CREATE INDEX idx_high_interest_stocks_yield ON high_interest_stocks(dividend_yield DESC);
CREATE INDEX idx_portfolio_holdings_user_id ON portfolio_holdings(user_id);
CREATE INDEX idx_dividend_payments_user_id ON dividend_payments(user_id);
CREATE INDEX idx_dividend_payments_payment_date ON dividend_payments(payment_date DESC);
CREATE INDEX idx_portfolio_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date DESC);

-- RLS Policies
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividend_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view their own portfolio holdings" ON portfolio_holdings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own income profiles" ON income_profiles  
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own dividend payments" ON dividend_payments
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own portfolio snapshots" ON portfolio_snapshots
    FOR ALL USING (auth.uid() = user_id);

-- High-interest stocks are publicly readable
CREATE POLICY "High interest stocks are publicly readable" ON high_interest_stocks
    FOR SELECT USING (true);
```

### 2. TypeScript Interfaces and Types

Create `src/types/high-interest-portfolio.types.ts`:

```typescript
// Core data models
export interface HighInterestStock {
  id: string;
  symbol: string;
  company_name: string;
  current_price: number;
  dividend_yield: number;
  dividend_per_share: number;
  ex_dividend_date: string;
  payment_date: string;
  dividend_frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  payout_ratio: number;
  dividend_growth_rate: number;
  market_cap: number;
  sector: string;
  risk_level: 'conservative' | 'moderate' | 'growth';
  dividend_aristocrat: boolean;
  yield_stability_score: number;
  last_updated: string;
  created_at: string;
}

export interface PortfolioHolding {
  id: string;
  user_id: string;
  stock_id: string;
  stock?: HighInterestStock; // Populated via join
  shares_owned: number;
  average_cost_basis: number;
  purchase_date: string;
  current_value: number;
  unrealized_gain_loss: number;
  annual_dividend_income: number;
  quarterly_dividend_income: number;
  yield_on_cost: number;
  last_dividend_received: string | null;
  next_dividend_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeProfile {
  id: string;
  user_id: string;
  target_monthly_income: number;
  target_annual_income: number;
  current_monthly_income: number;
  current_annual_income: number;
  income_gap: number;
  required_investment: number;
  target_yield: number;
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
  time_horizon: number;
  preferred_sectors: string[];
  dividend_reinvestment: boolean;
  created_at: string;
  updated_at: string;
}

export interface DividendPayment {
  id: string;
  holding_id: string;
  user_id: string;
  stock_id: string;
  stock?: HighInterestStock;
  payment_date: string;
  shares_owned: number;
  dividend_per_share: number;
  total_dividend: number;
  tax_withheld: number;
  net_dividend: number;
  reinvested: boolean;
  reinvested_shares: number;
  reinvestment_price: number | null;
  created_at: string;
}

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_portfolio_value: number;
  total_annual_income: number;
  weighted_average_yield: number;
  stock_count: number;
  diversification_score: number;
  risk_score: number;
  created_at: string;
}

// Analytics and calculations
export interface PortfolioAnalytics {
  total_portfolio_value: number;
  total_annual_income: number;
  total_monthly_income: number;
  weighted_average_yield: number;
  dividend_growth_rate: number;
  income_stability_score: number;
  sector_diversification: SectorAllocation[];
  yield_distribution: YieldBucket[];
  risk_metrics: PortfolioRiskMetrics;
  projections: IncomeProjections;
}

export interface SectorAllocation {
  sector: string;
  allocation_percentage: number;
  dividend_contribution: number;
  average_yield: number;
  stock_count: number;
}

export interface YieldBucket {
  yield_range: string;
  allocation_percentage: number;
  stock_count: number;
  income_contribution: number;
}

export interface PortfolioRiskMetrics {
  portfolio_beta: number;
  dividend_coverage_ratio: number;
  concentration_risk: number;
  sector_concentration: number;
  yield_sustainability_score: number;
}

export interface IncomeProjections {
  one_year_income: number;
  five_year_income: number;
  ten_year_income: number;
  retirement_income_potential: number;
  dividend_growth_impact: number;
}

// Calculator interfaces
export interface IncomeCalculatorInputs {
  target_monthly_income: number;
  current_savings: number;
  monthly_contribution: number;
  target_yield: number;
  time_horizon: number;
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
  reinvest_dividends: boolean;
  preferred_sectors?: string[];
}

export interface IncomeCalculatorResult {
  required_investment: number;
  monthly_savings_needed: number;
  projected_portfolio_value: number;
  projected_annual_income: number;
  yield_on_investment: number;
  years_to_goal: number;
  dividend_reinvestment_impact: number;
  recommended_allocation: StockAllocation[];
  risk_assessment: string;
  confidence_level: number;
}

export interface StockAllocation {
  stock_symbol: string;
  company_name: string;
  allocation_percentage: number;
  shares_to_buy: number;
  investment_amount: number;
  expected_annual_dividend: number;
  current_yield: number;
  risk_level: string;
  sector: string;
  rationale: string;
}

// Portfolio optimization
export interface OptimizationSuggestion {
  type: 'rebalance' | 'add_position' | 'reduce_position' | 'sector_diversify';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact_description: string;
  suggested_actions: OptimizationAction[];
  projected_income_change: number;
  risk_impact: 'increase' | 'decrease' | 'neutral';
}

export interface OptimizationAction {
  action_type: 'buy' | 'sell' | 'rebalance';
  stock_symbol: string;
  shares: number;
  target_allocation: number;
  reasoning: string;
}

// Stock screening and filtering
export interface StockScreeningCriteria {
  min_yield?: number;
  max_yield?: number;
  min_market_cap?: number;
  sectors?: string[];
  risk_levels?: ('conservative' | 'moderate' | 'growth')[];
  dividend_aristocrats_only?: boolean;
  min_stability_score?: number;
  min_dividend_growth?: number;
  max_payout_ratio?: number;
}

export interface StockAnalysis {
  stock: HighInterestStock;
  analysis_date: string;
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'caution' | 'avoid';
  dividend_sustainability_score: number;
  growth_potential_score: number;
  risk_assessment_score: number;
  key_metrics: {
    debt_to_equity: number;
    free_cash_flow: number;
    dividend_coverage_ratio: number;
    revenue_growth: number;
    earnings_growth: number;
  };
  pros: string[];
  cons: string[];
  analyst_notes: string;
}

// Widget data interfaces
export interface IHighInterestPortfolioData {
  holdings: PortfolioHolding[];
  total_value: number;
  total_annual_income: number;
  weighted_average_yield: number;
  top_performers: PortfolioHolding[];
  recent_activity: DividendPayment[];
}

export interface IDividendIncomeData {
  current_monthly_income: number;
  projected_monthly_income: number;
  target_monthly_income: number;
  progress_percentage: number;
  upcoming_payments: DividendPayment[];
  payment_history: DividendPayment[];
  income_trend: { month: string; amount: number }[];
}

export interface IYieldTrackerData {
  current_portfolio_yield: number;
  target_yield: number;
  yield_by_sector: SectorAllocation[];
  yield_distribution: YieldBucket[];
  top_yielding_stocks: PortfolioHolding[];
}

export interface IIncomeProjectionData {
  current_income: number;
  projected_income: IncomeProjections;
  growth_scenarios: {
    conservative: number;
    moderate: number;
    optimistic: number;
  };
  milestone_dates: { income_level: number; estimated_date: string }[];
}
```

### 3. Widget Components Implementation

Create `src/components/profile/widgets/HighInterestPortfolioWidgets.tsx`:

```typescript
import React from 'react';
import { Widget } from './Widget';
import { 
  IHighInterestPortfolioWidget, 
  IDividendIncomeWidget, 
  IYieldTrackerWidget, 
  IIncomeProjectionWidget 
} from '@/types/high-interest-portfolio.types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartLine, 
  faDollarSign, 
  faPercent, 
  faCalendar,
  faTrendingUp,
  faCoins
} from '@fortawesome/free-solid-svg-icons';

export function HighInterestPortfolioWidget({ widget }: { widget: IHighInterestPortfolioWidget }) {
  const { holdings, total_value, total_annual_income, weighted_average_yield, top_performers } = widget.data;

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
            High-Interest Portfolio
          </h3>
          <FontAwesomeIcon icon={faChartLine} className="text-primary h-5 w-5" />
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Value</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
              ${total_value.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="text-sm text-slate-600 dark:text-slate-400">Annual Income</div>
            <div className="text-xl font-bold text-green-600">
              ${total_annual_income.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mb-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">Weighted Avg. Yield</div>
          <div className="text-2xl font-bold text-primary">
            {weighted_average_yield.toFixed(2)}%
          </div>
        </div>

        {/* Top Performers */}
        <div>
          <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Top Performers</h4>
          <div className="space-y-2">
            {top_performers.slice(0, 3).map((holding) => (
              <div key={holding.id} className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">{holding.stock?.symbol}</div>
                  <div className="text-xs text-slate-500">{holding.stock?.company_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">
                    {holding.stock?.dividend_yield.toFixed(2)}%
                  </div>
                  <div className="text-xs text-slate-500">
                    ${holding.annual_dividend_income.toFixed(0)}/yr
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Holdings Count */}
        <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-700">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {holdings.length} holdings • {holdings.filter(h => h.stock?.dividend_aristocrat).length} dividend aristocrats
          </span>
        </div>
      </div>
    </Widget>
  );
}

export function DividendIncomeWidget({ widget }: { widget: IDividendIncomeWidget }) {
  const { 
    current_monthly_income, 
    target_monthly_income, 
    progress_percentage, 
    upcoming_payments,
    income_trend 
  } = widget.data;

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
            Dividend Income Tracker
          </h3>
          <FontAwesomeIcon icon={faDollarSign} className="text-green-600 h-5 w-5" />
        </div>

        {/* Current vs Target */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Monthly Income Progress</span>
            <span className="text-sm font-bold text-green-700 dark:text-green-400">
              {progress_percentage.toFixed(1)}%
            </span>
          </div>
          
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-3">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress_percentage, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              Current: ${current_monthly_income.toLocaleString()}/mo
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              Target: ${target_monthly_income.toLocaleString()}/mo
            </span>
          </div>
        </div>

        {/* Upcoming Payments */}
        <div>
          <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center">
            <FontAwesomeIcon icon={faCalendar} className="mr-2 h-4 w-4" />
            Next Payments
          </h4>
          <div className="space-y-2">
            {upcoming_payments.slice(0, 3).map((payment) => (
              <div key={payment.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                <div>
                  <div className="font-medium text-sm">{payment.stock?.symbol}</div>
                  <div className="text-xs text-slate-500">{new Date(payment.payment_date).toLocaleDateString()}</div>
                </div>
                <div className="text-sm font-medium text-green-600">
                  ${payment.total_dividend.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mini Trend Chart */}
        <div>
          <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Income Trend</h4>
          <div className="flex items-end space-x-1 h-16">
            {income_trend.slice(-12).map((month, index) => {
              const maxAmount = Math.max(...income_trend.map(m => m.amount));
              const height = (month.amount / maxAmount) * 100;
              return (
                <div 
                  key={index}
                  className="bg-green-500 rounded-sm flex-1 min-h-[2px]"
                  style={{ height: `${height}%` }}
                  title={`${month.month}: $${month.amount.toFixed(0)}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </Widget>
  );
}

export function YieldTrackerWidget({ widget }: { widget: IYieldTrackerWidget }) {
  const { current_portfolio_yield, target_yield, yield_by_sector, top_yielding_stocks } = widget.data;

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
            Yield Tracker
          </h3>
          <FontAwesomeIcon icon={faPercent} className="text-blue-600 h-5 w-5" />
        </div>

        {/* Current vs Target Yield */}
        <div className="text-center mb-4">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {current_portfolio_yield.toFixed(2)}%
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Current Yield • Target: {target_yield.toFixed(2)}%
          </div>
          <div className={`text-sm font-medium mt-1 ${
            current_portfolio_yield >= target_yield ? 'text-green-600' : 'text-amber-600'
          }`}>
            {current_portfolio_yield >= target_yield ? '✓ Target Met' : `${(target_yield - current_portfolio_yield).toFixed(2)}% to go`}
          </div>
        </div>

        {/* Yield by Sector */}
        <div>
          <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Yield by Sector</h4>
          <div className="space-y-1">
            {yield_by_sector.slice(0, 4).map((sector) => (
              <div key={sector.sector} className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                  {sector.sector}
                </span>
                <span className="text-sm font-medium text-blue-600">
                  {sector.average_yield.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Yielding Stocks */}
        <div>
          <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Highest Yields</h4>
          <div className="space-y-1">
            {top_yielding_stocks.slice(0, 3).map((holding) => (
              <div key={holding.id} className="flex justify-between items-center">
                <span className="text-sm font-medium">{holding.stock?.symbol}</span>
                <span className="text-sm font-bold text-green-600">
                  {holding.stock?.dividend_yield.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Widget>
  );
}

export function IncomeProjectionWidget({ widget }: { widget: IIncomeProjectionWidget }) {
  const { current_income, projected_income, growth_scenarios, milestone_dates } = widget.data;

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
            Income Projections
          </h3>
          <FontAwesomeIcon icon={faTrendingUp} className="text-purple-600 h-5 w-5" />
        </div>

        {/* Current Income */}
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-1">
            ${current_income.toLocaleString()}/year
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Current Annual Income
          </div>
        </div>

        {/* Growth Scenarios */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
            <div className="text-sm text-red-700 dark:text-red-400 font-medium">Conservative</div>
            <div className="text-lg font-bold text-red-800 dark:text-red-300">
              ${growth_scenarios.conservative.toLocaleString()}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400">5 years</div>
          </div>
          <div className="text-center bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
            <div className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">Moderate</div>
            <div className="text-lg font-bold text-yellow-800 dark:text-yellow-300">
              ${growth_scenarios.moderate.toLocaleString()}
            </div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400">5 years</div>
          </div>
          <div className="text-center bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
            <div className="text-sm text-green-700 dark:text-green-400 font-medium">Optimistic</div>
            <div className="text-lg font-bold text-green-800 dark:text-green-300">
              ${growth_scenarios.optimistic.toLocaleString()}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">5 years</div>
          </div>
        </div>

        {/* Key Milestones */}
        <div>
          <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Income Milestones</h4>
          <div className="space-y-1">
            {milestone_dates.slice(0, 3).map((milestone, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  ${milestone.income_level.toLocaleString()}/year
                </span>
                <span className="font-medium text-purple-600">
                  {milestone.estimated_date}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Retirement Potential */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-3">
          <div className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-1">
            Retirement Income Potential
          </div>
          <div className="text-xl font-bold text-purple-800 dark:text-purple-300">
            ${projected_income.retirement_income_potential.toLocaleString()}/year
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400">
            At current growth rate
          </div>
        </div>
      </div>
    </Widget>
  );
}
```

### 4. Service Layer Implementation

Create `src/services/high-interest-portfolio.service.ts`:

```typescript
import { supabase } from '@/lib/supabase';
import { 
  HighInterestStock, 
  PortfolioHolding, 
  IncomeProfile, 
  DividendPayment,
  PortfolioAnalytics,
  StockScreeningCriteria,
  IncomeCalculatorInputs,
  IncomeCalculatorResult,
  OptimizationSuggestion
} from '@/types/high-interest-portfolio.types';

export class HighInterestPortfolioService {
  // Stock data operations
  async getHighYieldStocks(criteria: StockScreeningCriteria = {}): Promise<HighInterestStock[]> {
    let query = supabase
      .from('high_interest_stocks')
      .select('*')
      .order('dividend_yield', { ascending: false });

    // Apply filtering criteria
    if (criteria.min_yield) {
      query = query.gte('dividend_yield', criteria.min_yield);
    }
    if (criteria.max_yield) {
      query = query.lte('dividend_yield', criteria.max_yield);
    }
    if (criteria.min_market_cap) {
      query = query.gte('market_cap', criteria.min_market_cap);
    }
    if (criteria.sectors && criteria.sectors.length > 0) {
      query = query.in('sector', criteria.sectors);
    }
    if (criteria.risk_levels && criteria.risk_levels.length > 0) {
      query = query.in('risk_level', criteria.risk_levels);
    }
    if (criteria.dividend_aristocrats_only) {
      query = query.eq('dividend_aristocrat', true);
    }
    if (criteria.min_stability_score) {
      query = query.gte('yield_stability_score', criteria.min_stability_score);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error('Error fetching high yield stocks:', error);
      throw error;
    }

    return data || [];
  }

  async getStock(symbol: string): Promise<HighInterestStock | null> {
    const { data, error } = await supabase
      .from('high_interest_stocks')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .single();

    if (error) {
      console.error('Error fetching stock:', error);
      return null;
    }

    return data;
  }

  // Portfolio operations
  async getUserPortfolio(userId: string): Promise<PortfolioHolding[]> {
    const { data, error } = await supabase
      .from('portfolio_holdings')
      .select(`
        *,
        stock:high_interest_stocks(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user portfolio:', error);
      throw error;
    }

    return data || [];
  }

  async addHolding(holding: Omit<PortfolioHolding, 'id' | 'created_at' | 'updated_at'>): Promise<PortfolioHolding> {
    // Calculate current value and income
    const stock = await this.getStock(holding.stock_id);
    if (!stock) {
      throw new Error('Stock not found');
    }

    const calculatedHolding = {
      ...holding,
      current_value: holding.shares_owned * stock.current_price,
      unrealized_gain_loss: (holding.shares_owned * stock.current_price) - (holding.shares_owned * holding.average_cost_basis),
      annual_dividend_income: holding.shares_owned * stock.dividend_per_share * this.getDividendFrequencyMultiplier(stock.dividend_frequency),
      quarterly_dividend_income: holding.shares_owned * stock.dividend_per_share,
      yield_on_cost: (stock.dividend_per_share * this.getDividendFrequencyMultiplier(stock.dividend_frequency)) / holding.average_cost_basis * 100,
      next_dividend_date: stock.payment_date
    };

    const { data, error } = await supabase
      .from('portfolio_holdings')
      .insert(calculatedHolding)
      .select(`
        *,
        stock:high_interest_stocks(*)
      `)
      .single();

    if (error) {
      console.error('Error adding holding:', error);
      throw error;
    }

    return data;
  }

  async updateHolding(holdingId: string, updates: Partial<PortfolioHolding>): Promise<PortfolioHolding> {
    const { data, error } = await supabase
      .from('portfolio_holdings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', holdingId)
      .select(`
        *,
        stock:high_interest_stocks(*)
      `)
      .single();

    if (error) {
      console.error('Error updating holding:', error);
      throw error;
    }

    return data;
  }

  async removeHolding(holdingId: string): Promise<void> {
    const { error } = await supabase
      .from('portfolio_holdings')
      .delete()
      .eq('id', holdingId);

    if (error) {
      console.error('Error removing holding:', error);
      throw error;
    }
  }

  // Income profile operations
  async getIncomeProfile(userId: string): Promise<IncomeProfile | null> {
    const { data, error } = await supabase
      .from('income_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is OK
      console.error('Error fetching income profile:', error);
      throw error;
    }

    return data;
  }

  async upsertIncomeProfile(profile: Omit<IncomeProfile, 'id' | 'created_at' | 'updated_at' | 'target_annual_income' | 'current_annual_income' | 'income_gap'>): Promise<IncomeProfile> {
    const { data, error } = await supabase
      .from('income_profiles')
      .upsert(profile)
      .select('*')
      .single();

    if (error) {
      console.error('Error upserting income profile:', error);
      throw error;
    }

    return data;
  }

  // Dividend payment operations
  async getDividendPayments(userId: string, limit: number = 50): Promise<DividendPayment[]> {
    const { data, error } = await supabase
      .from('dividend_payments')
      .select(`
        *,
        stock:high_interest_stocks(*)
      `)
      .eq('user_id', userId)
      .order('payment_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching dividend payments:', error);
      throw error;
    }

    return data || [];
  }

  async getUpcomingPayments(userId: string): Promise<DividendPayment[]> {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);
    
    // This would typically come from portfolio holdings with projected payment dates
    // For now, return empty array - would need more complex logic to project future payments
    return [];
  }

  // Analytics operations
  async calculatePortfolioAnalytics(userId: string): Promise<PortfolioAnalytics> {
    const holdings = await this.getUserPortfolio(userId);
    
    if (holdings.length === 0) {
      return {
        total_portfolio_value: 0,
        total_annual_income: 0,
        total_monthly_income: 0,
        weighted_average_yield: 0,
        dividend_growth_rate: 0,
        income_stability_score: 0,
        sector_diversification: [],
        yield_distribution: [],
        risk_metrics: {
          portfolio_beta: 0,
          dividend_coverage_ratio: 0,
          concentration_risk: 0,
          sector_concentration: 0,
          yield_sustainability_score: 0
        },
        projections: {
          one_year_income: 0,
          five_year_income: 0,
          ten_year_income: 0,
          retirement_income_potential: 0,
          dividend_growth_impact: 0
        }
      };
    }

    const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const totalAnnualIncome = holdings.reduce((sum, h) => sum + h.annual_dividend_income, 0);
    const weightedYield = totalAnnualIncome / totalValue * 100;

    // Calculate sector diversification
    const sectorAllocation = this.calculateSectorAllocation(holdings);
    const yieldDistribution = this.calculateYieldDistribution(holdings);
    const avgDividendGrowth = holdings.reduce((sum, h) => sum + (h.stock?.dividend_growth_rate || 0), 0) / holdings.length;

    return {
      total_portfolio_value: totalValue,
      total_annual_income: totalAnnualIncome,
      total_monthly_income: totalAnnualIncome / 12,
      weighted_average_yield: weightedYield,
      dividend_growth_rate: avgDividendGrowth,
      income_stability_score: this.calculateStabilityScore(holdings),
      sector_diversification: sectorAllocation,
      yield_distribution: yieldDistribution,
      risk_metrics: this.calculateRiskMetrics(holdings),
      projections: this.calculateIncomeProjections(holdings, avgDividendGrowth)
    };
  }

  // Calculator operations
  async calculateIncomeRequirement(inputs: IncomeCalculatorInputs): Promise<IncomeCalculatorResult> {
    const {
      target_monthly_income,
      current_savings,
      monthly_contribution,
      target_yield,
      time_horizon,
      risk_tolerance,
      reinvest_dividends
    } = inputs;

    const target_annual_income = target_monthly_income * 12;
    const required_investment = target_annual_income / (target_yield / 100);
    const investment_gap = Math.max(0, required_investment - current_savings);
    const monthly_savings_needed = investment_gap / (time_horizon * 12);

    // Calculate compound growth if dividends are reinvested
    let projected_value = current_savings;
    const monthly_rate = target_yield / 100 / 12;
    
    for (let i = 0; i < time_horizon * 12; i++) {
      projected_value = projected_value * (1 + monthly_rate) + monthly_contribution;
    }

    const recommended_allocation = await this.generateRecommendedAllocation(
      required_investment,
      risk_tolerance,
      target_yield
    );

    return {
      required_investment,
      monthly_savings_needed: Math.max(0, monthly_savings_needed),
      projected_portfolio_value: projected_value,
      projected_annual_income: projected_value * (target_yield / 100),
      yield_on_investment: target_yield,
      years_to_goal: investment_gap > 0 ? Math.ceil(investment_gap / (monthly_contribution * 12)) : 0,
      dividend_reinvestment_impact: reinvest_dividends ? projected_value - required_investment : 0,
      recommended_allocation,
      risk_assessment: this.getRiskAssessment(risk_tolerance),
      confidence_level: this.calculateConfidenceLevel(target_yield, risk_tolerance)
    };
  }

  // Private helper methods
  private getDividendFrequencyMultiplier(frequency: string): number {
    switch (frequency) {
      case 'monthly': return 12;
      case 'quarterly': return 4;
      case 'semi-annual': return 2;
      case 'annual': return 1;
      default: return 4;
    }
  }

  private calculateSectorAllocation(holdings: PortfolioHolding[]): SectorAllocation[] {
    const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const sectorMap = new Map<string, { value: number; income: number; count: number; yieldSum: number }>();

    holdings.forEach(holding => {
      const sector = holding.stock?.sector || 'Unknown';
      const current = sectorMap.get(sector) || { value: 0, income: 0, count: 0, yieldSum: 0 };
      
      sectorMap.set(sector, {
        value: current.value + holding.current_value,
        income: current.income + holding.annual_dividend_income,
        count: current.count + 1,
        yieldSum: current.yieldSum + (holding.stock?.dividend_yield || 0)
      });
    });

    return Array.from(sectorMap.entries()).map(([sector, data]) => ({
      sector,
      allocation_percentage: (data.value / totalValue) * 100,
      dividend_contribution: data.income,
      average_yield: data.yieldSum / data.count,
      stock_count: data.count
    }));
  }

  private calculateYieldDistribution(holdings: PortfolioHolding[]): YieldBucket[] {
    const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const totalIncome = holdings.reduce((sum, h) => sum + h.annual_dividend_income, 0);
    
    const buckets = [
      { range: '0-3%', min: 0, max: 3 },
      { range: '3-4%', min: 3, max: 4 },
      { range: '4-5%', min: 4, max: 5 },
      { range: '5-6%', min: 5, max: 6 },
      { range: '6%+', min: 6, max: 100 }
    ];

    return buckets.map(bucket => {
      const bucketsHoldings = holdings.filter(h => {
        const yield = h.stock?.dividend_yield || 0;
        return yield >= bucket.min && yield < bucket.max;
      });

      const bucketValue = bucketsHoldings.reduce((sum, h) => sum + h.current_value, 0);
      const bucketIncome = bucketsHoldings.reduce((sum, h) => sum + h.annual_dividend_income, 0);

      return {
        yield_range: bucket.range,
        allocation_percentage: totalValue > 0 ? (bucketValue / totalValue) * 100 : 0,
        stock_count: bucketsHoldings.length,
        income_contribution: bucketIncome
      };
    }).filter(bucket => bucket.stock_count > 0);
  }

  private calculateStabilityScore(holdings: PortfolioHolding[]): number {
    if (holdings.length === 0) return 0;
    
    const avgStability = holdings.reduce((sum, h) => {
      return sum + (h.stock?.yield_stability_score || 5);
    }, 0) / holdings.length;

    // Factor in dividend aristocrats
    const aristocratRatio = holdings.filter(h => h.stock?.dividend_aristocrat).length / holdings.length;
    
    return Math.min(10, avgStability + (aristocratRatio * 2));
  }

  private calculateRiskMetrics(holdings: PortfolioHolding[]): any {
    // Simplified risk calculations
    const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const largestPosition = Math.max(...holdings.map(h => h.current_value));
    const concentrationRisk = totalValue > 0 ? (largestPosition / totalValue) * 100 : 0;

    return {
      portfolio_beta: 0.85, // Would need market data
      dividend_coverage_ratio: 2.5, // Would need earnings data
      concentration_risk: concentrationRisk,
      sector_concentration: this.calculateSectorConcentration(holdings),
      yield_sustainability_score: this.calculateYieldSustainability(holdings)
    };
  }

  private calculateSectorConcentration(holdings: PortfolioHolding[]): number {
    const sectorAllocation = this.calculateSectorAllocation(holdings);
    const maxSectorAllocation = Math.max(...sectorAllocation.map(s => s.allocation_percentage));
    return maxSectorAllocation;
  }

  private calculateYieldSustainability(holdings: PortfolioHolding[]): number {
    if (holdings.length === 0) return 0;
    
    const avgPayoutRatio = holdings.reduce((sum, h) => {
      return sum + (h.stock?.payout_ratio || 50);
    }, 0) / holdings.length;

    // Lower payout ratio = higher sustainability
    return Math.max(0, 100 - avgPayoutRatio);
  }

  private calculateIncomeProjections(holdings: PortfolioHolding[], avgGrowthRate: number): any {
    const currentIncome = holdings.reduce((sum, h) => sum + h.annual_dividend_income, 0);
    
    return {
      one_year_income: currentIncome * (1 + avgGrowthRate / 100),
      five_year_income: currentIncome * Math.pow(1 + avgGrowthRate / 100, 5),
      ten_year_income: currentIncome * Math.pow(1 + avgGrowthRate / 100, 10),
      retirement_income_potential: currentIncome * Math.pow(1 + avgGrowthRate / 100, 25),
      dividend_growth_impact: currentIncome * (Math.pow(1 + avgGrowthRate / 100, 10) - 1)
    };
  }

  private async generateRecommendedAllocation(
    investmentAmount: number,
    riskTolerance: string,
    targetYield: number
  ): Promise<StockAllocation[]> {
    // Get stocks based on risk tolerance
    const criteria: StockScreeningCriteria = {
      min_yield: targetYield * 0.8, // Allow 20% variance
      max_yield: targetYield * 1.2,
      risk_levels: riskTolerance === 'conservative' ? ['conservative'] : 
                  riskTolerance === 'moderate' ? ['conservative', 'moderate'] :
                  ['conservative', 'moderate', 'growth']
    };

    const stocks = await this.getHighYieldStocks(criteria);
    
    // Simple allocation strategy - equal weight top 10 stocks
    const topStocks = stocks.slice(0, 10);
    const allocationPerStock = 100 / topStocks.length;

    return topStocks.map(stock => {
      const allocation = investmentAmount * (allocationPerStock / 100);
      const shares = Math.floor(allocation / stock.current_price);
      
      return {
        stock_symbol: stock.symbol,
        company_name: stock.company_name,
        allocation_percentage: allocationPerStock,
        shares_to_buy: shares,
        investment_amount: shares * stock.current_price,
        expected_annual_dividend: shares * stock.dividend_per_share * this.getDividendFrequencyMultiplier(stock.dividend_frequency),
        current_yield: stock.dividend_yield,
        risk_level: stock.risk_level,
        sector: stock.sector,
        rationale: `High-quality ${stock.risk_level} risk dividend stock with ${stock.dividend_yield.toFixed(1)}% yield`
      };
    });
  }

  private getRiskAssessment(riskTolerance: string): string {
    switch (riskTolerance) {
      case 'conservative':
        return 'Low risk portfolio focused on dividend aristocrats and utilities';
      case 'moderate':
        return 'Balanced portfolio with mix of stable and growth dividend stocks';
      case 'aggressive':
        return 'Higher risk portfolio including growth stocks and REITs';
      default:
        return 'Balanced approach recommended';
    }
  }

  private calculateConfidenceLevel(targetYield: number, riskTolerance: string): number {
    // Higher yields = lower confidence, conservative approach = higher confidence
    let confidence = 90;
    
    if (targetYield > 6) confidence -= 20;
    if (targetYield > 8) confidence -= 20;
    if (riskTolerance === 'aggressive') confidence -= 10;
    if (riskTolerance === 'conservative') confidence += 10;
    
    return Math.max(50, Math.min(95, confidence));
  }
}

// Singleton instance
export const portfolioService = new HighInterestPortfolioService();
```

### 5. Integration with Existing Goal Tracker

Extend `src/components/goal-tracker/types/goal-types.ts`:

```typescript
// Add to existing GoalType
export type GoalType = 
  | 'emergency_fund' 
  | 'vacation' 
  | 'car_purchase' 
  | 'home_purchase' 
  | 'retirement'
  | 'dividend_income'; // New goal type

// Add dividend income goal interface
export interface DividendIncomeGoal extends FinancialGoal {
  goal_type: 'dividend_income';
  target_monthly_income: number;
  target_annual_yield: number;
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
  preferred_sectors: string[];
  dividend_reinvestment: boolean;
  income_timeline: number;
  portfolio_allocation?: {
    stocks: StockAllocation[];
    total_investment: number;
    projected_yield: number;
  };
}
```

Create `src/components/goal-tracker/questionnaire/DividendIncomeQuestionnaire.tsx`:

```typescript
import React, { useState } from 'react';
import { FormQuestion } from '@/components/ui/form-question';
import { Button } from '@/components/ui/button';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { portfolioService } from '@/services/high-interest-portfolio.service';

interface DividendIncomeQuestionnaireProps {
  onComplete: (data: any) => void;
  onBack: () => void;
}

const SECTORS = [
  { value: 'Technology', label: 'Technology' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Financials', label: 'Financial Services' },
  { value: 'Utilities', label: 'Utilities' },
  { value: 'Consumer Staples', label: 'Consumer Staples' },
  { value: 'Real Estate', label: 'Real Estate (REITs)' },
  { value: 'Energy', label: 'Energy' },
  { value: 'Industrials', label: 'Industrials' },
  { value: 'Materials', label: 'Materials' },
  { value: 'Telecommunications', label: 'Telecommunications' }
];

export const DividendIncomeQuestionnaire: React.FC<DividendIncomeQuestionnaireProps> = ({
  onComplete,
  onBack
}) => {
  const [formData, setFormData] = useState({
    target_monthly_income: '',
    current_savings: '',
    monthly_contribution: '',
    time_horizon: '',
    risk_tolerance: '',
    preferred_sectors: [] as string[],
    dividend_reinvestment: true,
    current_experience: '',
    target_yield_preference: ''
  });

  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    
    try {
      const calculatorInputs = {
        target_monthly_income: Number(formData.target_monthly_income),
        current_savings: Number(formData.current_savings),
        monthly_contribution: Number(formData.monthly_contribution),
        target_yield: formData.risk_tolerance === 'conservative' ? 4 : 
                     formData.risk_tolerance === 'moderate' ? 5.5 : 7,
        time_horizon: Number(formData.time_horizon),
        risk_tolerance: formData.risk_tolerance as any,
        reinvest_dividends: formData.dividend_reinvestment,
        preferred_sectors: formData.preferred_sectors
      };

      const result = await portfolioService.calculateIncomeRequirement(calculatorInputs);
      setCalculationResult(result);
    } catch (error) {
      console.error('Error calculating income requirement:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleComplete = () => {
    const goalData = {
      ...formData,
      target_amount: calculationResult?.required_investment || Number(formData.target_monthly_income) * 12 * 20, // fallback: 20x annual income
      calculation_result: calculationResult
    };
    
    onComplete(goalData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          Dividend Income Goal Setup
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Let's create a plan to generate passive income through dividend-paying stocks.
        </p>
      </div>

      <div className="grid gap-6">
        <FormQuestion
          question={{
            id: 'target_monthly_income',
            text: 'What is your target monthly dividend income?',
            type: 'number',
            placeholder: '2500',
            help: 'How much passive income do you want to receive each month?'
          }}
          value={formData.target_monthly_income}
          onChange={(value) => handleInputChange('target_monthly_income', value)}
        />

        <FormQuestion
          question={{
            id: 'current_savings',
            text: 'How much do you have to invest now?',
            type: 'number',
            placeholder: '50000',
            help: 'Your current savings available for dividend investing'
          }}
          value={formData.current_savings}
          onChange={(value) => handleInputChange('current_savings', value)}
        />

        <FormQuestion
          question={{
            id: 'monthly_contribution',
            text: 'How much can you invest monthly?',
            type: 'number',
            placeholder: '1000',
            help: 'Additional amount you can invest each month'
          }}
          value={formData.monthly_contribution}
          onChange={(value) => handleInputChange('monthly_contribution', value)}
        />

        <FormQuestion
          question={{
            id: 'time_horizon',
            text: 'In how many years do you want to reach this income?',
            type: 'number',
            placeholder: '10',
            help: 'Your timeline to achieve the target dividend income'
          }}
          value={formData.time_horizon}
          onChange={(value) => handleInputChange('time_horizon', value)}
        />

        <FormQuestion
          question={{
            id: 'risk_tolerance',
            text: 'What is your risk tolerance for dividend investing?',
            type: 'select',
            options: [
              { value: 'conservative', label: 'Conservative - Stable dividends, lower yields (3-5%)' },
              { value: 'moderate', label: 'Moderate - Balanced growth and income (4-7%)' },
              { value: 'aggressive', label: 'Aggressive - Higher yields, more volatility (6-10%+)' }
            ],
            help: 'Higher yields typically come with higher risk'
          }}
          value={formData.risk_tolerance}
          onChange={(value) => handleInputChange('risk_tolerance', value)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preferred sectors (optional)
          </label>
          <MultiSelectDropdown
            options={SECTORS}
            value={formData.preferred_sectors}
            onChange={(sectors) => handleInputChange('preferred_sectors', sectors)}
            placeholder="Select sectors you prefer..."
          />
          <p className="text-sm text-gray-500 mt-1">
            Leave empty for automatic diversification across all sectors
          </p>
        </div>

        <FormQuestion
          question={{
            id: 'dividend_reinvestment',
            text: 'Do you want to reinvest dividends for compound growth?',
            type: 'boolean',
            help: 'Reinvesting dividends can significantly increase long-term income'
          }}
          value={formData.dividend_reinvestment}
          onChange={(value) => handleInputChange('dividend_reinvestment', value)}
        />

        <FormQuestion
          question={{
            id: 'current_experience',
            text: 'What is your experience with dividend investing?',
            type: 'select',
            options: [
              { value: 'beginner', label: 'Beginner - New to dividend investing' },
              { value: 'intermediate', label: 'Intermediate - Some experience' },
              { value: 'advanced', label: 'Advanced - Experienced dividend investor' }
            ],
            help: 'This helps us provide appropriate education and guidance'
          }}
          value={formData.current_experience}
          onChange={(value) => handleInputChange('current_experience', value)}
        />
      </div>

      {/* Calculation Results */}
      {calculationResult && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
            Your Dividend Income Plan
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-green-600 dark:text-green-400">Required Investment</div>
              <div className="text-xl font-bold text-green-800 dark:text-green-200">
                ${calculationResult.required_investment.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-green-600 dark:text-green-400">Target Yield</div>
              <div className="text-xl font-bold text-green-800 dark:text-green-200">
                {calculationResult.yield_on_investment.toFixed(1)}%
              </div>
            </div>
          </div>

          {calculationResult.monthly_savings_needed > 0 && (
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">Monthly savings needed</div>
              <div className="text-lg font-semibold">
                ${calculationResult.monthly_savings_needed.toLocaleString()}/month
              </div>
            </div>
          )}

          <div className="text-sm text-green-700 dark:text-green-300">
            Confidence Level: {calculationResult.confidence_level}%
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <Button 
          variant="outline" 
          onClick={onBack}
        >
          Back
        </Button>
        
        {!calculationResult ? (
          <Button 
            onClick={handleCalculate}
            disabled={!formData.target_monthly_income || !formData.risk_tolerance || isCalculating}
            className="flex-1"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Income Plan'}
          </Button>
        ) : (
          <Button 
            onClick={handleComplete}
            className="flex-1"
          >
            Create Dividend Income Goal
          </Button>
        )}
      </div>
    </div>
  );
};
```

### 6. Calculator Integration

Create `src/components/calculators/dividend-income/dividend-income-calculator.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PieChart } from '@/components/ui/pie-chart';
import { LineChart } from '@/components/ui/line-chart';
import { portfolioService } from '@/services/high-interest-portfolio.service';
import { IncomeCalculatorInputs, IncomeCalculatorResult } from '@/types/high-interest-portfolio.types';

export const DividendIncomeCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<IncomeCalculatorInputs>({
    target_monthly_income: 2500,
    current_savings: 50000,
    monthly_contribution: 1000,
    target_yield: 5,
    time_horizon: 10,
    risk_tolerance: 'moderate',
    reinvest_dividends: true
  });

  const [result, setResult] = useState<IncomeCalculatorResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleInputChange = (field: keyof IncomeCalculatorInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const calculate = async () => {
    setIsCalculating(true);
    try {
      const calculationResult = await portfolioService.calculateIncomeRequirement(inputs);
      setResult(calculationResult);
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      calculate();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [inputs]);

  const projectionData = result ? [
    { name: 'Year 1', income: result.projected_annual_income * 0.2 },
    { name: 'Year 3', income: result.projected_annual_income * 0.4 },
    { name: 'Year 5', income: result.projected_annual_income * 0.6 },
    { name: 'Year 7', income: result.projected_annual_income * 0.8 },
    { name: 'Year 10', income: result.projected_annual_income }
  ] : [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          Dividend Income Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate how much you need to invest to reach your passive income goals
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <Card className="p-6 space-y-6">
          <h2 className="text-xl font-semibold">Your Income Goals</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="target-income">Target Monthly Income</Label>
              <Input
                id="target-income"
                type="number"
                value={inputs.target_monthly_income}
                onChange={(e) => handleInputChange('target_monthly_income', Number(e.target.value))}
                className="text-lg"
              />
            </div>

            <div>
              <Label htmlFor="current-savings">Current Savings</Label>
              <Input
                id="current-savings"
                type="number"
                value={inputs.current_savings}
                onChange={(e) => handleInputChange('current_savings', Number(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="monthly-contribution">Monthly Contribution</Label>
              <Input
                id="monthly-contribution"
                type="number"
                value={inputs.monthly_contribution}
                onChange={(e) => handleInputChange('monthly_contribution', Number(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="time-horizon">Time Horizon (Years)</Label>
              <Input
                id="time-horizon"
                type="number"
                value={inputs.time_horizon}
                onChange={(e) => handleInputChange('time_horizon', Number(e.target.value))}
                min="1"
                max="30"
              />
            </div>

            <div>
              <Label htmlFor="risk-tolerance">Risk Tolerance</Label>
              <Select
                value={inputs.risk_tolerance}
                onValueChange={(value) => handleInputChange('risk_tolerance', value)}
              >
                <option value="conservative">Conservative (3-5% yield)</option>
                <option value="moderate">Moderate (4-7% yield)</option>
                <option value="aggressive">Aggressive (6-10% yield)</option>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="reinvest"
                type="checkbox"
                checked={inputs.reinvest_dividends}
                onChange={(e) => handleInputChange('reinvest_dividends', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="reinvest">Reinvest dividends for compound growth</Label>
            </div>
          </div>
        </Card>

        {/* Results Panel */}
        <Card className="p-6 space-y-6">
          <h2 className="text-xl font-semibold">Your Investment Plan</h2>
          
          {result && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                  <div className="text-sm text-blue-600 dark:text-blue-400">Required Investment</div>
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    ${result.required_investment.toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                  <div className="text-sm text-green-600 dark:text-green-400">Target Yield</div>
                  <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {result.yield_on_investment.toFixed(1)}%
                  </div>
                </div>
              </div>

              {result.monthly_savings_needed > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                  <div className="text-sm text-amber-600 dark:text-amber-400 mb-1">Additional Monthly Savings Needed</div>
                  <div className="text-xl font-bold text-amber-800 dark:text-amber-200">
                    ${result.monthly_savings_needed.toLocaleString()}/month
                  </div>
                  <div className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    for {result.years_to_goal} years
                  </div>
                </div>
              )}

              {/* Confidence and Risk */}
              <div className="flex justify-between items-center py-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Confidence Level</span>
                <span className={`font-semibold ${
                  result.confidence_level >= 80 ? 'text-green-600' : 
                  result.confidence_level >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {result.confidence_level}%
                </span>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Risk Assessment:</strong> {result.risk_assessment}
              </div>

              {/* Dividend Reinvestment Impact */}
              {result.dividend_reinvestment_impact > 0 && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">
                    Compound Growth Impact
                  </div>
                  <div className="text-lg font-bold text-purple-800 dark:text-purple-200">
                    +${result.dividend_reinvestment_impact.toLocaleString()}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">
                    Additional portfolio value from reinvestment
                  </div>
                </div>
              )}
            </div>
          )}

          {isCalculating && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </Card>
      </div>

      {/* Recommended Allocation */}
      {result && result.recommended_allocation.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recommended Stock Allocation</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Stock</th>
                  <th className="text-right py-2">Allocation</th>
                  <th className="text-right py-2">Shares</th>
                  <th className="text-right py-2">Investment</th>
                  <th className="text-right py-2">Annual Dividend</th>
                  <th className="text-right py-2">Yield</th>
                </tr>
              </thead>
              <tbody>
                {result.recommended_allocation.map((stock, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">
                      <div>
                        <div className="font-medium">{stock.stock_symbol}</div>
                        <div className="text-xs text-gray-500">{stock.company_name}</div>
                      </div>
                    </td>
                    <td className="text-right py-2">{stock.allocation_percentage.toFixed(1)}%</td>
                    <td className="text-right py-2">{stock.shares_to_buy}</td>
                    <td className="text-right py-2">${stock.investment_amount.toLocaleString()}</td>
                    <td className="text-right py-2">${stock.expected_annual_dividend.toFixed(0)}</td>
                    <td className="text-right py-2">{stock.current_yield.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Income Projection Chart */}
      {projectionData.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Income Growth Projection</h2>
          <div className="h-64">
            <LineChart
              data={projectionData.map(d => ({ 
                label: d.name, 
                value: d.income 
              }))}
              height={240}
            />
          </div>
        </Card>
      )}
    </div>
  );
};
```

### 7. Financial Health Integration

Update `src/components/financial-health/quiz-calculations.ts`:

```typescript
// Add dividend income scoring to existing financial health calculation

export function calculateDividendIncomeScore(answers: any): {
  score: number;
  status: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  explanation: string;
} {
  let score = 0;
  const maxScore = 100;

  // Current dividend income (0-30 points)
  const monthlyDividendIncome = answers.monthly_dividend_income || 0;
  const monthlyExpenses = answers.monthly_expenses || 1;
  const incomeReplacement = monthlyDividendIncome / monthlyExpenses;
  
  if (incomeReplacement >= 1) score += 30;
  else if (incomeReplacement >= 0.5) score += 20;
  else if (incomeReplacement >= 0.25) score += 15;
  else if (incomeReplacement >= 0.1) score += 10;
  else if (incomeReplacement > 0) score += 5;

  // Portfolio diversification (0-25 points)
  const portfolioValue = answers.dividend_portfolio_value || 0;
  const stockCount = answers.dividend_stock_count || 0;
  
  if (stockCount >= 15 && portfolioValue > 50000) score += 25;
  else if (stockCount >= 10 && portfolioValue > 25000) score += 20;
  else if (stockCount >= 5 && portfolioValue > 10000) score += 15;
  else if (stockCount >= 3 && portfolioValue > 5000) score += 10;
  else if (portfolioValue > 0) score += 5;

  // Dividend growth history (0-20 points)
  const hasAristocrats = answers.has_dividend_aristocrats || false;
  const avgYield = answers.portfolio_avg_yield || 0;
  
  if (hasAristocrats && avgYield >= 3 && avgYield <= 6) score += 20;
  else if (avgYield >= 3 && avgYield <= 8) score += 15;
  else if (avgYield >= 2) score += 10;
  else if (avgYield > 0) score += 5;

  // Risk management (0-15 points)
  const maxStockAllocation = answers.max_single_stock_allocation || 100;
  if (maxStockAllocation <= 5) score += 15;
  else if (maxStockAllocation <= 10) score += 12;
  else if (maxStockAllocation <= 20) score += 8;
  else if (maxStockAllocation <= 30) score += 4;

  // Learning and strategy (0-10 points)
  const hasStrategy = answers.has_dividend_strategy || false;
  const continuesLearning = answers.continues_dividend_education || false;
  
  if (hasStrategy && continuesLearning) score += 10;
  else if (hasStrategy || continuesLearning) score += 5;

  // Determine status
  let status: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  let explanation: string;

  if (score >= 80) {
    status = 'Excellent';
    explanation = 'You have a well-diversified dividend portfolio generating meaningful passive income. Keep focusing on quality dividend aristocrats and reinvestment.';
  } else if (score >= 60) {
    status = 'Good';
    explanation = 'Your dividend strategy is solid but has room for improvement. Consider increasing diversification and focusing on dividend growth stocks.';
  } else if (score >= 40) {
    status = 'Fair';
    explanation = 'You have started building dividend income but need to expand your portfolio and focus on sustainable, growing dividends.';
  } else {
    status = 'Needs Attention';
    explanation = 'Your dividend income generation needs significant improvement. Start with high-quality dividend stocks and focus on building a diversified portfolio.';
  }

  return { score, status, explanation };
}

// Add to the main calculateFinancialHealthScore function
export function calculateFinancialHealthScore(answers: QuizAnswers): IFinancialHealthCalculationResult {
  // ... existing calculations ...
  
  // Add dividend income calculation
  const dividendIncomeResult = calculateDividendIncomeScore(answers);
  
  const allResults = [
    budgetingResult,
    savingsResult,
    debtResult,
    investmentResult,
    dividendIncomeResult, // Add this
    emergencyFundResult,
    retirementResult,
    // ... other results
  ];

  // ... rest of the function
}
```

### 8. AI Chat Integration

Create `src/components/chat/dividend-advisor-role.ts`:

```typescript
export const DIVIDEND_ADVISOR_SYSTEM_PROMPT = `
You are a specialized Dividend Income Advisor for Moneko, focused on helping users build passive income through dividend-paying stocks.

CORE PHILOSOPHY:
- Education-first approach: Teach users about dividend investing fundamentals
- Passive income focus: Emphasize sustainable, recurring income over capital gains
- Simplicity over complexity: Avoid complex trading strategies, focus on buy-and-hold
- Risk-aware growth: Balance yield with dividend sustainability and growth

KEY EXPERTISE AREAS:
1. Dividend Stock Selection
   - Dividend aristocrats and kings
   - Yield sustainability analysis
   - Payout ratio evaluation
   - Sector diversification

2. Income Portfolio Construction
   - Risk-based allocation strategies
   - Yield laddering techniques
   - Sector and geographic diversification
   - Rebalancing methodologies

3. Passive Income Strategies
   - DRIP (Dividend Reinvestment Plans)
   - Tax-efficient dividend investing
   - Income replacement calculations
   - Retirement income planning

4. Risk Management
   - Dividend cut risk assessment
   - Portfolio concentration limits
   - Economic cycle considerations
   - Interest rate impact analysis

RESPONSE GUIDELINES:
- Always prioritize education and understanding
- Provide specific, actionable advice
- Include relevant calculations when appropriate
- Emphasize long-term wealth building
- Address risk management proactively
- Use simple, clear language
- Reference real examples when helpful

CONVERSATION STARTERS:
- "I want to build passive income through dividends"
- "How do I evaluate dividend stocks?"
- "What yield should I target for my age?"
- "How can I diversify my dividend portfolio?"
- "Should I reinvest dividends or take cash?"

Remember: You're helping users build sustainable passive income for financial freedom, not day trading profits.
`;

export const DIVIDEND_ADVISOR_ROLE = {
  role: 'dividend_investment_advisor',
  name: 'Dividend Income Specialist',
  expertise: [
    'dividend_stock_selection',
    'yield_optimization',
    'income_portfolio_construction', 
    'dividend_aristocrat_analysis',
    'sector_diversification',
    'passive_income_strategies',
    'dividend_reinvestment_planning',
    'retirement_income_planning'
  ],
  personality: 'conservative_income_focused',
  approach: 'education_first_simple_strategies',
  systemPrompt: DIVIDEND_ADVISOR_SYSTEM_PROMPT
};
```

## Implementation Timeline

### Week 1-2: Foundation
- [ ] Database schema creation and migration
- [ ] TypeScript interfaces and type definitions  
- [ ] Basic service layer implementation
- [ ] Core widget components (portfolio overview, income tracker)

### Week 3-4: Portfolio Management
- [ ] Portfolio builder interface
- [ ] Holdings management (add/edit/remove stocks)
- [ ] Income tracking dashboard
- [ ] Basic calculator integration

### Week 5-6: Intelligence & Analytics  
- [ ] Portfolio analytics engine
- [ ] Stock screening and recommendations
- [ ] Income projections and modeling
- [ ] Optimization suggestions

### Week 7-8: Integration & Enhancement
- [ ] Goal tracker integration
- [ ] Financial health scoring integration  
- [ ] AI chat advisor specialization
- [ ] Testing, optimization, and documentation

## Testing Strategy

### Unit Tests
- Service layer functions (calculations, data transformations)
- Widget rendering and data display
- Calculator logic and edge cases
- Analytics and risk calculations

### Integration Tests
- Database operations and queries
- API endpoints and data flow
- Widget data loading and updates
- Cross-feature integrations

### User Acceptance Tests
- End-to-end portfolio creation flow
- Income goal setup and tracking
- Educational content accessibility
- Mobile responsiveness

## Security Considerations

### Data Protection
- Row-level security for all user data
- Input validation and sanitization
- Secure API endpoints with proper authentication
- Audit logging for financial transactions

### Privacy
- User financial data encryption
- Minimal data collection principles  
- Clear privacy policies for financial information
- Option to delete all financial data

## Performance Optimization

### Database Optimization
- Proper indexing for frequent queries
- Materialized views for analytics
- Connection pooling and query optimization
- Caching layer for stock data

### Frontend Performance
- Lazy loading of heavy components
- Memoization of expensive calculations
- Virtual scrolling for large lists
- Image optimization and CDN usage

## Monitoring and Analytics

### Business Metrics
- User adoption of dividend features
- Goal completion rates
- Portfolio value growth
- Educational content engagement

### Technical Metrics
- API response times
- Error rates and types
- Database performance
- User session analytics

## Conclusion

This implementation guide provides a comprehensive roadmap for building the High-Interest Portfolio System in Moneko. The system focuses on education, simplicity, and passive income generation while integrating seamlessly with existing features. The phased approach ensures steady progress while maintaining code quality and user experience.

The key differentiators are:
1. **Education-first approach** - Teaching users about dividend investing
2. **Passive income focus** - Emphasizing sustainable income over trading gains  
3. **Seamless integration** - Working with existing dashboard, goals, and chat systems
4. **Risk-aware guidance** - Balancing yield with sustainability and growth
5. **Progressive enhancement** - Starting simple and adding sophistication over time

By following this guide, Moneko can successfully launch a dividend-focused portfolio system that helps users achieve their goal of "living on interest" through well-educated, diversified investment strategies.