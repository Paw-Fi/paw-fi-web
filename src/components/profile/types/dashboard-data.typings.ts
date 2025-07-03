import { ReactNode } from 'react';

export interface IBaseWidget {
  id: string; // Unique identifier for the widget itself (Mandatory)
  type: string;
  title: string; // Title displayed for the widget (Mandatory)
  icon: string; // Font Awesome class string, e.g., "fas fa-wallet" (Mandatory)
  column_span: 1 | 2; // Layout hint: 1 for single column, 2 for double column width (Mandatory)
  row_span?: 1 | 2;    // Layout hint: 1 for single row, 2 for double row height (Optional, defaults to 1 if not set)
  controls?: ReactNode; // Optional React components for widget controls in header
}

export type IMetricTrend = 'up' | 'down' | 'neutral' | 'stable';

// =============================================================================
// ENHANCED DATA TYPES (All are now arrays or contain arrays)
// Each item within an array data type MUST have a unique 'id' field for modifiability.
// =============================================================================

// 1. METRIC CARD - Now supports multiple metrics
export interface IMetricCardItem {
  id: string; // (Mandatory) Unique ID for the metric item
  value: string; // (Mandatory) e.g., "12,000.00"
  currency: string; // (Mandatory) e.g., "$"
  trend?: IMetricTrend; // (Optional) Trend direction
  trendPercentage?: string; // (Optional) Percentage change (e.g., "8.3")
  description?: string; // (Optional) Brief description
  progress?: number; // (Optional) 0.0 - 1.0, for progress bars (e.g., 0.75 for 75%)
  goalLabel?: string; // (Optional) Label for the goal associated with progress
  displayOrder?: number; // (Optional) Numeric hint for display sorting,
}
export interface IMetricCardData {
  title?: string; // Optional title for the whole card
  description?: string; // Optional description for the whole card
  metrics: IMetricCardItem[]; // Array of individual metrics
}

// 2. PROGRESS BAR LIST - Enhanced with IDs for CRUD
export interface IProgressBarListItem {
  id: string; // (Mandatory) Unique ID for the progress bar item
  label: string; // (Mandatory) Label for the progress bar
  current: number; // (Mandatory) Current value (e.g., 15 for 15/20)
  max: number; // (Mandatory) Maximum value (e.g., 20 for 15/20)
  color?: string; // (Optional) Custom color for the progress bar (e.g., '#4CAF50')
  displayOrder?: number; // (Optional) Numeric hint for display sorting
}
export interface IProgressBarListData {
  items: IProgressBarListItem[];
  showPercentages?: boolean;
  sortBy?: 'progress' | 'alphabetical' | 'custom';
}

// Tip Card Widget
export interface ITipCardListItem {
  id: string;
  title: string;
  content: string;
  image?: string;
  link?: string;
  displayOrder: number;
}
export interface ITipCardData {
  tips: ITipCardListItem[];
  currentTipIndex: number;
  autoRotate?: boolean; // (Optional) Whether to auto-cycle through tips
  filterByCategory?: string; // Show only tips from specific category
}
export interface ITipCardWidget extends IBaseWidget {
  type: 'tipCard';
  data: ITipCardData;
}

// 3. COUNTDOWN CARD - Now supports multiple countdowns
export interface ICountdownCardItem {
  id: string; // (Mandatory) Unique ID for the countdown
  title: string; // (Mandatory) Name/description of what we're counting down to
  days: number; // (Mandatory) Number of days remaining
  image: string; // (Mandatory) URL for an icon or small image
  targetDate?: string; // (Optional) The specific target date (e.g., "2025-11-20")
}

export interface ICountdownCardData {
  id: string; // (Mandatory) Unique ID for the countdown
  title: string; // (Mandatory) Name/description of what we're counting down to
  days: number; // (Mandatory) Number of days remaining
  image: string; // (Mandatory) URL for an icon or small image
  targetDate?: string; // (Optional) The specific target date (e.g., "2025-11-20")
  showDays?: boolean;    // (Optional) Whether to display the days part
  showHours?: boolean;   // (Optional) Whether to display the hours part
  showMinutes?: boolean; // (Optional) Whether to display the minutes part
  showSeconds?: boolean; // (Optional) Whether to display the seconds part
}

// 5. DATA LIST - Enhanced with IDs
export interface IDataListItem {
  id: string; // (Mandatory) Unique ID for the list item
  label: string; // (Mandatory) Label for the data point (e.g., "Emergency Fund", "Groceries")
  value: string; // (Mandatory) The amount or relevant value
  currency: string; // (Mandatory) Currency symbol (e.g., "$", "€")
  category?: string; // (Optional) Optional grouping (e.g., "Assets", "Liabilities", "Fixed Expenses")
  displayOrder: number; // (Mandatory) Numeric hint for display sorting
}
export interface IDataListData {
  items: IDataListItem[];
  tip?: string;
  footerLink?: { text: string; url: string; icon: string; };
  groupByCategory?: boolean;
  showTotals?: boolean;
}

// 6. CHART DATA - Enhanced with metadata
export interface IChartDataPoint {
  id: string; // (Mandatory) Unique ID for the data point
  label: string; // (Mandatory) Label for the individual bar/point (e.g., "Rent", "Jan")
  value: number; // (Mandatory) The numerical value for the bar/point
  color?: string; // (Optional) Custom color for this specific data point
  displayOrder?: number; // (Optional) Numeric hint for display sorting
}
export interface IChartData {
  dataPoints: IChartDataPoint[];
  chartType?: 'bar' | 'line'; // (Optional) Explicitly set the chart type if different from widget type
  xAxisLabel?: string; // (Optional) Label for the X-axis
  yAxisLabel?: string; // (Optional) Label for the Y-axis
  height?: number;
  showLegend?: boolean;
  showDataPoints?: boolean; // (Optional) For line charts, whether to show data points
  title?: string;
}

// 7. FINANCIAL HEALTH SCORECARD - Now supports multiple scores
export interface IFinancialHealthItem {
  id: string; // (Mandatory) Unique ID for the financial health category
  category: string; // (Mandatory) e.g., "Budgeting", "Savings", "Debt", "Investments"
  score: number; // (Mandatory) e.g., 1-100
  status: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention'; // (Mandatory) Assessment status
  explanation: string; // (Mandatory) Detailed explanation for the score/status
  weight?: number; // (Optional) Numeric weight for calculating an overall score if multiple items
  displayOrder?: number; // (Optional) Numeric hint for display sorting
}
export interface IFinancialHealthScorecardData {
  items: IFinancialHealthItem[]; // (Mandatory) Array of individual financial health assessments
  overallScore?: number; // (Optional) Calculated overall score
  overallStatus?: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention'; // (Optional) Overall status
  showIndividualScores?: boolean; // (Optional) Whether to show individual scores
}

// 8. NEXT BEST ACTION - Now supports multiple actions
export interface INextBestActionItem {
  id: string; // (Mandatory) Unique ID for the action item
  title: string; // (Mandatory) Brief title for the action
  message: string; // (Mandatory) Detailed message or description of the action
  priority: 'low' | 'medium' | 'high' | 'urgent'; // (Mandatory) Priority level
  category?: string; // (Optional) Grouping (e.g., "Budgeting", "Savings", "Debt Payoff")
  callToAction?: string; // (Optional) Text for the clickable action button
  actionLink?: string; // (Optional) URL to navigate to when action button is clicked
  dueDate?: string; // (Optional) Optional deadline (e.g., "2025-06-30")
  isCompleted?: boolean; // (Optional) Whether the action has been completed
  displayOrder?: number; // (Optional) Numeric hint for display sorting
}
export interface INextBestActionData extends Array<INextBestActionItem> {}

// 9. CASH FLOW SUMMARY - Enhanced with IDs and categories
export interface ICashFlowEntry {
  id: string; // (Mandatory) Unique ID for the cash flow entry
  title: string; // (Mandatory) Name of the income/expense item (e.g., "Salary", "Rent")
  value: number; // (Mandatory) The monetary amount
  category?: string; // (Optional) Further sub-categorization (e.g., "Primary Income", "Housing")
    frequency?: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly'; // (Optional) How often this entry occurs
  isRecurring?: boolean; // (Optional) Is this a recurring entry?
  displayOrder?: number; // (Optional) Numeric hint for display sorting
}
export interface IQuickCashFlowSummaryData {
  inflows: ICashFlowEntry[]; // (Mandatory) Array of positive cash flow items
  outflows: ICashFlowEntry[]; // (Mandatory) Array of negative cash flow items
  projectedPeriod?: string; // (Optional) e.g., "Monthly", "Quarterly" for context
}

// 10. DEBT VISUALIZER - Enhanced with IDs
export interface IDebtItem {
  id: string; // (Mandatory) Unique ID for the debt item
  name: string; // (Mandatory) Name of the debt (e.g., "Credit Card A", "Student Loan")
  currentBalance: number; // (Mandatory) Current outstanding balance
  originalBalance: number; // (Mandatory) Original loan/debt amount (for progress calculation)
  interestRate: number; // (Mandatory) Annual interest rate (e.g., 18 for 18%)
  minPayment: number; // (Mandatory) Minimum monthly payment
  payoffDate: string; // (Mandatory) Estimated payoff date (e.g., "Aug 2025")
  category?: string; // (Optional) Grouping (e.g., "Credit Card", "Student Loan", "Mortgage")
  priority?: number; // (Optional) Numeric priority for custom payoff strategies
  displayOrder?: number; // (Optional) Numeric hint for display sorting
}
export interface IDebtVisualizerData extends Array<IDebtItem> {}

// 11. RETIREMENT READINESS - Now supports multiple scenarios
export interface IRetirementScenario {
  id: string; // (Mandatory) Unique ID for the scenario
  scenarioName: string; // (Mandatory) e.g., "Current Path"
  score: number; // (Mandatory) e.g., 65
  status: string; // (Mandatory) e.g., "Needs Significant Work"
  projectionAmount: number; // (Mandatory) Projected retirement savings amount
  projectionDate: string; // (Mandatory) Age or date of projected amount (e.g., "Age 67", "2055")
  explanation: string; // (Mandatory) Explanation for this scenario's assessment
  assumptions: string; // (Mandatory) What this scenario assumes
  displayOrder: number; // (Mandatory) Numeric hint for display sorting
}

export interface IRetirementReadinessData {
  scenarios: IRetirementScenario[]; // (Mandatory) Array of retirement scenarios
  currentScenarioId: string; // (Mandatory) ID of the currently active/selected scenario
}

// 12. ENHANCED SAVINGS GOALS - Already array-based, adding IDs
export interface IEnhancedSavingsGoalItem {
  id: string; // (Mandatory) Unique ID for the savings goal
  name: string; // (Mandatory) Name of the goal (e.g., "Japan Trip", "House Down Payment")
  savedAmount: number; // (Mandatory) Current amount saved
  targetAmount: number; // (Mandatory) Total target amount
  estimatedCompletionDate: string; // (Mandatory) Estimated completion date (e.g., "Oct 2025")
  status: 'On Track' | 'Ahead' | 'Behind'; // (Mandatory) Current status of the goal
  category?: string; // (Optional) Grouping (e.g., "Emergency Fund", "Vacation", "Home")
  priority?: 'low' | 'medium' | 'high'; // (Optional) Priority of the goal
  autoContribution?: number; // (Optional) Monthly auto-contribution amount
  displayOrder?: number; // (Optional) Numeric hint for display sorting
}
export interface IEnhancedSavingsGoalsData {
  items: IEnhancedSavingsGoalItem[];
  groupByCategory?: boolean;
  showProgress?: boolean;
}

// 13. INSURANCE COVERAGE - Enhanced with IDs
export interface IInsuranceCoverageItem {
  id: string;
  type: string; // Insurance type (e.g., "Health Insurance", "Auto Insurance")
  provider: string; // Provider name (e.g., "MediCare Plus", "AutoSecure")
  coverage: string; // Coverage details as a string (e.g., "$1M annual limit, $5k deductible")
  premium: number; // Monthly premium amount
  status: string; // Status like "Adequate", "Review Recommended", etc.
  suggestion?: string; // Optional suggestion for improvement
  renewalDate?: string; // Renewal date in ISO format or YYYY-MM-DD
  displayOrder: number; // Mandatory for drag-and-drop ordering
  
  // Legacy fields - keeping for backward compatibility
  policyName?: string;
  coverageAmount?: number;
  policyType?: 'life' | 'health' | 'auto' | 'home' | 'other';
  notes?: string;
}

export interface IInsuranceCoverageData {
  items: IInsuranceCoverageItem[];
  showPremiums?: boolean;
  showRenewalDates?: boolean;
}

// 14. CHECKLIST - Enhanced (already had IDs)
export interface IChecklistItem {
  id: string; // (Mandatory) Unique ID for the task
  task: string; // (Mandatory) The task description
  isCompleted: boolean; // (Mandatory) Whether the task is completed
  dueDate?: string; // (Optional) Optional due date (e.g., "2025-06-30")
  priority?: 'low' | 'medium' | 'high'; // (Optional) Priority of the task
  category?: string; // (Optional) Optional grouping within the checklist
  notes?: string; // (Optional) Additional notes for the task
  displayOrder?: number; // (Optional) Numeric hint for display sorting
}

export interface IChecklistData {
  items: IChecklistItem[];
  showCompleted?: boolean;
  sortBy?: 'dueDate' | 'priority' | 'alphabetical' | 'custom';
}

// Removed 'IMultipleChecklistsData' and 'ICategoryChecklist' as they are no longer a distinct type for the widget.
// Users can use multiple IChecklistWidgets with different IDs and titles to achieve the same effect.

// =============================================================================
// UPDATED WIDGET export interfaceS (Discriminated Union Members)
// =============================================================================
export interface IMetricCardWidget extends IBaseWidget {
  type: 'metricCard';
  data: IMetricCardData;
}
export interface IProgressBarListWidget extends IBaseWidget {
  type: 'progressBarList';
  data: IProgressBarListData;
}
export interface ICountdownCardWidget extends IBaseWidget {
  type: 'countdownCard';
  data: ICountdownCardData;
}
export interface ITipCardWidget extends IBaseWidget {
  type: 'tipCard';
  data: ITipCardData;
}
export interface IDataListWidget extends IBaseWidget {
  type: 'dataList';
  data: IDataListData;
}
export interface IBarChartWidget extends IBaseWidget {
  type: 'barChart';
  data: IChartData;
}
export interface ILineChartWidget extends IBaseWidget {
  type: 'lineChart';
  data: IChartData;
}
export interface IFinancialHealthScorecardWidget extends IBaseWidget {
  type: 'financialHealthScorecard';
  data: IFinancialHealthScorecardData;
}
export interface INextBestActionWidget extends IBaseWidget {
  type: 'nextBestAction';
  data: INextBestActionData;
  maxDisplayItems?: number; // Limit how many actions to show
  filterByPriority?: 'low' | 'medium' | 'high' | 'urgent';
}
export interface IQuickCashFlowSummaryWidget extends IBaseWidget {
  type: 'quickCashFlowSummary';
  data: IQuickCashFlowSummaryData;
  showCategories?: boolean;
  showProjections?: boolean;
}
export interface IDebtVisualizerWidget extends IBaseWidget {
  type: 'debtVisualizer';
  data: IDebtVisualizerData;
  strategy: 'snowball' | 'avalanche' | 'custom';
  showPayoffDates?: boolean;
}
export interface IRetirementReadinessWidget extends IBaseWidget {
  type: 'retirementReadiness';
  data: IRetirementReadinessData;
}
export interface IEnhancedSavingsGoalsWidget extends IBaseWidget {
  type: 'enhancedSavingsGoals';
  data: IEnhancedSavingsGoalsData;
}
export interface IInsuranceCoverageWidget extends IBaseWidget {
  type: 'insuranceCoverage';
  data: IInsuranceCoverageData;
}
export type Priority = 'low' | 'medium' | 'high';

export interface IChecklistItem {
  id: string; // (Mandatory) Unique ID for the task
  task: string; // (Mandatory) The task description
  isCompleted: boolean; // (Mandatory) Whether the task is completed
  dueDate?: string; // (Optional) Optional due date (e.g., "2025-06-30")
  priority?: Priority; // (Optional) Priority of the task
  category?: string; // (Optional) Optional grouping within the checklist
  notes?: string; // (Optional) Additional notes for the task
  displayOrder?: number; // (Optional) Numeric hint for display sorting
}
export interface IChecklistData {
  items: IChecklistItem[]; // (Mandatory) Array of tasks
  showCompleted?: boolean; // (Optional) Whether to show completed tasks
  sortBy?: 'dueDate' | 'priority' | 'alphabetical' | 'custom'; // (Optional) Sorting preference
}

export interface IChecklistWidget extends IBaseWidget {
  type: 'checklist';
  data: IChecklistData;
}
// Removed 'IMultipleChecklistsWidget' as it is no longer a distinct widget type.

// Discriminated Union for all possible widget types
export interface IPieChartWidget extends IBaseWidget {
  type: 'pieChart';
  data: IChartData;
}

export type Widget =
  | IMetricCardWidget
  | IProgressBarListWidget
  | ICountdownCardWidget
  | ITipCardWidget
  | IDataListWidget
  | IBarChartWidget
  | ILineChartWidget
  | IPieChartWidget
  | IFinancialHealthScorecardWidget
  | INextBestActionWidget
  | IQuickCashFlowSummaryWidget
  | IDebtVisualizerWidget
  | IRetirementReadinessWidget
  | IEnhancedSavingsGoalsWidget
  | IInsuranceCoverageWidget
  | IChecklistWidget;