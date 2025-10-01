"use client";

import { useState, useEffect, useRef } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  rectIntersection,
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  MeasuringStrategy,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import classnames from "classnames";

import type {
  DraggableItem,
  SortQuestion as SortQuestionType,
} from "@/types/learning.types";

interface SortableItemProps {
  item: DraggableItem;
  isActive?: boolean;
}

function SortableItem({ item, isActive = false }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.id,
    // This is critical for smooth animations
    transition: {
      duration: 150, // Shorter duration for snappier animations
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)' // Custom easing function for smoother motion
    }
  });

  // Fix the style to properly handle transform transitions
  const style = {
    // Apply transform using CSS custom properties for better performance
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms cubic-bezier(0.25, 1, 0.5, 1)',
    // Important for z-index stacking during dragging
    zIndex: isDragging ? 999 : undefined,
    // This reduces the "stickiness" feeling by minimizing visual weight during drag
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={classnames("mb-3 rounded-lg border p-4 will-change-transform", {
        "border-[var(--quiz-dragging-border)] bg-[var(--quiz-dragging-bg)] z-10 shadow-md": isDragging || isActive,
        "hover:border-primary cursor-grab border-[var(--question-border)]":
          !isDragging && !isActive,
      })}
    >
      <div className="flex items-center">
        <div className="mr-3 flex h-6 w-6 items-center justify-center text-purple-primary">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M8 6H6V8H8V6Z" fill="currentColor" />
            <path d="M8 11H6V13H8V11Z" fill="currentColor" />
            <path d="M8 16H6V18H8V16Z" fill="currentColor" />
            <path d="M13 6H11V8H13V6Z" fill="currentColor" />
            <path d="M13 11H11V13H13V11Z" fill="currentColor" />
            <path d="M13 16H11V18H13V16Z" fill="currentColor" />
            <path d="M18 6H16V8H18V6Z" fill="currentColor" />
            <path d="M18 11H16V13H18V11Z" fill="currentColor" />
            <path d="M18 16H16V18H18V16Z" fill="currentColor" />
          </svg>
        </div>
        <span className="font-medium text-[var(--question-text)]">{item.content}</span>
      </div>
    </div>
  );
}

interface SortQuestionProps {
  question: SortQuestionType;
  onAnswer: (answer: Array<DraggableItem>) => void;
  value?: Array<DraggableItem>;
}

function SortQuestion({ question, onAnswer, value }: SortQuestionProps) {
  const [items, setItems] = useState<Array<DraggableItem>>(
    value || [...question.items],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Decrease the activation constraint for smoother starts
      activationConstraint: {
        delay: 0,
        tolerance: 5, // Smaller tolerance for more responsive dragging
      },
    }),
    useSensor(TouchSensor, {
      // Better touch handling for mobile devices
      activationConstraint: {
        delay: 0,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  
  // Reference to prevent infinite update loops
  const prevAnswerRef = useRef<string>('');

  // Update initial items if value changes from parent
  useEffect(() => {
    if (value) {
      setItems(value);
    }
  }, [value]);
  
  // Effect to notify parent component of answer changes
  useEffect(() => {
    const currentAnswer = JSON.stringify(items);
    
    // Only update if the answer has changed
    if (currentAnswer !== prevAnswerRef.current) {
      prevAnswerRef.current = currentAnswer;
      
      // Use requestAnimationFrame to safely notify parent after render
      requestAnimationFrame(() => {
        onAnswer(items);
      });
    }
  }, [items, onAnswer]);

  // Track active dragging state to improve visual feedback
  const [activeId, setActiveId] = useState<string | null>(null);

  // Handle start of drag
  function handleDragStart(event: { active: any }) {
    setActiveId(event.active.id);
  }

  // Handle end of drag
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      // Find the indices first outside the state update function
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      
      // Create the new array without being inside the state setter
      const newItems = arrayMove([...items], oldIndex, newIndex);
      
      // Just update the state - the useEffect will handle calling onAnswer
      setItems(newItems);
    }
  }

  // Handle cancellation of drag
  function handleDragCancel() {
    setActiveId(null);
  }

  return (
    <div className="sort-question">
      <DndContext
        sensors={sensors}
        // Using rectIntersection for more precise collision detection with vertical lists
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        modifiers={[restrictToVerticalAxis]}
        // Optimize drag animation performance
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        // Enhanced measurement strategy improves animation performance
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mb-6">
            {items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                isActive={activeId === item.id}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default SortQuestion;
