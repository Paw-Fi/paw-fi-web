import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { IEnhancedSavingsGoalsWidget, IEnhancedSavingsGoalItem } from '../types/dashboard-data.typings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import { DndContext, DragEndEvent, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string;
  children: (listeners: any, attributes: any) => React.ReactNode;
}

// Sortable item component
function SortableItem({ id, children }: SortableItemProps) {
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
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children(listeners, { ...attributes, style: { cursor: 'grab' } })}
    </div>
  );
}

interface WidgetFormProps<T> {
  data: T;
  onDataChange: (data: T) => void;
}

export const EnhancedSavingsGoalsForm: React.FC<WidgetFormProps<IEnhancedSavingsGoalsWidget>> = ({ data: widgetData, onDataChange }) => {
  const [items, setItems] = useState<IEnhancedSavingsGoalItem[]>(widgetData.data || []);
  const [showGroupByCategory, setShowGroupByCategory] = useState<boolean>(widgetData.groupByCategory || false);
  const [showProgress, setShowProgress] = useState<boolean>(widgetData.showProgress || true);

  useEffect(() => {
    setItems(widgetData.data || []);
    setShowGroupByCategory(widgetData.groupByCategory || false);
    setShowProgress(widgetData.showProgress || true);
  }, [widgetData.data, widgetData.groupByCategory, widgetData.showProgress]);

  const propagateChangesUp = (updatedItems: IEnhancedSavingsGoalItem[], groupByCategory?: boolean, showProgress?: boolean) => {
    onDataChange({ 
      ...widgetData, 
      data: updatedItems,
      groupByCategory: groupByCategory !== undefined ? groupByCategory : widgetData.groupByCategory,
      showProgress: showProgress !== undefined ? showProgress : widgetData.showProgress
    });
  };

  const handleItemChange = (index: number, field: keyof IEnhancedSavingsGoalItem, value: any) => {
    if (index < 0 || index >= items.length) return;
    
    const newItems = [...items];
    const updatedItem = { ...newItems[index], [field]: value };
    newItems[index] = updatedItem;
    
    // Update local state immediately for better UX
    setItems(newItems);
    
    // Propagate changes up to parent
    propagateChangesUp(newItems);
  };

  const addItem = useCallback(() => {
    const newItem: IEnhancedSavingsGoalItem = {
      id: `esg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: 'New Savings Goal',
      savedAmount: 0,
      targetAmount: 1000,
      estimatedCompletionDate: 'Dec 2025',
      status: 'On Track',
      category: 'General',
      priority: 'medium',
      displayOrder: items.length,
    };
    
    const newItems = [...items, newItem];
    
    // Update local state immediately for better UX
    setItems(newItems);
    
    // Propagate changes up to parent
    propagateChangesUp(newItems);
  }, [items]);

  const removeItem = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return;
    
    const newItems = [...items];
    newItems.splice(index, 1);
    
    // Update displayOrder for remaining items
    const reorderedItems = newItems.map((item, idx) => ({
      ...item,
      displayOrder: idx
    }));
    
    // Update local state immediately for better UX
    setItems(reorderedItems);
    
    // Propagate changes up to parent
    propagateChangesUp(reorderedItems);
  }, [items]);

  const handleToggleGroupByCategory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setShowGroupByCategory(newValue);
    propagateChangesUp(items, newValue, showProgress);
  };

  const handleToggleShowProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setShowProgress(newValue);
    propagateChangesUp(items, showGroupByCategory, newValue);
  };

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

  const handleDragStart = useCallback(() => {
    // Optional: Add any drag start logic here
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id.toString());
      const newIndex = items.findIndex((item) => item.id === over.id.toString());
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrderedItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          displayOrder: index
        }));
        
        // Update local state immediately for better UX
        setItems(newOrderedItems);
        
        // Propagate changes up to parent
        propagateChangesUp(newOrderedItems);
      }
    }
  }, [items]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="group-by-category"
            checked={showGroupByCategory}
            onChange={handleToggleGroupByCategory}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <Label htmlFor="group-by-category">Group by Category</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="show-progress"
            checked={showProgress}
            onChange={handleToggleShowProgress}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <Label htmlFor="show-progress">Show Progress Bars</Label>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Savings Goals</h3>
          <Button 
            onClick={addItem} 
            size="sm" 
            className="flex items-center gap-1"
          >
            <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
            <span>Add Goal</span>
          </Button>
        </div>

        {sortedItems.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No savings goals added yet. Click the button above to add one.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {}}
          >
            <SortableContext
              items={sortedItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {sortedItems.map((item, index) => (
                  <SortableItem key={item.id} id={item.id}>
                    {(listeners: any, attributes: any) => (
                      <div className="border rounded-lg bg-card">
                        <div className="flex items-center gap-2 p-3 border-b">
                          <button
                            type="button"
                            {...listeners}
                            {...attributes}
                            className="p-2 rounded-md hover:bg-accent"
                          >
                            <FontAwesomeIcon icon={faGripVertical} className="text-muted-foreground" />
                          </button>
                          <div className="flex-1 font-medium">{item.name || 'Unnamed Goal'}</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-destructive hover:text-destructive h-9 w-9 p-0"
                            title="Remove goal"
                          >
                            <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`name-${item.id}`}>Goal Name</Label>
                            <Input
                              id={`name-${item.id}`}
                              value={item.name}
                              onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                              placeholder="e.g., House Down Payment"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`category-${item.id}`}>Category</Label>
                            <Input
                              id={`category-${item.id}`}
                              value={item.category || ''}
                              onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                              placeholder="e.g., Home, Travel, Emergency"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`saved-${item.id}`}>Saved Amount</Label>
                            <Input
                              id={`saved-${item.id}`}
                              type="number"
                              value={item.savedAmount}
                              onChange={(e) => handleItemChange(index, 'savedAmount', Number(e.target.value))}
                              placeholder="Current saved amount"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`target-${item.id}`}>Target Amount</Label>
                            <Input
                              id={`target-${item.id}`}
                              type="number"
                              value={item.targetAmount}
                              onChange={(e) => handleItemChange(index, 'targetAmount', Number(e.target.value))}
                              placeholder="Goal amount"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`date-${item.id}`}>Estimated Completion</Label>
                            <Input
                              id={`date-${item.id}`}
                              value={item.estimatedCompletionDate}
                              onChange={(e) => handleItemChange(index, 'estimatedCompletionDate', e.target.value)}
                              placeholder="e.g., Dec 2025"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`status-${item.id}`}>Status</Label>
                            <select
                              id={`status-${item.id}`}
                              value={item.status}
                              onChange={(e) => handleItemChange(index, 'status', e.target.value as 'On Track' | 'Ahead' | 'Behind')}
                              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 h-9 px-2"
                            >
                              <option value="On Track">On Track</option>
                              <option value="Ahead">Ahead</option>
                              <option value="Behind">Behind</option>
                            </select>
                          </div>
                          
                          <div>
                            <Label htmlFor={`priority-${item.id}`}>Priority</Label>
                            <select
                              id={`priority-${item.id}`}
                              value={item.priority || 'medium'}
                              onChange={(e) => handleItemChange(index, 'priority', e.target.value as 'low' | 'medium' | 'high')}
                              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 h-9 px-2"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                          
                          <div>
                            <Label htmlFor={`auto-contribution-${item.id}`}>Monthly Auto-Contribution</Label>
                            <Input
                              id={`auto-contribution-${item.id}`}
                              type="number"
                              value={item.autoContribution || 0}
                              onChange={(e) => handleItemChange(index, 'autoContribution', Number(e.target.value))}
                              placeholder="Monthly contribution"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};
