'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Widget, IDataListItem, IProgressBarListItem, ICountdownCardData, IMetricCardItem } from './types/dashboard-data.typings';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faPlus, faCalendar, faChartLine, faList, faPercent } from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';
import { Modal } from '../ui/modal';
import { IconSelector } from '../ui/icon-selector';

// Type definitions
type WidgetData = Widget['data'];
interface WidgetFormProps {
  data: any;
  onDataChange: (data: any) => void;
}

// Sub-components for editing different widget types

function DataListForm({ data, onDataChange }: WidgetFormProps) {
  const items: IDataListItem[] = Array.isArray(data) ? data : [];
  
  const handleItemChange = (index: number, field: keyof IDataListItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onDataChange(newItems);
  };

  const addItem = () => onDataChange([...items, { id: `item-${Date.now()}`, label: '', value: '', currency: '$' }]);
  const removeItem = (index: number) => onDataChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Data List Items</h3>
      {items.map((item, index) => (
        <motion.div key={item.id || index} layout className="flex items-center space-x-2 p-2 border rounded-lg">
          <Input value={item.label} onChange={(e) => handleItemChange(index, 'label', e.target.value)} placeholder="Label" className="flex-grow" />
          <Input value={item.value} onChange={(e) => handleItemChange(index, 'value', e.target.value)} placeholder="Value" className="flex-grow" />
          <Button variant="text" size="sm" onClick={() => removeItem(index)}><FontAwesomeIcon icon={faTrashAlt} className="text-red-500" /></Button>
        </motion.div>
      ))}
      <Button onClick={addItem} variant="outline" size="sm"><FontAwesomeIcon icon={faPlus} className="mr-2" />Add Item</Button>
    </div>
  );
}

function ProgressBarListForm({ data, onDataChange }: WidgetFormProps) {
  const items: IProgressBarListItem[] = Array.isArray(data) ? data : [];

  const handleItemChange = (index: number, field: keyof IProgressBarListItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onDataChange(newItems);
  };

  const addItem = () => onDataChange([...items, { id: `item-${Date.now()}`, label: '', current: 0, max: 100 }]);
  const removeItem = (index: number) => onDataChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Progress Bar Items</h3>
      {items.map((item, index) => (
        <motion.div key={item.id || index} layout className="grid grid-cols-3 gap-2 items-center p-2 border rounded-lg">
          <Input value={item.label} onChange={(e) => handleItemChange(index, 'label', e.target.value)} placeholder="Label" className="col-span-3" />
          <Input type="number" value={item.current} onChange={(e) => handleItemChange(index, 'current', parseInt(e.target.value, 10))} placeholder="Current" />
          <Input type="number" value={item.max} onChange={(e) => handleItemChange(index, 'max', parseInt(e.target.value, 10))} placeholder="Max" />
          <Button variant="text" size="sm" onClick={() => removeItem(index)}><FontAwesomeIcon icon={faTrashAlt} className="text-red-500" /></Button>
        </motion.div>
      ))}
      <Button onClick={addItem} variant="outline" size="sm"><FontAwesomeIcon icon={faPlus} className="mr-2" />Add Item</Button>
    </div>
  );
}

function CountdownCardForm({ data, onDataChange }: WidgetFormProps) {
  const countdownData = data as ICountdownCardData;
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Countdown Settings</h3>
      <div>
        <Label htmlFor="countdown-title">Title</Label>
        <Input id="countdown-title" value={countdownData?.title || ''} onChange={(e) => onDataChange({ ...countdownData, title: e.target.value })} placeholder="Event Title" />
      </div>
      <div>
        <Label htmlFor="countdown-date">Target Date</Label>
        <Input id="countdown-date" type="date" value={countdownData?.targetDate ? new Date(countdownData.targetDate).toISOString().split('T')[0] : ''} onChange={(e) => onDataChange({ ...countdownData, targetDate: e.target.value })} />
      </div>
    </div>
  );
}

function MetricCardForm({ data, onDataChange }: WidgetFormProps) {
  const item: IMetricCardItem = (Array.isArray(data) && data[0]) || { id: 'metric-1', value: '', currency: '$', description: '' };

  const handleFieldChange = (field: keyof IMetricCardItem, value: any) => {
    onDataChange([{ ...item, id: item.id || `metric-${Date.now()}`, [field]: value }]);
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
  onSave: (updatedWidget: Omit<Widget, 'id'> & { id?: string }) => void | Promise<void>;
}

// Main Component
export function WidgetEditModal({ isOpen, onClose, widget, onSave }: WidgetEditModalProps): JSX.Element {
  const [formData, setFormData] = useState<Omit<Widget, 'id' | 'type' | 'columnSpan'>>({ title: '', icon: '', data: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (widget) {
      setFormData({
        title: widget.title || '',
        icon: widget.icon || 'faChartLine',
        data: widget.data,
      });
    }
  }, [widget]);

  const handleFormChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDataChange = (newData: WidgetData) => {
    handleFormChange('data', newData);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updatedWidget = {
        ...widget,
        ...formData,
      };
      await onSave(updatedWidget);
      onClose();
    } catch (error) {
      console.error('Error saving widget:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [widget, formData, onSave, onClose]);

  const widgetTypeConfig = useMemo(() => ({
    'dataList': { icon: faList, title: 'Data List', component: DataListForm },
    'progressBarList': { icon: faPercent, title: 'Progress Bar List', component: ProgressBarListForm },
    'countdownCard': { icon: faCalendar, title: 'Countdown', component: CountdownCardForm },
    'metricCard': { icon: faChartLine, title: 'Metric Card', component: MetricCardForm },
  }), []);

  const { component: EditFormComponent, title: formTitle, icon: formIcon } = widgetTypeConfig[widget.type as keyof typeof widgetTypeConfig] || { component: null, title: 'Widget', icon: faChartLine };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col">
        <header className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <FontAwesomeIcon icon={formIcon} className="text-xl text-gray-500" />
            <h2 className="text-xl font-semibold">Edit {formTitle}</h2>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: General Settings */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="widget-title">Widget Title</Label>
              <Input id="widget-title" value={formData.title} onChange={(e) => handleFormChange('title', e.target.value)} placeholder="Enter widget title" />
            </div>
            <div>
              <Label>Icon</Label>
              <IconSelector selectedIcon={formData.icon} onSelectIcon={(icon) => handleFormChange('icon', icon)} />
            </div>
          </div>

          {/* Right Column: Widget-Specific Settings */}
          <div className="md:border-l md:pl-6 dark:border-gray-700">
            {EditFormComponent && <EditFormComponent data={formData.data} onDataChange={handleDataChange} />}
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