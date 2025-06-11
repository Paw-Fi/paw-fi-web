'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Widget } from './types/dashboard-data.typings';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faPlus } from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IMetricCardData,
  IProgressBarListData,
  ICountdownCardData,
  ITipCardData,
  IDataListData,
  IChartData,
  IChecklistItem,
  IFinancialHealthScorecardData,
  INextBestActionData,
  IQuickCashFlowSummaryData,
  IDebtVisualizerData,
  IRetirementReadinessData,
  IEnhancedSavingsGoalsData,
  IInsuranceCoverageData,
  IMetricCardItem,
  IProgressBarListItem
} from './types/dashboard-data.typings';
import { Modal } from '../ui/modal';
import { IconSelector } from '../ui/icon-selector';

// Type definitions
type WidgetType = Widget['type'];

type WidgetDataMap = {
  metricCard: IMetricCardData;
  progressBarList: IProgressBarListData;
  countdownCard: ICountdownCardData;
  tipCard: ITipCardData;
  dataList: IDataListData;
  barChart: IChartData;
  lineChart: IChartData;
  checklist: IChecklistItem[];
  financialHealthScorecard: IFinancialHealthScorecardData;
  nextBestAction: INextBestActionData;
  quickCashFlowSummary: IQuickCashFlowSummaryData;
  debtVisualizer: IDebtVisualizerData;
  retirementReadiness: IRetirementReadinessData;
  enhancedSavingsGoals: IEnhancedSavingsGoalsData;
  insuranceCoverage: IInsuranceCoverageData;
};

type WidgetData = WidgetDataMap[WidgetType];

// Helper type to extract data type from widget type
type WidgetDataForType<T extends WidgetType> = T extends keyof WidgetDataMap ? WidgetDataMap[T] : never;

// Type for widget form data
type WidgetFormData<T extends WidgetType> = 
  T extends 'metricCard' ? IMetricCardData :
  T extends 'progressBarList' ? IProgressBarListData :
  T extends 'countdownCard' ? ICountdownCardData :
  T extends 'tipCard' ? ITipCardData :
  T extends 'dataList' ? IDataListData :
  T extends 'barChart' | 'lineChart' ? IChartData :
  T extends 'checklist' ? IChecklistItem[] :
  T extends 'financialHealthScorecard' ? IFinancialHealthScorecardData :
  T extends 'nextBestAction' ? INextBestActionData :
  T extends 'quickCashFlowSummary' ? IQuickCashFlowSummaryData :
  T extends 'debtVisualizer' ? IDebtVisualizerData :
  T extends 'retirementReadiness' ? IRetirementReadinessData :
  T extends 'enhancedSavingsGoals' ? IEnhancedSavingsGoalsData :
  T extends 'insuranceCoverage' ? IInsuranceCoverageData :
  never;

// Type guards for widget data with proper type narrowing
const isMetricCardData = (data: unknown): data is IMetricCardData => 
  Array.isArray(data) && data.every(
    (item: any) => item && 
    typeof item === 'object' && 
    'value' in item && 
    'currency' in item
  );

const isProgressBarListData = (data: unknown): data is IProgressBarListData =>
  Array.isArray(data) && data.every(
    (item: any) => item && 
    typeof item === 'object' && 
    'current' in item && 
    'max' in item
  );

const isCountdownCardData = (data: unknown): data is ICountdownCardData =>
  data !== null && 
  typeof data === 'object' && 
  !Array.isArray(data) && 
  'targetDate' in data;

const isTipCardData = (data: unknown): data is ITipCardData =>
  data !== null && 
  typeof data === 'object' && 
  !Array.isArray(data) && 
  'tips' in data;

const isDataListData = (data: unknown): data is IDataListData =>
  Array.isArray(data) && data.every(
    (item: any) => item && 
    typeof item === 'object' && 
    'title' in item && 
    'value' in item
  );

const isChartData = (data: unknown): data is IChartData =>
  data !== null && 
  typeof data === 'object' && 
  !Array.isArray(data) && 
  'dataPoints' in data;

const isChecklistData = (data: unknown): data is IChecklistItem[] =>
  Array.isArray(data) && data.every(
    (item: any) => item && 
    typeof item === 'object' && 
    'id' in item && 
    'label' in item && 
    'completed' in item
  );

const isFinancialHealthScorecardData = (data: unknown): data is IFinancialHealthScorecardData =>
  data !== null && 
  typeof data === 'object' && 
  !Array.isArray(data) && 
  'items' in data;

const isNextBestActionData = (data: unknown): data is INextBestActionData =>
  Array.isArray(data) && data.every(
    (item: any) => item && 
    typeof item === 'object' && 
    'id' in item && 
    'title' in item && 
    'completed' in item
  );

const isQuickCashFlowSummaryData = (data: unknown): data is IQuickCashFlowSummaryData =>
  data !== null && 
  typeof data === 'object' && 
  !Array.isArray(data) && 
  'inflows' in data && 
  'outflows' in data;

const isDebtVisualizerData = (data: unknown): data is IDebtVisualizerData =>
  Array.isArray(data) && data.every(
    (item: any) => item && 
    typeof item === 'object' && 
    'name' in item && 
    'balance' in item && 
    'interestRate' in item
  );

const isRetirementReadinessData = (data: unknown): data is IRetirementReadinessData =>
  data !== null && 
  typeof data === 'object' && 
  !Array.isArray(data) && 
  'scenarios' in data;

const isEnhancedSavingsGoalsData = (data: unknown): data is IEnhancedSavingsGoalsData =>
  Array.isArray(data) && data.every(
    (item: any) => item && 
    typeof item === 'object' && 
    'id' in item && 
    'name' in item && 
    'targetAmount' in item
  );

const isInsuranceCoverageData = (data: unknown): data is IInsuranceCoverageData =>
  Array.isArray(data) && data.every(
    (item: any) => item && 
    typeof item === 'object' && 
    'type' in item && 
    'coverageAmount' in item
  );

// Helper to get the appropriate data type based on widget type
const getWidgetDataType = <T extends WidgetType>(type: T): WidgetDataForType<T> => {
  switch (type) {
    case 'metricCard':
      return [] as unknown as WidgetDataForType<T>;
    case 'progressBarList':
      return [] as unknown as WidgetDataForType<T>;
    case 'countdownCard':
      return {
        id: '',
        title: '',
        targetDate: new Date().toISOString(),
        days: 0,
        image: ''
      } as unknown as WidgetDataForType<T>;
    case 'tipCard':
      return {
        tips: [],
        currentTipIndex: 0
      } as unknown as WidgetDataForType<T>;
    case 'dataList':
      return [] as unknown as WidgetDataForType<T>;
    case 'barChart':
    case 'lineChart':
      return {
        dataPoints: [],
        xAxisLabel: '',
        yAxisLabel: ''
      } as unknown as WidgetDataForType<T>;
    case 'checklist':
      return [] as unknown as WidgetDataForType<T>;
    case 'financialHealthScorecard':
      return { items: [] } as unknown as WidgetDataForType<T>;
    case 'nextBestAction':
      return [] as unknown as WidgetDataForType<T>;
    case 'quickCashFlowSummary':
      return { 
        inflows: [],
        outflows: []
      } as unknown as WidgetDataForType<T>;
    case 'debtVisualizer':
      return [] as unknown as WidgetDataForType<T>;
    case 'retirementReadiness':
      return { scenarios: [] } as unknown as WidgetDataForType<T>;
    case 'enhancedSavingsGoals':
      return [] as unknown as WidgetDataForType<T>;
    case 'insuranceCoverage':
      return [] as unknown as WidgetDataForType<T>;
    default:
      throw new Error(`Unsupported widget type: ${type as string}`);
  }
};

// Helper to get default item for a widget type
const getDefaultItemForType = (type: WidgetType) => {
  switch (type) {
    case 'metricCard':
      return {
        id: `metric-${Date.now()}`,
        value: '',
        currency: '$',
        trend: undefined,
        trendPercentage: '',
        description: ''
      } as IMetricCardItem;
    case 'progressBarList':
      return {
        id: `progress-${Date.now()}`,
        label: 'New Item',
        current: 0,
        max: 100,
        color: 'blue'
      } as IProgressBarListItem;
    default:
      return null;
  }
};

interface WidgetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  widget: Widget;
  onSave: (updatedWidget: Omit<Widget, 'id'> & { id?: string }) => void | Promise<void>;
}

export function WidgetEditModal({ 
  isOpen, 
  onClose, 
  widget, 
  onSave 
}: WidgetEditModalProps) {
  // State for form data
  const [title, setTitle] = useState(widget.title || '');
  const [widgetData, setWidgetData] = useState<WidgetData>(() => widget.data || getWidgetDataType(widget.type));
  const [icon, setIcon] = useState(widget.icon || 'faChartLine');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset form when widget changes
  useEffect(() => {
    setTitle(widget.title || '');
    setWidgetData(widget.data || getWidgetDataType(widget.type));
    setIcon(widget.icon || 'faChartLine');
  }, [widget]);

  // Handle form submission with proper type handling
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure we have valid widget data before saving
    if (!widgetData) {
      console.error('Invalid widget data');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create the updated widget object with proper typing
      const updatedWidget: Omit<Widget, 'id'> & { id?: string } = {
        ...widget,
        title,
        icon,
        data: widgetData as Widget['data'], // Type assertion to handle the union type
        id: widget.id // Preserve the ID if it exists
      };
      
      // Call the onSave prop with the updated widget
      await onSave(updatedWidget);
      onClose();
    } catch (error) {
      console.error('Error saving widget:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [widget, title, icon, widgetData, onSave, onClose]);

  // Handle removing an item from the widget data
  const handleRemoveItem = (type: WidgetType, index: number) => {
    setWidgetData(prevData => {
      if (!prevData || !Array.isArray(prevData)) return prevData;
      
      const newData = [...prevData];
      newData.splice(index, 1);
      return newData.length > 0 ? (newData as WidgetData) : getWidgetDataType(type);
    });
  };

  // Handle changing an item's property in the widget data
  const handleItemChange = <T extends WidgetType>(
    type: T,
    index: number,
    key: string,
    value: any
  ) => {
    setWidgetData(prevData => {
      if (!prevData || !Array.isArray(prevData)) return prevData;
      
      const newData = [...prevData];
      newData[index] = { ...newData[index], [key]: value };
      return newData as WidgetData;
    });
  };

  // Handle updating widget data for non-array data with proper type safety
  const updateWidgetData = <K extends keyof WidgetDataMap[typeof widget.type]>(
    key: K,
    value: WidgetDataMap[typeof widget.type][K]
  ) => {
    setWidgetData(prevData => {
      if (!prevData) return getWidgetDataType(widget.type);
      
      // Create a new object with the updated property
      // Using a type assertion to handle the union type safely
      const updatedData = {
        ...prevData
      };
      
      // Update the specific property using a type assertion
      // This is safe because we've already validated the key and value types
      (updatedData as any)[key] = value;
      
      return updatedData as WidgetData;
    });
  }; 
  
  // Render bar chart fields
  const renderBarChartFields = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Bar Chart Settings</h3>
        <div className="space-y-2">
          <Label>Chart configuration coming soon</Label>
        </div>
      </div>
    );
  }; 
  
  // Render widget-specific fields
  const renderWidgetFields = () => {
    if (!widgetData) return null;

    switch (widget.type) {
      case 'metricCard':
        return renderMetricCardFields();
      case 'progressBarList':
        return renderProgressBarListFields();
      case 'countdownCard':
        return renderCountdownCardFields();
      case 'barChart':
        return renderBarChartFields();
      default:
        return <p className="text-gray-500">No specific configuration options for this widget type.</p>;
    }
  };
  
  // Render metric card fields
  const renderMetricCardFields = () => {
    if (!isMetricCardData(widgetData)) return null;
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Metric Card Settings</h3>
        <div className="space-y-2">
          <AnimatePresence>
            {widgetData.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 border rounded-lg"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Item {index + 1}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => handleRemoveItem('metricCard', index)}
                  >
                    <FontAwesomeIcon icon={faTrashAlt} className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`value-${item.id}`}>Value</Label>
                    <Input
                      id={`value-${item.id}`}
                      value={item.value}
                      onChange={(e) =>
                        handleItemChange('metricCard', index, 'value', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`currency-${item.id}`}>Currency</Label>
                    <Input
                      id={`currency-${item.id}`}
                      value={item.currency}
                      onChange={(e) =>
                        handleItemChange('metricCard', index, 'currency', e.target.value)
                      }
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddItem('metricCard')}
            className="mt-2"
          >
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4 mr-2" />
            Add Metric
          </Button>
        </div>
      </div>
    );
  };
  
  // Render progress bar list fields
  const renderProgressBarListFields = () => {
    if (!isProgressBarListData(widgetData)) return null;
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Progress Bar List Settings</h3>
        <div className="space-y-2">
          <AnimatePresence>
            {widgetData.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 border rounded-lg"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Item {index + 1}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => handleRemoveItem('progressBarList', index)}
                  >
                    <FontAwesomeIcon icon={faTrashAlt} className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`label-${item.id}`}>Label</Label>
                    <Input
                      id={`label-${item.id}`}
                      value={item.label}
                      onChange={(e) =>
                        handleItemChange('progressBarList', index, 'label', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`current-${item.id}`}>Current Value</Label>
                    <Input
                      id={`current-${item.id}`}
                      type="number"
                      value={item.current}
                      onChange={(e) =>
                        handleItemChange('progressBarList', index, 'current', Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`max-${item.id}`}>Max Value</Label>
                    <Input
                      id={`max-${item.id}`}
                      type="number"
                      value={item.max}
                      onChange={(e) =>
                        handleItemChange('progressBarList', index, 'max', Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`color-${item.id}`}>Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id={`color-${item.id}`}
                        value={item.color || '#3b82f6'} // Default to blue if no color is set
                        onChange={(e) =>
                          handleItemChange('progressBarList', index, 'color', e.target.value)
                        }
                        className="h-10 w-10 cursor-pointer rounded border border-gray-300"
                        title="Choose a color"
                      />
                      <Input
                        type="text"
                        value={item.color || ''}
                        onChange={(e) =>
                          handleItemChange('progressBarList', index, 'color', e.target.value)
                        }
                        placeholder="Enter a color name or hex code"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddItem('progressBarList')}
            className="mt-2"
          >
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4 mr-2" />
            Add Progress Bar
          </Button>
        </div>
      </div>
    );
  };
  
  // Render countdown card fields
  const renderCountdownCardFields = () => {
    if (!isCountdownCardData(widgetData)) return null;
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Countdown Card Settings</h3>
        <div className="space-y-2">
          <div>
            <Label htmlFor="countdownTitle">Title</Label>
            <Input
              id="countdownTitle"
              value={widgetData && 'title' in widgetData ? (widgetData as any).title : ''}
              onChange={(e) => {
                // Update the title field with proper type safety
                // Type assertion needed for TypeScript to understand the key is valid
                const key = 'title' as keyof WidgetDataMap[typeof widget.type];
                updateWidgetData(key, e.target.value as WidgetDataMap[typeof widget.type][typeof key]);
              }}
              placeholder="Enter title"
            />
          </div>
          <div>
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="date"
              value={widgetData && 'targetDate' in widgetData ? new Date((widgetData as any).targetDate).toISOString().split('T')[0] : ''}
              onChange={(e) => {
                // Update the targetDate field with proper type safety
                // Type assertion needed for TypeScript to understand the key is valid
                const key = 'targetDate' as keyof WidgetDataMap[typeof widget.type];
                updateWidgetData(key, e.target.value as WidgetDataMap[typeof widget.type][typeof key]);
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Handle adding a new item to the widget data
  const handleAddItem = (type: WidgetType) => {
    const newItem = getDefaultItemForType(type);
    if (!newItem) return;

    setWidgetData(prevData => {
      if (!prevData) return [newItem] as WidgetData;
      
      if (Array.isArray(prevData)) {
        return [...prevData, newItem] as WidgetData;
      }
      
      return prevData;
    });
  };

  // Render the appropriate form based on widget type
  const renderForm = () => {
    return renderWidgetFields();
  };

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={`Edit ${widget.type} Widget`}
      description={`Configure the settings for your ${widget.type} widget.`}
    >
      <form onSubmit={handleSubmit} className="">
        <div className="space-y-2">
          <Label htmlFor="widgetTitle">Widget Title</Label>
          <Input
            id="widgetTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter widget title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="widgetIcon">Widget Icon</Label>
          <div className="flex items-center space-x-2">
           <IconSelector
            value={icon}
            selectedIcon={icon}
            onValueChange={(value) => setIcon(value)}
            onSelectIcon={(value) => setIcon(value)}
            className="w-full"
            id="widgetIcon"
          />
          </div>
        </div>

        <div className="border-t pt-4">
          {renderWidgetFields()} {/* Render widget-specific fields */}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}