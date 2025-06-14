'use client';

import React, { useState, useEffect, useCallback, useMemo, Component } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Select } from '@/components/ui/select'; // Select component not found, commented out for now
import { Label } from '@/components/ui/label';
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
  IFinancialHealthScorecardWidget 
} from './types/dashboard-data.typings'; 
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
  type UniqueIdentifier 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates, 
  useSortable, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Font Awesome imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
  faListCheck
} from '@fortawesome/free-solid-svg-icons';

// Import form components with aliases to avoid conflicts
import { DataListForm as DataListFormExt } from './widget-forms/DataListForm';
import { ProgressBarListForm as ProgressBarListFormExt } from './widget-forms/ProgressBarListForm';
import { BarChartForm as BarChartFormExt, SortableBarChartItem } from './widget-forms/BarChartForm';
import { LineChartForm as LineChartFormExt } from './widget-forms/LineChartForm';
import { DebtVisualizerForm as DebtVisualizerFormExt } from './widget-forms/DebtVisualizerForm';
import { QuickCashFlowSummaryForm as QuickCashFlowSummaryFormExt } from './widget-forms/QuickCashFlowSummaryForm';
import { TipCardForm as TipCardFormExt } from './widget-forms/TipCardForm';
import { CountdownCardForm as CountdownCardFormExt } from './widget-forms/CountdownCardForm';
import { MetricCardForm as MetricCardFormExt } from './widget-forms/MetricCardForm';

// Import IconDefinition type from @fortawesome/fontawesome-common-types
import type { IconDefinition } from '@fortawesome/fontawesome-common-types';

import { motion } from 'framer-motion';
import { Modal } from '../ui/modal';
import { IconSelector } from '../ui/icon-selector';

interface WidgetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  widget: Widget | null;
  onSave: (widget: Widget) => void;
}

const availableIcons = [
  { name: 'List', value: 'faList', icon: faList },
  { name: 'Tasks', value: 'faTasks', icon: faTasks },
  { name: 'Chart Line', value: 'faChartLine', icon: faChartLine },
  { name: 'Lightbulb', value: 'faLightbulb', icon: faLightbulb },
  { name: 'Calendar Alt', value: 'faCalendarAlt', icon: faCalendarAlt },
  { name: 'Chart Bar', value: 'faChartBar', icon: faChartBar },
  { name: 'Exchange Alt', value: 'faExchangeAlt', icon: faExchangeAlt },
  { name: 'Credit Card', value: 'faCreditCard', icon: faCreditCard },
  { name: 'Shield Alt', value: 'faShieldAlt', icon: faShieldAlt },
  { name: 'Check Square', value: 'faCheckSquare', icon: faCheckSquare },
  { name: 'Cog', value: 'faCog', icon: faCog },
  { name: 'Calendar', value: 'faCalendar', icon: faCalendar },
  { name: 'Percent', value: 'faPercent', icon: faPercent },
];

// Type definitions
type WidgetData = Widget['data'];
interface WidgetFormProps<T = any> {
  data: T;
  onDataChange: (data: T) => void;
}

// Sub-components for editing different widget types

function DataListForm({ data: widgetData, onDataChange }: WidgetFormProps<IDataListWidget>) {
  const items: IDataListItem[] = widgetData.data || [];
  
  const handleItemChange = (index: number, field: keyof IDataListItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onDataChange({ ...widgetData, data: newItems });
  };

  const addItem = () => {
    const newItem: IDataListItem = { id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, label: '', value: '', currency: '$', displayOrder: items.length };
    onDataChange({ ...widgetData, data: [...items, newItem] });
  };
  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index).map((item, idx) => ({ ...item, displayOrder: idx }));
    onDataChange({ ...widgetData, data: newItems });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Data List Items</h3>
      {items.map((item, index) => (
        <motion.div key={item.id || index} layout className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 bg-gray-50 dark:bg-gray-700/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`dl-label-${item.id || index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label</Label>
              <Input id={`dl-label-${item.id || index}`} value={item.label} onChange={(e) => handleItemChange(index, 'label', e.target.value)} placeholder="E.g., Monthly Income" />
            </div>
            <div>
              <Label htmlFor={`dl-value-${item.id || index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</Label>
              <Input id={`dl-value-${item.id || index}`} value={item.value} onChange={(e) => handleItemChange(index, 'value', e.target.value)} placeholder="E.g., 5000" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
              <Label htmlFor={`dl-currency-${item.id || index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency/Unit (Optional)</Label>
              <Input id={`dl-currency-${item.id || index}`} value={item.currency || ''} onChange={(e) => handleItemChange(index, 'currency', e.target.value)} placeholder="E.g., $, £, kg" />
            </div>
            <div className="flex items-end justify-end sm:justify-start">
                <Button variant="text" size="sm" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 self-end">
                    <FontAwesomeIcon icon={faTrash} className="mr-2" />Remove
                </Button>
            </div>
          </div>
        </motion.div>
      ))}
      <Button onClick={addItem} variant="outline" size="sm"><FontAwesomeIcon icon={faPlus} className="mr-2" />Add Item</Button>
    </div>
  );
}

// Helper: Sortable Item Component for dnd-kit
interface SortableListItemProps {
  id: string;
  children: React.ReactNode;
}

interface SortableProgressBarItemProps {
  id: string;
  children: (listeners: DraggableSyntheticListeners, attributes: DraggableAttributes) => React.ReactNode;
}

function SortableListItem({ id, children }: SortableListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function SortableProgressBarItem({ id, children }: SortableProgressBarItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white dark:bg-slate-700/50 rounded-lg shadow mb-2 last:mb-0">
      <div className="flex items-center p-3">
        <button 
          {...listeners} 
          type="button"
          className="p-2 cursor-grab mr-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          aria-label="Drag to reorder"
        >
          <FontAwesomeIcon icon={faGripVertical} />
        </button>
        <div className="flex-grow">
          {children(listeners, attributes)}
        </div>
      </div>
    </div>
  );
}

// ProgressBarListForm with Drag-and-Drop
function ProgressBarListForm({ data: widgetData, onDataChange }: WidgetFormProps<IProgressBarListWidget>) {
  const [formData, setFormData] = useState<IProgressBarListWidget>(() => {
    const itemsArray: IProgressBarListItem[] = widgetData.data || [];
    const processedItems: IProgressBarListItem[] = itemsArray
      .map((item, index) => ({
        ...item,
        id: item.id || `pbl-item-${Date.now()}-${index}`,
        displayOrder: item.displayOrder !== undefined ? item.displayOrder : index,
      }))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    return {
      ...widgetData,
      data: processedItems,
    };
  });

  useEffect(() => {
    const itemsArray: IProgressBarListItem[] = widgetData.data || [];
    const processedItems: IProgressBarListItem[] = itemsArray
      .map((item, index) => ({
        ...item,
        id: item.id || `pbl-item-${Date.now()}-${index}`,
        displayOrder: item.displayOrder !== undefined ? item.displayOrder : index,
      }))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    
    if (JSON.stringify(formData.data) !== JSON.stringify(processedItems) || 
        formData.showPercentages !== widgetData.showPercentages || 
        formData.sortBy !== widgetData.sortBy) {
      setFormData({
        ...widgetData,
        data: processedItems,
      });
    }
  }, [widgetData, formData.data]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleWidgetSettingChange = (field: keyof Omit<IProgressBarListWidget, 'data' | 'id' | 'type' | 'title' | 'icon' | 'gridWidth' | 'gridHeight' | 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight'>, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = formData.data.findIndex(item => item.id === active.id);
      const newIndex = formData.data.findIndex(item => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const movedItems = arrayMove(formData.data, oldIndex, newIndex).map((item, index) => ({ ...item, displayOrder: index }));
        const newFormData = { ...formData, data: movedItems, sortBy: 'custom' as const }; 
        setFormData(newFormData);
        onDataChange(newFormData);
      }
    }
  };

  const handleItemChange = (itemId: string, field: keyof Omit<IProgressBarListItem, 'id' | 'displayOrder'>, value: string | number | undefined) => {
    const newItems = formData.data.map(item =>
      item.id === itemId ? { ...item, [field]: (field === 'current' || field === 'max') ? Number(value) : value } : item
    );
    const newFormData = { ...formData, data: newItems };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleAddItem = () => {
    const newItem: IProgressBarListItem = {
      id: `pbi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label: 'New Goal',
      current: 0,
      max: 100,
      color: '#3b82f6', 
      displayOrder: formData.data.length,
    };
    const newItems = [...formData.data, newItem];
    const newFormData = { ...formData, data: newItems };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleRemoveItem = (itemId: string) => {
    const newItems = formData.data.filter(item => item.id !== itemId).map((item, index) => ({ ...item, displayOrder: index }));
    const newFormData = { ...formData, data: newItems };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const sortByOptions: { value: IProgressBarListWidget['sortBy'], label: string }[] = [
    { value: 'custom', label: 'Custom Order' },
    { value: 'progress', label: 'By Progress (Highest First)' },
    { value: 'alphabetical', label: 'Alphabetical (A-Z)' },
  ];

  const items = useMemo(() =>
    formData.data.map((item, index) => ({
      ...item,
      displayOrder: item.displayOrder ?? index,
    })),
    [formData.data]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/30">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">List Settings</h4>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showPercentages-pbl"
            checked={formData.showPercentages || false}
            onChange={(e) => handleWidgetSettingChange('showPercentages', e.target.checked)}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-primary-600 dark:ring-offset-gray-800"
          />
          <Label htmlFor="showPercentages-pbl" className="ml-2 text-sm text-slate-600 dark:text-slate-300">Show Percentages</Label>
        </div>
        <div>
          <Label htmlFor="sortBy-pbl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</Label>
          <select
            id="sortBy-pbl"
            value={formData.sortBy || 'custom'}
            onChange={(e) => handleWidgetSettingChange('sortBy', e.target.value as IProgressBarListWidget['sortBy'])}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 h-9 px-2"
          >
            {sortByOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress Items ({formData.data.length})</h4>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <SortableProgressBarItem key={item.id} id={item.id}>
              {(listeners, _attributes) => ( 
                <div className="flex items-start p-3">
                  <Button {...listeners} variant="text" size="sm" className="cursor-grab p-1 mr-2 mt-5 text-slate-400 dark:text-slate-500 flex-shrink-0"><FontAwesomeIcon icon={faGripVertical} /></Button>
                  <div className="flex-grow space-y-2 ml-1">
                    <div className="flex items-center">
                      <div className="flex-grow space-y-1">
                        <Label htmlFor={`pbi-${item.id}-label`} className="text-xs text-slate-500 dark:text-slate-400">Label</Label>
                        <Input id={`pbi-${item.id}-label`} value={item.label} onChange={e => handleItemChange(item.id, 'label', e.target.value)} placeholder="Progress Label" className="w-full" />
                      </div>
                      <Button type="button" variant="text" size="sm" onClick={() => handleRemoveItem(item.id)} className="ml-2 text-red-500 flex-shrink-0"><FontAwesomeIcon icon={faTrash} /></Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor={`pbi-${item.id}-current`} className="text-xs text-slate-500 dark:text-slate-400">Current Value</Label>
                        <Input id={`pbi-${item.id}-current`} type="number" value={item.current} onChange={e => handleItemChange(item.id, 'current', e.target.value)} placeholder="Current" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`pbi-${item.id}-max`} className="text-xs text-slate-500 dark:text-slate-400">Target Value (Max)</Label>
                        <Input id={`pbi-${item.id}-max`} type="number" value={item.max} onChange={e => handleItemChange(item.id, 'max', e.target.value)} placeholder="Max" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`pbi-${item.id}-color`} className="text-xs text-slate-500 dark:text-slate-400">Color</Label>
                      <Input
                        id={`pbi-${item.id}-color`}
                        type="color"
                        value={item.color || '#3b82f6'}
                        onChange={e => handleItemChange(item.id, 'color', e.target.value)}
                        className="w-full h-10 p-1 border-slate-300 dark:border-slate-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </SortableProgressBarItem>
          ))}
        </SortableContext>
      </DndContext>
      {formData.data.length === 0 && (
        <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">No progress items yet. Add one below!</p>
      )}
      <Button type="button" onClick={handleAddItem} variant="outline" className="w-full border-dashed border-gray-400 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-500">
        <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Progress Item
      </Button>
    </div>
  );
}


function BarChartForm({ data: widgetData, onDataChange }: WidgetFormProps<IBarChartWidget>) {
  const [formData, setFormData] = useState<IBarChartWidget>(widgetData);

  const handleInputChange = useCallback((field: keyof IBarChartWidget | keyof IChartData, value: any) => {
    setFormData(prevData => {
      if (!prevData) return prevData;

      if (['title', 'icon', 'columnSpan', 'rowSpan', 'height', 'showLegend'].includes(field as string) && !(field in prevData.data)) {
        const newData = { ...prevData, [field]: value };
        onDataChange(newData as IBarChartWidget);
        return newData as IBarChartWidget;
      }

      if (['xAxisLabel', 'yAxisLabel', 'showLegend', 'dataPoints', 'title', 'height', 'chartType'].includes(field as string)) {
         const newChartData = {
            ...(prevData.data),
            [field as keyof IChartData]: value,
          };
        const newData = {
          ...prevData,
          data: newChartData
        };
        onDataChange(newData);
        return newData;
      }

      return prevData;
    });
  }, [onDataChange]);

  const handleItemChange = useCallback((itemId: string, field: keyof IChartDataPoint, value: any) => {
    setFormData(prevData => {
      if (!prevData?.data?.dataPoints) return prevData;

      const newItems = prevData.data.dataPoints.map(item =>
        item.id === itemId
          ? {
              ...item,
              [field]: field === 'value' ? parseFloat(value) || 0 : value,
            }
          : item
      );

      const newData = {
        ...prevData,
        data: {
          ...prevData.data,
          dataPoints: newItems,
        },
      };
      
      onDataChange(newData);
      return newData;
    });
  }, [onDataChange]);

  const handleAddItem = useCallback(() => {
    const newItemId = `chartitem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newItem: IChartDataPoint = {
      id: newItemId,
      label: 'New Item',
      value: 10,
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
      displayOrder: formData.data?.dataPoints?.length || 0,
    };

    setFormData(prevData => {
      if (!prevData?.data) return prevData;

      const newItems = [...(prevData.data.dataPoints || []), newItem];
      const newData = {
        ...prevData,
        data: {
          ...prevData.data,
          dataPoints: newItems,
        },
      };
      
      onDataChange(newData);
      return newData;
    });
  }, [formData.data?.dataPoints?.length, onDataChange, formData.data]);

  const handleRemoveItem = useCallback((itemId: string) => {
    setFormData(prevData => {
      if (!prevData?.data?.dataPoints) return prevData;

      const newItems = prevData.data.dataPoints
        .filter(item => item.id !== itemId)
        .map((item, index) => ({ ...item, displayOrder: index }));

      const newData = {
        ...prevData,
        data: {
          ...prevData.data,
          dataPoints: newItems,
        },
      };
      
      onDataChange(newData);
      return newData;
    });
  }, [onDataChange]);

  const items = useMemo(() => {
    return [...(formData.data?.dataPoints || [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [formData.data?.dataPoints]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !formData.data?.dataPoints) return;

    const oldIndex = formData.data.dataPoints.findIndex(item => item.id === active.id);
    const newIndex = formData.data.dataPoints.findIndex(item => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) { 
      const newItems = arrayMove(formData.data.dataPoints, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        displayOrder: idx
      }));

      setFormData(prevData => {
        if (!prevData?.data) return prevData;
        const newData = {
          ...prevData,
          data: {
            ...prevData.data,
            dataPoints: newItems,
          },
        };
        onDataChange(newData);
        return newData;
      });
    }
  }, [onDataChange, formData.data?.dataPoints]); 

  if (!formData.data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="chart-title-barchart-widget">Chart Title (Widget)</Label>
          <Input
            id="chart-title-barchart-widget"
            value={formData.title || ''}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Widget Title"
          />
        </div>
        <div>
          <Label htmlFor="chart-icon-barchart">Icon</Label>
          <select
            id="chart-icon-barchart"
            value={formData.icon || ''}
            onChange={(e) => handleInputChange('icon', e.target.value)}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 h-9 px-2"
          >
            {availableIcons.map((icon) => (
              <option key={icon.value} value={icon.value}>
                {icon.name}
              </option>
            ))}
          </select>
        </div>
      </div>
       <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="chart-title-barchart-data">Chart Title (Data)</Label>
          <Input
            id="chart-title-barchart-data"
            value={formData.data.title || ''}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Data Title (e.g. Sales)"
          />
        </div>
        <div>
          <Label htmlFor="chart-height-barchart">Chart Height</Label>
          <Input
            id="chart-height-barchart"
            type="number"
            value={formData.data.height || 300}
            onChange={(e) => handleInputChange('height', parseInt(e.target.value) || 300)}
            placeholder="300"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="x-axis-label-bc">X-Axis Label</Label>
          <Input
            id="x-axis-label-bc"
            value={formData.data.xAxisLabel || ''}
            onChange={(e) => handleInputChange('xAxisLabel', e.target.value)}
            placeholder="X-Axis Label"
          />
        </div>
        <div>
          <Label htmlFor="y-axis-label-bc">Y-Axis Label</Label>
          <Input
            id="y-axis-label-bc"
            value={formData.data.yAxisLabel || ''}
            onChange={(e) => handleInputChange('yAxisLabel', e.target.value)}
            placeholder="Y-Axis"
          />
        </div>
      </div>
       <div className="flex items-center">
          <input
            type="checkbox"
            id="barchart-showLegend"
            checked={formData.data.showLegend || false}
            onChange={(e) => handleInputChange('showLegend', e.target.checked)}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <Label htmlFor="barchart-showLegend" className="ml-2 text-sm text-slate-600 dark:text-slate-300">Show Legend</Label>
        </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Data Points</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add Data Point
          </Button>
        </div>

        <div className="space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableBarChartItem key={item.id} id={item.id}>
                  {(listeners, attributes) => (
                    <div className="grid grid-cols-12 gap-2 items-center p-2 border rounded bg-white dark:bg-slate-800">
                      <div className="col-span-1">
                        <button
                          {...attributes}
                          {...listeners}
                          type="button"
                          className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-grab active:cursor-grabbing"
                        >
                          <FontAwesomeIcon icon={faGripVertical} />
                        </button>
                      </div>
                      <div className="md:col-span-4">
                        <Label htmlFor={`chartitem-label-${item.id}`} className="text-xs text-slate-500 dark:text-slate-400">Label</Label>
                        <Input
                            id={`chartitem-label-${item.id}`}
                            value={item.label}
                            onChange={(e) => handleItemChange(item.id, 'label', e.target.value)}
                            className="w-full text-sm mt-1"
                            placeholder="Label"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label htmlFor={`chartitem-value-${item.id}`} className="text-xs text-slate-500 dark:text-slate-400">Value</Label>
                        <Input
                            id={`chartitem-value-${item.id}`}
                            type="number"
                            value={item.value}
                            onChange={(e) => handleItemChange(item.id, 'value', e.target.value)}
                            className="w-full text-sm mt-1"
                            placeholder="Value"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label htmlFor={`chartitem-color-${item.id}`} className="text-xs text-slate-500 dark:text-slate-400">Color</Label>
                        <Input
                          id={`chartitem-color-${item.id}`}
                          type="color"
                          value={item.color || '#CCCCCC'}
                          onChange={(e) => handleItemChange(item.id, 'color', e.target.value)}
                          className="w-full h-9 p-0.5 border-slate-300 dark:border-slate-600 rounded cursor-pointer mt-1"
                        />
                      </div>
                      <div className="md:col-span-1 flex items-center justify-self-end self-center h-9">
                          <Button
                            type="button"
                            variant="text"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-500"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </SortableBarChartItem>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
  );
}

function LineChartForm({ data: widgetData, onDataChange }: WidgetFormProps<ILineChartWidget>) {
  const [formData, setFormData] = useState<ILineChartWidget>(widgetData);

  const handleInputChange = (field: keyof ILineChartWidget | keyof IChartData, value: any) => {
    setFormData(prev => {
        if (!prev) return prev;
        // Check if the field is a direct property of ILineChartWidget (excluding 'data')
        if (['title', 'icon', 'columnSpan', 'rowSpan', 'gridWidth', 'gridHeight', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'].includes(field as string) && !(prev.data && field in prev.data)) {
         return { ...prev, [field]: value };
        } else if (prev.data && ['xAxisLabel', 'yAxisLabel', 'showLegend', 'dataPoints', 'title', 'height', 'chartType'].includes(field as string)) { 
          // Check if field is part of the 'data' object (IChartData)
         return {
            ...prev,
            data: {
              ...(prev.data),
              [field as keyof IChartData]: value 
            }
          };
        }
        return prev; // Should not reach here if logic is correct
      });
  };


  const handleItemChange = (itemId: string, field: keyof IChartDataPoint, value: any) => {
    setFormData(prev => {
      if (!prev.data?.dataPoints) return prev;
      
      const updatedDataPoints = prev.data.dataPoints.map(item => 
        item.id === itemId ? { ...item, [field]: (field === 'value' || field === 'y' || (field === 'x' && typeof value === 'string' && !isNaN(parseFloat(value)))) ? parseFloat(value) : value } : item
      );
      
      return {
        ...prev,
        data: {
          ...prev.data,
          dataPoints: updatedDataPoints
        }
      };
    });
  };

  const handleAddItem = useCallback(() => {
    const newItemId = `chartitem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newItem: IChartDataPoint = {
      id: newItemId,
      x: `Point ${(formData.data?.dataPoints?.length || 0) + 1}`, 
      y: Math.floor(Math.random() * 100), 
      label: `Point ${(formData.data?.dataPoints?.length || 0) + 1}`,
      value: Math.floor(Math.random() * 100), 
      displayOrder: formData.data?.dataPoints?.length || 0,
      color: '#3b82f6' 
    };

    setFormData(prev => ({
      ...prev,
      data: {
        ...(prev.data!), 
        dataPoints: [...(prev.data?.dataPoints || []), newItem]
      }
    }));
  }, [formData.data?.dataPoints]);

  const handleRemoveItem = useCallback((itemId: string) => {
    setFormData(prev => ({
      ...prev,
      data: {
        ...(prev.data!), 
        dataPoints: prev.data?.dataPoints?.filter(item => item.id !== itemId).map((item, index) => ({...item, displayOrder: index })) || []
      }
    }));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !formData.data?.dataPoints) return;

    const oldIndex = formData.data.dataPoints.findIndex(item => item.id === active.id);
    const newIndex = formData.data.dataPoints.findIndex(item => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const newItems = arrayMove(formData.data.dataPoints, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        displayOrder: idx
      }));

      setFormData(prev => ({
        ...prev,
        data: {
          ...(prev.data!),
          dataPoints: newItems
        }
      }));
    }
  };

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  if (!formData.data) return <p>Loading chart data configuration...</p>;

  const items = [...(formData.data?.dataPoints || [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="linechart-title-widget">Chart Title (Widget Level)</Label>
          <Input
            id="linechart-title-widget"
            value={formData.title || ''}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Chart Title"
          />
        </div>
        <div>
          <Label htmlFor="linechart-icon-widget">Icon (Widget Level)</Label>
          <select
            id="linechart-icon-widget"
            value={formData.icon || ''}
            onChange={(e) => handleInputChange('icon', e.target.value)}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 h-9 px-2"
          >
            {availableIcons.map((icon) => (
              <option key={icon.value} value={icon.value}>
                {icon.name}
              </option>
            ))}
          </select>
        </div>
      </div>
       <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="linechart-data-title-lc">Chart Title (Data Level)</Label>
          <Input
            id="linechart-data-title-lc"
            value={formData.data.title || ''}
            onChange={(e) => handleInputChange('title', e.target.value)} 
            placeholder="Data Title (e.g. Monthly Sales)"
          />
        </div>
        <div>
          <Label htmlFor="linechart-height-lc">Chart Height</Label>
          <Input
            id="linechart-height-lc"
            type="number"
            value={formData.data.height || 300}
            onChange={(e) => handleInputChange('height', parseInt(e.target.value) || 300)}
            placeholder="300"
          />
        </div>
      </div>


      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="x-axis-label-lc">X-Axis Label</Label>
          <Input
            id="x-axis-label-lc"
            value={formData.data.xAxisLabel || ''}
            onChange={(e) => handleInputChange('xAxisLabel', e.target.value)}
            placeholder="X-Axis Label (e.g., Month)"
          />
        </div>
        <div>
          <Label htmlFor="y-axis-label-lc">Y-Axis Label</Label>
          <Input
            id="y-axis-label-lc"
            value={formData.data.yAxisLabel || ''}
            onChange={(e) => handleInputChange('yAxisLabel', e.target.value)}
            placeholder="Y-Axis Label (e.g., Value)"
          />
        </div>
      </div>
       <div className="flex items-center">
          <input
            type="checkbox"
            id="linechart-showLegend-lc"
            checked={formData.data.showLegend || false}
            onChange={(e) => handleInputChange('showLegend', e.target.checked)}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <Label htmlFor="linechart-showLegend-lc" className="ml-2 text-sm text-slate-600 dark:text-slate-300">Show Legend</Label>
        </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Data Points</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add Data Point
          </Button>
        </div>

        <div className="space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableBarChartItem key={item.id} id={item.id}> 
                  {(listeners, attributes) => (
                    <div className="grid grid-cols-12 gap-2 items-center p-2 border rounded bg-white dark:bg-slate-800">
                      <div className="col-span-1">
                        <button
                          {...attributes}
                          {...listeners}
                          type="button"
                          className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-grab active:cursor-grabbing"
                        >
                          <FontAwesomeIcon icon={faGripVertical} />
                        </button>
                      </div>
                      <div className="md:col-span-3">
                        <Label htmlFor={`lcitem-x-${item.id}`} className="text-xs text-slate-500 dark:text-slate-400">X Value/Label</Label>
                        <Input
                            id={`lcitem-x-${item.id}`}
                            value={item.x as string || item.label || ''} 
                            onChange={(e) => handleItemChange(item.id, 'x', e.target.value)}
                            className="w-full text-sm mt-1"
                            placeholder="X (e.g., Jan, 2023-01)"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label htmlFor={`lcitem-y-${item.id}`} className="text-xs text-slate-500 dark:text-slate-400">Y Value</Label>
                        <Input
                            id={`lcitem-y-${item.id}`}
                            type="number"
                            value={item.y as number || item.value || 0} 
                            onChange={(e) => handleItemChange(item.id, 'y', parseFloat(e.target.value))}
                            className="w-full text-sm mt-1"
                            placeholder="Y Value"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <Label htmlFor={`lcitem-color-${item.id}`} className="text-xs text-slate-500 dark:text-slate-400">Color</Label>
                        <Input
                          id={`lcitem-color-${item.id}`}
                          type="color"
                          value={item.color || '#3B82F6'}
                          onChange={(e) => handleItemChange(item.id, 'color', e.target.value)}
                          className="w-full h-9 p-0.5 border-slate-300 dark:border-slate-600 rounded cursor-pointer mt-1"
                        />
                      </div>
                      <div className="md:col-span-1 flex items-center justify-self-end self-center h-9">
                          <Button
                            type="button"
                            variant="text"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-500"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </SortableBarChartItem>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
  );
}

interface SortableCashFlowItemProps {
  id: UniqueIdentifier;
  children: (listeners: DraggableSyntheticListeners, attributes: DraggableAttributes) => React.ReactNode;
}

function SortableCashFlowItem({ id, children }: SortableCashFlowItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="touch-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm mb-3">
      {children(listeners, attributes)}
    </div>
  );
}

const cashFlowFrequencies = ['one-time', 'weekly', 'monthly', 'quarterly', 'yearly'];

interface SortableDebtItemProps {
  id: UniqueIdentifier;
  children: (listeners: DraggableSyntheticListeners, attributes: DraggableAttributes) => React.ReactNode;
}

function SortableDebtItem({ id, children }: SortableDebtItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="touch-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm mb-3">
      {children(listeners, attributes)}
    </div>
  );
}

const debtStrategyOptions = ['snowball', 'avalanche', 'custom'];

function DebtVisualizerForm({ data: widgetData, onDataChange }: WidgetFormProps<IDebtVisualizerWidget>) {
  const [formData, setFormData] = useState<IDebtVisualizerWidget>(widgetData);

  const handleInputChange = (field: keyof IDebtVisualizerWidget, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleDebtItemChange = (itemId: string, field: keyof IDebtItem, value: any) => {
    const newItems = formData.data.map(item =>
      item.id === itemId ? { ...item, [field]: (field === 'currentBalance' || field === 'originalBalance' || field === 'interestRate' || field === 'minPayment' || field === 'priority') ? parseFloat(value) || 0 : value } : item
    );
    const newFormData = { ...formData, data: newItems as IDebtVisualizerData }; 
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleAddDebtItem = () => {
    const newItemId = `debt-${Date.now()}`;
    const newItem: IDebtItem = {
      id: newItemId,
      name: 'New Debt',
      currentBalance: 0,
      originalBalance: 0,
      interestRate: 0,
      minPayment: 0,
      payoffDate: '',
      category: '',
      priority: formData.data.length + 1,
      displayOrder: formData.data.length,
    };
    const newItems = [...formData.data, newItem];
    const newFormData = { ...formData, data: newItems as IDebtVisualizerData }; 
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleRemoveDebtItem = (itemId: string) => {
    const newItems = formData.data.filter(item => item.id !== itemId).map((item, index) => ({ ...item, displayOrder: index }));
    const newFormData = { ...formData, data: newItems as IDebtVisualizerData };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = formData.data.findIndex(item => item.id === active.id);
      const newIndex = formData.data.findIndex(item => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) { 
        const newOrderedItems = arrayMove(formData.data, oldIndex, newIndex).map((item, index) => ({ ...item, displayOrder: index }));
        const newFormData = { ...formData, data: newOrderedItems as IDebtVisualizerData };
        setFormData(newFormData);
        onDataChange(newFormData);
      }
    }
  };
  
  const debtItems = useMemo(() => 
    [...(formData.data || [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [formData.data]
  );


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div className="space-y-1">
          <Label htmlFor="debt-strategy">Payoff Strategy</Label>
          <select id="debt-strategy" value={formData.strategy} onChange={e => handleInputChange('strategy', e.target.value as IDebtVisualizerWidget['strategy'])} className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 h-9 px-2">
            {debtStrategyOptions.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <input type="checkbox" id="debt-show-payoff-dates" checked={formData.showPayoffDates || false} onChange={e => handleInputChange('showPayoffDates', e.target.checked)} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
          <Label htmlFor="debt-show-payoff-dates" className="text-sm text-slate-600 dark:text-slate-300">Show Payoff Dates</Label>
        </div>
      </div>

      <div className="space-y-3 p-4 border border-slate-200 dark:border-slate-700 rounded-md">
        <h4 className="text-md font-semibold text-slate-700 dark:text-slate-200">Debt Items</h4>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={debtItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {debtItems.map(item => (
              <SortableDebtItem key={item.id} id={item.id}>
                {(listeners, attributes) => (
                  <div className="flex items-start p-3"> 
                    <Button {...listeners} {...attributes} variant="text" size="sm" className="cursor-grab p-1 mr-2 mt-5 text-slate-400 dark:text-slate-500 flex-shrink-0"><FontAwesomeIcon icon={faGripVertical} /></Button>
                    <div className="flex-grow space-y-3 ml-1"> 
                      <div className="flex items-center">
                        <div className="flex-grow space-y-1">
                          <Label htmlFor={`debt-item-${item.id}-name`} className="text-xs text-slate-500 dark:text-slate-400">Debt Name</Label>
                          <Input id={`debt-item-${item.id}-name`} value={item.name} onChange={e => handleDebtItemChange(item.id, 'name', e.target.value)} placeholder="e.g., Visa Card" className="w-full" />
                        </div>
                        <Button type="button" variant="text" size="sm" onClick={() => handleRemoveDebtItem(item.id)} className="ml-2 text-red-500 flex-shrink-0"><FontAwesomeIcon icon={faTrash} /></Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`debt-item-${item.id}-currentBalance`} className="text-xs text-slate-500 dark:text-slate-400">Current Balance ($)</Label>
                          <Input id={`debt-item-${item.id}-currentBalance`} type="number" value={item.currentBalance} onChange={e => handleDebtItemChange(item.id, 'currentBalance', e.target.value)} placeholder="0.00" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`debt-item-${item.id}-originalBalance`} className="text-xs text-slate-500 dark:text-slate-400">Original Balance ($)</Label>
                          <Input id={`debt-item-${item.id}-originalBalance`} type="number" value={item.originalBalance} onChange={e => handleDebtItemChange(item.id, 'originalBalance', e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`debt-item-${item.id}-interestRate`} className="text-xs text-slate-500 dark:text-slate-400">Interest Rate (%)</Label>
                          <Input id={`debt-item-${item.id}-interestRate`} type="number" value={item.interestRate} onChange={e => handleDebtItemChange(item.id, 'interestRate', e.target.value)} placeholder="e.g., 18.5" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`debt-item-${item.id}-minPayment`} className="text-xs text-slate-500 dark:text-slate-400">Minimum Payment ($)</Label>
                          <Input id={`debt-item-${item.id}-minPayment`} type="number" value={item.minPayment} onChange={e => handleDebtItemChange(item.id, 'minPayment', e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`debt-item-${item.id}-payoffDate`} className="text-xs text-slate-500 dark:text-slate-400">Est. Payoff Date</Label>
                          <Input id={`debt-item-${item.id}-payoffDate`} value={item.payoffDate} onChange={e => handleDebtItemChange(item.id, 'payoffDate', e.target.value)} placeholder="e.g., Aug 2025" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`debt-item-${item.id}-category`} className="text-xs text-slate-500 dark:text-slate-400">Category</Label>
                          <Input id={`debt-item-${item.id}-category`} value={item.category || ''} onChange={e => handleDebtItemChange(item.id, 'category', e.target.value)} placeholder="e.g., Credit Card" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`debt-item-${item.id}-priority`} className="text-xs text-slate-500 dark:text-slate-400">Priority (for 'Custom' strategy)</Label>
                        <Input id={`debt-item-${item.id}-priority`} type="number" value={item.priority || ''} onChange={e => handleDebtItemChange(item.id, 'priority', e.target.value)} placeholder="e.g., 1" />
                      </div>
                    </div> 
                  </div>   
                )}
              </SortableDebtItem>
            ))}
          </SortableContext>
        </DndContext>
        <Button onClick={handleAddDebtItem} variant="outline" size="sm" className="mt-2"><FontAwesomeIcon icon={faPlus} className="mr-2" />Add Debt Item</Button>
      </div>
    </div>
  );
}

function QuickCashFlowSummaryForm({ data: widgetData, onDataChange }: WidgetFormProps<IQuickCashFlowSummaryWidget>) {
  const [formData, setFormData] = useState<IQuickCashFlowSummaryWidget>(widgetData);

  const handleInputChange = (field: keyof IQuickCashFlowSummaryWidget | keyof IQuickCashFlowSummaryData, value: any) => {
    let newFormData: IQuickCashFlowSummaryWidget;
    if (['title', 'icon', 'columnSpan', 'rowSpan', 'showCategories', 'showProjections'].includes(field as string)) {
      newFormData = { ...formData, [field]: value };
    } else {
      newFormData = { ...formData, data: { ...(formData.data!), [field as keyof IQuickCashFlowSummaryData]: value } };
    }
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleFlowItemChange = (flowType: 'inflows' | 'outflows', itemId: string, field: keyof ICashFlowEntry, value: any) => {
    const items = formData.data![flowType];
    const newItems = items.map(item =>
      item.id === itemId ? { ...item, [field]: field === 'value' ? parseFloat(value) || 0 : value } : item
    );
    const newFlowData = { ...formData.data!, [flowType]: newItems };
    const newFormData = { ...formData, data: newFlowData };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleAddFlowItem = (flowType: 'inflows' | 'outflows') => {
    const newItemId = `${flowType.slice(0, -1)}-${Date.now()}`;
    const newItem: ICashFlowEntry = {
      id: newItemId,
      title: 'New Item',
      value: 0,
      category: '',
      frequency: 'monthly',
      isRecurring: true,
      displayOrder: formData.data![flowType].length,
    };
    const newItems = [...formData.data![flowType], newItem];
    const newFlowData = { ...formData.data!, [flowType]: newItems };
    const newFormData = { ...formData, data: newFlowData };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleRemoveFlowItem = (flowType: 'inflows' | 'outflows', itemId: string) => {
    const items = formData.data![flowType];
    const newItems = items.filter(item => item.id !== itemId).map((item, index) => ({ ...item, displayOrder: index }));
    const newFlowData = { ...formData.data!, [flowType]: newItems };
    const newFormData = { ...formData, data: newFlowData };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (flowType: 'inflows' | 'outflows', event: DragEndEvent) => {
    const { active, over } = event;
    const currentItems = formData.data![flowType];
    if (over && active.id !== over.id) {
      const oldIndex = currentItems.findIndex(item => item.id === active.id);
      const newIndex = currentItems.findIndex(item => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) { 
        const newOrderedItems = arrayMove(currentItems, oldIndex, newIndex).map((item, index) => ({ ...item, displayOrder: index }));
        const newFlowData = { ...formData.data!, [flowType]: newOrderedItems };
        const newFormData = { ...formData, data: newFlowData };
        setFormData(newFormData);
        onDataChange(newFormData);
      }
    }
  };

  const renderFlowSection = (flowType: 'inflows' | 'outflows', title: string) => {
    const items = useMemo(() => 
      [...(formData.data![flowType] || [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)), 
      [formData.data, flowType]
    );

    return (
      <div className="space-y-3 p-4 border border-slate-200 dark:border-slate-700 rounded-md">
        <h4 className="text-md font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(flowType, e)}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {items.map(item => (
              <SortableCashFlowItem key={item.id} id={item.id}>
                {(listeners, attributes) => (
                  <div className="flex items-start p-3"> 
                    <Button {...listeners} {...attributes} variant="text" size="sm" className="cursor-grab p-1 mr-2 mt-5 text-slate-400 dark:text-slate-500 flex-shrink-0"><FontAwesomeIcon icon={faGripVertical} /></Button>
                    <div className="flex-grow space-y-2 ml-1"> 
                      <div className="flex items-center">
                        <div className="flex-grow space-y-1">
                          <Label htmlFor={`${flowType}-${item.id}-title`} className="text-xs text-slate-500 dark:text-slate-400">Title</Label>
                          <Input id={`${flowType}-${item.id}-title`} value={item.title} onChange={e => handleFlowItemChange(flowType, item.id, 'title', e.target.value)} placeholder="Item Title" className="w-full" />
                        </div>
                        <Button type="button" variant="text" size="sm" onClick={() => handleRemoveFlowItem(flowType, item.id)} className="ml-2 text-red-500 flex-shrink-0"><FontAwesomeIcon icon={faTrash} /></Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`${flowType}-${item.id}-value`} className="text-xs text-slate-500 dark:text-slate-400">Amount</Label>
                          <Input id={`${flowType}-${item.id}-value`} type="number" value={item.value} onChange={e => handleFlowItemChange(flowType, item.id, 'value', e.target.value)} placeholder="Amount" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`${flowType}-${item.id}-category`} className="text-xs text-slate-500 dark:text-slate-400">Category</Label>
                          <Input id={`${flowType}-${item.id}-category`} value={item.category || ''} onChange={e => handleFlowItemChange(flowType, item.id, 'category', e.target.value)} placeholder="Category (e.g., Salary, Rent)" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                        <div className="space-y-1">
                          <Label htmlFor={`${flowType}-${item.id}-frequency`} className="text-xs text-slate-500 dark:text-slate-400">Frequency</Label>
                          <select id={`${flowType}-${item.id}-frequency`} value={item.frequency || 'monthly'} onChange={e => handleFlowItemChange(flowType, item.id, 'frequency', e.target.value)} className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 h-9 px-2">
                            {cashFlowFrequencies.map(freq => <option key={freq} value={freq}>{freq.charAt(0).toUpperCase() + freq.slice(1)}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center">
                          <input type="checkbox" id={`${flowType}-${item.id}-recurring`} checked={item.isRecurring || false} onChange={e => handleFlowItemChange(flowType, item.id, 'isRecurring', e.target.checked)} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                          <Label htmlFor={`${flowType}-${item.id}-recurring`} className="ml-2 text-sm text-slate-600 dark:text-slate-300">Recurring</Label>
                        </div>
                      </div>
                    </div> 
                  </div>   
                )}
              </SortableCashFlowItem>
            ))}
          </SortableContext>
        </DndContext>
        <Button onClick={() => handleAddFlowItem(flowType)} variant="outline" size="sm" className="mt-2"><FontAwesomeIcon icon={faPlus} className="mr-2" />Add {flowType.slice(0, -1)}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="qcf-show-categories">Show Categories</Label>
          <input type="checkbox" id="qcf-show-categories" checked={formData.showCategories || false} onChange={e => handleInputChange('showCategories', e.target.checked)} className="ml-2 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
        </div>
        <div>
          <Label htmlFor="qcf-show-projections">Show Projections</Label>
          <input type="checkbox" id="qcf-show-projections" checked={formData.showProjections || false} onChange={e => handleInputChange('showProjections', e.target.checked)} className="ml-2 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
        </div>
      </div>
      <div>
        <Label htmlFor="qcf-projected-period">Projected Period (e.g., Monthly)</Label>
        <Input id="qcf-projected-period" value={formData.data!.projectedPeriod || ''} onChange={e => handleInputChange('projectedPeriod', e.target.value)} placeholder="Monthly, Annually" />
      </div>
      {renderFlowSection('inflows', 'Inflows')}
      {renderFlowSection('outflows', 'Outflows')}
    </div>
  );
}

function TipCardForm({ data: widgetData, onDataChange }: WidgetFormProps<ITipCardWidget>) {
  const items: ITipCardListItem[] = widgetData.data?.tips?.map((tip: ITipCardListItem) => ({...tip, id: tip.id || `tip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`})) || [];
  const currentTipIndex = typeof widgetData.data?.currentTipIndex === 'number' ? widgetData.data.currentTipIndex : 0;
  const autoRotate = typeof widgetData.data?.autoRotate === 'boolean' ? widgetData.data.autoRotate : true;


  const handleItemChange = (index: number, field: keyof ITipCardListItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onDataChange({ ...widgetData, data: { tips: newItems, currentTipIndex, autoRotate } }); 
  };

  const addItem = () => {
    const newTip: ITipCardListItem = { id: `tip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, title: '', content: '', image: '', link: '', displayOrder: items.length };
    const newItems = [...items, newTip];
    onDataChange({ ...widgetData, data: { tips: newItems, currentTipIndex, autoRotate } });
  };

  const removeItem = (index: number) => {
    const filteredItems = items.filter((_, i) => i !== index);
    const newItems = filteredItems.map((item, idx) => ({ ...item, displayOrder: idx }));
    let newCurrentTipIndex = currentTipIndex;
    if (newCurrentTipIndex >= newItems.length && newItems.length > 0) {
      newCurrentTipIndex = newItems.length - 1;
    } else if (newItems.length === 0) {
      newCurrentTipIndex = 0; 
    }
    onDataChange({ ...widgetData, data: { tips: newItems, currentTipIndex: newCurrentTipIndex, autoRotate } });
  };
  
  const handleAutoRotateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDataChange({ ...widgetData, data: { tips: items, currentTipIndex, autoRotate: e.target.checked } });
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center">
        <input
          type="checkbox"
          id="tipcard-autorotate"
          checked={autoRotate}
          onChange={handleAutoRotateChange}
          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
        />
        <Label htmlFor="tipcard-autorotate" className="ml-2 text-sm text-slate-600 dark:text-slate-300">Auto-rotate tips</Label>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Tip Card Items</h3>
      {items.map((item, index) => (
        <motion.div key={item.id} layout className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 bg-gray-50 dark:bg-gray-700/30">
          <div>
            <Label htmlFor={`tip-title-${item.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</Label>
            <Input id={`tip-title-${item.id}`} value={item.title} onChange={(e) => handleItemChange(index, 'title', e.target.value)} placeholder="E.g., Smart Saving Tip" />
          </div>
          <div>
            <Label htmlFor={`tip-content-${item.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</Label>
            <textarea
              id={`tip-content-${item.id}`} 
              value={item.content} 
              onChange={(e) => handleItemChange(index, 'content', e.target.value)} 
              placeholder="Explain the tip in detail..." 
              rows={3}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <Label htmlFor={`tip-image-${item.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image URL (Optional)</Label>
            <Input id={`tip-image-${item.id}`} value={item.image || ''} onChange={(e) => handleItemChange(index, 'image', e.target.value)} placeholder="https://example.com/image.png" />
          </div>
          <div>
            <Label htmlFor={`tip-link-${item.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link URL (Optional)</Label>
            <Input id={`tip-link-${item.id}`} value={item.link || ''} onChange={(e) => handleItemChange(index, 'link', e.target.value)} placeholder="https://example.com/learn-more" />
          </div>
          <div className="flex justify-end">
            <Button variant="text" size="sm" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400">
              <FontAwesomeIcon icon={faTrash} className="mr-2" />Remove Tip
            </Button>
          </div>
        </motion.div>
      ))}
      <Button onClick={addItem} variant="outline" size="sm"><FontAwesomeIcon icon={faPlus} className="mr-2" />Add Tip</Button>
    </div>
  );
}

function CountdownCardForm({ data: widgetData, onDataChange }: WidgetFormProps<ICountdownCardWidget>) {
  const countdownData = widgetData.data as ICountdownCardData; 
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Countdown Settings</h3>
      <div>
        <Label htmlFor="countdown-title">Title</Label>
        <Input id="countdown-title" value={countdownData?.title || ''} onChange={(e) => onDataChange({ ...widgetData, data: { ...countdownData, title: e.target.value } })} placeholder="Event Title" />
      </div>
      <div>
        <Label htmlFor="countdown-date">Target Date</Label>
        <Input id="countdown-date" type="date" value={countdownData?.targetDate ? new Date(countdownData.targetDate).toISOString().split('T')[0] : ''} onChange={(e) => onDataChange({ ...widgetData, data: { ...countdownData, targetDate: e.target.value } })} />
      </div>
       <div>
        <Label htmlFor="countdown-image">Image URL (Optional)</Label>
        <Input id="countdown-image" value={countdownData?.image || ''} onChange={(e) => onDataChange({ ...widgetData, data: { ...countdownData, image: e.target.value } })} placeholder="https://example.com/image.jpg" />
      </div>
    </div>
  );
}

function MetricCardForm({ data: widgetData, onDataChange }: WidgetFormProps<IMetricCardWidget>) {
  const item = (widgetData.data && widgetData.data[0]) || { 
    id: `metric-${Date.now()}`,
    description: 'New Metric', 
    value: '0', 
    currency: '', 
    trend: 'neutral' as IMetricTrend,
    displayOrder: 0 
  };

  const handleFieldChange = (field: keyof IMetricCardItem, value: string | number | IMetricTrend) => {
    const updatedItem = { ...item, [field]: value };
    const newDataArray = widgetData.data ? [...widgetData.data] : [];
    if (newDataArray.length > 0) {
        newDataArray[0] = updatedItem;
    } else {
        newDataArray.push(updatedItem);
    }
    onDataChange({ ...widgetData, data: newDataArray as IMetricCardItem[] });
  };

  return (
    <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
      <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">Metric Card Settings (First Item)</h3>
      <div>
        <Label htmlFor={`metric-description-${item.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</Label>
        <Input
          id={`metric-description-${item.id}`}
          value={item.description || ''} 
          onChange={(e) => handleFieldChange('description', e.target.value)}
          placeholder="e.g., Total Revenue, Active Users"
          className="w-full"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor={`metric-value-${item.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</Label>
          <Input
            id={`metric-value-${item.id}`}
            value={item.value}
            onChange={(e) => handleFieldChange('value', e.target.value)}
            placeholder="e.g., 12,500"
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor={`metric-currency-${item.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency (Optional)</Label>
          <Input
            id={`metric-currency-${item.id}`}
            value={item.currency || ''} 
            onChange={(e) => handleFieldChange('currency', e.target.value)}
            placeholder="e.g., USD, kg, %"
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor={`metric-trend-${item.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trend (Optional)</Label>
          <select
            id={`metric-trend-${item.id}`}
            value={item.trend || 'neutral'}
            onChange={(e) => handleFieldChange('trend', e.target.value as IMetricTrend)}
            className="w-full block rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 h-9 px-2"
          >
            <option value="neutral">Neutral</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
            <option value="stable">Stable</option>
          </select>
        </div>
      </div>
    </div>
  );
}
  

type WidgetTypeKey = Widget['type']; 

type WidgetTypeConfig = {
  [K in WidgetTypeKey]: {
    component: React.ComponentType<{ 
      data: Extract<Widget, { type: K }>; 
      onDataChange: (data: Extract<Widget, { type: K }>) => void; 
    }> | null;
    icon: IconDefinition;
    defaultData: Omit<Extract<Widget, { type: K }>, 'id' | 'createdAt' | 'updatedAt'> & { id: string }; 
    title?: string;
  };
};

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const widgetTypeConfig: WidgetTypeConfig = {
  nextBestAction: {
    component: null,
    icon: faLightbulb,
    defaultData: {
      id: generateId('widget-nba'),
      type: 'nextBestAction',
      title: 'Next Best Action',
      icon: 'faLightbulb',
      columnSpan: 1,
      rowSpan: 1,
      data: [] 
    }
  },
  retirementReadiness: {
    component: null,
    icon: faChartLine,
    defaultData: {
      id: generateId('widget-rr'),
      type: 'retirementReadiness',
      title: 'Retirement Readiness',
      icon: 'faChartLine',
      columnSpan: 2,
      rowSpan: 1,
      data: {
        scenarios: [],
        currentScenarioId: ''
      }
    }
  },
  enhancedSavingsGoals: {
    component: null,
    icon: faPiggyBank,
    defaultData: {
      id: generateId('widget-esg'),
      type: 'enhancedSavingsGoals',
      title: 'Savings Goals',
      icon: 'faPiggyBank',
      columnSpan: 2,
      rowSpan: 1,
      data: [] 
    }
  },
  insuranceCoverage: {
    component: null,
    icon: faShieldAlt,
    defaultData: {
      id: generateId('widget-ic'),
      type: 'insuranceCoverage',
      title: 'Insurance Coverage',
      icon: 'faShieldAlt',
      columnSpan: 1,
      rowSpan: 1,
      data: [] 
    }
  },
  dataList: {
    component: DataListFormExt as React.ComponentType<{data: IDataListWidget; onDataChange: (data: IDataListWidget) => void}>,
    icon: faList,
    defaultData: { 
      id: generateId('widget-dl'),
      type: 'dataList' as const, 
      title: 'New Data List', 
      icon: 'faList', 
      columnSpan: 2, 
      rowSpan: 1, 
      data: [] as IDataListItem[]
    } as Omit<IDataListWidget, 'createdAt' | 'updatedAt'> & { id: string } 
  },
  progressBarList: {
    component: ProgressBarListFormExt as React.ComponentType<{
      data: IProgressBarListWidget;
      onDataChange: (data: IProgressBarListWidget) => void;
    }>,
    icon: faTasks,
    defaultData: {
      id: generateId('widget-pbl'),
      type: 'progressBarList' as const,
      title: 'My Progress',
      icon: 'faTasks',
      columnSpan: 1,
      rowSpan: 1,
      data: [
        {
          id: generateId('progress-item'),
          label: 'New Goal',
          current: 0,
          max: 100,
          color: '#4CAF50',
          displayOrder: 0
        }
      ],
      showPercentages: true,
      sortBy: 'custom' as const
    } as Omit<IProgressBarListWidget, 'createdAt' | 'updatedAt'> & { id: string }
  },
  metricCard: {
    component: MetricCardFormExt as React.ComponentType<{data: IMetricCardWidget; onDataChange: (data: IMetricCardWidget) => void}>,
    icon: faCheckSquare,
    defaultData: { 
      id: generateId('widget-mc'),
      type: 'metricCard' as const, 
      title: 'Key Metric', 
      icon: 'faCheckSquare', 
      columnSpan: 1, 
      rowSpan: 1, 
      data: [{
        id: 'm1', 
        value: '0', 
        currency: '$', 
        trend: 'neutral' as const, 
        description: 'Metric Label',
        displayOrder: 0
      }] as IMetricCardData
    } as Omit<IMetricCardWidget, 'createdAt' | 'updatedAt'> & { id: string }
  },
  tipCard: {
    component: TipCardFormExt as React.ComponentType<{data: ITipCardWidget; onDataChange: (data: ITipCardWidget) => void}>,
    icon: faLightbulb,
    defaultData: { 
      id: generateId('widget-tc'),
      type: 'tipCard' as const, 
      title: 'Helpful Tip', 
      icon: 'faLightbulb', 
      columnSpan: 1, 
      rowSpan: 1, 
      data: { 
        tips: [{
          id: 'tip-1', 
          title: 'Save Regularly', 
          content: 'Try to save a portion of your income each month.', 
          displayOrder: 0
        }], 
        currentTipIndex: 0, 
        autoRotate: true 
      } as ITipCardData
    } as Omit<ITipCardWidget, 'createdAt' | 'updatedAt'> & { id: string }
  },
  countdownCard: {
    component: CountdownCardFormExt as React.ComponentType<{data: ICountdownCardWidget; onDataChange: (data: ICountdownCardWidget) => void}>,
    icon: faCalendar,
    defaultData: { 
      id: generateId('widget-cc'),
      type: 'countdownCard' as const, 
      title: 'Event Countdown', 
      icon: 'faCalendar', 
      columnSpan: 1, 
      rowSpan: 1, 
      data: { 
        id: 'cd-1', 
        title: 'Next Holiday', 
        image: 'https://placekitten.com/100/100',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
      } as ICountdownCardData
    } as Omit<ICountdownCardWidget, 'createdAt' | 'updatedAt'> & { id: string } // NO COMMA HERE
  }, // This is the original BRACE_X, closing countdownCard.
  // The original COMMA_Y will separate countdownCard from the new _placeholderForOriginalBraceY.
  // The original BRACE_Y will close _placeholderForOriginalBraceY.
  _placeholderForOriginalBraceY: { 
    // This object is created to be closed by the original BRACE_Y,
    // and separated from barChart by original COMMA_Y.
  }, // This is the original BRACE_Y, closing this placeholder. Original COMMA_Y will follow.
  
  barChart: {
    component: BarChartFormExt as React.ComponentType<{
      data: IBarChartWidget;
      onDataChange: (data: IBarChartWidget) => void;
    }>,
    icon: faChartBar,
    defaultData: {
      id: generateId('widget-bc'),
      type: 'barChart' as const,
      title: 'Sample Bar Chart',
      icon: 'faChartBar',
      columnSpan: 2,
      rowSpan: 1,
      data: {
        dataPoints: [
          {
            id: generateId('dp-bc1'),
            label: 'A',
            value: 10,
            color: '#4CAF50',
            displayOrder: 0
          },
          {
            id: generateId('dp-bc2'),
            label: 'B',
            value: 20,
            color: '#FFC107',
            displayOrder: 1
          }
        ],
        chartType: 'bar' as const,
        xAxisLabel: 'Category',
        yAxisLabel: 'Value',
        showLegend: true,
        title: 'Sample Bar Chart', 
        height: 300
      }
    } as Omit<IBarChartWidget, 'createdAt' | 'updatedAt'> & { id: string }
  },
  lineChart: {
    component: LineChartFormExt as React.ComponentType<{data: ILineChartWidget; onDataChange: (data: ILineChartWidget) => void}>,
    icon: faChartLine,
    defaultData: { 
      id: generateId('widget-lc'),
      type: 'lineChart' as const, 
      title: 'Sample Line Chart', 
      icon: 'faChartLine', 
      columnSpan: 2, 
      rowSpan: 1, 
      data: { 
        dataPoints: [
          {id:'dp-lc1', label: 'Jan', value: 5, x: 'Jan', y: 5, color: '#3B82F6', displayOrder: 0}, 
          {id:'dp-lc2', label: 'Feb', value: 15, x: 'Feb', y: 15, color: '#3B82F6', displayOrder: 1}
        ], 
        chartType: 'line' as const, 
        xAxisLabel: 'Month', 
        yAxisLabel: 'Value',
        showLegend: true,
        title: 'Sample Line Chart', 
        height: 300
      } 
    } as Omit<ILineChartWidget, 'createdAt' | 'updatedAt'> & { id: string }
  },
  quickCashFlowSummary: {
    component: QuickCashFlowSummaryFormExt as unknown as React.ComponentType<any>, 
    icon: faExchangeAlt,
    defaultData: { 
      id: generateId('widget-qcf'),
      type: 'quickCashFlowSummary', 
      title: 'Cash Flow', 
      icon: 'faExchangeAlt', 
      columnSpan: 2, 
      rowSpan: 1, 
      data: { 
        inflows: [
          {
            id: 'in1',
            title: 'Salary',
            value: 3000,
            category: 'Primary Income',
            frequency: 'monthly',
            isRecurring: true,
            displayOrder: 0
          }
        ],
        outflows: [
          {
            id: 'out1',
            title: 'Rent',
            value: 1000,
            category: 'Housing',
            frequency: 'monthly',
            isRecurring: true,
            displayOrder: 0
          }
        ],
        projectedPeriod: 'monthly' 
      } 
    } as Omit<IQuickCashFlowSummaryWidget, 'createdAt'|'updatedAt'> & {id: string} 
  },
  debtVisualizer: {
    component: DebtVisualizerFormExt as unknown as React.ComponentType<any>, 
    icon: faCreditCard,
    defaultData: { 
      id: generateId('widget-dv'),
      type: 'debtVisualizer', 
      title: 'My Debts', 
      icon: 'faCreditCard', 
      columnSpan: 2, 
      rowSpan: 1, 
      data: [
        {
          id: 'd1', 
          name: 'Credit Card', 
          currentBalance: 5000, 
          originalBalance: 5000, 
          interestRate: 18, 
          minPayment: 100, 
          payoffDate: '2026-01-01', 
          category: 'Credit Card', 
          displayOrder: 0,
          priority: 1 
        }
      ],
      strategy: 'snowball',
      showPayoffDates: true
    } as Omit<IDebtVisualizerWidget, 'createdAt'|'updatedAt'> & {id: string} 
  },
  financialHealthScorecard: {
    component: null as any, 
    icon: faHeartbeat,
    defaultData: { 
      id: generateId('widget-fhs'),
      type: 'financialHealthScorecard', 
      title: 'Financial Health', 
      icon: 'faHeartbeat', 
      columnSpan: 2, 
      rowSpan: 1, 
      data: [
        {
          id: 'm1-fhs',
          name: 'Savings Rate',
          currentValue: 0,
          targetValue: 20,
          weight: 25,
          displayOrder: 0,
          category: 'savings',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'm2-fhs',
          name: 'Debt to Income',
          currentValue: 0,
          targetValue: 36,
          weight: 25,
          displayOrder: 1,
          category: 'debt',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'm3-fhs',
          name: 'Emergency Fund',
          currentValue: 0,
          targetValue: 6, 
          weight: 25,
          displayOrder: 2,
          category: 'savings',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'm4-fhs',
          name: 'Credit Score',
          currentValue: 0,
          targetValue: 750,
          weight: 25,
          displayOrder: 3,
          category: 'credit',
          lastUpdated: new Date().toISOString()
        }
      ]
    } as Omit<IFinancialHealthScorecardWidget, 'createdAt'|'updatedAt'> & {id: string} 
  },
  checklist: {
    component: null as any, 
    icon: faListCheck,
    defaultData: { 
      id: generateId('widget-cl'),
      type: 'checklist', 
      title: 'My Checklist', 
      icon: 'faListCheck', 
      columnSpan: 2, 
      rowSpan: 1, 
      data: [
        {
          id: 'i1-cl',
          text: 'Task 1',
          completed: false,
          displayOrder: 0,
          category: 'general',
          dueDate: null,
          priority: 'medium',
          notes: ''
        },
        {
          id: 'i2-cl',
          text: 'Task 2',
          completed: false,
          displayOrder: 1,
          category: 'general',
          dueDate: null,
          priority: 'medium',
          notes: ''
        }
      ]
    } as Omit<IChecklistWidget, 'createdAt'|'updatedAt'> & {id: string} 
  }
};

export default function WidgetEditModal({ isOpen, onClose, widget, onSave }: WidgetEditModalProps) {
  const [formData, setFormData] = useState<Widget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (widget) {
      setFormData(JSON.parse(JSON.stringify(widget))); 
    } else {
      setFormData(null);
    }
  }, [widget]);

  const handleGlobalSettingChange = useCallback((field: keyof Widget, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } as Widget : null);
  }, []);

  // This onDataChange is for the forms to update the *entire widget object* in formData
  const handleSpecificWidgetDataChange = useCallback((updatedWidgetData: Widget) => {
    setFormData(prev => {
        if (!prev) return updatedWidgetData; // Should not happen if form is active with a widget
        // Ensure the core properties like id, type are from the original `prev`
        // if updatedWidgetData is only partial, but most forms send the whole new object.
        return {
            ...prev, // Keep old top-level fields like id, type, title (unless changed in form)
            ...updatedWidgetData // Apply changes from the form
        };
    });
  }, []);


  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData) return;
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); 
      onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save widget:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSave, onClose]);

  const ActiveForm = useMemo(() => {
    if (!formData?.type) return null;
    const config = widgetTypeConfig[formData.type as WidgetTypeKey]; 
    return config?.component || null;
  }, [formData?.type]);

  const renderActiveForm = useMemo(() => {
    if (!ActiveForm || !formData) return null;
    
    return (
        <div className="w-full">
          <ActiveForm 
            data={formData as any} 
            onDataChange={handleSpecificWidgetDataChange} 
          />
        </div>
      );
  }, [ActiveForm, formData, handleSpecificWidgetDataChange]); 

  if (!isOpen || !formData) return null;

  const currentWidgetTypeConf = formData?.type ? widgetTypeConfig[formData.type as WidgetTypeKey] : null;
  const displayFormTitle = formData.title || (currentWidgetTypeConf ? currentWidgetTypeConf.defaultData.title : 'Widget Settings');
  const displayFormIcon = currentWidgetTypeConf ? currentWidgetTypeConf.icon : faCog;


  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <form onSubmit={handleSubmit} className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="py-4 px-5 bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10 border-b dark:border-gray-700">
          <div className="flex items-center">
            <FontAwesomeIcon icon={displayFormIcon} className="text-xl text-primary-600 dark:text-primary-400 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit {displayFormTitle}</h2>
          </div>
        </div>

        <div className="py-6 px-5 space-y-6 max-h-[calc(100vh-220px)] overflow-y-auto">
          <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/30">
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">General Settings</h3>
            <div>
              <Label htmlFor="widget-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Widget Title</Label>
              <Input
                id="widget-title"
                value={formData.title || ''}
                onChange={(e) => handleGlobalSettingChange('title', e.target.value)}
                placeholder={`E.g., ${currentWidgetTypeConf ? currentWidgetTypeConf.defaultData.title : 'Default Title'}`}
              />
            </div>
            <div>
              <Label htmlFor="widget-icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon</Label>
              <IconSelector
                selectedIcon={formData.icon || ''}
                onSelectIcon={(iconName) => handleGlobalSettingChange('icon', iconName)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="widget-columnSpan" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Column Span</Label>
                    <Input id="widget-columnSpan" type="number" min="1" max="2" value={formData.columnSpan || 1} onChange={(e) => handleGlobalSettingChange('columnSpan', parseInt(e.target.value,10) as 1 | 2 || 1)} />
                </div>
                <div>
                    <Label htmlFor="widget-rowSpan" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Row Span (Optional)</Label>
                    <Input id="widget-rowSpan" type="number" min="1" max="2" value={formData.rowSpan || ''} onChange={(e) => handleGlobalSettingChange('rowSpan', parseInt(e.target.value,10) as 1 | 2 || undefined)} placeholder="Auto"/>
                </div>
            </div>
          </div>

          {ActiveForm ? renderActiveForm : <p className="text-center text-gray-500 dark:text-gray-400">No specific form for this widget type or widget data is missing.</p>}
        </div>

        <div className="py-4 px-5 flex justify-end space-x-3 bg-gray-50 dark:bg-gray-800/50 sticky bottom-0 z-10 border-t dark:border-gray-700">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}