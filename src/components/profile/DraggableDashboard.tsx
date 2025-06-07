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
import { updateWidgets, toggleExpandedWidget, setExpandedWidgets } from '@/store/slices/dashboardSlice';

type ExpandedWidgetsState = Record<string, boolean>;

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
  const { data, expandedWidgets } = useAppSelector(state => state.dashboard);
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedNodeRect, setDraggedNodeRect] = useState<DOMRect | null>(null);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState(false);
  
  // Use widgets from Redux store or fallback to props
  // Ensure widgets is always an array
  const widgets = Array.isArray(data) ? data : (Array.isArray(initialWidgets) ? initialWidgets : []);

  // Initialize expanded state
  useEffect(() => {
    if (Object.keys(expandedWidgets).length === 0 && widgets.length > 0) {
      const initialExpandedState: ExpandedWidgetsState = {};
      widgets.forEach(widget => {
        const shouldBeExpanded = [
          'barChart',
          'lineChart',
          'financialHealthScorecard',
          'debtVisualizer',
          'retirementReadiness',
          'quickCashFlowSummary'
        ].includes((widget as any).type);
        initialExpandedState[widget.id] = shouldBeExpanded;
      });
      dispatch(setExpandedWidgets(initialExpandedState));
    }
  }, [widgets, expandedWidgets, dispatch]);

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
      const oldIndex = widgets.findIndex(widget => widget.id === active.id);
      const newIndex = widgets.findIndex(widget => widget.id === over.id);
      
      const newWidgets = arrayMove(widgets, oldIndex, newIndex);
      
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

  const toggleWidgetHeight = (id: string) => {
    // Update Redux store
    dispatch(toggleExpandedWidget(id));
  };

  const handleRemoveWidget = (id: string) => {
    const updatedWidgets = widgets.filter(widget => widget.id !== id);
    
    // Update Redux store
    dispatch(updateWidgets(updatedWidgets));
    
    // Also call the callback if provided
    if (onUpdateWidgets) {
      onUpdateWidgets(updatedWidgets);
    }
  };

  const handleEditWidget = (id: string) => {
    const widget = widgets.find?.(w => w.id === id);
    if (widget) {
      setEditingWidget(widget as Widget);
    }
  };

  const handleSaveWidget = (updatedWidget: Widget) => {
    const updatedWidgets = widgets.map(widget => 
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

  const handleAddWidget = (newWidget: Widget) => {
    const updatedWidgets = [...widgets, newWidget];
    setIsAddWidgetModalOpen(false);
    
    // Set initial expanded state for the new widget
    const shouldBeExpanded = [
      'barChart',
      'lineChart',
      'financialHealthScorecard',
      'debtVisualizer',
      'retirementReadiness',
      'quickCashFlowSummary'
    ].includes((newWidget as any).type);
    
    // Update Redux store
    dispatch(updateWidgets(updatedWidgets));
    
    // Update expanded widgets state in Redux
    const newExpandedState = {
      ...expandedWidgets,
      [newWidget.id]: shouldBeExpanded
    };
    dispatch(setExpandedWidgets(newExpandedState));
    
    // Also call the callback if provided
    if (onUpdateWidgets) {
      onUpdateWidgets(updatedWidgets);
    }
  };

  // Find the active widget for the drag overlay
  const activeWidget = widgets.find?.(widget => widget.id === activeId);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-[14rem]">
          <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
            {widgets.map((widget) => (
              isEditMode ? (
                <EditableWidget
                  key={widget.id}
                  id={widget.id}
                  widget={widget}
                  isExpanded={!!expandedWidgets[widget.id]}
                  onToggleHeight={toggleWidgetHeight}
                  onRemoveWidget={handleRemoveWidget}
                  onEditWidget={handleEditWidget}
                  isEditMode={isEditMode}
                />
              ) : (
                <SortableWidget
                  key={widget.id}
                  id={widget.id}
                  widget={widget}
                  isExpanded={!!expandedWidgets[widget.id]}
                  onToggleHeight={toggleWidgetHeight}
                  isEditMode={isEditMode}
                />
              )
            ))}
          </SortableContext>
          
          {/* Add widget button in edit mode */}
          {isEditMode && (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setIsAddWidgetModalOpen(true)}
            >
              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-700">Add New Widget</h3>
                <p className="text-sm text-gray-500 mt-1">Click to add a new dashboard widget</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Custom drag overlay that maintains the exact appearance of the original widget */}
        <DragOverlay adjustScale={false}>
          {activeId && activeWidget && draggedNodeRect ? (
            <div 
              className="bg-white rounded-xl shadow-lg overflow-hidden pointer-events-none"
              style={{
                // Use the exact width and height from the original node
                width: draggedNodeRect.width,
                height: draggedNodeRect.height,
                opacity: 0.8,
                transform: 'none',  // Prevent any automatic scaling
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              }}
            >
              <WidgetFactory widget={activeWidget} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      
      {/* Widget edit modal */}
      <WidgetEditModal 
        isOpen={!!editingWidget}
        onClose={() => setEditingWidget(null)}
        widget={editingWidget}
        onSave={handleSaveWidget}
      />
      
      {/* Add widget modal */}
      <AddWidgetModal
        isOpen={isAddWidgetModalOpen}
        onClose={() => setIsAddWidgetModalOpen(false)}
        onAddWidget={handleAddWidget}
      />
    </>
  );
}
