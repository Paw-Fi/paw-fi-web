import React, { useState, useCallback } from 'react';
import { ITipCardWidget, ITipCardListItem } from '../types/dashboard-data.typings';
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

interface SortableTipCardItemProps {
  id: UniqueIdentifier;
  children: (listeners: DraggableSyntheticListeners, attributes: DraggableAttributes) => React.ReactNode;
}

function SortableTipCardItem({ id, children }: SortableTipCardItemProps) {
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

export function TipCardForm({ data: widgetData, onDataChange }: WidgetFormProps<ITipCardWidget>) {
  const tips = widgetData.data?.tips || [];
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

  const handleTipChange = (index: number, field: keyof ITipCardListItem, value: string) => {
    const newTips = [...tips];
    newTips[index] = { ...newTips[index], [field]: value };
    onDataChange({
      ...widgetData,
      data: {
        ...widgetData.data,
        tips: newTips,
      },
    });
  };

  const addTip = useCallback(() => {
    const newTip: ITipCardListItem = {
      id: `tip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: `Tip ${tips.length + 1}`,
      content: '',
      image: '',
      link: '',
      displayOrder: tips.length,
    };
    
    onDataChange({
      ...widgetData,
      data: {
        ...widgetData.data,
        items: [...tips, newTip],
      },
    });
  }, [tips, widgetData, onDataChange]);

  const removeTip = useCallback((index: number) => {
    const newTips = [...tips];
    newTips.splice(index, 1);
    onDataChange({
      ...widgetData,
      data: {
        ...widgetData.data,
        tips: newTips,
      },
    });
  }, [tips, widgetData, onDataChange]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = tips.findIndex((tip) => tip.id === active.id);
      const newIndex = tips.findIndex((tip) => tip.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newTips = arrayMove(tips, oldIndex, newIndex).map((tip, index) => ({
          ...tip,
          displayOrder: index,
        }));
        
        onDataChange({
          ...widgetData,
          data: {
            ...widgetData.data,
            tips: newTips,
          },
        });
      }
    }
    
    setIsDragging(false);
  }, [tips, widgetData, onDataChange]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Tips</Label>
          <Button type="button" size="sm" variant="outline" onClick={addTip}>
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add Tip
          </Button>
        </div>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
        >
          <SortableContext 
            items={tips.map((tip: ITipCardListItem) => tip.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {tips.map((tip, index) => (
                <SortableTipCardItem key={tip.id} id={tip.id}>
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
                        
                        <div className="flex-1 space-y-3">
                          <div>
                            <Label>Tip Title</Label>
                            <Input
                              value={tip.title}
                              onChange={(e) => handleTipChange(index, 'title', e.target.value)}
                              placeholder="Enter tip title"
                            />
                          </div>
                          
                          <div>
                            <Label>Content</Label>
                            <textarea
                              value={tip.content}
                              onChange={(e) => handleTipChange(index, 'content', e.target.value)}
                              placeholder="Enter tip content"
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              rows={3}
                            />
                          </div>

                          <div>
                            <Label>Image URL (optional)</Label>
                            <Input
                              value={tip.image || ''}
                              onChange={(e) => handleTipChange(index, 'image', e.target.value)}
                              placeholder="Enter image URL (e.g., https://placekitten.com/50/50)"
                            />
                          </div>

                          <div>
                            <Label>Link URL (optional)</Label>
                            <Input
                              value={tip.link || ''}
                              onChange={(e) => handleTipChange(index, 'link', e.target.value)}
                              placeholder="Enter full URL (e.g., https://example.com)"
                            />
                          </div>
                        </div>
                        
                        <Button
                          type="button"
                          variant="text"
                          size="sm"
                          onClick={() => removeTip(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </Button>
                      </div>
                    </div>
                  )}
                </SortableTipCardItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      
      {tips.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-gray-500">No tips added yet. Click "Add Tip" to get started.</p>
        </div>
      )}
    </div>
  );
}
