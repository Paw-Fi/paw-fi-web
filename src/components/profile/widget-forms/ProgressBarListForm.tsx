import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { IProgressBarListWidget, IProgressBarListItem, IProgressBarListData } from '../types/dashboard-data.typings';
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

export const ProgressBarListForm: React.FC<WidgetFormProps<IProgressBarListWidget>> = ({ data: widgetData, onDataChange }) => {
  const [items, setItems] = useState<IProgressBarListItem[]>(widgetData.data || []);

  useEffect(() => {
    setItems(widgetData.data || []);
  }, [widgetData.data]);

  const propagateChangesUp = (updatedItems: IProgressBarListItem[]) => {
    onDataChange({ ...widgetData, data: updatedItems });
  };

  const handleItemChange = (index: number, field: keyof IProgressBarListItem, value: any) => {
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
    const newItem: IProgressBarListItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label: 'New Goal',
      current: 0,
      max: 100,
      color: '#3b82f6',
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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id.toString());
      const newIndex = items.findIndex((item) => item.id === over.id.toString());
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrderedItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          displayOrder: index,
        }));
        
        // Update local state immediately
        setItems(newOrderedItems);
        
        // Propagate changes up to parent
        propagateChangesUp(newOrderedItems);
      }
    }
  }, [items]);

  const handleDragStart = () => {
    // setIsDragging(true);
  };

  // Sort items by displayOrder before rendering
  const sortedItems = [...items].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Widget Title</Label>
        <Input
          value={widgetData.title || ''}
          onChange={(e) => onDataChange({
            ...widgetData,
            title: e.target.value,
          })}
          placeholder="Enter widget title"
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Progress Bars</h3>
          <Button type="button" onClick={addItem} size="sm">
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add Progress Bar
          </Button>
        </div>

        {sortedItems.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No progress bars added yet. Click the button above to add one.
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
                      <div className="flex items-center gap-2 p-3 border rounded-lg bg-card">
                        <button
                          type="button"
                          {...listeners}
                          {...attributes}
                          className="p-2 rounded-md hover:bg-accent"
                        >
                          <FontAwesomeIcon icon={faGripVertical} className="text-muted-foreground" />
                        </button>
                        
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor={`label-${item.id}`}>Label</Label>
                            <Input
                              id={`label-${item.id}`}
                              value={item.label}
                              onChange={(e) => handleItemChange(index, 'label', e.target.value)}
                              placeholder="Label"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`current-${item.id}`}>Current</Label>
                            <Input
                              id={`current-${item.id}`}
                              type="number"
                              value={item.current}
                              onChange={(e) => handleItemChange(index, 'current', Number(e.target.value))}
                              placeholder="Current"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`max-${item.id}`}>Max</Label>
                            <Input
                              id={`max-${item.id}`}
                              type="number"
                              value={item.max}
                              onChange={(e) => handleItemChange(index, 'max', Number(e.target.value))}
                              placeholder="Max"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={item.color}
                            onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                            className="w-10 h-10 p-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-destructive hover:text-destructive h-9 w-9 p-0"
                            title="Remove item"
                          >
                            <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                          </Button>
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
}
