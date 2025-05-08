"use client";

import { useState, useEffect } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
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
      className={classnames("mb-3 rounded-lg border p-4 transition-all", {
        "border-primary bg-background z-10 shadow-md": isDragging || isActive,
        "hover:border-primary cursor-grab border-gray-200":
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
        <span className="font-medium text-gray-900">{item.content}</span>
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
    useSensor(PointerSensor, {
      // Adding activation constraints for better control
      activationConstraint: {
        // Only start dragging after moving 8px - helps with accidental drags
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Call onAnswer when items change
  useEffect(() => {
    onAnswer(items);
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
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex(
          (item) => item.id === active.id,
        );
        const newIndex = currentItems.findIndex((item) => item.id === over.id);

        return arrayMove(currentItems, oldIndex, newIndex);
      });
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
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
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
