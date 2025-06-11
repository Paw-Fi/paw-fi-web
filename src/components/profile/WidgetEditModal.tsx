'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/modal'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSelector } from '@/components/ui/icon-selector';
import {
  Widget,
  IProgressBarListWidget,
  IProgressBarListItem,
} from './types/dashboard-data.typings';

// --- Widget Type Definitions ---

// Base widget data types
type WidgetType = 'metricCard' | 'progressBarList' | 'tipCard' | 'dataList' | 'countdownCard' | 'barChart' | 'lineChart' | 'quickCashFlowSummary';

// Progress bar item type
interface ProgressBarItem {
  id: string;
  label: string;
  value: number; // Current progress value
  max: number;   // Maximum value
  color: string;
  displayOrder?: number;
}

// Data list item type
interface DataListItem {
  id: string;
  label: string;
  value: string | number; // Can be string (e.g., "$100") or number
  description?: string;
  currency?: string;
  category?: string;
}

// Tip card item type
interface TipCardItem {
  id: string;
  title: string;
  content: string;
  category: string;
}

// Metric card item type
interface MetricCardItem {
  id: string;
  label: string;
  value: string | number; // Can be string (e.g., "1.5M") or number
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
}

// Bar Chart Data Point type
interface BarChartDataPoint {
  id: string;
  label: string;
  value: number;
  color: string;
  displayOrder?: number;
}

// --- Widget Data Interfaces (specific to each type) ---

interface MetricCardData {
  type: 'metricCard';
  items: MetricCardItem[];
  title?: string;
}

interface ProgressBarListData {
  type: 'progressBarList';
  items: ProgressBarItem[];
  title?: string;
  showPercentages?: boolean;
  sortBy?: 'value' | 'label' | 'custom';
}

interface TipCardWidgetData {
  type: 'tipCard';
  tips: TipCardItem[];
  currentTipIndex: number;
  autoRotate: boolean;
  title?: string;
}

interface DataListWidgetData {
  type: 'dataList';
  items: DataListItem[];
  title?: string;
  footerLink?: { text: string; url: string; icon: string; };
  showIcons?: boolean;
  tip?: string;
  groupByCategory?: boolean;
  showTotals?: boolean;
}

interface CountdownCardData {
  type: 'countdownCard';
  targetDate: string;
  title: string;
  image?: string;
  description?: string;
}

interface BarChartWidgetData {
  type: 'barChart';
  dataPoints: BarChartDataPoint[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  showLegend?: boolean;
  title?: string;
}

// Union type for all widget specific data structures
type WidgetData =
  | DataListWidgetData
  | TipCardWidgetData
  | ProgressBarListData
  | MetricCardData
  | CountdownCardData
  | BarChartWidgetData
  // Fallback for unknown widget types
  | { type: string; [key: string]: any; };

// --- Type Guards (for safer type assertions) ---

const isDataListWidgetData = (data: WidgetData): data is DataListWidgetData => data.type === 'dataList';
const isTipCardWidgetData = (data: WidgetData): data is TipCardWidgetData => data.type === 'tipCard';
const isProgressBarListData = (data: WidgetData): data is ProgressBarListData => data.type === 'progressBarList';
const isMetricCardData = (data: WidgetData): data is MetricCardData => data.type === 'metricCard';
const isCountdownCardData = (data: WidgetData): data is CountdownCardData => data.type === 'countdownCard';
const isBarChartWidgetData = (data: WidgetData): data is BarChartWidgetData => data.type === 'barChart';


interface WidgetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  widget: Widget; // The widget being edited
  onSave: (updatedWidget: Widget) => void;
}

export function WidgetEditModal({ isOpen, onClose, widget, onSave }: WidgetEditModalProps) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('');
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to safely update the nested widgetData state
  const updateWidgetData = useCallback(
    <T extends WidgetData>(updates: Partial<T> | ((prev: T) => T)) => {
      setWidgetData(prev => {
        if (!prev) return prev; // If prev is null, don't update
        // Apply updates based on whether 'updates' is an object or a function
        const updated = typeof updates === 'function' ? updates(prev as T) : { ...prev, ...updates };
        return updated;
      });
    },
    []
  );

  // Initialize form state when the widget prop changes
  useEffect(() => {
    if (!widget) {
      setTitle('');
      setIcon('');
      setWidgetData(null);
      return;
    }

    setTitle(widget.title || '');
    setIcon(widget.icon || '');

    // Deep initialization of widgetData based on type
    let initialWidgetData: WidgetData | null = null;

    switch (widget.type) {
      case 'metricCard':
        initialWidgetData = {
          type: 'metricCard',
          // Ensure items is always an array, mapping existing data if present
          items: Array.isArray(widget.data?.items) ? widget.data.items.map((item: any) => ({
            id: item.id || String(Math.random()),
            label: item.label || '',
            value: item.value || 0,
            description: item.description || '',
            trend: item.trend || 'neutral',
            icon: item.icon || ''
          })) : [], // Initialize as empty array if no data
          title: widget.data?.title || widget.title || ''
        } as MetricCardData;
        break;

      case 'progressBarList':
        initialWidgetData = {
          type: 'progressBarList',
          items: Array.isArray(widget.data?.items)
            ? widget.data.items.map((item: any) => ({
                id: item.id || `item-${Date.now()}-${Math.random()}`,
                label: item.label || '',
                // Use 'current' from backend type, map to 'value' for frontend
                value: typeof item.current === 'number' ? item.current : 0,
                max: typeof item.max === 'number' ? item.max : 100,
                color: item.color || '#3b82f6',
                displayOrder: item.displayOrder // Preserve displayOrder if exists
              }))
            : [], // Initialize as empty array
          showPercentages: widget.data?.showPercentages ?? true, // Default to true if undefined
          sortBy: widget.data?.sortBy === 'progress' ? 'value' :
                  widget.data?.sortBy === 'alphabetical' ? 'label' : 'custom',
          title: widget.data?.title || widget.title || '',
        } as ProgressBarListData;
        break;

      case 'tipCard':
        initialWidgetData = {
          type: 'tipCard',
          tips: Array.isArray(widget.data?.tips) ? widget.data.tips.map((tip: any) => ({
            id: tip.id || `tip-${Date.now()}-${Math.random()}`,
            title: tip.title || '',
            content: tip.content || '',
            category: tip.category || ''
          })) : [], // Initialize as empty array
          currentTipIndex: widget.data?.currentTipIndex || 0,
          autoRotate: widget.data?.autoRotate ?? false, // Default to false if undefined
          title: widget.data?.title || widget.title || '',
        } as TipCardWidgetData;
        break;

      case 'dataList':
        initialWidgetData = {
          type: 'dataList',
          items: Array.isArray(widget.data?.items) ? widget.data.items.map((item: any) => ({
            id: item.id || `data-item-${Date.now()}-${Math.random()}`,
            label: item.label || '',
            value: item.value || '',
            description: item.description || '',
            currency: item.currency || '',
            category: item.category || ''
          })) : [], // Initialize as empty array
          tip: widget.data?.tip || '',
          footerLink: widget.data?.footerLink || { text: '', url: '', icon: 'link' },
          groupByCategory: widget.data?.groupByCategory ?? false,
          showTotals: widget.data?.showTotals ?? false,
          title: widget.data?.title || widget.title || '',
        } as DataListWidgetData;
        break;

      case 'countdownCard':
        initialWidgetData = {
          type: 'countdownCard',
          targetDate: widget.data?.targetDate || new Date().toISOString().split('T')[0], // Default to today
          title: widget.data?.title || '',
          image: widget.data?.image || '',
          description: widget.data?.description || '',
        } as CountdownCardData;
        break;

      case 'barChart':
        initialWidgetData = {
          type: 'barChart',
          dataPoints: Array.isArray(widget.data?.dataPoints)
            ? widget.data.dataPoints.map((point: any) => ({
                id: point.id || `point-${Date.now()}-${Math.random()}`,
                label: point.label || '',
                value: typeof point.value === 'number' ? point.value : 0,
                color: point.color || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
                displayOrder: point.displayOrder
              }))
            : [], // Initialize as empty array
          xAxisLabel: widget.data?.xAxisLabel || '',
          yAxisLabel: widget.data?.yAxisLabel || '',
          height: widget.data?.height || 300,
          showLegend: widget.data?.showLegend ?? true, // Default to true
          title: widget.data?.title || widget.title || '',
        } as BarChartWidgetData;
        break;

      default:
        // Handle other/unknown widget types gracefully
        initialWidgetData = {
          type: widget.type,
          ...widget.data, // Spread existing data if any
        };
    }
    setWidgetData(initialWidgetData);
  }, [widget]); // Dependency array: re-run if widget changes

  // Handle saving the widget data
  const handleSave = useCallback(() => {
    if (!widget || !widgetData) {
      console.error("Attempted to save with missing widget or widgetData.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Special handling for progressBarList to match backend IProgressBarListWidget type
      if (isProgressBarListData(widgetData)) {
        // Map frontend ProgressBarItem to backend IProgressBarListItem
        const progressBarItems: IProgressBarListItem[] = widgetData.items.map(item => ({
          id: item.id,
          label: item.label,
          current: item.value, // Map 'value' back to 'current'
          max: item.max,
          color: item.color,
          ...(item.displayOrder !== undefined ? { displayOrder: item.displayOrder } : {})
        }));

        // The IProgressBarListWidget type expects showPercentages and sortBy as direct properties,
        // not nested inside 'data'.
        const progressBarListBackendWidget: IProgressBarListWidget = {
          id: widget.id,
          title: title, // Use the shared title state
          icon: icon,   // Use the shared icon state
          type: 'progressBarList',
          data: progressBarItems, // This is the array of items
          showPercentages: widgetData.showPercentages ?? false,
          sortBy: widgetData.sortBy === 'value' ? 'progress' :
                  widgetData.sortBy === 'label' ? 'alphabetical' : 'custom',
          // Preserve other base widget properties if they exist on the original widget
          size: widget.size,
          position: widget.position,
          column: widget.column,
        };
        onSave(progressBarListBackendWidget);
        onClose();
        return; // Exit early as we've already saved and closed
      }

      // For all other widget types, construct the updated widget generically
      const updatedWidget: Widget = {
        ...widget, // Spread original widget properties
        title: title, // Use the shared title state
        icon: icon,   // Use the shared icon state
        data: widgetData, // The widgetData state holds the specific data structure
      };

      onSave(updatedWidget);
      onClose();
    } catch (error: unknown) {
      console.error('Error saving widget:', error);
      // Optionally show a user-friendly error message
    } finally {
      setIsSubmitting(false);
    }
  }, [widget, title, icon, widgetData, onSave, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    handleSave();
  };

  // Helper function to calculate progress percentage for display
  const getProgressPercentage = (current: number, target: number): number => {
    if (target <= 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  // --- Bar Chart Specific Functions ---
  const updateBarChartDataPoint = useCallback((index: number, field: keyof BarChartDataPoint, value: any) => {
    if (!isBarChartWidgetData(widgetData)) return; // Type guard

    updateWidgetData<BarChartWidgetData>(prev => {
      const newDataPoints = [...(prev.dataPoints || [])]; // Ensure it's an array
      if (!newDataPoints[index]) return prev; // Item not found, return previous state

      newDataPoints[index] = {
        ...newDataPoints[index],
        [field]: field === 'value' ? Number(value) : value // Convert value to number if applicable
      };
      return { ...prev, dataPoints: newDataPoints };
    });
  }, [widgetData, updateWidgetData]); // Dependency on widgetData to trigger re-render and updateWidgetData

  const addBarChartDataPoint = useCallback(() => {
    if (!isBarChartWidgetData(widgetData)) return;

    const newId = `item-${Date.now()}-${Math.random()}`; // More robust ID
    const newColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`; // Ensure 6 chars
    const newDataPoint: BarChartDataPoint = {
      id: newId,
      label: '',
      value: 0,
      color: newColor,
      displayOrder: (widgetData.dataPoints?.length || 0) + 1
    };

    updateWidgetData<BarChartWidgetData>(prev => ({
      ...prev,
      dataPoints: [...(prev.dataPoints || []), newDataPoint]
    }));
  }, [widgetData, updateWidgetData]);

  const removeBarChartDataPoint = useCallback((index: number) => {
    if (!isBarChartWidgetData(widgetData)) return;

    updateWidgetData<BarChartWidgetData>(prev => {
      const newDataPoints = [...(prev.dataPoints || [])];
      newDataPoints.splice(index, 1); // Remove item at index
      return { ...prev, dataPoints: newDataPoints };
    });
  }, [widgetData, updateWidgetData]);

  // Render bar chart specific fields
  const renderBarChartFields = () => {
    if (!isBarChartWidgetData(widgetData)) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="xAxisLabel">X-Axis Label</Label>
            <Input
              id="xAxisLabel"
              value={widgetData.xAxisLabel || ''}
              onChange={(e) => updateWidgetData<BarChartWidgetData>({ xAxisLabel: e.target.value })}
              placeholder="e.g., Categories"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yAxisLabel">Y-Axis Label</Label>
            <Input
              id="yAxisLabel"
              value={widgetData.yAxisLabel || ''}
              onChange={(e) => updateWidgetData<BarChartWidgetData>({ yAxisLabel: e.target.value })}
              placeholder="e.g., Amount"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Data Points</Label>
            <Button type="button" size="sm" onClick={addBarChartDataPoint}>
              Add Data Point
            </Button>
          </div>

          <div className="space-y-3">
            <AnimatePresence> {/* Wrap mapped items for animation */}
              {widgetData.dataPoints?.map((item, index) => (
                <motion.div
                  key={item.id} // Essential for lists in React and AnimatePresence
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md" // Added styling for clarity
                >
                  <div className="col-span-4">
                    <Input
                      value={item.label}
                      onChange={(e) => updateBarChartDataPoint(index, 'label', e.target.value)}
                      placeholder="Label"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={item.value}
                      onChange={(e) => updateBarChartDataPoint(index, 'value', e.target.value)}
                      placeholder="Value"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="color"
                      value={item.color}
                      onChange={(e) => updateBarChartDataPoint(index, 'color', e.target.value)}
                      className="p-0 h-10 w-full"
                    />
                  </div>
                  <div className="col-span-3 flex items-center">
                    <div
                      className="w-4 h-4 rounded mr-2"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-500">{item.color}</span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="text"
                      size="icon"
                      onClick={() => removeBarChartDataPoint(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="chartHeight">Chart Height (px)</Label>
            <Input
              id="chartHeight"
              type="number"
              min="100"
              max="1000"
              step="10"
              value={widgetData.height || 300}
              onChange={(e) => updateWidgetData<BarChartWidgetData>({ height: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-end space-x-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showLegend"
                checked={widgetData.showLegend ?? true} // Default to true
                onCheckedChange={(checked) => updateWidgetData<BarChartWidgetData>({ showLegend: !!checked })}
              />
              <Label htmlFor="showLegend">Show Legend</Label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render the form based on widget type
  const renderWidgetFields = () => {
    if (!widget || !widgetData) return null; // Ensure data is loaded

    // Cast widgetData to specific types for easier access
    const dataListData = isDataListWidgetData(widgetData) ? widgetData : null;
    const tipCardData = isTipCardWidgetData(widgetData) ? widgetData : null;
    const progressBarData = isProgressBarListData(widgetData) ? widgetData : null;
    const metricCardData = isMetricCardData(widgetData) ? widgetData : null;
    const countdownData = isCountdownCardData(widgetData) ? widgetData : null;

    switch (widgetData.type) {
      case 'dataList':
        if (!dataListData) return null;
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Data List Configuration</h3>
            <div className="space-y-2">
              <Label htmlFor="dataListTitle">Title</Label>
              <Input
                id="dataListTitle"
                value={dataListData.title || ''}
                onChange={(e) => updateWidgetData<DataListWidgetData>(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter title"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateWidgetData<DataListWidgetData>(prev => {
                      const newId = `item-${Date.now()}-${Math.random()}`; // Unique ID
                      const newItem: DataListItem = {
                        id: newId,
                        label: `Item ${(prev.items?.length || 0) + 1}`,
                        value: '0',
                        currency: 'USD',
                        category: 'Uncategorized',
                      };
                      return {
                        ...prev,
                        items: [...(prev.items || []), newItem], // Ensure items is always an array
                      };
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Item
                </Button>
              </div>
              {/* AnimatePresence must have a single direct child */}
              <AnimatePresence>
                <div className="space-y-2"> {/* This div is the single child */}
                  {dataListData.items?.map((item, index) => (
                    <motion.div
                      key={item.id} // Important for list rendering and animations
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-3 border rounded-md space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Item {index + 1}</h4>
                        <Button
                          type="button"
                          variant="text"
                          size="sm"
                          onClick={() => {
                            updateWidgetData<DataListWidgetData>(prev => ({
                              ...prev,
                              items: (prev.items || []).filter((_, i) => i !== index),
                            }));
                          }}
                        >
                          <FontAwesomeIcon icon={faTimes} className="mr-1" /> Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`dataListItemLabel-${item.id}`}>Label</Label>
                          <Input
                            id={`dataListItemLabel-${item.id}`}
                            value={item.label}
                            onChange={(e) => {
                              updateWidgetData<DataListWidgetData>(prev => {
                                const newItems = [...prev.items];
                                newItems[index] = { ...newItems[index], label: e.target.value };
                                return { ...prev, items: newItems };
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`dataListItemValue-${item.id}`}>Value</Label>
                          <Input
                            id={`dataListItemValue-${item.id}`}
                            type="text" // Value can be string or number
                            value={item.value}
                            onChange={(e) => {
                              updateWidgetData<DataListWidgetData>(prev => {
                                const newItems = [...prev.items];
                                newItems[index] = { ...newItems[index], value: e.target.value };
                                return { ...prev, items: newItems };
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`dataListItemCurrency-${item.id}`}>Currency</Label>
                          <Input
                            id={`dataListItemCurrency-${item.id}`}
                            value={item.currency || ''}
                            onChange={(e) => {
                              updateWidgetData<DataListWidgetData>(prev => {
                                const newItems = [...prev.items];
                                newItems[index] = { ...newItems[index], currency: e.target.value };
                                return { ...prev, items: newItems };
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`dataListItemCategory-${item.id}`}>Category</Label>
                          <Input
                            id={`dataListItemCategory-${item.id}`}
                            value={item.category || ''}
                            onChange={(e) => {
                              updateWidgetData<DataListWidgetData>(prev => {
                                const newItems = [...prev.items];
                                newItems[index] = { ...newItems[index], category: e.target.value };
                                return { ...prev, items: newItems };
                              });
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            </div>
          </div>
        );

      case 'tipCard':
        if (!tipCardData) return null;
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Tip Card Configuration</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Tips</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateWidgetData<TipCardWidgetData>(prev => {
                      const newId = `tip-${Date.now()}-${Math.random()}`;
                      const newTip: TipCardItem = {
                        id: newId,
                        title: 'New Tip',
                        content: 'New tip content',
                        category: 'General',
                      };
                      return {
                        ...prev,
                        tips: [...(prev.tips || []), newTip],
                      };
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Tip
                </Button>
              </div>
              <AnimatePresence>
                <div className="space-y-2"> {/* Single child for AnimatePresence */}
                  {tipCardData.tips?.map((tip, index) => (
                    <motion.div
                      key={tip.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-3 border rounded-md space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Tip {index + 1}</h4>
                        <Button
                          type="button"
                          variant="text"
                          size="sm"
                          onClick={() => {
                            updateWidgetData<TipCardWidgetData>(prev => ({
                              ...prev,
                              tips: (prev.tips || []).filter((_, i) => i !== index),
                            }));
                          }}
                        >
                          <FontAwesomeIcon icon={faTimes} className="mr-1" /> Remove
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <Label htmlFor={`tipTitle-${tip.id}`}>Title</Label>
                          <Input
                            id={`tipTitle-${tip.id}`}
                            value={tip.title}
                            onChange={(e) => {
                              updateWidgetData<TipCardWidgetData>(prev => {
                                const newTips = [...prev.tips];
                                newTips[index] = { ...newTips[index], title: e.target.value };
                                return { ...prev, tips: newTips };
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`tipContent-${tip.id}`}>Content</Label>
                          <Input
                             id={`tipContent-${tip.id}`}
                             value={tip.content}
                             onChange={(e) => {
                               updateWidgetData<TipCardWidgetData>(prev => {
                                 const newTips = [...prev.tips];
                                 newTips[index] = { ...newTips[index], content: e.target.value };
                                 return { ...prev, tips: newTips };
                               });
                             }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`tipCategory-${tip.id}`}>Category</Label>
                          <Input
                            id={`tipCategory-${tip.id}`}
                            value={tip.category}
                            onChange={(e) => {
                              updateWidgetData<TipCardWidgetData>(prev => {
                                const newTips = [...prev.tips];
                                newTips[index] = { ...newTips[index], category: e.target.value };
                                return { ...prev, tips: newTips };
                              });
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            </div>
          </div>
        );

      case 'progressBarList':
        if (!progressBarData) return null;
        const currentProgressBarItems = progressBarData.items || [];
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Progress Bar List Configuration</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Progress Bars</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateWidgetData<ProgressBarListData>(prev => {
                      const newId = `item-${Date.now()}-${Math.random()}`;
                      const newItem: ProgressBarItem = {
                        id: newId,
                        label: `Progress ${(prev.items?.length || 0) + 1}`,
                        value: 50,
                        max: 100,
                        color: '#3b82f6',
                      };
                      return {
                        ...prev,
                        items: [...(prev.items || []), newItem],
                      };
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Progress Bar
                </Button>
              </div>
              <AnimatePresence>
                <div className="space-y-2"> {/* Single child for AnimatePresence */}
                  {currentProgressBarItems.map((item, index) => {
                    const progress = getProgressPercentage(item.value, item.max);
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-3 border rounded-md space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Progress Bar {index + 1}</h4>
                          <Button
                            type="button"
                            variant="text"
                            size="sm"
                            onClick={() => {
                              updateWidgetData<ProgressBarListData>(prev => ({
                                ...prev,
                                items: (prev.items || []).filter((_, i) => i !== index),
                              }));
                            }}
                          >
                            <FontAwesomeIcon icon={faTimes} className="mr-1" /> Remove
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor={`progressLabel-${item.id}`}>Label</Label>
                            <Input
                              id={`progressLabel-${item.id}`}
                              value={item.label}
                              onChange={(e) => {
                                updateWidgetData<ProgressBarListData>(prev => {
                                  const newItems = [...prev.items];
                                  newItems[index] = { ...newItems[index], label: e.target.value };
                                  return { ...prev, items: newItems };
                                });
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`progressValue-${item.id}`}>Current Value</Label>
                            <Input
                              id={`progressValue-${item.id}`}
                              type="number"
                              value={item.value}
                              onChange={(e) => {
                                updateWidgetData<ProgressBarListData>(prev => {
                                  const newItems = [...prev.items];
                                  newItems[index] = { ...newItems[index], value: Number(e.target.value) };
                                  return { ...prev, items: newItems };
                                });
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`progressMax-${item.id}`}>Max Value</Label>
                            <Input
                              id={`progressMax-${item.id}`}
                              type="number"
                              value={item.max}
                              onChange={(e) => {
                                updateWidgetData<ProgressBarListData>(prev => {
                                  const newItems = [...prev.items];
                                  newItems[index] = { ...newItems[index], max: Number(e.target.value) };
                                  return { ...prev, items: newItems };
                                });
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`progressColor-${item.id}`}>Color</Label>
                            <Input
                              id={`progressColor-${item.id}`}
                              type="color"
                              value={item.color}
                              onChange={(e) => {
                                updateWidgetData<ProgressBarListData>(prev => {
                                  const newItems = [...prev.items];
                                  newItems[index] = { ...newItems[index], color: e.target.value };
                                  return { ...prev, items: newItems };
                                });
                              }}
                              className="p-0 h-10 w-full"
                            />
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                          <div
                            className="h-2.5 rounded-full"
                            style={{ width: `${progress}%`, backgroundColor: item.color }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500">{progress}% Complete</span>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showPercentages"
                  checked={progressBarData.showPercentages ?? true} // Default to true
                  onCheckedChange={(checked) => updateWidgetData<ProgressBarListData>({ showPercentages: !!checked })}
                />
                <Label htmlFor="showPercentages">Show Percentages</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortBy">Sort By</Label>
                {/* Assuming 'Select' component takes 'onValueChange' directly */}
                <Select
                  id="sortBy"
                  value={progressBarData.sortBy || 'custom'}
                  onValueChange={(value: 'value' | 'label' | 'custom') => updateWidgetData<ProgressBarListData>({ sortBy: value })}
                  options={[
                    { value: 'custom', label: 'Custom' },
                    { value: 'value', label: 'Value (Progress)' },
                    { value: 'label', label: 'Label (Alphabetical)' },
                  ]}
                />
              </div>
            </div>
          </div>
        );

      case 'metricCard':
        if (!metricCardData) return null;
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Metric Card Configuration</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Metrics</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateWidgetData<MetricCardData>(prev => {
                      const newId = `metric-${Date.now()}-${Math.random()}`;
                      const newItem: MetricCardItem = {
                        id: newId,
                        label: 'New Metric',
                        value: 0,
                        trend: 'neutral',
                        icon: 'chart-line'
                      };
                      return {
                        ...prev,
                        items: [...(prev.items || []), newItem],
                      };
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Metric
                </Button>
              </div>
              <AnimatePresence>
                <div className="space-y-2"> {/* Single child for AnimatePresence */}
                  {metricCardData.items?.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-3 border rounded-md space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Metric {index + 1}</h4>
                        <Button
                          type="button"
                          variant="text"
                          size="sm"
                          onClick={() => {
                            updateWidgetData<MetricCardData>(prev => ({
                              ...prev,
                              items: (prev.items || []).filter((_, i) => i !== index),
                            }));
                          }}
                        >
                          <FontAwesomeIcon icon={faTimes} className="mr-1" /> Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`metricLabel-${item.id}`}>Label</Label>
                          <Input
                            id={`metricLabel-${item.id}`}
                            value={item.label}
                            onChange={(e) => {
                              updateWidgetData<MetricCardData>(prev => {
                                const newItems = [...prev.items];
                                newItems[index] = { ...newItems[index], label: e.target.value };
                                return { ...prev, items: newItems };
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`metricValue-${item.id}`}>Value</Label>
                          <Input
                            id={`metricValue-${item.id}`}
                            type="text" // Can be string or number (e.g. "1.5M")
                            value={item.value}
                            onChange={(e) => {
                              updateWidgetData<MetricCardData>(prev => {
                                const newItems = [...prev.items];
                                newItems[index] = { ...newItems[index], value: e.target.value };
                                return { ...prev, items: newItems };
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`metricDescription-${item.id}`}>Description</Label>
                          <Input
                            id={`metricDescription-${item.id}`}
                            value={item.description || ''}
                            onChange={(e) => {
                              updateWidgetData<MetricCardData>(prev => {
                                const newItems = [...prev.items];
                                newItems[index] = { ...newItems[index], description: e.target.value };
                                return { ...prev, items: newItems };
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`metricTrend-${item.id}`}>Trend</Label>
                          <Select
                            id={`metricTrend-${item.id}`}
                            value={item.trend || 'neutral'}
                            // Assuming Select component takes onValueChange directly AND an options prop
                            onValueChange={(value: 'up' | 'down' | 'neutral') => {
                              updateWidgetData<MetricCardData>(prev => {
                                const newItems = [...prev.items];
                                newItems[index] = { ...newItems[index], trend: value };
                                return { ...prev, items: newItems };
                              });
                            }}
                            options={[
                              { value: 'up', label: 'Up' },
                              { value: 'down', label: 'Down' },
                              { value: 'neutral', label: 'Neutral' },
                            ]}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`metricIcon-${item.id}`}>Icon</Label>
                          <IconSelector
                            selectedIcon={item.icon}
                            onSelectIcon={(selectedIcon) => {
                              updateWidgetData<MetricCardData>(prev => {
                                const newItems = [...prev.items];
                                newItems[index] = { ...newItems[index], icon: selectedIcon };
                                return { ...prev, items: newItems };
                              });
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            </div>
          </div>
        );

      case 'countdownCard':
        if (!countdownData) return null;
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Countdown Card Configuration</h3>
            <div className="space-y-2">
              <Label htmlFor="countdownTitle">Title</Label>
              <Input
                id="countdownTitle"
                value={countdownData.title || ''}
                onChange={(e) => updateWidgetData<CountdownCardData>({ title: e.target.value })}
                placeholder="Enter title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date</Label>
              <Input
                id="targetDate"
                type="date"
                // Ensure date format is compatible with input type="date" (YYYY-MM-DD)
                value={countdownData.targetDate ? new Date(countdownData.targetDate).toISOString().split('T')[0] : ''}
                onChange={(e) => updateWidgetData<CountdownCardData>({ targetDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="countdownImage">Image URL</Label>
              <Input
                id="countdownImage"
                value={countdownData.image || ''}
                onChange={(e) => updateWidgetData<CountdownCardData>({ image: e.target.value })}
                placeholder="Optional image URL"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="countdownDescription">Description</Label>
              <Input
                id="countdownDescription"
                value={countdownData.description || ''}
                onChange={(e) => updateWidgetData<CountdownCardData>({ description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
        );

      case 'barChart':
        return renderBarChartFields();

      default:
        return (
          <p className="text-gray-500">No specific configuration options for this widget type.</p>
        );
    }
  };

  return (
    <Modal
      title={`Edit ${widget?.title || 'Widget'}`}
      description={`Configure the settings for your ${widget?.type} widget.`}
      isOpen={isOpen}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-4">
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
          <IconSelector
            selectedIcon={icon}
            onSelectIcon={setIcon}
          />
          {icon && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-2">
              <FontAwesomeIcon icon={icon as any} />
              <span>Selected Icon: {icon}</span>
            </div>
          )}
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