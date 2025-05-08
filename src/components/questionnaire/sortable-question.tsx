'use client';

import { useState } from 'react';
import classnames from 'classnames';

import { useQuestionnaire } from '@/contexts/questionnaire-context';
import type { Option, Question } from '@/types/questions';

import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
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
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Droppable } from './components/droppable';

interface SortableItemProps {
  option: Option;
}

function SortableItem({ option }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: option.id,
    data: option, // Include the data for easier reference
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1, // Ensure dragging item is always on top
    opacity: isDragging ? 0.8 : 1, // Add subtle transparency to dragged item
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={classnames(
        'relative', // Position relative for proper stacking
        'p-4 rounded-lg border mb-3 cursor-grab transition-all touch-manipulation',
        {
          'border-purple-300 bg-purple-50 shadow-md cursor-grabbing': isDragging,
          'border-gray-200 hover:border-purple-200': !isDragging
        }
      )}
    >
      <div className="flex items-center">
        <div className="w-6 h-6 flex items-center justify-center mr-3 text-purple-600">
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
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{option.label}</span>
          {option.description && (
            <span className="text-sm text-gray-500">{option.description}</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface SortableQuestionProps {
  question: Question;
}

function SortableQuestion({ question }: SortableQuestionProps) {
  const { state, setAnswer } = useQuestionnaire();
  const initialItems = question.options || [];
  
  // Track the active item being dragged
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Use existing answer or initialize with original options
  const [items, setItems] = useState<Array<Option>>(() => {
    const savedAnswer = state.answers[question.id] as Array<string> | undefined;
    
    if (savedAnswer && savedAnswer.length > 0) {
      // Reconstruct the options array using the saved order of IDs
      return savedAnswer.map(id => {
        const option = initialItems.find(item => item.id === id);
        return option || { id, label: 'Unknown option' };
      });
    }
    
    return initialItems;
  });
  
  // Configure sensors with appropriate options for better touch/mouse handling
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Wait a small distance before initiating drag
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start to track active item
  function handleDragStart(event: DragStartEvent) {
    console.log("handleDragStart", event)
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    console.log("handleDragEnd", event)
    setActiveId(null); // Clear the active ID
    
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex(item => item.id === active.id);
        const newIndex = currentItems.findIndex(item => item.id === over.id);
        
        const newArray = arrayMove(currentItems, oldIndex, newIndex);
        // Save the new order to the questionnaire context
        setAnswer(question.id, newArray.map(item => item.id));
        return newArray;
      });
    }
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        autoScroll={true} /* Enable auto-scrolling during drag */
      >
       
          {items.map((option) => (
            <Droppable key={option.id} id={option.id} >
                   <div className="flex flex-col">
          <span className="font-medium text-gray-900">{option.label}</span>
          {option.description && (
            <span className="text-sm text-gray-500">{option.description}</span>
          )}
        </div>
              </Droppable>
          ))}

        {/* This adds a visual overlay during drag operations */}
        {activeId && (
          <div className="fixed inset-0 bg-black opacity-5 pointer-events-none z-0" />
        )}
      </DndContext>
    </div>
  );
}

export default SortableQuestion;
