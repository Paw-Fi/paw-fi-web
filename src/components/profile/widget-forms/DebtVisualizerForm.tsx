import React, { useState, useCallback } from 'react';
import { IDebtVisualizerWidget, IDebtItem, IDebtVisualizerData } from '../types/dashboard-data.typings';
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

interface SortableDebtItemProps {
  id: UniqueIdentifier;
  children: (listeners: DraggableSyntheticListeners, attributes: DraggableAttributes) => React.ReactNode;
}

function SortableDebtItem({ id, children }: SortableDebtItemProps) {
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

export const debtStrategyOptions = [
  { value: 'snowball', label: 'Snowball (smallest balance first)' },
  { value: 'avalanche', label: 'Avalanche (highest interest first)' },
  { value: 'custom', label: 'Custom order' },
];

export function DebtVisualizerForm({ data: widgetData, onDataChange }: WidgetFormProps<IDebtVisualizerWidget>) {
  const debtData = widgetData.data || { debts: [], strategy: 'snowball', monthlyPayment: 0 };
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

  const handleDebtChange = (index: number, field: keyof IDebtItem, value: string | number) => {
    const newDebts = [...debtData.debts];
    newDebts[index] = { ...newDebts[index], [field]: value };
    onDataChange({
      ...widgetData,
      data: {
        ...debtData,
        debts: newDebts,
      },
    });
  };

  const addDebt = useCallback(() => {
    const newDebt: IDebtItem = {
      id: `debt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `Debt ${debtData.debts.length + 1}`,
      balance: 0,
      interestRate: 0,
      minimumPayment: 0,
    };
    
    onDataChange({
      ...widgetData,
      data: {
        ...debtData,
        debts: [...debtData.debts, newDebt],
      },
    });
  }, [debtData, widgetData, onDataChange]);

  const removeDebt = useCallback((index: number) => {
    const newDebts = [...debtData.debts];
    newDebts.splice(index, 1);
    onDataChange({
      ...widgetData,
      data: {
        ...debtData,
        debts: newDebts,
      },
    });
  }, [debtData, widgetData, onDataChange]);

  const handleStrategyChange = (value: string) => {
    onDataChange({
      ...widgetData,
      data: {
        ...debtData,
        strategy: value as 'snowball' | 'avalanche' | 'custom',
      },
    });
  };

  const handleMonthlyPaymentChange = (value: number) => {
    onDataChange({
      ...widgetData,
      data: {
        ...debtData,
        monthlyPayment: value,
      },
    });
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = debtData.debts.findIndex((item) => item.id === active.id);
      const newIndex = debtData.debts.findIndex((item) => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newDebts = arrayMove(debtData.debts, oldIndex, newIndex);
        
        onDataChange({
          ...widgetData,
          data: {
            ...debtData,
            debts: newDebts,
            strategy: 'custom', // Switch to custom strategy when manually reordering
          },
        });
      }
    }
    
    setIsDragging(false);
  }, [debtData, widgetData, onDataChange]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const totalDebt = debtData.debts.reduce((sum, debt) => sum + (Number(debt.balance) || 0), 0);
  const totalMinimumPayment = debtData.debts.reduce((sum, debt) => sum + (Number(debt.minimumPayment) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Debt Payoff Strategy</Label>
        <div className="grid gap-2">
          {debtStrategyOptions.map((option) => (
            <label key={option.value} className="flex items-center space-x-2">
              <input
                type="radio"
                checked={debtData.strategy === option.value}
                onChange={() => handleStrategyChange(option.value)}
                className="text-blue-500"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Monthly Payment</Label>
          <div className="relative w-48">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <Input
              type="number"
              value={debtData.monthlyPayment || ''}
              onChange={(e) => handleMonthlyPaymentChange(Number(e.target.value))}
              placeholder="0.00"
              className="pl-8"
              min={totalMinimumPayment}
              step="0.01"
            />
          </div>
        </div>
        {totalMinimumPayment > 0 && (
          <p className="text-xs text-gray-500">
            Total minimum payments: ${totalMinimumPayment.toFixed(2)}/month
            {debtData.monthlyPayment > 0 && debtData.monthlyPayment < totalMinimumPayment && (
              <span className="text-red-500 ml-2">
                Warning: Below minimum payments (${totalMinimumPayment.toFixed(2)})
              </span>
            )}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Debts</Label>
          <Button type="button" size="sm" variant="outline" onClick={addDebt}>
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add Debt
          </Button>
        </div>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
        >
          <SortableContext 
            items={debtData.debts.map(debt => debt.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {debtData.debts.map((debt, index) => (
                <SortableDebtItem key={debt.id} id={debt.id}>
                  {(listeners, attributes) => (
                    <div 
                      className={`p-4 border rounded-lg bg-white ${isDragging ? 'shadow-md' : ''}`}
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
                              value={debt.name}
                              onChange={(e) => handleDebtChange(index, 'name', e.target.value)}
                              placeholder="Debt name"
                            />
                          </div>
                          
                          <div>
                            <Label>Balance</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500">$</span>
                              <Input
                                type="number"
                                value={debt.balance || ''}
                                onChange={(e) => handleDebtChange(index, 'balance', Number(e.target.value))}
                                placeholder="0.00"
                                className="pl-8"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label>Interest Rate</Label>
                            <div className="relative">
                              <Input
                                type="number"
                                value={debt.interestRate || ''}
                                onChange={(e) => handleDebtChange(index, 'interestRate', Number(e.target.value))}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                              />
                              <span className="absolute right-3 top-2 text-gray-500">%</span>
                            </div>
                          </div>
                          
                          <div>
                            <Label>Min. Payment</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500">$</span>
                              <Input
                                type="number"
                                value={debt.minimumPayment || ''}
                                onChange={(e) => handleDebtChange(index, 'minimumPayment', Number(e.target.value))}
                                placeholder="0.00"
                                className="pl-8"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDebt(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </Button>
                      </div>
                    </div>
                  )}
                </SortableDebtItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Debt Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-500">Total Debt</div>
            <div className="text-xl font-bold">${totalDebt.toFixed(2)}</div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-500">Total Minimum Payment</div>
            <div className="text-xl font-bold">${totalMinimumPayment.toFixed(2)}/month</div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-500">Number of Debts</div>
            <div className="text-xl font-bold">{debtData.debts.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
