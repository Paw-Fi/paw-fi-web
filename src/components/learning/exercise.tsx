'use client';

import { useState } from 'react';
import classnames from 'classnames';

import { CSS } from '@dnd-kit/utilities';

import type { DragEndEvent } from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

import type { DraggableItem } from '@/types/learning.types';

interface SortableItemProps {
  item: DraggableItem;
}

function SortableItem({ item }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={classnames(
        'p-4 rounded-lg border mb-3 transition-all',
        {
          'border-purple-300 bg-purple-50 shadow-md z-10': isDragging,
          'border-gray-200 hover:border-purple-200 cursor-grab': !isDragging
        }
      )}
    >
      <div className="flex items-center">
        <div className="w-6 h-6 flex items-center justify-center mr-3 text-purple-primary">
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M8 6H6V8H8V6Z" 
              fill="currentColor" 
            />
            <path 
              d="M8 11H6V13H8V11Z" 
              fill="currentColor" 
            />
            <path 
              d="M8 16H6V18H8V16Z" 
              fill="currentColor" 
            />
            <path 
              d="M13 6H11V8H13V6Z" 
              fill="currentColor" 
            />
            <path 
              d="M13 11H11V13H13V11Z" 
              fill="currentColor" 
            />
            <path 
              d="M13 16H11V18H13V16Z" 
              fill="currentColor" 
            />
            <path 
              d="M18 6H16V8H18V6Z" 
              fill="currentColor" 
            />
            <path 
              d="M18 11H16V13H18V11Z" 
              fill="currentColor" 
            />
            <path 
              d="M18 16H16V18H18V16Z" 
              fill="currentColor" 
            />
          </svg>
        </div>
        <span className="font-medium text-gray-900">{item.content}</span>
      </div>
    </div>
  );
}

// This DropTarget component is removed as it's unused

interface ExerciseProps {
  title: string;
  description?: string;
  submitAnswer: (answer: Array<DraggableItem>) => void;
  initialItems: Array<DraggableItem>;
  correctOrder?: Array<string>; // Optional correct order for validation
}

function Exercise({ title, description, submitAnswer, initialItems }: ExerciseProps) {
  const [items, setItems] = useState<Array<DraggableItem>>(initialItems);
  const [completed, setCompleted] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex(item => item.id === active.id);
        const newIndex = currentItems.findIndex(item => item.id === over.id);
        
        return arrayMove(currentItems, oldIndex, newIndex);
      });
    }
  }

  function handleSubmit() {
    submitAnswer(items);
    setCompleted(true);
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl shadow-md p-6">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      {description && <p className="text-gray-600 mb-6">{description}</p>}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mb-6">
            {items.map((item) => (
              <SortableItem key={item.id} item={item} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      <button
        onClick={handleSubmit}
        disabled={completed}
        className={classnames(
          'w-full py-3 rounded-full text-white font-medium transition-colors',
          {
            'bg-purple-primary hover:bg-purple-700': !completed,
            'bg-green-600': completed
          }
        )}
      >
        {completed ? 'Completed!' : 'Submit Answer'}
      </button>
    </div>
  );
}

export default Exercise;
