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

export const cashFlowFrequencies: { value: ICashFlowEntry['frequency']; label: string }[] = [
  { value: 'one-time', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

type EntryType = 'inflows' | 'outflows';

export function QuickCashFlowSummaryForm({ data: widgetData, onDataChange }: WidgetFormProps<IQuickCashFlowSummaryWidget>) {
  const cashFlowData = widgetData.data || { inflows: [], outflows: [], projectedPeriod: 'Monthly' };
  const [isDragging, setIsDragging] = useState<EntryType | null>(null);
  
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

  const handleEntryChange = (entryType: EntryType, index: number, field: keyof ICashFlowEntry, value: string | number | boolean) => {
    const currentEntries = cashFlowData[entryType] ?? [];
    const newEntries = [...currentEntries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    onDataChange({
      ...widgetData,
      data: {
        ...cashFlowData,
        [entryType]: newEntries,
      },
    });
  };

  const addEntry = useCallback((entryType: EntryType) => {
    const newEntry: ICashFlowEntry = {
      id: `${entryType}-entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: entryType === 'inflows' ? 'New Income' : 'New Expense',
      value: 0,
      frequency: 'monthly',
      isRecurring: true,
    };
    
    const currentEntries = cashFlowData[entryType] ?? [];
    onDataChange({
      ...widgetData,
      data: {
        ...cashFlowData,
        [entryType]: [...currentEntries, newEntry],
      },
    });
  }, [cashFlowData, widgetData, onDataChange]);

  const removeEntry = useCallback((entryType: EntryType, index: number) => {
    const currentEntries = cashFlowData[entryType] ?? [];
    const newEntries = [...currentEntries];
    newEntries.splice(index, 1);
    onDataChange({
      ...widgetData,
      data: {
        ...cashFlowData,
        [entryType]: newEntries,
      },
    });
  }, [cashFlowData, widgetData, onDataChange]);

  const handleProjectedPeriodChange = (value: string) => {
    onDataChange({
      ...widgetData,
      data: {
        ...cashFlowData,
        projectedPeriod: value,
      },
    });
  };

  const handleDragEnd = useCallback((entryType: EntryType, event: DragEndEvent) => {
    const { active, over } = event;
    const currentEntries = cashFlowData[entryType] ?? [];
    
    if (over && active.id !== over.id) {
      const oldIndex = currentEntries.findIndex((item: ICashFlowEntry) => item.id === active.id);
      const newIndex = currentEntries.findIndex((item: ICashFlowEntry) => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedEntries = arrayMove(currentEntries, oldIndex, newIndex);
        onDataChange({
          ...widgetData,
          data: {
            ...cashFlowData,
            [entryType]: reorderedEntries,
          },
        });
      }
    }
    setIsDragging(null);
  }, [cashFlowData, widgetData, onDataChange]);

  const handleDragStart = (entryType: EntryType) => {
    setIsDragging(entryType);
  };

  const safeInflows = cashFlowData.inflows ?? [];
  const safeOutflows = cashFlowData.outflows ?? [];

  const totalIncome = safeInflows
    .reduce((sum: number, entry: ICashFlowEntry) => sum + (Number(entry.value) || 0), 0);

  const totalExpenses = safeOutflows
    .reduce((sum: number, entry: ICashFlowEntry) => sum + (Number(entry.value) || 0), 0);

  const netCashFlow = totalIncome - totalExpenses;

  const renderEntryList = (entryType: EntryType, entries: ICashFlowEntry[]) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="capitalize">{entryType}</Label>
        <Button type="button" onClick={() => addEntry(entryType)} size="sm" variant="outline">
          <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" /> Add {entryType === 'inflows' ? 'Income' : 'Expense'}
        </Button>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => handleDragStart(entryType)}
        onDragEnd={(event) => handleDragEnd(entryType, event)}
      >
        <SortableContext items={entries.map((i: ICashFlowEntry) => i.id)} strategy={verticalListSortingStrategy}>
          <div className={`space-y-3 p-3 border rounded-md ${isDragging === entryType ? 'bg-blue-50/50' : ''}`}>
            {entries.map((entry: ICashFlowEntry, index: number) => (
              <SortableCashFlowItem key={entry.id} id={entry.id}>
                {(listeners, attributes) => (
                  <div className="p-3 bg-white border rounded-md shadow-sm flex items-start space-x-3">
                    <button
                      {...listeners}
                      className="p-2 text-gray-500 hover:text-gray-700 cursor-grab touch-none"
                      aria-label="Drag to reorder"
                    >
                      <FontAwesomeIcon icon={faGripVertical} />
                    </button>
                    <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`${entryType}-title-${entry.id}`}>Title</Label>
                        <Input
                          id={`${entryType}-title-${entry.id}`}
                          value={entry.title}
                          onChange={(e) => handleEntryChange(entryType, index, 'title', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${entryType}-value-${entry.id}`}>Value</Label>
                        <Input
                          id={`${entryType}-value-${entry.id}`}
                          type="number"
                          value={entry.value}
                          onChange={(e) => handleEntryChange(entryType, index, 'value', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`${entryType}-frequency-${entry.id}`}>Frequency</Label>
                        <select
                          id={`${entryType}-frequency-${entry.id}`}
                          value={entry.frequency}
                          onChange={(e) => handleEntryChange(entryType, index, 'frequency', e.target.value as ICashFlowEntry['frequency'])}
                          className="flex h-10 w-full rounded-md border border-input bg-moneko-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                              id={`${entryType}-recurring-${entry.id}`}
                              checked={!!entry.isRecurring} // Ensure boolean for checkbox
                              onChange={(e) => handleEntryChange(entryType, index, 'isRecurring', e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor={`${entryType}-recurring-${entry.id}`} className="text-sm font-medium">
                              Recurring
                            </Label>
                          </div>
                        </div>
                        
                        <FontAwesomeIcon
                      type="button"
                      icon={faTrash}
                      onClick={() => removeEntry(entryType, index)}
                      className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                    
                    />
                      </div>
                    </div>
                  </div>
                )}
              </SortableCashFlowItem>
            ))}
            {entries.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No {entryType} yet. Click the button above to add one.</p>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="projectedPeriod">Projected Period</Label>
        <Input
          id="projectedPeriod"
          type="text"
          value={cashFlowData.projectedPeriod || ''}
          onChange={(e) => handleProjectedPeriodChange(e.target.value)}
          placeholder="e.g., Monthly, Annually"
          className="w-full md:w-1/2"
        />
      </div>

      {renderEntryList('inflows', safeInflows)}
      {renderEntryList('outflows', safeOutflows)}
      
      <div className="p-4 bg-slate-50 rounded-lg shadow">
        <h4 className="font-semibold text-slate-800 mb-4 text-lg">Cash Flow Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-green-300 shadow-sm">
            <div className="text-sm text-gray-600">Total Income</div>
            <div className="text-xl font-bold text-green-600">${totalIncome.toFixed(2)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-red-300 shadow-sm">
            <div className="text-sm text-gray-600">Total Expenses</div>
            <div className="text-xl font-bold text-red-600">${totalExpenses.toFixed(2)}</div>
          </div>
          <div className={`bg-white p-4 rounded-lg border shadow-sm ${netCashFlow >= 0 ? 'border-green-300' : 'border-red-300'}
          }`}>
            <div className="text-sm text-gray-600">Net Cash Flow</div>
            <div className={`text-xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}
            }`}>
              {netCashFlow >= 0 ? '+' : ''}${netCashFlow.toFixed(2)} {/* Use netCashFlow directly, Math.abs not needed if sign is handled */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
