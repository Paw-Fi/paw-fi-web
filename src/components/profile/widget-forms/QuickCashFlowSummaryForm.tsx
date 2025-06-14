import React, { useState, useCallback } from 'react';
import { IQuickCashFlowSummaryWidget, IQuickCashFlowSummaryData, ICashFlowEntry } from '../types/dashboard-data.typings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import { WidgetFormProps } from './types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  UniqueIdentifier,
  DraggableSyntheticListeners,
  DraggableAttributes,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableCashFlowItemProps {
  id: UniqueIdentifier;
  children: (listeners: DraggableSyntheticListeners, attributes: DraggableAttributes) => React.ReactNode;
}

function SortableCashFlowItem({ id, children }: SortableCashFlowItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children(listeners, attributes)}
    </div>
  );
}

export const cashFlowFrequencies = [
  { value: 'one-time', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export function QuickCashFlowSummaryForm({ data: widgetData, onDataChange }: WidgetFormProps<IQuickCashFlowSummaryWidget>) {
  const cashFlowData = widgetData.data || { entries: [], startDate: new Date().toISOString().split('T')[0] };
  const [isDragging, setIsDragging] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleEntryChange = (index: number, field: keyof ICashFlowEntry, value: string | number | boolean) => {
    const newEntries = [...cashFlowData.entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    onDataChange({
      ...widgetData,
      data: {
        ...cashFlowData,
        entries: newEntries,
      },
    });
  };

  const addEntry = useCallback((type: 'income' | 'expense' = 'income') => {
    const newEntry: ICashFlowEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: type === 'income' ? 'New Income' : 'New Expense',
      amount: 0,
      type,
      frequency: 'monthly',
      isRecurring: true,
    };
    
    onDataChange({
      ...widgetData,
      data: {
        ...cashFlowData,
        entries: [...cashFlowData.entries, newEntry],
      },
    });
  }, [cashFlowData, widgetData, onDataChange]);

  const removeEntry = useCallback((index: number) => {
    const newEntries = [...cashFlowData.entries];
    newEntries.splice(index, 1);
    onDataChange({
      ...widgetData,
      data: {
        ...cashFlowData,
        entries: newEntries,
      },
    });
  }, [cashFlowData, widgetData, onDataChange]);

  const handleStartDateChange = (value: string) => {
    onDataChange({
      ...widgetData,
      data: {
        ...cashFlowData,
        startDate: value,
      },
    });
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = cashFlowData.entries.findIndex((item) => item.id === active.id);
      const newIndex = cashFlowData.entries.findIndex((item) => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newEntries = arrayMove(cashFlowData.entries, oldIndex, newIndex);
        
        onDataChange({
          ...widgetData,
          data: {
            ...cashFlowData,
            entries: newEntries,
          },
        });
      }
    }
    
    setIsDragging(false);
  }, [cashFlowData, widgetData, onDataChange]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const totalIncome = cashFlowData.entries
    .filter(entry => entry.type === 'income')
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

  const totalExpenses = cashFlowData.entries
    .filter(entry => entry.type === 'expense')
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

  const netCashFlow = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Start Date</Label>
        <Input
          type="date"
          value={cashFlowData.startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          className="w-48"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Cash Flow Entries</Label>
          <div className="space-x-2">
            <Button type="button" size="sm" variant="outline" onClick={() => addEntry('income')}>
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Add Income
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addEntry('expense')}>
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Add Expense
            </Button>
          </div>
        </div>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
        >
          <SortableContext 
            items={cashFlowData.entries.map(entry => entry.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {cashFlowData.entries.map((entry, index) => (
                <SortableCashFlowItem key={entry.id} id={entry.id}>
                  {(listeners, attributes) => (
                    <div 
                      className={`p-4 border rounded-lg bg-white ${isDragging ? 'shadow-md' : ''} ${
                        entry.type === 'income' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <button
                          type="button"
                          {...listeners}
                          {...attributes}
                          className="p-1 -ml-1 -mt-1 text-gray-400 hover:text-gray-600 cursor-move"
                        >
                          <FontAwesomeIcon icon={faGripVertical} />
                        </button>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={entry.name}
                              onChange={(e) => handleEntryChange(index, 'name', e.target.value)}
                              placeholder="Entry name"
                            />
                          </div>
                          
                          <div>
                            <Label>Amount</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500">$</span>
                              <Input
                                type="number"
                                value={entry.amount || ''}
                                onChange={(e) => handleEntryChange(index, 'amount', Number(e.target.value))}
                                placeholder="0.00"
                                className="pl-8"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label>Frequency</Label>
                            <select
                              value={entry.frequency}
                              onChange={(e) => handleEntryChange(index, 'frequency', e.target.value as any)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {cashFlowFrequencies.map((freq) => (
                                <option key={freq.value} value={freq.value}>
                                  {freq.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="flex items-end space-x-2">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 h-10">
                                <input
                                  type="checkbox"
                                  id={`recurring-${entry.id}`}
                                  checked={entry.isRecurring}
                                  onChange={(e) => handleEntryChange(index, 'isRecurring', e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor={`recurring-${entry.id}`} className="text-sm font-medium">
                                  Recurring
                                </Label>
                              </div>
                            </div>
                            
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeEntry(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </SortableCashFlowItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-4">Cash Flow Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded border border-green-200">
            <div className="text-sm text-gray-500">Total Income</div>
            <div className="text-xl font-bold text-green-700">${totalIncome.toFixed(2)}</div>
          </div>
          <div className="bg-white p-4 rounded border border-red-200">
            <div className="text-sm text-gray-500">Total Expenses</div>
            <div className="text-xl font-bold text-red-700">${totalExpenses.toFixed(2)}</div>
          </div>
          <div className={`bg-white p-4 rounded border ${
            netCashFlow >= 0 ? 'border-green-200' : 'border-red-200'
          }`}>
            <div className="text-sm text-gray-500">Net Cash Flow</div>
            <div className={`text-xl font-bold ${
              netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {netCashFlow >= 0 ? '+' : ''}${Math.abs(netCashFlow).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
