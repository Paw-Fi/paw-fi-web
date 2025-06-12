'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Widget, IMetricCardWidget, IProgressBarListWidget, ICountdownCardWidget, IDataListWidget, ITipCardWidget, IChecklistWidget, IDataListItem, IProgressBarListItem, ITipCardListItem, IChecklistItem, ICountdownCardData, IMetricCardItem } from './types/dashboard-data.typings'; 
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
  faTasks
} from '@fortawesome/free-solid-svg-icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Modal } from '../ui/modal';
import { IconSelector } from '../ui/icon-selector';

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
  const [formData, setFormData] = useState<IProgressBarListWidget>(() => {
    const itemsArray = widgetData.data || []; // widgetData.data is IProgressBarListData (the array itself)
    const processedItems = itemsArray.map((item: IProgressBarListItem, index: number) => ({
      ...item,
      id: item.id || `pbl-item-${Date.now()}-${index}`,
      displayOrder: item.displayOrder !== undefined ? item.displayOrder : index,
    })).sort((a: IProgressBarListItem, b: IProgressBarListItem) => (a.displayOrder || 0) - (b.displayOrder || 0));
    
    return {
      ...widgetData, // Spread the base widget props (id, title, type etc.)
      data: processedItems, // Assign the processed array to data
    };
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = formData.data.findIndex((item: IProgressBarListItem) => item.id === active.id);
      const newIndex = formData.data.findIndex((item: IProgressBarListItem) => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSortedItems = arrayMove(formData.data, oldIndex, newIndex);
        const updatedItemsWithOrder: IProgressBarListItem[] = newSortedItems.map((item: IProgressBarListItem, index: number) => ({
          ...item,
          displayOrder: index,
        }));

        const newItemsArray = updatedItemsWithOrder;
        // Clear sortBy to ensure manual displayOrder is respected
        const newData = { ...formData, data: newItemsArray, sortBy: undefined };
        setFormData(newData);
        onDataChange(newData);
      }
    }
  };

  const handleItemChange = (itemId: string, field: keyof Omit<IProgressBarListItem, 'id' | 'displayOrder'>, value: string | number) => {
    const updatedItems = formData.data.map((item: IProgressBarListItem) =>
      item.id === itemId ? { ...item, [field]: field === 'current' || field === 'max' ? Number(value) : value } : item
    );
    const newData = { ...formData, data: updatedItems };
    setFormData(newData);
    onDataChange(newData);
  };

  const handleAddItem = () => {
    const newItemId = `pbl-new-item-${Date.now()}`;
    const newItem: IProgressBarListItem = {
      id: newItemId,
      label: 'New Progress',
      current: 0, // Corrected from value
      max: 100,   // Corrected from maxValue
      color: '#3B82F6',
      displayOrder: formData.data.length,
    };
    const updatedItems = [...formData.data, newItem];
    const newData = { ...formData, data: updatedItems };
    setFormData(newData);
    onDataChange(newData);
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = formData.data
      .filter((item: IProgressBarListItem) => item.id !== itemId)
      .map((item: IProgressBarListItem, index: number) => ({ ...item, displayOrder: index }));
    const newData = { ...formData, data: updatedItems };
    setFormData(newData);
    onDataChange(newData);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-1">
        <SortableContext items={formData.data.map((i: IProgressBarListItem) => i.id)} strategy={verticalListSortingStrategy}>
          {formData.data.map((item: IProgressBarListItem) => (
            <SortableListItem key={item.id} id={item.id}>
              {/* Item Content Grid */}
              <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_minmax(60px,auto)_minmax(60px,auto)_minmax(70px,auto)_auto] items-end gap-x-2.5 gap-y-2 w-full">
                {/* Label Input */}
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor={`pbl-label-${item.id}`} className="text-xs mb-0.5 block">Label</Label>
                  <Input
                    id={`pbl-label-${item.id}`}
                    value={item.label}
                    onChange={(e) => handleItemChange(item.id, 'label', e.target.value)}
                    placeholder="Progress Label"
                    className="w-full text-sm h-9"
                  />
                </div>
                {/* Current Value Input */}
                <div className="min-w-[60px]">
                  <Label htmlFor={`pbl-current-${item.id}`} className="text-xs mb-0.5 block">Current</Label>
                  <Input
                    id={`pbl-current-${item.id}`}
                    type="number"
                    value={item.current} 
                    onChange={(e) => handleItemChange(item.id, 'current', parseInt(e.target.value, 10) || 0)}
                    placeholder="Val"
                    className="w-full text-sm h-9"
                  />
                </div>
                {/* Max Value Input */}
                <div className="min-w-[60px]">
                  <Label htmlFor={`pbl-max-${item.id}`} className="text-xs mb-0.5 block">Max</Label>
                  <Input
                    id={`pbl-max-${item.id}`}
                    type="number"
                    value={item.max} 
                    onChange={(e) => handleItemChange(item.id, 'max', parseInt(e.target.value, 10) || 100)}
                    placeholder="Max"
                    className="w-full text-sm h-9"
                  />
                </div>
                {/* Color Picker */}
                <div className="min-w-[70px]">
                  <Label htmlFor={`pbl-color-${item.id}`} className="text-xs mb-0.5 block">Color</Label>
                  <Input
                    id={`pbl-color-${item.id}`}
                    type="color"
                    value={item.color}
                    onChange={(e) => handleItemChange(item.id, 'color', e.target.value)}
                    className="w-full h-9 p-0.5 border-slate-300 dark:border-slate-600 rounded cursor-pointer"
                  />
                </div>
                {/* Remove Button */}
                <div className="flex items-center self-center sm:self-end h-9">
                  <Button
                    type="button"
                    variant="text"
                    size="sm" 
                    onClick={() => handleRemoveItem(item.id)}
                    aria-label="Remove progress bar item"
                    className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 p-2 h-full"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-4 w-4"/>
                  </Button>
                </div>
              </div>
            </SortableListItem>
          ))}
        </SortableContext>
      </div>
      <Button onClick={handleAddItem} variant="outline" size="sm"><FontAwesomeIcon icon={faPlus} className="mr-2" />Add Item</Button>
    </DndContext>
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
    </div>
  );
}

function MetricCardForm({ data: widgetData, onDataChange }: WidgetFormProps<IMetricCardWidget>) {
  const item: IMetricCardItem = (Array.isArray(widgetData.data) && widgetData.data[0]) || { id: 'metric-1', value: '', currency: '$', description: '' };

  const handleFieldChange = (field: keyof IMetricCardItem, value: any) => {
    onDataChange({ ...widgetData, data: [{ ...item, [field]: value }] });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Metric Card Settings</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="metric-description">Description</Label>
          <Input id="metric-description" value={item.description || ''} onChange={(e) => handleFieldChange('description', e.target.value)} placeholder="e.g., Total Balance" />
        </div>
        <div>
          <Label htmlFor="metric-value">Value</Label>
          <Input id="metric-value" value={item.value} onChange={(e) => handleFieldChange('value', e.target.value)} placeholder="e.g., 10,000" />
        </div>
        <div>
          <Label htmlFor="metric-currency">Currency</Label>
          <Input id="metric-currency" value={item.currency} onChange={(e) => handleFieldChange('currency', e.target.value)} placeholder="e.g., $" />
        </div>
        <div>
          <Label htmlFor="metric-trend">Trend</Label>
          <Input id="metric-trend" type="text" value={item.trend || ''} onChange={(e) => handleFieldChange('trend', e.target.value)} placeholder="up or down" />
        </div>
      </div>
    </div>
  );
}

// Props interface
interface WidgetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  widget: Widget;
  onSave: (updatedWidget: Widget) => void | Promise<void>; // Changed Omit to full Widget for simplicity, can be Omit if needed
}

// Main Component
export function WidgetEditModal({ isOpen, onClose, widget, onSave }: WidgetEditModalProps): JSX.Element {
  const [formData, setFormData] = useState<Widget>(widget);

  // This useEffect handles updates if the `widget` prop instance itself changes while the modal is open.
  useEffect(() => {
    setFormData(widget);
  }, [widget]);

  const handleFormChange = (field: keyof Widget, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }) as Widget);
  };

  // This function is passed to the specific form components (DataListForm, etc.)
  // Those forms will call it with the full, updated specific widget object (e.g., IDataListWidget)
  const handleDataChange = (updatedSubFormWidget: Widget) => { 
    setFormData(updatedSubFormWidget);
  };

  const widgetTypeConfig = useMemo(() => ({
    'DataList': { icon: faList, title: 'Data List' },
    'ProgressBarList': { icon: faTasks, title: 'Progress Bar List' }, // faTasks or faPercent
    'TipCard': { icon: faLightbulb, title: 'Tip Card' },
    'CountdownCard': { icon: faCalendarAlt, title: 'Countdown' }, // faCalendarAlt or faCalendar
    'MetricCard': { icon: faChartLine, title: 'Metric Card' },
    'Checklist': { icon: faCheckSquare, title: 'Checklist' }, // faCheckSquare or faListCheck
    // Add other widget types here
  }), []);

  const currentConfig = widgetTypeConfig[widget.type as keyof typeof widgetTypeConfig] || { icon: faCog, title: 'Widget Settings' };
  const formTitle = currentConfig.title;
  const formIcon = currentConfig.icon;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
            await onSave(formData); // formData now holds the complete updated widget
      onClose();
    } catch (error) {
      console.error('Error saving widget:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [widget, formData, onSave, onClose]);

  const renderActiveForm = () => {
    if (!formData) return null;
    switch (formData.type) {
      case 'dataList':
        return <DataListForm data={formData as IDataListWidget} onDataChange={handleDataChange as (data: IDataListWidget) => void} />;
      case 'progressBarList':
        return <ProgressBarListForm data={formData as IProgressBarListWidget} onDataChange={handleDataChange as (data: IProgressBarListWidget) => void} />;
      case 'tipCard':
        return <TipCardForm data={formData as ITipCardWidget} onDataChange={handleDataChange as (data: ITipCardWidget) => void} />;
      case 'countdownCard':
        return <CountdownCardForm data={formData as ICountdownCardWidget} onDataChange={handleDataChange as (data: ICountdownCardWidget) => void} />;
      case 'metricCard':
        return <MetricCardForm data={formData as IMetricCardWidget} onDataChange={handleDataChange as (data: IMetricCardWidget) => void} />;
      case 'checklist':
        // Assuming ChecklistForm exists and is imported, and IChecklistWidget is imported
        // return <ChecklistForm data={formData as IChecklistWidget} onDataChange={handleDataChange as (data: IChecklistWidget) => void} />;
        return null; // Placeholder for ChecklistForm
      default:
        // Optionally, handle unknown widget types or return a default message
        // const _exhaustiveCheck: never = formData.type;
        return <p>Unsupported widget type: {formData.type}</p>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col">
        <header className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <FontAwesomeIcon icon={formIcon} className="text-xl text-gray-500" />
            <h2 className="text-xl font-semibold">Edit {formTitle}</h2>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto py-6 space-y-6">
          {/* General Settings - now part of the single column flow */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="widget-title">Widget Title</Label>
              <Input id="widget-title" value={formData.title || ''} onChange={(e) => handleFormChange('title', e.target.value)} placeholder="Enter widget title" />
            </div>
            <div>
              <Label>Icon</Label>
              <IconSelector selectedIcon={formData.icon || 'faCog'} onSelectIcon={(iconName) => handleFormChange('icon', iconName)} />
            </div>
          </div>

          {/* Widget-Specific Settings - now part of the single column flow */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {renderActiveForm()}
          </div>
        </main>

        <footer className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
        </footer>
      </form>
    </Modal>
  );
}