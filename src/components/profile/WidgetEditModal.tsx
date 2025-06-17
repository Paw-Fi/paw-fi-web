"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Component,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { Select } from '@/components/ui/select'; // Select component not found, commented out for now
import { Label } from "@/components/ui/label";
import {
  Widget,
  IDataListWidget,
  IProgressBarListWidget,
  IBarChartWidget,
  ILineChartWidget,
  IDebtVisualizerWidget,
  IQuickCashFlowSummaryWidget,
  ITipCardWidget,
  ICountdownCardWidget,
  IMetricCardWidget,
  IDataListItem,
  IProgressBarListItem,
  IChartData,
  IChartDataPoint,
  IDebtItem,
  IDebtVisualizerData,
  ICashFlowEntry,
  IQuickCashFlowSummaryData,
  ITipCardListItem,
  ICountdownCardData,
  IMetricCardItem,
  IMetricTrend,
  ITipCardData,
  IChecklistData,
  IFinancialHealthScorecardData,
  IMetricCardData,
  IProgressBarListData,
  IChecklistWidget,
  IFinancialHealthScorecardWidget,
  IInsuranceCoverageWidget,
  IInsuranceCoverageData,
  IInsuranceCoverageItem,
  IChecklistItem,
  INextBestActionData,
  IEnhancedSavingsGoalsWidget,
  IRetirementReadinessWidget,
  IRetirementReadinessData, // Added import
} from "./types/dashboard-data.typings";
// DnD Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  type DraggableSyntheticListeners,
  type DraggableAttributes,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Font Awesome imports
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlusCircle,
  faPalette,
  faCheck,
  faTimes,
  faList,
  faChartLine,
  faCalendarAlt,
  faCheckSquare,
  faCog,
  faTasks,
  faChartBar,
  faExchangeAlt,
  faCreditCard,
  faShieldAlt,
  faLightbulb,
  faCalendar,
  faGripVertical,
  faPen,
  faPlus,
  faTrash,
  faPercent,
  faPiggyBank,
  faHeartbeat,
  faListCheck,
  faSave, // Added for Save button
  faUmbrellaBeach, // Added for Retirement Readiness
  // faShieldAlt was already imported earlier, removed duplicate
} from "@fortawesome/free-solid-svg-icons";

// Import form components with aliases to avoid conflicts
import { DataListForm as DataListFormExt } from "./widget-forms/DataListForm";
import { ProgressBarListForm as ProgressBarListFormExt } from "./widget-forms/ProgressBarListForm";
import {
  BarChartForm as BarChartFormExt,
  SortableBarChartItem,
} from "./widget-forms/BarChartForm";
import { LineChartForm as LineChartFormExt } from "./widget-forms/LineChartForm";
import { DebtVisualizerForm as DebtVisualizerFormExt } from "./widget-forms/DebtVisualizerForm";
import { QuickCashFlowSummaryForm as QuickCashFlowSummaryFormExt } from "./widget-forms/QuickCashFlowSummaryForm";
import { TipCardForm as TipCardFormExt } from "./widget-forms/TipCardForm";
import { CountdownCardForm as CountdownCardFormExt } from "./widget-forms/CountdownCardForm";
import { MetricCardForm as MetricCardFormExt } from "./widget-forms/MetricCardForm";
import { RetirementReadinessForm as RetirementReadinessFormExt } from "./widget-forms/retirement-readiness-form";
import { InsuranceCoverageForm as InsuranceCoverageFormExt } from "./widget-forms/InsuranceCoverageForm";
import { FinancialHealthScorecardForm } from "./widget-forms/financial-health-scorecard-form";
import { ChecklistForm } from "./widget-forms/ChecklistForm";
import { NextBestActionForm } from "./widget-forms/next-best-action-form";
import { EnhancedSavingsGoalsForm } from "./widget-forms/EnhancedSavingsGoalsForm";

// Import IconDefinition type from @fortawesome/fontawesome-common-types
import type { IconDefinition } from "@fortawesome/fontawesome-common-types";

import { motion, Variants } from "framer-motion";
import { Modal } from "../ui/modal";
import { IconSelector } from "../ui/icon-selector";

interface WidgetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  widget: Widget | null;
  onSave: (widget: Widget) => void;
}

const availableIcons = [
  { name: "List", value: "faList", icon: faList },
  { name: "Tasks", value: "faTasks", icon: faTasks },
  { name: "Chart Line", value: "faChartLine", icon: faChartLine },
  { name: "Lightbulb", value: "faLightbulb", icon: faLightbulb },
  { name: "Calendar Alt", value: "faCalendarAlt", icon: faCalendarAlt },
  { name: "Chart Bar", value: "faChartBar", icon: faChartBar },
  { name: "Exchange Alt", value: "faExchangeAlt", icon: faExchangeAlt },
  { name: "Credit Card", value: "faCreditCard", icon: faCreditCard },
  { name: "Shield Alt", value: "faShieldAlt", icon: faShieldAlt },
  { name: "Check Square", value: "faCheckSquare", icon: faCheckSquare },
  { name: "Cog", value: "faCog", icon: faCog },
  { name: "Calendar", value: "faCalendar", icon: faCalendar },
  { name: "Percent", value: "faPercent", icon: faPercent },
];

export type WidgetTypeKey = Widget["type"];

type WidgetTypeConfig = {
  [K in WidgetTypeKey]: {
    component: React.ComponentType<{
      data: Extract<Widget, { type: K }>;
      onDataChange: (data: Extract<Widget, { type: K }>) => void;
    }> | null;
    icon: IconDefinition;
    defaultData: Omit<
      Extract<Widget, { type: K }>,
      "id" | "createdAt" | "updatedAt"
    > & { id: string };
    title?: string;
  };
};

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const widgetTypeConfig: WidgetTypeConfig = {
  quickCashFlowSummary: {
    component: QuickCashFlowSummaryFormExt,
    icon: faExchangeAlt,
    defaultData: {
      id: generateId("widget-qcf"),
      type: "quickCashFlowSummary",
      title: "Cash Flow Summary",
      icon: "faExchangeAlt",
      columnSpan: 1,
      rowSpan: 1,
      data: {
        inflows: [],
        outflows: [],
        period: "monthly",
      } as IQuickCashFlowSummaryData,
    } as Omit<IQuickCashFlowSummaryWidget, "createdAt" | "updatedAt"> & {
      id: string;
    },
  },
  debtVisualizer: {
    component: DebtVisualizerFormExt,
    icon: faCreditCard,
    defaultData: {
      id: generateId("widget-dv"),
      type: "debtVisualizer",
      title: "Debt Visualizer",
      icon: "faCreditCard",
      columnSpan: 2,
      rowSpan: 1,
      strategy: "avalanche",
      data: [] as IDebtItem[],
    } as Omit<IDebtVisualizerWidget, "createdAt" | "updatedAt"> & {
      id: string;
    },
  },
  nextBestAction: {
    component: NextBestActionForm,
    title: "Next Best Actions",
    icon: faLightbulb, // Use the imported IconDefinition
    defaultData: {
      id: generateId("widget-nba"),
      type: "nextBestAction",
      title: "Next Best Actions",
      icon: "faLightbulb",
      columnSpan: 1,
      rowSpan: 1,
      data: [] as INextBestActionData, // INextBestActionData is INextBestActionItem[]
      maxDisplayItems: 3,
      filterByPriority: undefined,
    },
  },
  retirementReadiness: {
    title: "Retirement Readiness",
    component: RetirementReadinessFormExt,
    icon: faUmbrellaBeach,
    defaultData: {
      id: generateId("widget-rr"),
      type: "retirementReadiness",
      title: "Retirement Readiness",
      icon: "faUmbrellaBeach",
      columnSpan: 1,
      rowSpan: 1,
      data: (() => {
        const firstScenarioId = generateId("ret-scen");
        return {
          scenarios: [
            {
              id: firstScenarioId,
              scenarioName: "My Retirement Plan",
              score: 75,
              status: "On Track",
              projectionAmount: 1200000,
              projectionDate: "Age 67",
              explanation:
                "Initial projection based on current savings and market estimates.",
              assumptions:
                "Assumes 5% annual real return, $500 monthly contribution.",
              displayOrder: 1,
            },
          ],
          currentScenarioId: firstScenarioId,
        } as IRetirementReadinessData;
      })(),
    },
  },
  enhancedSavingsGoals: {
    component: EnhancedSavingsGoalsForm as React.ComponentType<{
      data: IEnhancedSavingsGoalsWidget;
      onDataChange: (data: IEnhancedSavingsGoalsWidget) => void;
    }>,
    icon: faPiggyBank,
    defaultData: {
      id: generateId("widget-esg"),
      type: "enhancedSavingsGoals",
      title: "Savings Goals",
      icon: "faPiggyBank",
      columnSpan: 2,
      rowSpan: 1,
      data: [],
      groupByCategory: false,
      showProgress: true,
    },
  },
  dataList: {
    component: DataListFormExt as React.ComponentType<{
      data: IDataListWidget;
      onDataChange: (data: IDataListWidget) => void;
    }>,
    icon: faList,
    defaultData: {
      id: generateId("widget-dl"),
      type: "dataList" as const,
      title: "New Data List",
      icon: "faList",
      columnSpan: 2,
      rowSpan: 1,
      data: [] as IDataListItem[],
    } as Omit<IDataListWidget, "createdAt" | "updatedAt"> & { id: string },
  },
  progressBarList: {
    component: ProgressBarListFormExt as React.ComponentType<{
      data: IProgressBarListWidget;
      onDataChange: (data: IProgressBarListWidget) => void;
    }>,
    icon: faTasks,
    defaultData: {
      id: generateId("widget-pbl"),
      type: "progressBarList" as const,
      title: "My Progress",
      icon: "faTasks",
      columnSpan: 1,
      rowSpan: 1,
      data: [
        {
          id: generateId("progress-item"),
          label: "New Goal",
          current: 0,
          max: 100,
          color: "#4CAF50",
          displayOrder: 0,
        },
      ],
      showPercentages: true,
      sortBy: "custom" as const,
    } as Omit<IProgressBarListWidget, "createdAt" | "updatedAt"> & {
      id: string;
    },
  },
  metricCard: {
    component: MetricCardFormExt as React.ComponentType<{
      data: IMetricCardWidget;
      onDataChange: (data: IMetricCardWidget) => void;
    }>,
    icon: faCheckSquare,
    defaultData: {
      id: generateId("widget-mc"),
      type: "metricCard" as const,
      title: "Key Metric",
      icon: "faCheckSquare",
      columnSpan: 1,
      rowSpan: 1,
      data: {
        title: "Key Performance Indicators",
        description: "Monitor your important metrics.",
        metrics: [
          {
            id: "m1",
            description: "Metric Label", // Changed from label to description
            value: "0", // IMetricCardItem.value is string
            currency: "$", // IMetricCardItem.currency is string
            trend: "neutral" as const,
            trendPercentage: "0",
          },
        ],
      } as IMetricCardData,
    } as Omit<IMetricCardWidget, "createdAt" | "updatedAt"> & { id: string },
  },
  tipCard: {
    component: TipCardFormExt as React.ComponentType<{
      data: ITipCardWidget;
      onDataChange: (data: ITipCardWidget) => void;
    }>,
    icon: faLightbulb,
    defaultData: {
      id: generateId("widget-tc"),
      type: "tipCard" as const,
      title: "Helpful Tip",
      icon: "faLightbulb",
      columnSpan: 1,
      rowSpan: 1,
      data: {
        tips: [
          {
            id: "tip-1",
            title: "Save Regularly",
            content: "Try to save a portion of your income each month.",
            displayOrder: 0,
          },
        ],
        currentTipIndex: 0,
        autoRotate: true,
      } as ITipCardData,
    } as Omit<ITipCardWidget, "createdAt" | "updatedAt"> & { id: string },
  },
  countdownCard: {
    component: CountdownCardFormExt as React.ComponentType<{
      data: ICountdownCardWidget;
      onDataChange: (data: ICountdownCardWidget) => void;
    }>,
    icon: faCalendar,
    defaultData: {
      id: generateId("widget-cc"),
      type: "countdownCard" as const,
      title: "Event Countdown",
      icon: "faCalendar",
      columnSpan: 1,
      rowSpan: 1,
      data: {
        id: "cd-1",
        title: "Next Holiday",
        image: "https://placekitten.com/100/100",
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        showDays: true,
        showHours: true,
        showMinutes: true,
        showSeconds: true,
      } as ICountdownCardData,
    } as Omit<ICountdownCardWidget, "createdAt" | "updatedAt"> & { id: string },
  },
  barChart: {
    component: BarChartFormExt as React.ComponentType<{
      data: IBarChartWidget;
      onDataChange: (data: IBarChartWidget) => void;
    }>,
    icon: faChartBar,
    defaultData: {
      id: generateId("widget-bc"),
      type: "barChart" as const,
      title: "Sample Bar Chart",
      icon: "faChartBar",
      columnSpan: 2,
      rowSpan: 1,
      data: {
        dataPoints: [
          {
            id: generateId("dp-bc1"),
            label: "A",
            value: 10,
            color: "#4CAF50",
            displayOrder: 0,
          },
          {
            id: generateId("dp-bc2"),
            label: "B",
            value: 20,
            color: "#FFC107",
            displayOrder: 1,
          },
        ],
        chartType: "bar" as const,
        xAxisLabel: "Category",
        yAxisLabel: "Value",
        showLegend: true,
        title: "Sample Bar Chart",
        height: 300,
      },
    } as Omit<IBarChartWidget, "createdAt" | "updatedAt"> & { id: string },
  },
  lineChart: {
    component: LineChartFormExt as React.ComponentType<{
      data: ILineChartWidget;
      onDataChange: (data: ILineChartWidget) => void;
    }>,
    icon: faChartLine,
    defaultData: {
      id: generateId("widget-lc"),
      type: "lineChart" as const,
      title: "Sample Line Chart",
      icon: "faChartLine",
      columnSpan: 2,
      rowSpan: 1,
      data: {
        dataPoints: [
          {
            id: "dp-lc1",
            label: "Jan",
            value: 5,
            color: "#3B82F6",
            displayOrder: 0,
          },
          {
            id: "dp-lc2",
            label: "Feb",
            value: 15,
            color: "#3B82F6",
            displayOrder: 1,
          },
        ],
        chartType: "line" as const,
        xAxisLabel: "Month",
        yAxisLabel: "Value",
        showLegend: true,
        title: "Sample Line Chart",
        height: 300,
      },
    } as Omit<ILineChartWidget, "createdAt" | "updatedAt"> & { id: string },
  },
  financialHealthScorecard: {
    component: FinancialHealthScorecardForm as React.ComponentType<{
      data: IFinancialHealthScorecardWidget;
      onDataChange: (data: IFinancialHealthScorecardWidget) => void;
    }>,
    icon: faHeartbeat,
    title: "Financial Health Scorecard", // Title for the "Add Widget" list entry
    defaultData: {
      id: generateId("widget-fhs"),
      type: "financialHealthScorecard",
      title: "Financial Health Score",
      icon: "faHeartbeat",
      columnSpan: 2,
      rowSpan: 1,
      showIndividualScores: true, // Default setting for the widget
      data: {
        items: [
          // Optionally, start with one default item or keep empty
          // {
          //   id: generateId('fhs-item'),
          //   category: 'Example Category',
          //   score: 75,
          //   status: 'Good' as const,
          //   explanation: 'This is an example item.',
          //   weight: 0.5,
          //   displayOrder: 0,
          // }
        ], // Start with an empty array or a minimal valid item
        // overallScore and overallStatus are calculated, not part of default data.items
      } as IFinancialHealthScorecardData,
    } as Omit<IFinancialHealthScorecardWidget, "createdAt" | "updatedAt"> & {
      id: string;
    },
  },
  insuranceCoverage: {
    component: InsuranceCoverageFormExt,
    icon: faShieldAlt, // Icon for the "Add Widget" list entry
    title: "Insurance Coverage", // Title for the "Add Widget" list entry
    defaultData: {
      id: generateId("widget-insurance"),
      type: "insuranceCoverage",
      title: "Insurance Policies",
      icon: "faShieldAlt",
      columnSpan: 1,
      rowSpan: 1,
      data: { items: [] as IInsuranceCoverageItem[] },
      showPremiums: true,
      showRenewalDates: true,
    } as Omit<IInsuranceCoverageWidget, "createdAt" | "updatedAt"> & {
      id: string;
    },
  },
  checklist: {
    component: ChecklistForm,
    icon: faListCheck,
    defaultData: {
      id: generateId("widget-cl"),
      type: "checklist",
      title: "My Checklist",
      icon: "faListCheck",
      columnSpan: 2,
      rowSpan: 1,
      data: [
        {
          id: "i1-cl",
          task: "Review monthly budget",
          isCompleted: false,
          displayOrder: 0,
        },
        {
          id: "i2-cl",
          task: "Plan retirement contributions",
          isCompleted: false,
          displayOrder: 1,
        },
      ] as IChecklistItem[],
    } as Omit<IChecklistWidget, "createdAt" | "updatedAt"> & { id: string },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
};

export default function WidgetEditModal({
  isOpen,
  onClose,
  widget,
  onSave,
}: WidgetEditModalProps) {
  const [formData, setFormData] = useState<Widget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (widget) {
      setFormData(JSON.parse(JSON.stringify(widget)));
    } else {
      setFormData(null);
    }
  }, [widget]);

  const handleGlobalSettingChange = useCallback(
    (field: keyof Widget, value: any) => {
      setFormData((prev) =>
        prev ? ({ ...prev, [field]: value } as Widget) : null,
      );
    },
    [],
  );

  // This onDataChange is for the forms to update the *entire widget object* in formData
  const handleSpecificWidgetDataChange = useCallback(
    (updatedWidgetData: Widget) => {
      setFormData(updatedWidgetData);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!formData) return;
      setIsSubmitting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onSave(formData);
        onClose();
      } catch (error) {
        console.error("Failed to save widget:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSave, onClose],
  );

  const ActiveForm = useMemo(() => {
    if (!formData?.type) return null;
    const config = widgetTypeConfig[formData.type as WidgetTypeKey];
    return config?.component || null;
  }, [formData?.type]);

  const renderActiveForm = useMemo(() => {
    if (!ActiveForm || !formData) return null;
    const TypedActiveForm = ActiveForm as React.ComponentType<{
      data: Widget;
      onDataChange: (data: Widget) => void;
    }>;

    return (
      <div className="w-full">
        <TypedActiveForm
          data={formData}
          onDataChange={handleSpecificWidgetDataChange}
        />
      </div>
    );
  }, [ActiveForm, formData, handleSpecificWidgetDataChange]);

  if (!isOpen || !formData) return null;

  const currentWidgetTypeConf = formData?.type
    ? widgetTypeConfig[formData.type as WidgetTypeKey]
    : null;
  const displayFormTitle =
    formData.title ||
    (currentWidgetTypeConf
      ? currentWidgetTypeConf.defaultData.title
      : "Widget Settings");
  const displayFormIcon = currentWidgetTypeConf
    ? currentWidgetTypeConf.icon
    : faCog;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      contentClassName="p-0 bg-white dark:bg-slate-800 border border-slate-300/30 dark:border-slate-700/30 shadow-2xl rounded-xl overflow-hidden"
      footer={
        ()=> <motion.div
        variants={itemVariants}
        className="flex justify-end space-x-3 border-t border-gray-300/50 px-5 py-4 dark:border-slate-700/50"
      >
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
          className="flex items-center space-x-2 rounded-lg px-5 py-2.5 transition-all duration-200 ease-in-out hover:border-gray-400 hover:bg-gray-100/50 hover:text-gray-800 dark:hover:border-slate-500 dark:hover:bg-slate-700/50 dark:hover:text-gray-200"
        >
          <span>Cancel</span>
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="flex transform items-center space-x-2 rounded-lg px-5 py-2.5 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg hover:shadow-primary/30"
        >
          <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
        </Button>
      </motion.div>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="flex h-full flex-col divide-y divide-gray-300/50 dark:divide-slate-700/50"
      >
        <motion.div
          variants={itemVariants}
          className="sticky top-0 z-10 border-b border-gray-300/50 px-5 py-4 dark:border-slate-700/50"
        >
          <div className="flex items-center">
            <FontAwesomeIcon
              icon={displayFormIcon}
              className="text-primary-600 dark:text-primary-400 mr-3 text-xl"
            />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit {displayFormTitle}
            </h2>
          </div>
        </motion.div>

        {/* Scrollable Content Area */}
        <motion.div
          variants={itemVariants}
          className="flex-1 space-y-6 overflow-y-auto px-5 py-6"
        >
          <div className="space-y-4 rounded-lg border border-gray-300/30 bg-white/10 p-4 dark:border-slate-700/30 dark:bg-slate-900/10">
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">
              General Settings
            </h3>
            <div>
              <Label
                htmlFor="widget-title"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Widget Title
              </Label>
              <Input
                id="widget-title"
                value={formData.title || ""}
                onChange={(e) =>
                  handleGlobalSettingChange("title", e.target.value)
                }
                placeholder={`E.g., ${currentWidgetTypeConf ? currentWidgetTypeConf.defaultData.title : "Default Title"}`}
                className="focus:ring-primary-500 focus:border-primary-500 border-gray-400/50 bg-white/20 placeholder:text-gray-400/70 dark:border-slate-600/50 dark:bg-slate-900/20 dark:placeholder:text-gray-500/70"
              />
            </div>
            <div>
              <Label
                htmlFor="widget-icon"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Icon
              </Label>
              <IconSelector
                selectedIcon={formData.icon || ""}
                onSelectIcon={(iconName) =>
                  handleGlobalSettingChange("icon", iconName)
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="widget-columnSpan"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Column Span
                </Label>
                <Input
                  id="widget-columnSpan"
                  type="number"
                  min="1"
                  max="2"
                  value={formData.columnSpan || 1}
                  onChange={(e) =>
                    handleGlobalSettingChange(
                      "columnSpan",
                      (parseInt(e.target.value, 10) as 1 | 2) || 1,
                    )
                  }
                  className="focus:ring-primary-500 focus:border-primary-500 border-gray-400/50 bg-white/20 placeholder:text-gray-400/70 dark:border-slate-600/50 dark:bg-slate-900/20 dark:placeholder:text-gray-500/70"
                />
              </div>
              <div>
                <Label
                  htmlFor="widget-rowSpan"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Row Span (Optional)
                </Label>
                <Input
                  id="widget-rowSpan"
                  type="number"
                  min="1"
                  max="2"
                  value={formData.rowSpan || ""}
                  onChange={(e) =>
                    handleGlobalSettingChange(
                      "rowSpan",
                      (parseInt(e.target.value, 10) as 1 | 2) || undefined,
                    )
                  }
                  placeholder="Auto"
                  className="focus:ring-primary-500 focus:border-primary-500 border-gray-400/50 bg-white/20 placeholder:text-gray-400/70 dark:border-slate-600/50 dark:bg-slate-900/20 dark:placeholder:text-gray-500/70"
                />
              </div>
            </div>
          </div>

          {ActiveForm ? (
            renderActiveForm
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400">
              No specific form for this widget type or widget data is missing.
            </p>
          )}
        </motion.div>
      </form>
    </Modal>
  );
}
