'use client';

import { Widget as WidgetType, IBaseWidget, Widget } from "../types/dashboard-data.typings";
import { MetricCard } from './MetricCard';
import { 
  BarChartWidget, 
  LineChartWidget, 
  PieChartWidget,
  CashFlowWidget,
} from './ChartWidgets';
import { 
  CountdownCardWidget, DataListWidget, ProgressBarListWidget
} from './DataWidgets';
import { ChecklistWidget } from './ChecklistWidget';
import { 
  FinancialHealthScorecardWidget,
  DebtVisualizerWidget,
  EnhancedSavingsGoalsWidget,
  InsuranceCoverageWidget,
  NextBestActionWidget,
  RetirementReadinessWidget
} from './FinancialWidgets';

import { IChecklistWidget } from "../types/dashboard-data.typings"; // Added import
import { TipCardWidget } from "./tip-card-widget";
import { 
  DailyHabitCalculatorWidget, 
  PensionHeadStartWidget, 
  MortgageDepositTimelineWidget, 
  SalarySlicerWidget
} from "./PlaygroundWidgets";
import {
  GoalTrackerSummaryWidget,
  GoalProgressWidget,
  GoalsGridWidget
} from '@/components/goal-tracker/widgets';

interface WidgetFactoryProps {
  widget: IBaseWidget;
  controls?: React.ReactNode; // Added for control buttons
}

export function WidgetFactory({ widget, controls }: WidgetFactoryProps) {
  // Cast the widget to any to access the type property
  const widgetType = (widget as Widget).type;

  // Helper function to wrap each widget with the base Widget component
  const renderWidget = (SpecificWidget: React.ComponentType<{widget: any}>) => {
    return (
      <SpecificWidget 
        widget={{...widget, controls}} 
      />
    );
  };

  switch (widgetType) {
    case 'metricCard':
      return renderWidget(MetricCard);
    case 'progressBarList':
      return renderWidget(ProgressBarListWidget);
    case 'countdownCard':
      return renderWidget(CountdownCardWidget);
    case 'tipCard':
      return renderWidget(TipCardWidget);
    case 'dataList':
      return renderWidget(DataListWidget);
    case 'barChart':
      return renderWidget(BarChartWidget);
    case 'lineChart':
      return renderWidget(LineChartWidget);
    case 'pieChart':
      return renderWidget(PieChartWidget);
    case 'financialHealthScorecard':
      return renderWidget(FinancialHealthScorecardWidget);
    case 'nextBestAction':
      return renderWidget(NextBestActionWidget);
    case 'quickCashFlowSummary':
      return renderWidget(CashFlowWidget);
    case 'debtVisualizer':
      return renderWidget(DebtVisualizerWidget);
    case 'retirementReadiness':
      return renderWidget(RetirementReadinessWidget);
    case 'enhancedSavingsGoals':
      return renderWidget(EnhancedSavingsGoalsWidget);
    case 'insuranceCoverage':
      return renderWidget(InsuranceCoverageWidget);
    case 'checklist':
      return renderWidget(ChecklistWidget);
    case 'dailyHabitCalculator':
      return renderWidget(DailyHabitCalculatorWidget);
    case 'salarySlicer':
      return renderWidget(SalarySlicerWidget);
    case 'pensionHeadStart':
      return renderWidget(PensionHeadStartWidget);
    case 'mortgageDepositTimeline':
      return renderWidget(MortgageDepositTimelineWidget);
    case 'goalTrackerSummary':
      return renderWidget(GoalTrackerSummaryWidget);
    case 'goalProgress':
      return renderWidget(GoalProgressWidget);
    case 'goalsGrid':
      return renderWidget(GoalsGridWidget);
    default:
      return (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
          <p className="text-red-600 dark:text-red-400">Unknown widget type: {widgetType}</p>
        </div>
      );
  }
}
