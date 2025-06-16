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
  IFinancialHealthScorecardWidget,
  IInsuranceCoverageWidget, 
  IInsuranceCoverageData, 
  IInsuranceCoverageItem,
  IChecklistItem 
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
  // faShieldAlt was already imported earlier, removed duplicate
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
import { InsuranceCoverageForm as InsuranceCoverageFormExt } from './widget-forms/InsuranceCoverageForm';

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

  return (
    <div />
  );
}

const cashFlowFrequencies: { value: ICashFlowEntry['frequency']; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

interface SortableCashFlowItemProps {
  id: string;
  children: (listeners: DraggableSyntheticListeners, attributes: DraggableAttributes) => React.ReactNode;
}

function SortableCashFlowItem({ id, children }: SortableCashFlowItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children(listeners, attributes)}
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
                  <div className="flex items-start p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
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
                          <select id={`${flowType}-${item.id}-frequency`} value={item.frequency || 'monthly'} onChange={e => handleFlowItemChange(flowType, item.id, 'frequency', e.target.value as ICashFlowEntry['frequency'])} className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 h-9 px-2">
                            {cashFlowFrequencies.map(freq => <option key={freq.value} value={freq.value}>{freq.label}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </SortableCashFlowItem>
            ))}
          </SortableContext>
        </DndContext>
        <Button onClick={() => handleAddFlowItem(flowType)} variant="outline" size="sm" className="mt-2"><FontAwesomeIcon icon={faPlus} className="mr-2" />Add {flowType === 'inflows' ? 'Inflow' : 'Outflow'}</Button>
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
  const item = (widgetData.data && widgetData.data.metrics && widgetData.data.metrics[0]) || { 
    id: `metric-${Date.now()}`,
    description: 'New Metric', 
    value: '0', 
    currency: '', 
    trend: 'neutral' as IMetricTrend,
    displayOrder: 0 
  };

  const handleFieldChange = (field: keyof IMetricCardItem, value: string | number | IMetricTrend) => {
    const updatedItem = { ...item, [field]: value };
    const newDataArray = widgetData.data && widgetData.data.metrics ? [...widgetData.data.metrics] : [];
    if (newDataArray.length > 0) {
        newDataArray[0] = updatedItem;
    } else {
        newDataArray.push(updatedItem);
    }
    onDataChange({ ...widgetData, data: { ...widgetData.data, metrics: newDataArray } as IMetricCardData });
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
  quickCashFlowSummary: {
    component: QuickCashFlowSummaryFormExt,
    icon: faExchangeAlt,
    defaultData: {
      id: generateId('widget-qcf'),
      type: 'quickCashFlowSummary',
      title: 'Cash Flow Summary',
      icon: 'faExchangeAlt',
      columnSpan: 1,
      rowSpan: 1,
      data: {
        inflows: [],
        outflows: [],
        period: 'monthly',
      } as IQuickCashFlowSummaryData,
    } as Omit<IQuickCashFlowSummaryWidget, 'createdAt' | 'updatedAt'> & { id: string },
  },
  debtVisualizer: {
    component: DebtVisualizerFormExt,
    icon: faCreditCard,
    defaultData: {
      id: generateId('widget-dv'),
      type: 'debtVisualizer',
      title: 'Debt Visualizer',
      icon: 'faCreditCard',
      columnSpan: 2,
      rowSpan: 1,
      strategy: 'avalanche',
      data: [] as IDebtItem[],
    } as Omit<IDebtVisualizerWidget, 'createdAt' | 'updatedAt'> & { id: string },
  },
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
      data: {
        title: 'Key Performance Indicators',
        description: 'Monitor your important metrics.',
        metrics: [{
          id: 'm1',
          description: 'Metric Label', // Changed from label to description
          value: '0', // IMetricCardItem.value is string
          currency: '$', // IMetricCardItem.currency is string
          trend: 'neutral' as const,
          trendPercentage: '0'
        }]
      } as IMetricCardData
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
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        showDays: true,
        showHours: true,
        showMinutes: true,
        showSeconds: true
      } as ICountdownCardData
    } as Omit<ICountdownCardWidget, 'createdAt' | 'updatedAt'> & { id: string }
  },
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
          {id:'dp-lc1', label: 'Jan', value: 5, color: '#3B82F6', displayOrder: 0}, 
          {id:'dp-lc2', label: 'Feb', value: 15, color: '#3B82F6', displayOrder: 1}
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
      data: {
        items: [
          {
            id: 'm1-fhs',
            category: 'Credit Score',
            score: 750,
            status: 'Good' as const,
            explanation: 'Your credit score is healthy, but could be improved.',
            weight: 0.4,
            displayOrder: 1,
          },
          {
            id: 'm2-fhs',
            category: 'Savings Ratio',
            score: 15,
            status: 'Fair' as const,
            explanation: 'Your savings rate is okay, aiming for 20% is better.',
            weight: 0.3,
            displayOrder: 2,
          },
          {
            id: 'm3-fhs',
            category: 'Debt-to-Income Ratio',
            score: 35,
            status: 'Good' as const,
            explanation: 'Your DTI is in a good range.',
            weight: 0.3,
            displayOrder: 3,
          },
          {
            id: 'm4-fhs',
            category: 'Emergency Fund',
            score: 6,
            status: 'Fair' as const,
            explanation: 'Your emergency fund is okay, aiming for 3-6 months is better.',
            weight: 0.3,
            displayOrder: 4,
          },
        ],
        overallScore: 78,
        overallStatus: 'Good' as const,
      } as IFinancialHealthScorecardData
    } as Omit<IFinancialHealthScorecardWidget, 'createdAt'|'updatedAt'> & {id: string} 
  },
  insuranceCoverage: {
    component: InsuranceCoverageFormExt,
    icon: faShieldAlt, // Icon for the "Add Widget" list entry
    title: 'Insurance Coverage', // Title for the "Add Widget" list entry
    defaultData: { // Default data for a new widget instance
      id: generateId('widget-insurance'),
      type: 'insuranceCoverage',
      title: 'Insurance Policies', // Default title for the new widget instance
      icon: 'faShieldAlt', // Default icon string for the new widget instance
      columnSpan: 1,
      rowSpan: 1,
      data: { items: [] as IInsuranceCoverageItem[] }, // Data structure for insurance items
      showPremiums: true,
      showRenewalDates: true,
    } as Omit<IInsuranceCoverageWidget, 'createdAt' | 'updatedAt'> & { id: string }
  },
  checklist: {
    component: null as any, // Replace with a real form component when created
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
          task: 'Review monthly budget',
          isCompleted: false,
          displayOrder: 0,
        },
        {
          id: 'i2-cl',
          task: 'Plan retirement contributions',
          isCompleted: false,
          displayOrder: 1,
        },
      ] as IChecklistItem[],
    } as Omit<IChecklistWidget, 'createdAt' | 'updatedAt'> & { id: string },
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
        } as Widget; // Explicitly cast to Widget type
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
    const TypedActiveForm = ActiveForm as React.ComponentType<{ data: Widget; onDataChange: (data: Widget) => void; }>;
    
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