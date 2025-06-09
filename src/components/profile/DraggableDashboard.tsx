'use client';

import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  rectSortingStrategy 
} from '@dnd-kit/sortable';
import { SortableWidget } from './SortableWidget';
import { EditableWidget } from './EditableWidget';
import { Widget } from './types/dashboard-data.typings';
import { WidgetFactory } from './widgets/WidgetFactory';
import { WidgetEditModal } from './WidgetEditModal';
import { AddWidgetModal } from './AddWidgetModal';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateWidgets } from '@/store/slices/dashboardSlice'; // Removed toggleExpandedWidget, setExpandedWidgets


interface DraggableDashboardProps {
  widgets: Widget[];
  onWidgetsReordered?: (widgets: Widget[]) => void;
  savedExpandedState?: Record<string, boolean>;
  onExpandedStateChange?: (expandedState: Record<string, boolean>) => void;
  isEditMode?: boolean;
  onUpdateWidgets?: (widgets: Widget[]) => void;
}

export function DraggableDashboard({ 
  widgets: initialWidgets, 
  isEditMode = false,
  onUpdateWidgets
}: DraggableDashboardProps) {
  const dispatch = useAppDispatch();
  const { data } = useAppSelector(state => state.dashboard); // Removed expandedWidgets
  // Ensure widgets is always an array, using data from store first
  const currentWidgets = Array.isArray(data) && data.length > 0 ? data : (Array.isArray(initialWidgets) ? initialWidgets : []);
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedNodeRect, setDraggedNodeRect] = useState<DOMRect | null>(null);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState(false);
  


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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Find the dragged element by its data-id attribute
    const draggedElement = document.querySelector(`[data-id="${active.id}"]`);
    if (draggedElement) {
      const rect = draggedElement.getBoundingClientRect();
      setDraggedNodeRect(rect);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = currentWidgets.findIndex(widget => widget.id === active.id);
      const newIndex = currentWidgets.findIndex(widget => widget.id === over.id);
      
      const newWidgets = arrayMove(currentWidgets, oldIndex, newIndex);
      
      // Update Redux store
      dispatch(updateWidgets(newWidgets));
      
      // Also call the callback if provided
      if (onUpdateWidgets) {
        onUpdateWidgets(newWidgets);
      }
    }
    
    setActiveId(null);
    setDraggedNodeRect(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleToggleRowSpan = (id: string) => {
    const widgetIndex = currentWidgets.findIndex(w => w.id === id);
    if (widgetIndex === -1) return;

    const updatedWidgets = currentWidgets.map((widget, index) => {
      if (index === widgetIndex) {
        const currentRowSpan = widget.rowSpan || 1; // Default to 1 if undefined
        return {
          ...widget,
          rowSpan: (currentRowSpan === 2 ? 1 : 2) as (1 | 2),
        };
      }
      return widget;
    });

    dispatch(updateWidgets(updatedWidgets));
    if (onUpdateWidgets) {
      onUpdateWidgets(updatedWidgets);
    }
  };

  const handleToggleColumnSpan = (id: string) => {
    const widgetIndex = currentWidgets.findIndex(w => w.id === id);
    if (widgetIndex === -1) return;

    const updatedWidgets = currentWidgets.map((widget, index) => {
      if (index === widgetIndex) {
        return {
          ...widget,
          columnSpan: (widget.columnSpan === 2 ? 1 : 2) as (1 | 2),
        };
      }
      return widget;
    });

    dispatch(updateWidgets(updatedWidgets));
    if (onUpdateWidgets) {
      onUpdateWidgets(updatedWidgets);
    }
  };

  const handleToggleChecklistItem = (widgetId: string, itemId: string, isCompleted: boolean) => {
    const widgetIndex = currentWidgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) {
      console.warn(`handleToggleChecklistItem: Widget with id ${widgetId} not found.`);
      return;
    }

    const targetWidget = currentWidgets[widgetIndex] as Widget;

    if ((targetWidget as any).type !== 'checklist' || !Array.isArray((targetWidget as any).items)) {
      console.warn('handleToggleChecklistItem: Target is not a valid checklist widget or items are missing/not an array.');
      return;
    }

    const items = (targetWidget as any).items as { id: string; isCompleted: boolean }[];
    const itemIndex = items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      console.warn(`handleToggleChecklistItem: Item with id ${itemId} not found in widget ${widgetId}.`);
      return;
    }
    
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, isCompleted: isCompleted } : item
    );

    const updatedWidget = {
      ...targetWidget,
      items: updatedItems,
    };

    const updatedWidgets = currentWidgets.map((w, index) =>
      index === widgetIndex ? updatedWidget : w
    );

    dispatch(updateWidgets(updatedWidgets as Widget[]));
    if (onUpdateWidgets) {
      onUpdateWidgets(updatedWidgets as Widget[]);
    }
  };

  const handleRemoveWidget = (id: string) => {
    const updatedWidgets = currentWidgets.filter(widget => widget.id !== id);
    
    // Update Redux store
    dispatch(updateWidgets(updatedWidgets));
    
    // Also call the callback if provided
    if (onUpdateWidgets) {
      onUpdateWidgets(updatedWidgets);
    }
  };

  const handleEditWidget = (id: string) => {
    const widget = currentWidgets.find?.(w => w.id === id);
    if (widget) {
      setEditingWidget(widget as Widget);
    }
  };

  const handleSaveWidget = (updatedWidget: Widget) => {
    const updatedWidgets = currentWidgets.map(widget => 
      widget.id === updatedWidget.id ? updatedWidget : widget
    );
    
    // Update Redux store
    dispatch(updateWidgets(updatedWidgets));
    setEditingWidget(null);
    
    // Also call the callback if provided
    if (onUpdateWidgets) {
      onUpdateWidgets(updatedWidgets);
    }
  };

  const handleAddWidget = (newWidgetData: Omit<Widget, 'rowSpan' | 'columnSpan'> & Partial<Pick<Widget, 'rowSpan' | 'columnSpan'>>) => {
    const shouldBeExpanded = [
      'barChart',
      'lineChart',
      'financialHealthScorecard',
      'debtVisualizer',
      'retirementReadiness',
      'quickCashFlowSummary'
    ].includes((newWidgetData as any).type);

    const newWidgetWithLayout: Widget = {
      ...newWidgetData,
      rowSpan: newWidgetData.rowSpan ?? (shouldBeExpanded ? 2 : 1),
      columnSpan: newWidgetData.columnSpan ?? 1, // Default columnSpan to 1 if not provided
    } as Widget; // Added 'as Widget' to satisfy TypeScript, assuming all required fields are present

    const updatedWidgets = [...currentWidgets, newWidgetWithLayout];
    setIsAddWidgetModalOpen(false);
    
    // Update Redux store
    dispatch(updateWidgets(updatedWidgets));
    
    // Also call the callback if provided
    if (onUpdateWidgets) {
      onUpdateWidgets(updatedWidgets);
    }
  };

  // Find the active widget for the drag overlay
  const activeWidget = currentWidgets.find?.(widget => widget.id === activeId);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-[14rem]">
          <SortableContext items={currentWidgets.map(w => w.id)} strategy={rectSortingStrategy}>
            {currentWidgets.map((widget) => (
              isEditMode ? (
                <EditableWidget
                  key={widget.id}
                  id={widget.id}
                  widget={widget}
                  // isExpanded prop removed, EditableWidget now uses widget.rowSpan directly
                  onToggleRowSpan={handleToggleRowSpan} // Renamed from onToggleHeight
                  onRemoveWidget={handleRemoveWidget}
                  onEditWidget={handleEditWidget}
                  onToggleColumnSpan={handleToggleColumnSpan}
                  onToggleChecklistItem={handleToggleChecklistItem} // Added prop
                  isEditMode={isEditMode}
                />
              ) : (
                <SortableWidget
                  key={widget.id}
                  id={widget.id}
                  widget={widget}
                  // isExpanded is derived from widget.rowSpan
                  onToggleRowSpan={handleToggleRowSpan} // Renamed prop and confirmed handler
                  onToggleChecklistItem={handleToggleChecklistItem} // Added prop
                  isEditMode={isEditMode}
                />
              )
            ))}
          </SortableContext>
          
          {/* Add widget button in edit mode */}
          {isEditMode && (
            <div 
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[14rem] md:min-h-full"
              onClick={() => setIsAddWidgetModalOpen(true)}
              role="button"
              tabIndex={0}
              aria-label="Add new widget"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsAddWidgetModalOpen(true); }}
            >
              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="font-medium text-gray-700 dark:text-gray-300">Add Widget</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Click to add a new widget to your dashboard</p>
              </div>
            </div>
          )}
        </div>
        
        <DragOverlay dropAnimation={null}>
          {activeId && activeWidget && draggedNodeRect ? (
            <div 
              className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl transform scale-105 cursor-grabbing h-full ${activeWidget.columnSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'} ${activeWidget.rowSpan === 2 ? 'md:row-span-2' : 'md:row-span-1'}`}
              style={{
                width: draggedNodeRect.width,
                height: draggedNodeRect.height,
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', // Enhanced shadow
              }}
            >
              <WidgetFactory widget={activeWidget} onToggleChecklistItem={handleToggleChecklistItem} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      {editingWidget && (
        <WidgetEditModal
          isOpen={!!editingWidget}
          onClose={() => setEditingWidget(null)}
          widget={editingWidget} 
          onSave={handleSaveWidget}
        />
      )}
      <AddWidgetModal 
        isOpen={isAddWidgetModalOpen}
        onClose={() => setIsAddWidgetModalOpen(false)}
        onAddWidget={handleAddWidget}
      />
    </>
  );
}
