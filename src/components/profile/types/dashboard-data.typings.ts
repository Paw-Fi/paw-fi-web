
// Common properties for all widgets
// --- TypeScript Type Definitions ---

// Common properties for all widgets
export interface BaseWidget {
    id: string;
    title: string;
    icon: string;
    columnSpan: 1 | 2;
  }
  
  // Data types for specific widgets
  export interface MetricCardData {
    value: string;
    currency: string;
    unit?: string;
    trend?: 'up' | 'down';
    trendPercentage?: string;
    description?: string;
    progress?: number;
    goalLabel?: string;
  }
  
  export interface ProgressBarListItem {
    label: string;
    progress: number;
  }
  export interface ProgressBarListData extends Array<ProgressBarListItem> {}
  
  export interface CountdownCardData {
    days: number;
    image: string;
  }
  
  export interface TipCardData {
    currentTipIndex: number;
    tips: string[];
  }
  
  export interface DataListItem {
    label: string;
    value: string;
    currency: string;
  }
  export interface DataListData extends Array<DataListItem> {}
  
  export interface ChartData { // For Recharts BarChartWidget and LineChartWidget
    labels: string[];
    values: number[];
  }
  
  export interface FinancialHealthScorecardData {
    score: number;
    status: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
    explanation: string;
  }
  
  export interface NextBestActionData {
    message: string;
    callToAction?: string;
  }
  
  export interface QuickCashFlowSummaryData { // For react-chartjs-2 Bar chart
    income: number;
    expenses: number;
  }
  
  // NEW: Debt Visualizer Data
  export interface DebtItem {
    name: string;
    currentBalance: number;
    originalBalance: number; // Added for progress calculation
    interestRate: number;
    minPayment: number;
    payoffDate: string; // Estimated payoff date
  }
  export interface DebtVisualizerData extends Array<DebtItem> {}
  
  // NEW: Retirement Readiness Data
  export interface RetirementReadinessData {
    score: number;
    status: 'On Track' | 'Ahead' | 'Behind' | 'Needs Significant Work';
    projectionAmount: number;
    projectionDate: string; // e.g., "Age 67"
    explanation: string;
  }
  
  // NEW: Enhanced Savings Goals Data
  export interface EnhancedSavingsGoalItem {
    name: string;
    savedAmount: number;
    targetAmount: number;
    estimatedCompletionDate: string; // e.g., "Dec 2026"
    status: 'On Track' | 'Ahead' | 'Behind';
  }
  export interface EnhancedSavingsGoalsData extends Array<EnhancedSavingsGoalItem> {}
  
  // NEW: Insurance Coverage Data
  export interface InsuranceCoverageItem {
    type: string; // e.g., "Health", "Life", "Home", "Auto"
    status: 'Adequate' | 'Potential Gap' | 'Review Recommended';
    suggestion?: string;
  }
  export interface InsuranceCoverageData extends Array<InsuranceCoverageItem> {}
  
  
  // Widget export interfaces (Discriminated Union Members)
  export interface IMetricCardWidget extends BaseWidget {
    type: 'metricCard';
    data: MetricCardData;
  }
  
  export interface IProgressBarListWidget extends BaseWidget {
    type: 'progressBarList';
    data: ProgressBarListData;
  }
  
  export interface ICountdownCardWidget extends BaseWidget {
    type: 'countdownCard';
    data: CountdownCardData;
  }
  
  export interface ITipCardWidget extends BaseWidget {
    type: 'tipCard';
    data: TipCardData;
  }
  
  export interface IDataListWidget extends BaseWidget {
    type: 'dataList';
    data: DataListData;
    tip?: string;
    footerLink?: { text: string; url: string; icon: string; };
  }
  
  export interface IBarChartWidget extends BaseWidget {
    type: 'barChart';
    data: ChartData;
  }
  
  export interface ILineChartWidget extends BaseWidget {
    type: 'lineChart';
    data: ChartData;
  }
  
  export interface IFinancialHealthScorecardWidget extends BaseWidget {
    type: 'financialHealthScorecard';
    data: FinancialHealthScorecardData;
  }
  
  export interface INextBestActionWidget extends BaseWidget {
    type: 'nextBestAction';
    data: NextBestActionData;
  }
  
  export interface IQuickCashFlowSummaryWidget extends BaseWidget {
    type: 'quickCashFlowSummary';
    data: QuickCashFlowSummaryData;
  }
  
  // NEW Widget Union Members
  export interface IDebtVisualizerWidget extends BaseWidget {
    type: 'debtVisualizer';
    data: DebtVisualizerData;
    strategy: 'snowball' | 'avalanche';
  }
  
  export interface IRetirementReadinessWidget extends BaseWidget {
    type: 'retirementReadiness';
    data: RetirementReadinessData;
  }
  
  export interface IEnhancedSavingsGoalsWidget extends BaseWidget {
    type: 'enhancedSavingsGoals';
    data: EnhancedSavingsGoalsData;
  }
  
  export interface IInsuranceCoverageWidget extends BaseWidget {
    type: 'insuranceCoverage';
    data: InsuranceCoverageData;
  }
  
  // Discriminated Union for all possible widget types
  export type Widget =
    | IMetricCardWidget
    | IProgressBarListWidget
    | ICountdownCardWidget
    | ITipCardWidget
    | IDataListWidget
    | IBarChartWidget
    | ILineChartWidget
    | IFinancialHealthScorecardWidget
    | INextBestActionWidget
    | IQuickCashFlowSummaryWidget
    | IDebtVisualizerWidget
    | IRetirementReadinessWidget
    | IEnhancedSavingsGoalsWidget
    | IInsuranceCoverageWidget;
