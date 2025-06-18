import React, { useState, useCallback } from 'react';
import { ILineChartWidget, IChartData, IChartDataPoint } from '../types/dashboard-data.typings';
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

interface SortableLineChartItemProps {
  id: UniqueIdentifier;
  children: (listeners: DraggableSyntheticListeners, attributes: DraggableAttributes) => React.ReactNode;
}

function SortableLineChartItem({ id, children }: SortableLineChartItemProps) {
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

export function LineChartForm({ data: widgetData, onDataChange }: WidgetFormProps<ILineChartWidget>) {
  const chartData = widgetData.data || { dataPoints: [] };
  const dataPoints = chartData.dataPoints || [];
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

  const handleDataPointChange = (index: number, field: keyof IChartDataPoint, value: string | number) => {
    const newDataPoints = [...dataPoints];
    newDataPoints[index] = { ...newDataPoints[index], [field]: value };
    onDataChange({
      ...widgetData,
      data: {
        ...chartData,
        dataPoints: newDataPoints,
      },
    });
  };

  const addDataPoint = useCallback(() => {
    const newDataPoints: IChartDataPoint = {
      id: `dp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label: `Series ${dataPoints.length + 1}`,
      value: 0,
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
    };
    
    onDataChange({
      ...widgetData,
      data: {
        ...chartData,
        dataPoints: [...dataPoints, newDataPoints],
      },
    });
  }, [chartData, widgetData, onDataChange]);

  const removeDataPoint = useCallback((index: number) => {
    const newDataPoints = [...dataPoints];
    newDataPoints.splice(index, 1);
    onDataChange({
      ...widgetData,
      data: {
        ...chartData,
        dataPoints: newDataPoints,
      },
    });
  }, [chartData, widgetData, onDataChange]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = dataPoints.findIndex((item) => item.id === active.id);
      const newIndex = dataPoints.findIndex((item) => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newDataPoints = arrayMove(dataPoints, oldIndex, newIndex);
        
        onDataChange({
          ...widgetData,
          data: {
            ...chartData,
            dataPoints: newDataPoints,
          },
        });
      }
    }
    
    setIsDragging(false);
  }, [chartData, widgetData, onDataChange]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Chart Title</Label>
        <Input
          value={chartData.title || ''}
          onChange={(e) => onDataChange({
            ...widgetData,
            data: {
              ...chartData,
              title: e.target.value,
            },
          })}
          placeholder="Enter chart title"
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>X-Axis Label</Label>
          <Input
            value={chartData.xAxisLabel || ''}
            onChange={(e) => onDataChange({
              ...widgetData,
              data: {
                ...chartData,
                xAxisLabel: e.target.value,
              },
            })}
            placeholder="X-axis label"
            className="w-48"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label>Y-Axis Label</Label>
          <Input
            value={chartData.yAxisLabel || ''}
            onChange={(e) => onDataChange({
              ...widgetData,
              data: {
                ...chartData,
                yAxisLabel: e.target.value,
              },
            })}
            placeholder="Y-axis label"
            className="w-48"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Data Points</Label>
          <Button type="button" size="sm" variant="outline" onClick={addDataPoint}>
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add Data Point
          </Button>
        </div>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
        >
          <SortableContext 
            items={dataPoints.map(item => item.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {dataPoints.map((dataPoint, index) => (
                <SortableLineChartItem key={dataPoint.id} id={dataPoint.id}>
                  {(listeners, attributes) => (
                    <div 
                      className={`p-3 border rounded-lg bg-white ${isDragging ? 'shadow-md' : ''}`}
                    >
                      <div className="flex items-start space-x-2">
                        <button
                          type="button"
                          {...listeners}
                          {...attributes}
                          className="p-1 -ml-1 -mt-1 text-gray-400 hover:text-gray-600 cursor-move"
                        >
                          <FontAwesomeIcon icon={faGripVertical} />
                        </button>
                        
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <div>
                            <Label>Label</Label>
                            <Input
                              value={dataPoint.label}
                              onChange={(e) => handleDataPointChange(index, 'label', e.target.value)}
                              placeholder="Label"
                            />
                          </div>
                          
                          <div>
                            <Label>Value</Label>
                            <Input
                              type="number"
                              value={dataPoint.value}
                              onChange={(e) => handleDataPointChange(index, 'value', Number(e.target.value))}
                              placeholder="Value"
                            />
                          </div>
                          
                          <div>
                            <Label>Color</Label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="color"
                                value={dataPoint.color}
                                onChange={(e) => handleDataPointChange(index, 'color', e.target.value)}
                                className="h-10 w-10 p-1 border rounded"
                              />
                              <Input
                                value={dataPoint.color}
                                onChange={(e) => handleDataPointChange(index, 'color', e.target.value)}
                                placeholder="Color code"
                                className="flex-1"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <FontAwesomeIcon
                      type="button"
                      icon={faTrash}
                      onClick={() => removeDataPoint(index)}
                      className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                    
                    />
                      </div>
                    </div>
                  )}
                </SortableLineChartItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
     
    </div>
  );
}
