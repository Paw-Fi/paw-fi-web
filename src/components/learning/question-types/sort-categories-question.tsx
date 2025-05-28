'use client';

import { useState, useEffect, useRef } from 'react';
import type { UniqueIdentifier, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin
} from '@dnd-kit/core';
// No need for modifiers at this point

// Import our drag-and-drop components
import { DraggableItem, Droppable, DragOverlay } from '../dnd';

// Import types from the learning types file
import type { SortCategoriesQuestion as SortCategoriesQuestionType, DraggableItem as DraggableItemType } from '@/types/learning.types';

interface SortCategoriesQuestionProps {
  question: SortCategoriesQuestionType;
  onAnswer: (answer: Record<string, string>) => void;
  value?: Record<string, string>;
}

function SortCategoriesQuestion({ question, onAnswer, value }: SortCategoriesQuestionProps) {
  // Store item-to-category mapping
  const [itemCategories, setItemCategories] = useState<Record<string, string>>(value || {});
  
  // Keep track of items not yet categorized
  const [uncategorizedItems, setUncategorizedItems] = useState<Array<DraggableItemType>>(
    question.items.filter(item => !value || !value[item.id])
  );

  // Reset state when question.id changes
  useEffect(() => {
    setItemCategories(value || {});
    setUncategorizedItems(question.items.filter(item => !value || !value[item.id]));
  }, [question.id, value, question.items]);
  
  // Track dragging state (following the example pattern)
  const [isDragging, setIsDragging] = useState(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  
  // Reference to prevent infinite update loops
  const prevAnswerRef = useRef<string>('');
  
  // Configure sensors for drag operations with proper activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Use distance only without delay to avoid issues with undefined coordinates
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Effect to notify parent component of answer changes
  useEffect(() => {
    const currentAnswer = JSON.stringify(itemCategories);
    
    // Only update if we have a full answer and it has changed
    if (Object.keys(itemCategories).length === question.items.length && 
        currentAnswer !== prevAnswerRef.current) {
      prevAnswerRef.current = currentAnswer;
      
      // Use requestAnimationFrame to avoid state updates during render
      requestAnimationFrame(() => {
        onAnswer(itemCategories);
      });
    }
  }, [itemCategories, onAnswer, question.items.length]);

  // Get items for a specific category
  const getItemsForCategory = (categoryId: string) => {
    return question.items.filter(item => 
      itemCategories[item.id] === categoryId
    );
  };

  // Event handlers for drag operations
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    setActiveId(null);
    
    const { active, over } = event;
    
    if (!over) return;
    
    // Get the IDs for the dragged item and the drop target
    const itemId = String(active.id);
    const categoryId = String(over.id);
    
    // Check if the target is a category container
    const isCategory = question.categories.some(cat => cat.id === categoryId);
    
    if (isCategory) {
      // Update the item's category
      setItemCategories(prev => ({
        ...prev,
        [itemId]: categoryId
      }));
      
      // Remove from uncategorized if needed
      setUncategorizedItems(prev => 
        prev.filter(item => item.id !== itemId)
      );
    }
  };

  const handleDragCancel = () => {
    setIsDragging(false);
    setActiveId(null);
  };

  // Find the active item for the drag overlay
  const activeItem = activeId 
    ? question.items.find(item => item.id === activeId) 
    : null;

  return (
    <div className="sort-categories-question">
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Category containers in a grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {question.categories?.map(category => (
            <Droppable 
              key={category.id}
              id={category.id}
              dragging={isDragging}
              className="bg-gray-50 rounded-lg p-4 mb-4"
            >
              <h3 className="font-semibold mb-3 text-lg">
                {category.content||category.name} {getItemsForCategory(category.id).length > 0 && 
                  `(${getItemsForCategory(category.id).length})`
                }
              </h3>
              
              <div className="h-48">
                {getItemsForCategory(category.id).map(item => (
                  <DraggableItem key={item.id} id={item.id}>
                    <span className="font-medium text-gray-900">{item.content}</span>
                  </DraggableItem>
                ))}
                
                {getItemsForCategory(category.id).length === 0 && (
                  <div className="border border-dashed border-gray-300 rounded-lg h-full flex items-center justify-center text-gray-400">
                    Drag items here
                  </div>
                )}
              </div>
            </Droppable>
          ))}
        </div>
        
        {/* Uncategorized items */}
        {uncategorizedItems.length > 0 && (
          <div className="mt-6">
            <div className="bg-white p-4  border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
              {uncategorizedItems.map(item => (
                <DraggableItem key={item.id} id={item.id} className="h-20 rounded-2xl">
                  <span className="font-medium text-gray-900">{item.content}</span>
                </DraggableItem>
              ))}
            </div>
          </div>
        )}
        
        {/* Display when all items have been categorized */}
        {uncategorizedItems.length === 0 && !value && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-green-700">
              Great job! You've categorized all items.
            </p>
          </div>
        )}
        
        {/* Drag overlay component with active item content */}
        <DragOverlay>
          {activeItem && (
            <div className="p-3 bg-white border border-gray-200 select-none rounded-lg shadow-md">
              <span className="font-medium text-gray-900">{activeItem.content}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default SortCategoriesQuestion;
