'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Select } from '@/components/ui/select'; // Select component not found, commented out for now
import { Label } from '@/components/ui/label';
import { Widget, IMetricCardWidget, IProgressBarListWidget, ICountdownCardWidget, IDataListWidget, ITipCardWidget, IChecklistWidget, IDataListItem, IProgressBarListItem, ITipCardListItem, IChecklistItem, ICountdownCardData, IMetricCardItem, IBarChartWidget, ILineChartWidget, IChartData, IChartDataPoint, IQuickCashFlowSummaryWidget, IQuickCashFlowSummaryData, ICashFlowEntry, IDebtVisualizerWidget, IDebtItem, IDebtVisualizerData, IFinancialHealthScorecardWidget, IFinancialHealthScorecardData, IFinancialHealthItem, IMetricTrend } from './types/dashboard-data.typings'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGripVertical, 
  faPlusCircle, 
  faPalette, 
  faCheck, 
  faTimes, 
  faPen, 
  faPlus, 
  faTrash, 
  faCalendar, 
  faChartLine, 
  faList, 
  faPercent, 
  faLightbulb,
  faCalendarAlt,
  faCheckSquare,
  faCog,
  faTasks,
  faChartBar,
  faExchangeAlt,
  faCreditCard,
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  UniqueIdentifier
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DraggableSyntheticListeners, DraggableAttributes } from '@dnd-kit/core';
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
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="bg-white dark:bg-slate-700/50 rounded-lg shadow mb-2 last:mb-0">
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
          {children}
        </div>
      </div>
    </div>
  );
}

// ProgressBarListForm with Drag-and-Drop
function ProgressBarListForm({ data: widgetData, onDataChange }: WidgetFormProps<IProgressBarListWidget>) {
  // Initialize formData with processed items, ensuring IDs and displayOrder
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

  // Effect to update formData if widgetData.data changes externally (e.g., discard changes)
  useEffect(() => {
    const itemsArray: IProgressBarListItem[] = widgetData.data || [];
    const processedItems: IProgressBarListItem[] = itemsArray
      .map((item, index) => ({
        ...item,
        id: item.id || `pbl-item-${Date.now()}-${index}`,
        displayOrder: item.displayOrder !== undefined ? item.displayOrder : index,
      }))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    
    // Only update if there's an actual difference to avoid infinite loops
    if (JSON.stringify(formData.data) !== JSON.stringify(processedItems) || 
        formData.showPercentages !== widgetData.showPercentages || 
        formData.sortBy !== widgetData.sortBy) {
      setFormData({
        ...widgetData,
        data: processedItems,
      });
    }
  }, [widgetData, formData.data]); // Add formData.data to dependencies to allow internal updates to reflect if needed

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
        const newFormData = { ...formData, data: movedItems, sortBy: 'custom' as const }; // Set sortBy to custom on manual reorder
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
      color: '#3b82f6', // Default blue
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

  return (
    <div className="space-y-6">
      {/* Widget-level settings */}
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

      {/* Item-level settings */}
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress Items ({formData.data.length})</h4>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={formData.data.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {formData.data.map(item => (
            <SortableProgressBarItem key={item.id} id={item.id}>
              {(listeners, _attributes) => ( // _attributes not used directly on Button for this layout
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
                        <Input id={`pbi-${item.id}-current`} type="number" value={item.current} onChange={e => handleItemChange(item.id, 'current', e.target.valueAsNumber)} placeholder="Current" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`pbi-${item.id}-max`} className="text-xs text-slate-500 dark:text-slate-400">Target Value (Max)</Label>
                        <Input id={`pbi-${item.id}-max`} type="number" value={item.max} onChange={e => handleItemChange(item.id, 'max', e.target.valueAsNumber)} placeholder="Max" />
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

// ProgressBarListForm specific: Sortable Item for Progress Bars
interface SortableProgressBarItemProps {
  id: UniqueIdentifier;
  children: (listeners: DraggableSyntheticListeners, attributes: DraggableAttributes) => React.ReactNode;
}

function SortableProgressBarItem({ id, children }: SortableProgressBarItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="bg-white dark:bg-slate-800 shadow rounded-lg mb-3 touch-manipulation">
      {children(listeners, attributes)}
    </div>
  );
}

// FinancialHealthScorecardForm specific: Sortable Item
interface SortableFinancialHealthItemProps {
  id: UniqueIdentifier;
  children: (listeners: DraggableSyntheticListeners, attributes: DraggableAttributes) => React.ReactNode;
}

function SortableFinancialHealthItem({ id, children }: SortableFinancialHealthItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="bg-white dark:bg-slate-800 shadow rounded-lg mb-3 touch-manipulation">
      {children(listeners, attributes)}
    </div>
  );
}

// Define SortableBarChartItem component and its props
interface SortableBarChartItemProps {
  id: UniqueIdentifier;
  // Children is a function that receives listeners and attributes and returns ReactNode
  children: (listeners: DraggableSyntheticListeners, attributesForDraggableNode: DraggableAttributes) => React.ReactNode;
}

function SortableBarChartItem({ id, children }: SortableBarChartItemProps) {
  const { 
    attributes, // These attributes are for the draggable node itself (the div we render here)
    listeners,  // These listeners are for the drag handle
    setNodeRef, 
    transform, 
    transition, 
    isDragging 
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  // The outer div is the draggable node, it gets setNodeRef and attributes from useSortable.
  // The children function is called with listeners (for the handle) and attributes (if the content needs them, though usually not).
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="touch-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm">
      {children(listeners, attributes)} 
    </div>
  );
}

function BarChartForm({ data: widgetData, onDataChange }: WidgetFormProps<IBarChartWidget>) {
  const [formData, setFormData] = useState<IBarChartWidget>(widgetData);

  const handleInputChange = (field: keyof IBarChartWidget | keyof IChartData, value: any) => {
    let newFormData: IBarChartWidget;
    if (['title', 'icon', 'columnSpan', 'rowSpan'].includes(field as string)) {
      newFormData = { ...formData, [field]: value };
    } else if (['xAxisLabel', 'yAxisLabel', 'showLegend'].includes(field as string)) {
      newFormData = { 
        ...formData, 
        data: { 
          ...formData.data, 
          [field as keyof IChartData]: value 
        } 
      };
    } else {
      // This case should ideally not be hit for these fields
      newFormData = { ...formData, [field as keyof IBarChartWidget]: value };
    }
    setFormData(newFormData);
    onDataChange(newFormData);
  };

const handleItemChange = (itemId: string, field: keyof IChartDataPoint, value: any) => {
    const newItems = formData.data.dataPoints.map(item => 
      item.id === itemId ? { ...item, [field]: field === 'value' ? parseFloat(value) || 0 : value } : item
    );
    const newFormData = { ...formData, data: { ...formData.data, dataPoints: newItems } };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleAddItem = () => {
    const newItemId = `chartitem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newItem: IChartDataPoint = {
      id: newItemId,
      label: 'New Item',
      value: 10,
      color: '#CCCCCC',
      displayOrder: formData.data.dataPoints.length,
    };
    const newItems = [...formData.data.dataPoints, newItem];
    const newFormData = { ...formData, data: { ...formData.data, dataPoints: newItems } };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleRemoveItem = (itemId: string) => {
    const newItems = formData.data.dataPoints.filter(item => item.id !== itemId).map((item, index) => ({ ...item, displayOrder: index }));
    const newFormData = { ...formData, data: { ...formData.data, dataPoints: newItems } };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  // Ensure items have IDs and displayOrder for dnd-kit
  const items = 
    formData.data.dataPoints.map((item, index) => ({
      ...item,
      id: item.id || `chartitem-init-${index}-${Math.random().toString(36).substring(2,9)}`,
      displayOrder: item.displayOrder !== undefined ? item.displayOrder : index
    })).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id.toString());
      const newIndex = items.findIndex((item) => item.id === over.id.toString());
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrderedItems = arrayMove(items, oldIndex, newIndex);
        const updatedDataPoints = newOrderedItems.map((item, index) => ({
          ...item,
          displayOrder: index,
        }));
        const newFormData = { ...formData, data: { ...formData.data, dataPoints: updatedDataPoints } };
        setFormData(newFormData);
        onDataChange(newFormData);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="bar-chart-title">Widget Title</Label>
        <Input
          id="bar-chart-title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Bar Chart Title"
        />
      </div>
      <div>
        <Label htmlFor="bar-chart-xaxis-label">X-Axis Label</Label>
        <Input
          id="bar-chart-xaxis-label"
          value={formData.data.xAxisLabel || ''}
          onChange={(e) => handleInputChange('xAxisLabel', e.target.value)}
          placeholder="X-Axis Label (e.g., Month)"
        />
      </div>
      <div>
        <Label htmlFor="bar-chart-yaxis-label">Y-Axis Label</Label>
        <Input
          id="bar-chart-yaxis-label"
          value={formData.data.yAxisLabel || ''}
          onChange={(e) => handleInputChange('yAxisLabel', e.target.value)}
          placeholder="Y-Axis Label (e.g., Sales)"
        />
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="bar-chart-show-legend"
          checked={formData.data.showLegend || false}
          onChange={(e) => handleInputChange('showLegend', e.target.checked)}
          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
        />
        <Label htmlFor="bar-chart-show-legend" className="mb-0">Show Legend</Label>
      </div>
      <div>
        <Label className="block mb-2 font-medium">Data Points</Label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((item) => (
                <SortableBarChartItem key={item.id} id={item.id}>
                  {(handleListeners, draggableNodeAttributes) => (
                    // The SortableBarChartItem renders the main draggable div and applies draggableNodeAttributes to it.
                    // We only need to render the content *inside* that div here.
                    // The handleListeners are passed to the specific drag handle button.
                    <div className="p-3"> {/* This inner div no longer needs draggableNodeAttributes, as the parent SortableBarChartItem handles it */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-1 flex items-center justify-center">
                          <Button {...handleListeners} variant="text" size="sm" className="cursor-grab p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 touch-manipulation">
                            <FontAwesomeIcon icon={faGripVertical} />
                          </Button>
                        </div>
                        <div className="md:col-span-4">
                          <Label htmlFor={`chartitem-label-${item.id}`} className="text-xs">Label</Label>
                          <Input
                            id={`chartitem-label-${item.id}`}
                            value={item.label}
                            onChange={(e) => handleItemChange(item.id, 'label', e.target.value)}
                            placeholder="E.g., Sales Q1"
                            className="mt-1"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <Label htmlFor={`chartitem-value-${item.id}`} className="text-xs">Value</Label>
                          <Input
                            id={`chartitem-value-${item.id}`}
                            type="number"
                            value={item.value}
                            onChange={(e) => handleItemChange(item.id, 'value', e.target.value)}
                            placeholder="E.g., 1500"
                            className="mt-1"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <Label htmlFor={`chartitem-color-${item.id}`} className="text-xs">Color</Label>
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
                            aria-label="Remove chart item"
                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </SortableBarChartItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Button onClick={handleAddItem} variant="outline" size="sm" className="mt-4">
          <FontAwesomeIcon icon={faPlus} className="mr-2" />Add Data Point
        </Button>
      </div>
    </div>
  );
}
interface SortableLineChartItemProps {
  id: UniqueIdentifier;
  children: (listeners: DraggableSyntheticListeners, attributes: DraggableAttributes) => React.ReactNode;
}

function SortableLineChartItem({ id, children }: SortableLineChartItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="touch-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm">
      {children(listeners, attributes)}
    </div>
  );
}

function LineChartForm({ data: widgetData, onDataChange }: WidgetFormProps<ILineChartWidget>) {
  const [formData, setFormData] = useState<ILineChartWidget>(widgetData);

  const handleInputChange = (field: keyof ILineChartWidget | keyof IChartData, value: any) => {
    let newFormData: ILineChartWidget;
    if (['title', 'icon', 'columnSpan', 'rowSpan', 'showDataPoints'].includes(field as string)) {
      newFormData = { ...formData, [field]: value };
    } else {
      newFormData = { ...formData, data: { ...formData.data, [field as keyof IChartData]: value } };
    }
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleItemChange = (itemId: string, field: keyof IChartDataPoint, value: any) => {
    const newItems = formData.data.dataPoints.map(item =>
      item.id === itemId ? { ...item, [field]: field === 'value' ? parseFloat(value) || 0 : value } : item
    );
    const newFormData = { ...formData, data: { ...formData.data, dataPoints: newItems } };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleAddItem = () => {
    const newItemId = `lineitem-${Date.now()}`;
    const newItem: IChartDataPoint = {
      id: newItemId,
      label: 'New Point',
      value: 100,
      displayOrder: formData.data.dataPoints.length,
    };
    const newItems = [...formData.data.dataPoints, newItem];
    const newFormData = { ...formData, data: { ...formData.data, dataPoints: newItems } };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleRemoveItem = (itemId: string) => {
    const newItems = formData.data.dataPoints.filter(item => item.id !== itemId).map((item, index) => ({ ...item, displayOrder: index }));
    const newFormData = { ...formData, data: { ...formData.data, dataPoints: newItems } };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const items = useMemo(() =>
    [...(formData.data.dataPoints || [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [formData.data.dataPoints]
  );

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      const newOrderedItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({ ...item, displayOrder: index }));
      const newFormData = { ...formData, data: { ...formData.data, dataPoints: newOrderedItems } };
      setFormData(newFormData);
      onDataChange(newFormData);
    }
  };

  return (
    <div className="space-y-4">
      <Input id="line-chart-title" value={formData.title} onChange={e => handleInputChange('title', e.target.value)} placeholder="Line Chart Title" />
      <Input id="line-chart-xaxis-label" value={formData.data.xAxisLabel || ''} onChange={e => handleInputChange('xAxisLabel', e.target.value)} placeholder="X-Axis Label" />
      <Input id="line-chart-yaxis-label" value={formData.data.yAxisLabel || ''} onChange={e => handleInputChange('yAxisLabel', e.target.value)} placeholder="Y-Axis Label" />
      <div className="flex items-center space-x-2">
        <input type="checkbox" id="line-chart-show-legend" checked={formData.data.showLegend || false} onChange={e => handleInputChange('showLegend', e.target.checked)} />
        <Label htmlFor="line-chart-show-legend">Show Legend</Label>
      </div>
      <div className="flex items-center space-x-2">
        <input type="checkbox" id="line-chart-show-points" checked={formData.showDataPoints || false} onChange={e => handleInputChange('showDataPoints', e.target.checked)} />
        <Label htmlFor="line-chart-show-points">Show Data Points</Label>
      </div>
      <div>
        <Label className="block mb-2 font-medium">Data Points (X, Y)</Label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map(item => (
                <SortableLineChartItem key={item.id} id={item.id}>
                  {(listeners, attributes) => (
                    <div className="p-3">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        <div className="md:col-span-1 flex items-center justify-center"><Button {...listeners} variant="text" size="sm" className="cursor-grab"><FontAwesomeIcon icon={faGripVertical} /></Button></div>
                        <div className="md:col-span-5"><Input value={item.label} onChange={e => handleItemChange(item.id, 'label', e.target.value)} placeholder="X Value (Label)" /></div>
                        <div className="md:col-span-5"><Input type="number" value={item.value} onChange={e => handleItemChange(item.id, 'value', e.target.value)} placeholder="Y Value" /></div>
                        <div className="md:col-span-1"><Button type="button" variant="text" size="sm" onClick={() => handleRemoveItem(item.id)} className="text-red-500"><FontAwesomeIcon icon={faTrash} /></Button></div>
                      </div>
                    </div>
                  )}
                </SortableLineChartItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Button onClick={handleAddItem} variant="outline" size="sm" className="mt-4"><FontAwesomeIcon icon={faPlus} className="mr-2" />Add Data Point</Button>
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
    const newFormData = { ...formData, data: newItems as IDebtVisualizerData }; // Cast because map might infer IDebtItem[]
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
      const newOrderedItems = arrayMove(formData.data, oldIndex, newIndex).map((item, index) => ({ ...item, displayOrder: index }));
      const newFormData = { ...formData, data: newOrderedItems as IDebtVisualizerData };
      setFormData(newFormData);
      onDataChange(newFormData);
    }
  };
  
  const debtItems =
    [...(formData.data || [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))

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
                  <div className="flex items-start p-3"> {/* Outer flex for handle and content block */}
                    <Button {...listeners} variant="text" size="sm" className="cursor-grab p-1 mr-2 mt-5 text-slate-400 dark:text-slate-500 flex-shrink-0"><FontAwesomeIcon icon={faGripVertical} /></Button>
                    <div className="flex-grow space-y-3 ml-1"> {/* Main content block for fields */}
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
                    </div> {/* Closing flex-grow space-y-3 ml-1 */}
                  </div>   /* Closing flex items-start p-3 */
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
      newFormData = { ...formData, data: { ...formData.data, [field as keyof IQuickCashFlowSummaryData]: value } };
    }
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleFlowItemChange = (flowType: 'inflows' | 'outflows', itemId: string, field: keyof ICashFlowEntry, value: any) => {
    const items = formData.data[flowType];
    const newItems = items.map(item =>
      item.id === itemId ? { ...item, [field]: field === 'value' ? parseFloat(value) || 0 : value } : item
    );
    const newFlowData = { ...formData.data, [flowType]: newItems };
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
      displayOrder: formData.data[flowType].length,
    };
    const newItems = [...formData.data[flowType], newItem];
    const newFlowData = { ...formData.data, [flowType]: newItems };
    const newFormData = { ...formData, data: newFlowData };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const handleRemoveFlowItem = (flowType: 'inflows' | 'outflows', itemId: string) => {
    const items = formData.data[flowType];
    const newItems = items.filter(item => item.id !== itemId).map((item, index) => ({ ...item, displayOrder: index }));
    const newFlowData = { ...formData.data, [flowType]: newItems };
    const newFormData = { ...formData, data: newFlowData };
    setFormData(newFormData);
    onDataChange(newFormData);
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (flowType: 'inflows' | 'outflows', event: DragEndEvent) => {
    const { active, over } = event;
    const currentItems = formData.data[flowType];
    if (over && active.id !== over.id) {
      const oldIndex = currentItems.findIndex(item => item.id === active.id);
      const newIndex = currentItems.findIndex(item => item.id === over.id);
      const newOrderedItems = arrayMove(currentItems, oldIndex, newIndex).map((item, index) => ({ ...item, displayOrder: index }));
      const newFlowData = { ...formData.data, [flowType]: newOrderedItems };
      const newFormData = { ...formData, data: newFlowData };
      setFormData(newFormData);
      onDataChange(newFormData);
    }
  };

  const renderFlowSection = (flowType: 'inflows' | 'outflows', title: string) => {
    const items = useMemo(() => 
      [...(formData.data[flowType] || [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)), 
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
                  <div className="flex items-start p-3"> {/* Outer flex for handle and content block */}
                    <Button {...listeners} variant="text" size="sm" className="cursor-grab p-1 mr-2 mt-5 text-slate-400 dark:text-slate-500 flex-shrink-0"><FontAwesomeIcon icon={faGripVertical} /></Button>
                    <div className="flex-grow space-y-2 ml-1"> {/* Main content block for fields */}
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
                    </div> {/* Closing flex-grow space-y-2 ml-1 */}
                  </div>   /* Closing flex items-start p-3 */
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
        <Input id="qcf-projected-period" value={formData.data.projectedPeriod || ''} onChange={e => handleInputChange('projectedPeriod', e.target.value)} placeholder="Monthly, Annually" />
      </div>
      {renderFlowSection('inflows', 'Inflows')}
      {renderFlowSection('outflows', 'Outflows')}
    </div>
  );
}

function TipCardForm({ data: widgetData, onDataChange }: WidgetFormProps<ITipCardWidget>) {
  // data is ITipCardData. Ensure data and data.tips are properly handled if they might be undefined initially.
  const items: ITipCardListItem[] = widgetData.data?.tips?.map((tip: ITipCardListItem) => ({...tip, id: tip.id || `tip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`})) || [];
  const currentTipIndex = typeof widgetData.data?.currentTipIndex === 'number' ? widgetData.data.currentTipIndex : 0;

  const handleItemChange = (index: number, field: keyof ITipCardListItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onDataChange({ ...widgetData, data: { tips: newItems, currentTipIndex } }); 
  };

  const addItem = () => {
    const newTip: ITipCardListItem = { id: `tip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, title: '', content: '', image: '', link: '', displayOrder: items.length };
    const newItems = [...items, newTip];
    onDataChange({ ...widgetData, data: { tips: newItems, currentTipIndex } });
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
    onDataChange({ ...widgetData, data: { tips: newItems, currentTipIndex: newCurrentTipIndex } });
  };

  return (
    <div className="space-y-6">
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
              <FontAwesomeIcon onClick={() => removeItem(index)} icon={faTrash} className="mr-2 text-red-500 hover:text-red-700 dark:hover:text-red-400" />Remove Tip
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
    </div>
  );
}

function MetricCardForm({ data: widgetData, onDataChange }: WidgetFormProps<IMetricCardWidget>) {
  // IMetricCardData is an array of IMetricCardItem. This form edits the first item.
  const item = (widgetData.data && widgetData.data[0]) || { 
    id: `metric-${Date.now()}`,
    description: 'New Metric', // Maps to IMetricCardItem.description
    value: '0', 
    currency: '', // Maps to IMetricCardItem.currency
    trend: 'neutral' as IMetricTrend 
  };

  const handleFieldChange = (field: keyof IMetricCardItem, value: string | number | IMetricTrend) => {
    const updatedItem = { ...item, [field]: value };
    // Update the first item in the array, preserve other items if they exist
    const newData = [updatedItem, ...(widgetData.data?.slice(1) || [])];
    onDataChange({ ...widgetData, data: newData as IMetricCardItem[] });
  };

  return (
    <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
      <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">Metric Card Settings (First Item)</h3>
      <div>
        <Label htmlFor={`metric-description-${item.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</Label>
        <Input
          id={`metric-description-${item.id}`}
          value={item.description || ''} // Use description
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
            value={item.currency || ''} // Use currency
            onChange={(e) => handleFieldChange('currency', e.target.value)}
            placeholder="e.g., USD, kg, %"
            className="w-full"
          />
        </div>
        {/* Select component for Trend is commented out as 'Select' is not found
        <div>
          <Label htmlFor={`metric-trend-${item.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trend (Optional)</Label>
          <Select
            id={`metric-trend-${item.id}`}
            value={item.trend || 'neutral'}
            onChange={(e) => handleFieldChange('trend', e.target.value as IMetricTrend)}
            className="w-full"
          >
            <option value="neutral">Neutral</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
            <option value="stable">Stable</option>
          </Select>
        </div>
        */}
      </div>
    </div>
  );
}

const widgetTypeConfig: Record<string, { title: string; icon: any; form: React.FC<WidgetFormProps<any>> | null; defaultData: Omit<Widget, 'id'> }> ={
  dataList: {
    title: 'Data List',
    icon: faList,
    form: DataListForm,
    defaultData: { type: 'dataList', title: 'New Data List', icon: 'faList', columnSpan: 2, rowSpan: 1, data: [] }
  },
  progressBarList: {
    title: 'Progress Bar List',
    icon: faTasks,
    form: ProgressBarListForm,
    defaultData: { type: 'progressBarList', title: 'My Progress', icon: 'faTasks', columnSpan: 1, rowSpan: 1, data: [], showPercentages: true, sortBy: 'custom' }
  },
  metricCard: {
    title: 'Metric Card',
    icon: faChartLine,
    form: MetricCardForm,
    defaultData: { type: 'metricCard', title: 'Key Metric', icon: 'faChartLine', columnSpan: 1, rowSpan: 1, data: [{ id: 'm1', description: 'Metric Label', value: '0', currency: '', trend: 'neutral' as IMetricTrend }] }
  },
  tipCard: {
    title: 'Tip Card',
    icon: faLightbulb,
    form: TipCardForm,
    defaultData: { type: 'tipCard', title: 'Helpful Tip', icon: 'faLightbulb', columnSpan: 1, rowSpan: 1, data: { tips: [{id: 'tip-1', title: 'Save Regularly', content: 'Try to save a portion of your income each month.', displayOrder: 0}], currentTipIndex: 0, autoRotate: true } }
  },
  countdownCard: {
    title: 'Countdown Card',
    icon: faCalendarAlt,
    form: CountdownCardForm,
    defaultData: { type: 'countdownCard', title: 'Event Countdown', icon: 'faCalendarAlt', columnSpan: 1, rowSpan: 1, data: { id: 'cd-1', title: 'Next Holiday', days: 30, image: 'default_icon_url', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], eventName: 'Upcoming Event' } }
  },
  barChart: {
    title: 'Bar Chart',
    icon: faChartBar,
    form: BarChartForm,
    defaultData: { type: 'barChart', title: 'Sample Bar Chart', icon: 'faChartBar', columnSpan: 2, rowSpan: 1, data: { dataPoints: [{id:'dp1', label: 'A', value: 10, color: '#4CAF50'}, {id:'dp2', label: 'B', value: 20, color: '#FFC107'}], chartType: 'bar', xAxisLabel: 'Category', yAxisLabel: 'Value' } }
  },
  lineChart: {
    title: 'Line Chart',
    icon: faChartLine,
    form: LineChartForm,
    defaultData: { type: 'lineChart', title: 'Sample Line Chart', icon: 'faChartLine', columnSpan: 2, rowSpan: 1, data: { dataPoints: [{id:'dp1', label: 'Jan', value: 5}, {id:'dp2', label: 'Feb', value: 15}], chartType: 'line', xAxisLabel: 'Month', yAxisLabel: 'Value', tension: 0.1, pointRadius: 3 } }
  },
  quickCashFlowSummary: {
    title: 'Quick Cash Flow',
    icon: faExchangeAlt,
    form: QuickCashFlowSummaryForm,
    defaultData: { type: 'quickCashFlowSummary', title: 'Cash Flow', icon: 'faExchangeAlt', columnSpan: 2, rowSpan: 1, data: { inflows: [{id:'in1', title: 'Salary', value: 3000, category: 'Income'}], outflows: [{id:'out1', title: 'Rent', value: 1000, category: 'Housing'}], projectedPeriod: 'Monthly' }, showCategories: true, showProjections: true }
  },
  debtVisualizer: {
    title: 'Debt Visualizer',
    icon: faCreditCard,
    form: DebtVisualizerForm,
    defaultData: { type: 'debtVisualizer', title: 'My Debts', icon: 'faCreditCard', columnSpan: 2, rowSpan: 1, data: [{id:'d1', name: 'Credit Card', currentBalance: 5000, originalBalance: 5000, interestRate: 18, minPayment: 100, payoffDate: '2026-01-01', type: 'Credit Card', displayOrder: 0}], strategy: 'snowball' }
  },
  financialHealthScorecard: {
    title: 'Financial Health Scorecard',
    icon: faShieldAlt,
    form: null, // FinancialHealthScorecardForm, // Commented out as component is not found
    defaultData: {
      type: 'financialHealthScorecard',
      title: 'My Financial Health',
      icon: 'faShieldAlt',
      columnSpan: 2, rowSpan: 1,
      data: {
        items: [
          { id: 'fhs-1', category: 'Budget Adherence', score: 80, status: 'Good', explanation: 'Generally sticking to budget.', weight: 1, displayOrder: 0 },
          { id: 'fhs-2', category: 'Emergency Fund', score: 60, status: 'Fair', explanation: 'Fund covers 2 months of expenses.', weight: 1.5, displayOrder: 1 },
        ],
        overallScore: 72,
        overallStatus: 'Good',
      },
      showIndividualScores: true,
    }
  },
  checklist: { 
    title: 'Checklist', 
    icon: faCheckSquare, 
    form: null, // Placeholder for ChecklistForm
    defaultData: { type: 'checklist', title: 'My Checklist', icon: 'faCheckSquare', columnSpan: 1, rowSpan: 1, data: [{id:'cl1', task: 'Pay bills', isCompleted: false, displayOrder: 0 }] }
  },
}

export default function WidgetEditModal({ isOpen, onClose, widget, onSave }: WidgetEditModalProps) {
  const [formData, setFormData] = useState<Widget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (widget) {
      setFormData(JSON.parse(JSON.stringify(widget))); // Deep copy
    } else {
      setFormData(null);
    }
  }, [widget]);

  const handleGlobalSettingChange = useCallback((field: keyof Widget, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  const handleDataChange = useCallback((updatedWidgetSpecificData: any) => {
    setFormData(prev => {
      if (!prev) return null;
      // This logic ensures that the 'data' field is correctly updated based on its type (array or object)
      // It's a simplified approach; more complex data structures might need more specific handling.
      return { ...prev, data: updatedWidgetSpecificData }; 
    });
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData) return;
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save widget:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSave, onClose]);

  const ActiveForm = useMemo(() => {
    if (!formData || !formData.type || !widgetTypeConfig[formData.type]) return () => <p>Widget configuration or form data is missing.</p>;
    const config = widgetTypeConfig[formData.type];
    const FormComponent = config.form;
    if (!FormComponent) return () => <p>Edit form for widget type "{formData.type}" is not available.</p>;
    return FormComponent;
  }, [formData, widgetTypeConfig]);

  if (!isOpen || !formData) return null;

  const currentDisplayConfig = widgetTypeConfig[formData.type] || { icon: faCog, title: 'Widget Settings' };
  const displayFormTitle = formData.title || currentDisplayConfig.title;
  const displayFormIcon = currentDisplayConfig.icon;

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
                placeholder={`E.g., ${currentDisplayConfig.title}`}
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

          {formData && formData.type && widgetTypeConfig[formData.type]?.form && <ActiveForm data={formData} onDataChange={handleDataChange as any} />}
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