'use client';

import { useState, useEffect } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import classnames from 'classnames';

import type { SortCategoriesQuestion as SortCategoriesQuestionType, DraggableItem } from '@/types/learning';

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
    opacity: isDragging ? 0.3 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={classnames(
        'p-3 rounded-lg border mb-2 transition-all bg-white',
        {
          'border-purple-300 shadow-sm z-10': isDragging,
          'border-gray-200 hover:border-purple-200 cursor-grab': !isDragging
        }
      )}
    >
      <div className="flex items-center">
        <div className="w-6 h-6 flex items-center justify-center mr-2 text-gray-400">
          <svg 
            width="16" 
            height="16" 
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

interface CategoryContainerProps {
  category: {
    id: string;
    name: string;
  };
  items: Array<DraggableItem>;
}

function CategoryContainer({ category, items }: CategoryContainerProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4">
      <h3 className="font-semibold mb-3 text-lg">{category.name} {items.length > 0 && `(${items.length})`}</h3>
      <div className="min-h-[100px]">
        <SortableContext
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <SortableItem key={item.id} item={item} />
          ))}
        </SortableContext>
        
        {items.length === 0 && (
          <div className="border border-dashed border-gray-300 rounded-lg h-20 flex items-center justify-center text-gray-400">
            Drag items here
          </div>
        )}
      </div>
    </div>
  );
}

interface SortCategoriesQuestionProps {
  question: SortCategoriesQuestionType;
  onAnswer: (answer: Record<string, string>) => void;
  value?: Record<string, string>;
}

function SortCategoriesQuestion({ question, onAnswer, value }: SortCategoriesQuestionProps) {
  // Store item-to-category mapping
  const [itemCategories, setItemCategories] = useState<Record<string, string>>(
    value || {}
  );
  
  // For the initial state, place items that don't have a category yet in an "uncategorized" section
  const [uncategorizedItems, setUncategorizedItems] = useState<Array<DraggableItem>>(
    question.items.filter(item => !value || !value[item.id])
  );
  
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update the answer when itemCategories changes
  useEffect(() => {
    // Only call onAnswer when we have categorized all items
    if (Object.keys(itemCategories).length === question.items.length) {
      onAnswer(itemCategories);
    }
  }, [itemCategories, onAnswer, question.items.length]);

  // Get items for a specific category
  const getItemsForCategory = (categoryId: string) => {
    return question.items.filter(item => 
      itemCategories[item.id] === categoryId
    );
  };
  
  function handleDragStart(event: { active: { id: string } }) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    
    const { active, over } = event;
    
    if (!over) return;
    
    // Find the containers involved in the drag operation
    const overId = String(over.id);
    
    // If the item was dropped into a category container
    if (question.categories.some(cat => cat.id === overId)) {
      const itemId = String(active.id);
      
      // Update the item's category
      setItemCategories(prev => ({
        ...prev,
        [itemId]: overId
      }));
      
      // Remove the item from uncategorized if necessary
      setUncategorizedItems(prev => 
        prev.filter(item => item.id !== itemId)
      );
    }
  }

  // Find the active item when dragging
  const activeItem = activeId 
    ? question.items.find(item => item.id === activeId)
    : null;

  return (
    <div className="sort-categories-question">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Category containers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {question.categories.map(category => (
            <div key={category.id} id={category.id}>
              <CategoryContainer 
                category={category} 
                items={getItemsForCategory(category.id)} 
              />
            </div>
          ))}
        </div>
        
        {/* Uncategorized items */}
        {uncategorizedItems.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Drag these items to categorize them:</h3>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <SortableContext
                items={uncategorizedItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {uncategorizedItems.map((item) => (
                  <SortableItem key={item.id} item={item} />
                ))}
              </SortableContext>
            </div>
          </div>
        )}
        
        {/* Drag overlay */}
        <DragOverlay>
          {activeItem ? (
            <div className="p-3 rounded-lg border bg-white shadow-md">
              <div className="flex items-center">
                <span className="font-medium text-gray-900">{activeItem.content}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default SortCategoriesQuestion;
