import React, { useState, useCallback } from 'react';
import { IDataListWidget, IDataListItem } from '../types/dashboard-data.typings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faGripVertical } from '@fortawesome/free-solid-svg-icons';
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

interface SortableDataListItemProps {
  id: UniqueIdentifier;
  children: (listeners: DraggableSyntheticListeners, attributes: DraggableAttributes) => React.ReactNode;
}

function SortableDataListItem({ id, children }: SortableDataListItemProps) {
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

interface WidgetFormProps<T = any> {
  data: T;
  onDataChange: (data: T) => void;
}

export function DataListForm({ data: widgetData, onDataChange }: WidgetFormProps<IDataListWidget>) {
  // Initialize data structure if it doesn't exist
  const initialData = widgetData.data || { items: [] };
  const initialItems: IDataListItem[] = initialData.items || [];
  
  // Ensure items are sorted by displayOrder initially for dnd-kit
  const [items, setItems] = useState<IDataListItem[]>(() => 
    [...initialItems].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
  );
  const [isDragging, setIsDragging] = useState(false);

  React.useEffect(() => {
    const sortedInitialItems = [...(widgetData.data?.items || [])].sort((a,b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    setItems(sortedInitialItems);
  }, [widgetData.data?.items]);

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
  
  const handleItemChange = (index: number, field: keyof IDataListItem, value: string) => {
    const newItems = items.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    setItems(newItems);
    onDataChange({ 
      ...widgetData, 
      data: {
        ...widgetData.data,
        items: newItems
      }
    });
  };

  const addItem = () => {
    const newItem: IDataListItem = { 
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, 
      label: '', 
      value: '', 
      currency: '$', 
      displayOrder: items.length 
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    onDataChange({ 
      ...widgetData, 
      data: {
        ...widgetData.data,
        items: newItems
      }
    });
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, displayOrder: idx }));
    setItems(newItems);
    onDataChange({ 
      ...widgetData, 
      data: {
        ...widgetData.data,
        items: newItems
      }
    });
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        let newOrderedItems = arrayMove(items, oldIndex, newIndex);
        newOrderedItems = newOrderedItems.map((item, idx) => ({ ...item, displayOrder: idx }));
        setItems(newOrderedItems);
        onDataChange({ 
          ...widgetData, 
          data: {
            ...widgetData.data,
            items: newOrderedItems
          }
        });
      }
    }
    setIsDragging(false);
  }, [items, onDataChange, widgetData]);

  const handleDragStart = () => setIsDragging(true);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={widgetData.title || ''}
          onChange={(e) => onDataChange({ ...widgetData, title: e.target.value })}
          placeholder="Enter title"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Tip (Optional)</Label>
        <Input
          value={widgetData.data?.tip || ''}
          onChange={(e) => onDataChange({ 
            ...widgetData, 
            data: {
              ...widgetData.data,
              tip: e.target.value
            }
          })}
          placeholder="Enter a helpful tip"
        />
      </div>
      
      <div className="flex items-center space-x-2 mb-4">
        <input
          type="checkbox"
          id="groupByCategory"
          checked={widgetData.data?.groupByCategory || false}
          onChange={(e) => onDataChange({ 
            ...widgetData, 
            data: {
              ...widgetData.data,
              groupByCategory: e.target.checked
            }
          })}
          className="h-4 w-4"
        />
        <Label htmlFor="groupByCategory">Group by category</Label>
      </div>
      
      <div className="flex items-center space-x-2 mb-4">
        <input
          type="checkbox"
          id="showTotals"
          checked={widgetData.data?.showTotals || false}
          onChange={(e) => onDataChange({ 
            ...widgetData, 
            data: {
              ...widgetData.data,
              showTotals: e.target.checked
            }
          })}
          className="h-4 w-4"
        />
        <Label htmlFor="showTotals">Show totals</Label>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Items</Label>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add Item
          </Button>
        </div>
        
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, index) => (
                <SortableDataListItem key={item.id} id={item.id}>
                  {(dndListeners, dndAttributes) => (
                    <div className={`flex items-center space-x-2 p-3 border rounded-lg bg-card ${isDragging ? 'shadow-md' : ''}`}>
                      <button type="button" {...dndListeners} {...dndAttributes} className="p-2 rounded-md hover:bg-accent cursor-move">
                        <FontAwesomeIcon icon={faGripVertical} className="text-muted-foreground" />
                      </button>
              <div className="flex-1 grid grid-cols-4 gap-2">
                <Input
                  value={item.label}
                  onChange={(e) => handleItemChange(index, 'label', e.target.value)}
                  placeholder="Label"
                />
                                <Input
                  value={item.value}
                  onChange={(e) => handleItemChange(index, 'value', e.target.value)}
                  placeholder="Value"
                  type="number"
                />
                <Input
                  value={item.currency || '$'}
                  onChange={(e) => handleItemChange(index, 'currency', e.target.value)}
                  placeholder="Curr."
                  className="max-w-[60px]"
                />
              </div>
              <FontAwesomeIcon
                      type="button"
                      icon={faTrash}
                      onClick={() => removeItem(index)}
                      className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                    
                    />
                    </div>
                  )}
                </SortableDataListItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
