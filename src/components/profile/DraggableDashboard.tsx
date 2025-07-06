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
import { EditableWidget } from './EditableWidget';
import { Widget } from './types/dashboard-data.typings';
import { WidgetFactory } from './widgets/WidgetFactory';
import WidgetEditModal from './WidgetEditModal';
import { AddWidgetModal } from './AddWidgetModal';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateWidgets } from '@/store/slices/dashboardSlice';
import { v4 as uuidv4 } from 'uuid';


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

  // handleToggleChecklistItem function removed as part of the checklist widget refactoring
  // Checklist items are now managed internally by the ChecklistWidget component

  const handleTogglecolumn_span = (id: string) => {
    const widgetIndex = currentWidgets.findIndex(w => w.id === id);
    if (widgetIndex === -1) return;

    const updatedWidgets = currentWidgets.map((widget, index) => {
      if (index === widgetIndex) {
        return {
          ...widget,
          column_span: (widget.column_span === 2 ? 1 : 2) as (1 | 2),
        };
      }
      return widget;
    });

    dispatch(updateWidgets(updatedWidgets));
    if (onUpdateWidgets) {
      onUpdateWidgets(updatedWidgets);
    }
  };

  const handleTogglerow_span = (id: string) => {
    const widgetIndex = currentWidgets.findIndex(w => w.id === id);
    if (widgetIndex === -1) return;

    const updatedWidgets = currentWidgets.map((widget, index) => {
      if (index === widgetIndex) {
        // Get current row span with default of 1
        const currentRowSpan = widget.row_span || 1;
        
        // Cycle through 1, 2, 3, 4 and back to 1
        let newRowSpan: 1 | 2 | 3 | 4;
        
        if (currentRowSpan === 1) newRowSpan = 2;
        else if (currentRowSpan === 2) newRowSpan = 3;
        else if (currentRowSpan === 3) newRowSpan = 4;
        else newRowSpan = 1; // Reset to 1 if it's 4 or any unexpected value
        
        return {
          ...widget,
          row_span: newRowSpan,
        };
      }
      return widget;
    });

    dispatch(updateWidgets(updatedWidgets));
    if (onUpdateWidgets) {
      onUpdateWidgets(updatedWidgets);
    }
  };
  

  // handleToggleChecklistItem function removed as part of the checklist widget refactoring
  // Checklist items are now managed internally by the ChecklistWidget component

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

  const handleSaveWidget = (updatedWidget: Omit<Widget, 'id'> & { id?: string }) => {
    // Ensure we have a valid ID
    if (!updatedWidget.id) {
      console.error('Cannot save widget: Missing ID');
      return;
    }
    
    const updatedWidgets = currentWidgets.map(widget => 
      widget.id === updatedWidget.id ? { ...widget, ...updatedWidget } as Widget : widget
    );
    
    // Update Redux store
    dispatch(updateWidgets(updatedWidgets));
    setEditingWidget(null);
    
    // Also call the callback if provided
    if (onUpdateWidgets) {
      onUpdateWidgets(updatedWidgets);
    }
  };

  const handleAddWidget = (newWidgetData: Omit<Widget, 'row_span' | 'column_span'> & Partial<Pick<Widget, 'row_span' | 'column_span'>>) => {
    const shouldBeExpanded = [
      'barChart',
      'lineChart',
      'financialHealthScorecard',
      'debtVisualizer',
      'retirementReadiness',
      'quickCashFlowSummary'
    ].includes((newWidgetData as any).type);

    // Generate a unique ID for the new widget if it doesn't have one
    const newWidgetWithLayout: Widget = {
      ...newWidgetData,
      id: newWidgetData.id || uuidv4(),
      row_span: newWidgetData.row_span ?? (shouldBeExpanded ? 2 : 1),
      column_span: newWidgetData.column_span ?? 1, // Default column_span to 1 if not provided
    } as Widget;

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

  if(!isEditMode&&currentWidgets.length===0){
    return  <div className="mt-4 rounded-lg bg-gray-50 p-6 text-center">
    <p className="text-gray-600">
      No dashboard data available
    </p>
  </div>
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" style={{ gridTemplateRows: '12rem 1fr 1fr 1fr' }}>
         { <SortableContext items={currentWidgets.map(w => w.id)} strategy={rectSortingStrategy}>
            {currentWidgets.map((widget) => (
             (
                <EditableWidget
                  key={widget.id}
                  id={widget.id}
                  widget={widget}
                  // isExpanded prop removed, EditableWidget now uses widget.row_span directly
                  onTogglerow_span={handleTogglerow_span} // Renamed from onToggleHeight
                  onRemoveWidget={handleRemoveWidget}
                  onEditWidget={handleEditWidget}
                  onTogglecolumn_span={handleTogglecolumn_span}
                  isEditMode={isEditMode}
                />
              ) 
            ))}
          </SortableContext>}
          
          {/* Add widget button in edit mode */}
          {isEditMode && (
            <div 
              className="bg-white/80 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-colors min-h-[14rem] md:min-h-full"
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
              className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl transform scale-105 cursor-grabbing h-full ${activeWidget.column_span === 2 ? 'md:col-span-2' : 'md:col-span-1'} ${`md:row-span-${activeWidget.row_span || 1}`}`}
              style={{
                width: draggedNodeRect.width,
                height: draggedNodeRect.height,
              }}
            >
              <WidgetFactory widget={activeWidget} />
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
