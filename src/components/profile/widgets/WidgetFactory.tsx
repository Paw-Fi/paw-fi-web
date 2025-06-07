'use client';

import { BaseWidget } from '../types/dashboard-data.typings';
import { MetricCard } from './MetricCard';
import { 
  BarChartWidget, 
  LineChartWidget, 
  CashFlowWidget,
} from './ChartWidgets';
import { 
  CountdownCardWidget, DataListWidget, ProgressBarListWidget, TipCardWidget
} from './DataWidgets';
import { 
  FinancialHealthScorecardWidget,
  DebtVisualizerWidget,
  EnhancedSavingsGoalsWidget,
  InsuranceCoverageWidget,
  NextBestActionWidget,
  RetirementReadinessWidget
} from './FinancialWidgets';

interface WidgetFactoryProps {
  widget: BaseWidget;
}

export function WidgetFactory({ widget }: WidgetFactoryProps) {
  // Cast the widget to any to access the type property
  const widgetType = (widget as any).type;

  switch (widgetType) {
    case 'metricCard':
      return <MetricCard widget={widget as any} />;
    case 'progressBarList':
      return <ProgressBarListWidget widget={widget as any} />;
    case 'countdownCard':
      return <CountdownCardWidget widget={widget as any} />;
    case 'tipCard':
      return <TipCardWidget widget={widget as any} />;
    case 'dataList':
      return <DataListWidget widget={widget as any} />;
    case 'barChart':
      return <BarChartWidget widget={widget as any} />;
    case 'lineChart':
      return <LineChartWidget widget={widget as any} />;
    case 'financialHealthScorecard':
      return <FinancialHealthScorecardWidget widget={widget as any} />;
    case 'nextBestAction':
      return <NextBestActionWidget widget={widget as any} />;
    case 'quickCashFlowSummary':
      return <CashFlowWidget widget={widget as any} />;
    case 'debtVisualizer':
      return <DebtVisualizerWidget widget={widget as any} />;
    case 'retirementReadiness':
      return <RetirementReadinessWidget widget={widget as any} />;
    case 'enhancedSavingsGoals':
      return <EnhancedSavingsGoalsWidget widget={widget as any} />;
    case 'insuranceCoverage':
      return <InsuranceCoverageWidget widget={widget as any} />;
    default:
      return (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-red-600">Unknown widget type: {widgetType}</p>
        </div>
      );
  }
}
