import { faGripVertical, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { IChecklistItem, IChecklistWidget } from '../types/dashboard-data.typings';
import type { WidgetFormProps } from './types';

interface SortableChecklistItemProps {
  item: IChecklistItem;
  index: number;
  onItemChange: (index: number, field: keyof IChecklistItem, value: string | boolean) => void;
  onRemoveItem: (index: number) => void;
}

function SortableChecklistItem({ item, index, onItemChange, onRemoveItem }: SortableChecklistItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center space-x-2 bg-moneko-background p-2 rounded-md shadow-sm border">
      <button {...attributes} {...listeners} className="cursor-grab p-2 text-gray-500 hover:text-gray-700">
        <FontAwesomeIcon icon={faGripVertical} />
      </button>
      <Checkbox
        id={`item-completed-${item.id}`}
        checked={item.isCompleted}
        onCheckedChange={(checked) => onItemChange(index, 'isCompleted', !!checked)}
        aria-label={`Mark item ${item.task} as completed`}
      />
      <Input
        type="text"
        value={item.task}
        onChange={(e) => onItemChange(index, 'task', e.target.value)}
        placeholder="Checklist item description"
        className="flex-grow"
        aria-label={`Edit item ${item.task}`}
      />
     <FontAwesomeIcon
                      type="button"
                      icon={faTrash}
                      onClick={() => onRemoveItem(index)}
                      className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                    
                    />
    </div>
  );
}

export function ChecklistForm({ data: widgetData, onDataChange }: WidgetFormProps<IChecklistWidget>) {
  const [items, setItems] = useState<IChecklistItem[]>(widgetData.data?.items || []);
  const [showCompleted, setShowCompleted] = useState<boolean>(widgetData.data?.showCompleted || false);
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'alphabetical' | 'custom'>(widgetData.data?.sortBy || 'custom');

  useEffect(() => {
    // Ensure displayOrder is consistent if not already set or if items are new
    const needsDisplayOrderUpdate = items.some((item, idx) => item.displayOrder !== idx);
    if (needsDisplayOrderUpdate || items.length > 0 && items.every(item => typeof item.displayOrder === 'undefined')) {
      const updatedItemsWithOrder = items.map((item, idx) => ({ ...item, displayOrder: idx }));
      if (JSON.stringify(items) !== JSON.stringify(updatedItemsWithOrder)) {
        setItems(updatedItemsWithOrder);
      }
    }
  }, [items]); // Removed widgetData from dependencies to avoid loop

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleItemChange = (index: number, field: keyof IChecklistItem, value: string | boolean) => {
    const newItems = [...items];
    if (index >= 0 && index < newItems.length) {
        const currentItem = newItems[index];
        if (field in currentItem) {
            (currentItem[field] as string | boolean) = value;
             setItems(newItems);
             onDataChange({ 
               ...widgetData, 
               data: {
                 items: newItems,
                 showCompleted,
                 sortBy
               }
             });
        } else {
            console.warn(`Field ${field} not found in item at index ${index}`);
        }
    } else {
        console.warn(`Invalid index ${index} for items array of length ${newItems.length}`);
    }
  };

  const addItem = () => {
    const newItem: IChecklistItem = {
      id: uuidv4(),
      task: '',
      isCompleted: false,
      displayOrder: items.length, // Assign next displayOrder
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    onDataChange({ 
      ...widgetData, 
      data: {
        items: newItems,
        showCompleted,
        sortBy
      }
    });
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index).map((item, idx) => ({ ...item, displayOrder: idx })); // Re-index displayOrder
    setItems(newItems);
    onDataChange({ 
      ...widgetData, 
      data: {
        items: newItems,
        showCompleted,
        sortBy
      }
    });
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.id === active.id.toString());
        const newIndex = currentItems.findIndex((item) => item.id === over.id.toString());
        const reorderedItems = arrayMove(currentItems, oldIndex, newIndex);
        const finalItems = reorderedItems.map((item, index) => ({ ...item, displayOrder: index }));
        onDataChange({ 
          ...widgetData, 
          data: {
            items: finalItems,
            showCompleted,
            sortBy
          }
        });
        return finalItems;
      });
    }
  }, [onDataChange, widgetData, showCompleted, sortBy]);

  return (
    <div className="space-y-4">
      <Label className="text-lg font-semibold">Checklist Items</Label>
      {items.length === 0 && (
        <p className="text-sm text-gray-500">No items in this checklist yet. Add some below!</p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableChecklistItem
                key={item.id}
                item={item}
                index={index}
                onItemChange={handleItemChange}
                onRemoveItem={removeItem}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button type="button" variant="outline" onClick={addItem} className="mt-4">
        <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Item
      </Button>
    </div>
  );
}
