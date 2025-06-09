'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';
import { IconSelector } from '@/components/ui/icon-selector';
import { IBaseWidget, Widget } from './types/dashboard-data.typings';

// Base widget data types
type WidgetType = 'metricCard' | 'progressBarList' | 'tipCard' | 'dataList' | 'countdownCard' | 'barChart' | 'lineChart' | 'quickCashFlowSummary';

// Button variant type to ensure type safety
type ButtonVariant = 'text' | 'outline' | 'primary' | 'secondary' | 'dark' | 'ghost'; // Added 'ghost'

// Progress bar item type
interface ProgressBarItem {
  id: string;
  label: string;
  value: number;
  max: number;
  color: string;
}

// Data list item type
interface DataListItem {
  id: string;
  label: string;
  value: string | number;
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

// Base widget interface
interface BaseWidget {
  id: string;
  type: WidgetType;
  title?: string;
  icon?: string;
  size?: 'small' | 'medium' | 'large';
  position?: number;
  column?: number;
}

// Type definitions for DataListWidget
interface DataListWidgetData {
  type: 'dataList';
  items: DataListItem[];
  title?: string;
  footerLink?: { text: string; url: string; icon: string; }; // Corrected type
  showIcons?: boolean;
  tip?: string; // Added from widget usage
  groupByCategory?: boolean; // Added from widget usage
  showTotals?: boolean; // Added from widget usage
}

// Type definitions for TipCardWidget
interface TipCardWidgetData {
  type: 'tipCard';
  tips: TipCardItem[];
  currentTipIndex: number;
  autoRotate: boolean;
  title?: string;
}

// Type definitions for ProgressBarList
interface ProgressBarListData {
  type: 'progressBarList';
  items: ProgressBarItem[];
  title?: string;
  showPercentages: boolean;
  sortBy?: 'value' | 'label' | 'custom'; // Added 'custom' from usage
}

// Type definitions for MetricCard
interface MetricCardData {
  type: 'metricCard';
  title: string;
  value: string | number;
  description: string;
  trend?: 'up' | 'down' | 'neutral';
  trendPercentage?: number;
}

// Type definitions for CountdownCard
interface CountdownCardData {
  type: 'countdownCard';
  targetDate: string;
  title: string;
  image?: string;
  description?: string;
}

// Union type for all widget data types
type WidgetData =
  | DataListWidgetData
  | TipCardWidgetData
  | ProgressBarListData
  | MetricCardData
  | CountdownCardData
  | {
      type: string;
      [key: string]: any;
    };

// Type guards
function isDataListWidgetData(data: WidgetData): data is DataListWidgetData {
  return data.type === 'dataList';
}

function isTipCardWidgetData(data: WidgetData): data is TipCardWidgetData {
  return data.type === 'tipCard';
}

function isProgressBarListData(data: WidgetData): data is ProgressBarListData {
  return data.type === 'progressBarList';
}

function isMetricCardData(data: WidgetData): data is MetricCardData {
  return data.type === 'metricCard';
}

function isCountdownCardData(data: WidgetData): data is CountdownCardData {
  return data.type === 'countdownCard';
}

interface WidgetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  widget: Widget;
  onSave: (updatedWidget: Widget) => void;
}

export function WidgetEditModal({ isOpen, onClose, widget, onSave }: WidgetEditModalProps) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('');
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to safely update widget data with type checking
  const updateWidgetData = useCallback(
    <T extends WidgetData>(updates: Partial<T> | ((prev: T) => T)) => {
      setWidgetData(prev => {
        if (!prev) return null;
        const updated = typeof updates === 'function' ? updates(prev as T) : { ...(prev as T), ...updates };
        return { ...updated, type: prev.type } as WidgetData; // Ensure type is preserved and correct
      });
    },
    []
  );

  // Initialize form when widget changes
  useEffect(() => {
    if (!widget) {
      setTitle('');
      setIcon('');
      setWidgetData(null);
      return;
    }

    setTitle(widget.title || '');
    setIcon(widget.icon || '');

    // Initialize widgetData based on widget.type, handling existing data if present
    let initialWidgetData: WidgetData | null = null;

    switch (widget.type) {
      case 'metricCard':
        initialWidgetData = {
          type: 'metricCard',
          ...(Array.isArray(widget.data) && widget.data.length > 0 ? widget.data[0] : {}),
          title: (widget.data && Array.isArray(widget.data) && widget.data.length > 0 && widget.data[0].title) || '',
          value: (widget.data && Array.isArray(widget.data) && widget.data.length > 0 && widget.data[0].value) || '',
          description: (widget.data && Array.isArray(widget.data) && widget.data.length > 0 && widget.data[0].description) || '',
        } as MetricCardData;
        break;

      case 'progressBarList':
        // Map the widget data to match the ProgressBarItem interface
        const progressItems = Array.isArray(widget.data) 
          ? widget.data.map(item => ({
              id: item.id || `item-${Date.now()}`,
              label: item.label || '',
              value: typeof item.current === 'number' ? item.current : 0,
              max: typeof item.max === 'number' ? item.max : 100,
              color: item.color || '#3b82f6'
            }))
          : [];
          
        initialWidgetData = {
          type: 'progressBarList',
          items: progressItems,
          showPercentages: widget.data?.showPercentages !== false,
          sortBy: widget.data?.sortBy || 'custom',
          title: widget.data?.title || widget.title || '',
        } as ProgressBarListData;
        break;

      case 'tipCard':
        initialWidgetData = {
          type: 'tipCard',
          tips: (widget.data?.tips && Array.isArray(widget.data.tips) ? widget.data.tips : []),
          currentTipIndex: widget.data?.currentTipIndex || 0,
          autoRotate: widget.data?.autoRotate || false,
          title: widget.data?.title || '',
        } as TipCardWidgetData;
        break;

      case 'dataList':
        // Handle widget data which is an array of items directly
        const dataListItems = Array.isArray(widget.data) 
          ? widget.data 
          : (widget.data?.items && Array.isArray(widget.data.items) ? widget.data.items : []);
          
        initialWidgetData = {
          type: 'dataList',
          items: dataListItems,
          tip: widget.data?.tip || widget.tip || '',
          footerLink: widget.data?.footerLink || widget.footerLink || { text: '', url: '', icon: 'link' },
          groupByCategory: widget.data?.groupByCategory || widget.groupByCategory || false,
          showTotals: widget.data?.showTotals || widget.showTotals || false,
          title: widget.data?.title || widget.title || '',
        } as DataListWidgetData;
        break;

      case 'countdownCard':
        initialWidgetData = {
          type: 'countdownCard',
          ...(widget.data || {}),
          targetDate: widget.data?.targetDate || new Date().toISOString(),
          title: widget.data?.title || '',
        } as CountdownCardData;
        break;

      default:
        // For other widget types, just use the existing data or an empty object
        initialWidgetData = {
          type: widget.type,
          ...(widget.data || {}),
        };
    }
    setWidgetData(initialWidgetData);
  }, [widget]);


  // Handle save button click
  const handleSave = useCallback(() => {
    if (!widget || !widgetData) return;

    try {
      setIsSubmitting(true);

      const updatedWidget: Widget = {
        ...widget,
        title: title || undefined,
        icon: icon || undefined,
        data: widgetData,
      };

      onSave(updatedWidget);
      onClose();
    } catch (error: unknown) {
      console.error('Error saving widget:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [widget, title, icon, widgetData, onSave, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  // Helper function to calculate progress percentage
  const getProgressPercentage = (current: number, target: number): number => {
    if (target <= 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  // Render the form based on widget type
  const renderWidgetFields = () => {
    if (!widget || !widgetData) return null;

    // Derive specific widget data using type guards
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
                      const newItem: DataListItem = {
                        id: `item-${Date.now()}`,
                        label: `Item ${(prev.items?.length || 0) + 1}`,
                        value: '0',
                        currency: 'USD',
                        category: 'Uncategorized',
                      };
                      return {
                        ...prev,
                        items: [...(prev.items || []), newItem],
                      };
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {dataListData.items?.map((item, index) => (
                    <motion.div
                      key={item.id}
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
                          variant="ghost"
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
                            type="text" // Keep as text to allow mixed types, parse if numerical ops needed
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
                </AnimatePresence>
              </div>
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
                      const newTip: TipCardItem = {
                        id: `tip-${Date.now()}`,
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
              <div className="space-y-2">
                <AnimatePresence>
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
                          variant="ghost"
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
                </AnimatePresence>
              </div>
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
                      const newItem: ProgressBarItem = {
                        id: `item-${Date.now()}`,
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
              <div className="space-y-2">
                <AnimatePresence>
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
                          <h4 className="font-medium">{item.label || `Progress ${index + 1}`}</h4>
                          <Button
                            type="button"
                            variant="ghost"
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
                        <div className="space-y-2">
                          <div>
                            <Label htmlFor={`progressBarLabel-${item.id}`}>Label</Label>
                            <Input
                              id={`progressBarLabel-${item.id}`}
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
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label htmlFor={`progressBarValue-${item.id}`}>Value</Label>
                              <Input
                                id={`progressBarValue-${item.id}`}
                                type="number"
                                min={0}
                                max={item.max}
                                value={item.value}
                                onChange={(e) => {
                                  updateWidgetData<ProgressBarListData>(prev => {
                                    const newItems = [...prev.items];
                                    const newValue = Math.min(Number(e.target.value), newItems[index].max);
                                    newItems[index] = { ...newItems[index], value: newValue };
                                    return { ...prev, items: newItems };
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`progressBarMaxValue-${item.id}`}>Max Value</Label>
                              <Input
                                id={`progressBarMaxValue-${item.id}`}
                                type="number"
                                min={1}
                                value={item.max}
                                onChange={(e) => {
                                  updateWidgetData<ProgressBarListData>(prev => {
                                    const newItems = [...prev.items];
                                    const newMax = Math.max(1, Number(e.target.value));
                                    newItems[index] = {
                                      ...newItems[index],
                                      max: newMax,
                                      value: Math.min(newItems[index].value, newMax),
                                    };
                                    return { ...prev, items: newItems };
                                  });
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor={`progressBarColor-${item.id}`}>Color</Label>
                            <div className="flex items-center space-x-2">
                              <input
                                id={`progressBarColorPicker-${item.id}`}
                                type="color"
                                value={item.color || '#3b82f6'}
                                onChange={(e) => {
                                  updateWidgetData<ProgressBarListData>(prev => {
                                    const newItems = [...prev.items];
                                    newItems[index] = { ...newItems[index], color: e.target.value };
                                    return { ...prev, items: newItems };
                                  });
                                }}
                                className="h-10 w-10 rounded border border-gray-300"
                              />
                              <Input
                                id={`progressBarColorInput-${item.id}`}
                                value={item.color || ''}
                                onChange={(e) => {
                                  updateWidgetData<ProgressBarListData>(prev => {
                                    const newItems = [...prev.items];
                                    newItems[index] = { ...newItems[index], color: e.target.value };
                                    return { ...prev, items: newItems };
                                  });
                                }}
                                placeholder="#3b82f6"
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Progress</Label>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className="h-2.5 rounded-full transition-all duration-300 ease-out"
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor: item.color || '#3b82f6',
                                }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {progress}% ({item.value} / {item.max})
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        );

      case 'metricCard':
        if (!metricCardData) return null;
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Metric Card Configuration</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="metricTitle">Title</Label>
                <Input
                  id="metricTitle"
                  value={metricCardData.title || ''}
                  onChange={(e) => updateWidgetData<MetricCardData>(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter title"
                />
              </div>
              <div>
                <Label htmlFor="metricValue">Value</Label>
                <Input
                  id="metricValue"
                  value={metricCardData.value}
                  onChange={(e) => updateWidgetData<MetricCardData>(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="Enter value"
                />
              </div>
              <div>
                <Label htmlFor="metricDescription">Description</Label>
                <Input
                  id="metricDescription"
                  value={metricCardData.description || ''}
                  onChange={(e) => updateWidgetData<MetricCardData>(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                />
              </div>
              <div>
                <Label htmlFor="metricTrend">Trend</Label>
                <Select
                  value={metricCardData.trend || 'neutral'}
                  onValueChange={(value: 'up' | 'down' | 'neutral') =>
                    updateWidgetData<MetricCardData>(prev => ({ ...prev, trend: value }))
                  }
                >
                  <SelectTrigger id="metricTrend">
                    <SelectValue placeholder="Select trend" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="up">Up</SelectItem>
                    <SelectItem value="down">Down</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {metricCardData.trend && metricCardData.trend !== 'neutral' && (
                <div>
                  <Label htmlFor="metricTrendPercentage">Trend Percentage</Label>
                  <Input
                    id="metricTrendPercentage"
                    type="number"
                    value={metricCardData.trendPercentage || ''}
                    onChange={(e) => updateWidgetData<MetricCardData>(prev => ({ ...prev, trendPercentage: Number(e.target.value) }))}
                    placeholder="Enter percentage"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'countdownCard':
        if (!countdownData) return null;
        const targetDate = countdownData.targetDate ? new Date(countdownData.targetDate) : new Date();
        const formattedDate = targetDate.toISOString().split('T')[0];

        // Calculate days remaining for countdown
        let daysRemaining: number | null = null;
        if (countdownData?.targetDate) {
          const target = new Date(countdownData.targetDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Normalize today's date to start of day
          daysRemaining = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Countdown Configuration</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="countdownTitle">Title</Label>
                <Input
                  id="countdownTitle"
                  value={countdownData.title || ''}
                  onChange={(e) => updateWidgetData<CountdownCardData>(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter title"
                />
              </div>
              <div>
                <Label htmlFor="countdownTargetDate">Target Date</Label>
                <Input
                  id="countdownTargetDate"
                  type="date"
                  value={formattedDate}
                  onChange={(e) => {
                    const newDate = e.target.value ? new Date(e.target.value) : new Date();
                    updateWidgetData<CountdownCardData>(prev => ({
                      ...prev,
                      targetDate: newDate.toISOString(),
                    }));
                  }}
                />
              </div>
              {daysRemaining !== null && (
                <div className="p-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    {daysRemaining > 0
                      ? `${daysRemaining} days until ${countdownData.title || 'target date'}`
                      : daysRemaining === 0
                        ? `Today is the ${countdownData.title || 'target date'}!`
                        : `${Math.abs(daysRemaining)} days since ${countdownData.title || 'target date'}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Widget Configuration</h3>
            <p className="text-sm text-gray-600">
              No specific configuration options available for this widget type.
            </p>
          </div>
        );
    }
  };

  if (!widget) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="mx-auto max-w-lg flex flex-col rounded-xl bg-white p-6"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Edit Widget</h2>
        <button
          type="button" // Added type button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <FontAwesomeIcon icon={faTimes} className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Main form for general widget properties */}
      <form onSubmit={handleSubmit} className="space-y-6 flex-grow overflow-y-auto">
        <div className="space-y-2">
          <Label htmlFor="widgetTitle">Title</Label>
          <Input
            id="widgetTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter widget title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="widgetIcon">Icon</Label>
          <IconSelector
            id="widgetIcon"
            selectedIcon={icon}
            onSelectIcon={setIcon}
          />
        </div>

        {/* Render specific widget data fields */}
        {renderWidgetFields()}

        <div className="flex justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}