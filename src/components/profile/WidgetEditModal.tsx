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
  IProgressBarListItem,
  IDataListItem
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
        chartType: type === 'barChart' ? 'bar' : 'line'
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
  const defaultItem = {
    id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  };

  switch (type) {
    case 'dataList':
      return {
        ...defaultItem,
        label: 'New Item',
        value: '0.00',
        currency: '$',
        category: '',
        displayOrder: 0
      } as IDataListItem;
    case 'progressBarList':
      return {
        ...defaultItem,
        label: 'New Item',
        current: 0,
        max: 100,
        color: '#3b82f6',
      } as IProgressBarListItem;
    case 'countdownCard':
      return {
        ...defaultItem,
        title: 'New Countdown',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } as ICountdownCardData;
    default:
      return defaultItem;
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
}: WidgetEditModalProps): JSX.Element {
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

  // Handle changing an item's property in the widget data with proper type safety
  const handleItemChange = (
    type: WidgetType,
    index: number,
    key: string,
    value: any
  ): void => {
    setWidgetData(prevData => {
      if (!prevData || !Array.isArray(prevData)) return prevData;
      
      const newData = [...prevData];
      if (index >= 0 && index < newData.length) {
        newData[index] = {
          ...newData[index],
          [key]: value
        };
      }
      return newData as WidgetData;
    });
  };

  // Handle updating widget data for non-array data with proper type safety
  const updateWidgetData = (
    key: string,
    value: any
  ): void => {
    setWidgetData(prevData => {
      if (!prevData) return getWidgetDataType(widget.type);
      
      // Create a new object with the updated property
      return {
        ...prevData,
        [key]: value
      } as WidgetData;
    });
  };

  // Handle adding a new item to a widget's data array
  const handleAddItem = (type: WidgetType) => {
    const newItem = getDefaultItemForType(type);
    
    setWidgetData(prevData => {
      if (!prevData) return [newItem] as WidgetData;
      
      if (Array.isArray(prevData)) {
        return [...prevData, newItem] as WidgetData;
      }
      
      // For non-array data, handle specific widget types
      if (isDataListData(prevData)) {
        return [...prevData, newItem as IDataListItem];
      }
      
      return prevData;
    });
  };

  // Handle removing an item from a widget's data array
  const handleRemoveItem = (type: WidgetType, index: number) => {
    setWidgetData(prevData => {
      if (!prevData || !Array.isArray(prevData)) return prevData;
      
      const newData = [...prevData];
      newData.splice(index, 1);
      return newData as WidgetData;
    });
  };



  // Render data list fields
  const renderDataListFields = () => {
    if (!isDataListData(widgetData)) return null;
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Data List Items</h3>
        <AnimatePresence>
          {Array.isArray(widgetData) && (widgetData as IDataListItem[]).map((item: IDataListItem, index: number) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="p-4 border rounded-lg space-y-3"
            >
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Item {index + 1}</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveItem('dataList', index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FontAwesomeIcon icon={faTrashAlt} className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`label-${item.id}`}>Label</Label>
                  <Input
                    id={`label-${item.id}`}
                    value={item.label}
                    onChange={(e) =>
                      handleItemChange('dataList', index, 'label', e.target.value)
                    }
                    placeholder="e.g., Checking Account"
                  />
                </div>
                <div>
                  <Label htmlFor={`value-${item.id}`}>Value</Label>
                  <Input
                    id={`value-${item.id}`}
                    value={item.value}
                    onChange={(e) =>
                      handleItemChange('dataList', index, 'value', e.target.value)
                    }
                    placeholder="e.g., 2,500.00"
                  />
                </div>
                <div>
                  <Label htmlFor={`currency-${item.id}`}>Currency Symbol</Label>
                  <Input
                    id={`currency-${item.id}`}
                    value={item.currency}
                    onChange={(e) =>
                      handleItemChange('dataList', index, 'currency', e.target.value)
                    }
                    placeholder="e.g., $"
                    className="w-20"
                  />
                </div>
                <div>
                  <Label htmlFor={`category-${item.id}`}>Category (Optional)</Label>
                  <Input
                    id={`category-${item.id}`}
                    value={item.category || ''}
                    onChange={(e) =>
                      handleItemChange('dataList', index, 'category', e.target.value)
                    }
                    placeholder="e.g., Liquid, Savings"
                  />
                </div>
                <div>
                  <Label htmlFor={`order-${item.id}`}>Display Order</Label>
                  <Input
                    id={`order-${item.id}`}
                    type="number"
                    value={item.displayOrder || 0}
                    onChange={(e) =>
                      handleItemChange('dataList', index, 'displayOrder', Number(e.target.value))
                    }
                    className="w-20"
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
          onClick={() => handleAddItem('dataList')}
          className="mt-2"
        >
          <FontAwesomeIcon icon={faPlus} className="h-4 w-4 mr-2" />
          Add Data Item
        </Button>
        
        <div className="pt-4 mt-4 border-t">
          <h4 className="text-md font-medium mb-3">Display Options</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="groupByCategory"
                checked={(widgetData as any).groupByCategory || false}
                onChange={(e) => 
                  updateWidgetData('groupByCategory' as keyof WidgetData, e.target.checked as any)
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="groupByCategory" className="text-sm font-normal">
                Group items by category
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showTotals"
                checked={(widgetData as any).showTotals || false}
                onChange={(e) => 
                  updateWidgetData('showTotals' as keyof WidgetData, e.target.checked as any)
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="showTotals" className="text-sm font-normal">
                Show totals at the bottom
              </Label>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render bar chart fields
  const renderBarChartFields = () => {
    if (!isChartData(widgetData)) return null;
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Bar Chart Settings</h3>
        <div className="space-y-2">
          <Label>Chart configuration coming soon</Label>
        </div>
        <h3 className="text-lg font-medium">Metric Card Settings</h3>
        <div className="space-y-2">
          <AnimatePresence>
            {Array.isArray(widgetData) && widgetData.map((item: any, index: number) => (
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

  // Render metric card fields
  const renderMetricCardFields = (): JSX.Element | null => {
    if (!isMetricCardData(widgetData)) return null;
    
    // Safely get the first item or use a default
    const firstItem = Array.isArray(widgetData) && widgetData.length > 0 
      ? widgetData[0] 
      : { 
          id: '1', 
          value: '', 
          currency: '$', 
          description: '',
          label: '',
          trend: 0,
          trendPercentage: 0,
          progress: 0,
          goalLabel: ''
        };
    
    // Helper to update a field in the first metric card item
    const updateMetricCardField = <K extends keyof IMetricCardItem>(
      field: K, 
      value: IMetricCardItem[K]
    ) => {
      setWidgetData(prevData => {
        if (!Array.isArray(prevData)) return prevData;
        const newData = [...prevData] as IMetricCardItem[];
        
        if (newData.length === 0) {
          newData.push({ ...firstItem, [field]: value });
        } else {
          newData[0] = { ...newData[0], [field]: value };
        }
        
        return newData as WidgetData;
      });
    };
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Metric Card Settings</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="metric-label">Label</Label>
            <Input
              id="metric-label"
              value={firstItem.label || ''}
              onChange={(e) => updateMetricCardField('label', e.target.value)}
              placeholder="e.g., Total Balance"
            />
          </div>
          <div>
            <Label htmlFor="metric-value">Value</Label>
            <Input
              id="metric-value"
              value={firstItem.value || ''}
              onChange={(e) => updateMetricCardField('value', e.target.value)}
              placeholder="e.g., 10,000"
            />
          </div>
          <div>
            <Label htmlFor="metric-currency">Currency</Label>
            <Input
              id="metric-currency"
              value={firstItem.currency || '$'}
              onChange={(e) => updateMetricCardField('currency', e.target.value)}
              placeholder="e.g., $"
              className="w-20"
            />
          </div>
          <div>
            <Label htmlFor="metric-trend">Trend (optional)</Label>
            <Input
              id="metric-trend"
              type="number"
              value={firstItem.trend || 0}
              onChange={(e) => updateMetricCardField('trend', Number(e.target.value))}
              placeholder="e.g., 5"
              className="w-32"
            />
          </div>
          <div>
            <Label htmlFor="metric-trend-percentage">Trend % (optional)</Label>
            <Input
              id="metric-trend-percentage"
              type="number"
              value={firstItem.trendPercentage || 0}
              onChange={(e) => updateMetricCardField('trendPercentage', Number(e.target.value))}
              placeholder="e.g., 10"
              className="w-32"
            />
          </div>
          <div>
            <Label htmlFor="metric-description">Description (Optional)</Label>
            <Input
              id="metric-description"
              value={firstItem.description || ''}
              onChange={(e) => updateMetricCardField('description', e.target.value)}
              placeholder="e.g., Total account balance"
            />
          </div>
        </div>
      </div>
    );
  };

  // Render the appropriate form based on widget type
  const renderWidgetFields = (): JSX.Element | null => {
    if (!widgetData) return null;

    switch (widget.type) {
      case 'metricCard':
        return renderMetricCardFields();
      case 'progressBarList':
        return renderProgressBarListFields();
      case 'countdownCard':
        return renderCountdownCardFields();
      case 'dataList':
        return renderDataListFields();
      case 'barChart':
      case 'lineChart':
        return renderBarChartFields();
      case 'tipCard':
      case 'checklist':
      case 'financialHealthScorecard':
      case 'nextBestAction':
      case 'quickCashFlowSummary':
      case 'debtVisualizer':
      case 'retirementReadiness':
      case 'enhancedSavingsGoals':
      case 'insuranceCoverage':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Settings</h3>
            <p className="text-sm text-gray-500">Configuration options coming soon</p>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Widget Settings</h3>
            <p className="text-sm text-gray-500">No configuration options available for this widget type</p>
          </div>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${widget.title || 'Widget'}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="widget-title">Widget Title</Label>
            <Input
              id="widget-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter widget title"
            />
          </div>
          
          <div>
            <Label>Icon</Label>
            <IconSelector 
              value={icon} 
              onValueChange={setIcon} 
              className="w-full"
            />
          </div>
          
          {renderWidgetFields()}
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
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