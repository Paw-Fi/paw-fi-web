import React, { useState, useCallback } from 'react';
import { IBarChartWidget, IChartData, IChartDataPoint } from '../types/dashboard-data.typings';
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

interface SortableBarChartItemProps {
  id: UniqueIdentifier;
  children: (listeners: DraggableSyntheticListeners, attributesForDraggableNode: DraggableAttributes) => React.ReactNode;
}

export function SortableBarChartItem({ id, children }: SortableBarChartItemProps) {
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

export function BarChartForm({ data: widgetData, onDataChange }: WidgetFormProps<IBarChartWidget>) {
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
    const newDataPoint: IChartDataPoint = {
      id: `dp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label: `Data ${dataPoints.length + 1}`,
      value: 0,
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
    };
    
    onDataChange({
      ...widgetData,
      data: {
        ...chartData,
        dataPoints: [...dataPoints, newDataPoint],
      },
    });
  }, [chartData, dataPoints, widgetData, onDataChange]);

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
  }, [dataPoints, chartData, widgetData, onDataChange]);

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
  }, [dataPoints, chartData, widgetData, onDataChange]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Chart Title</Label>
        <Input
          value={chartData.title || ''}
          onChange={(e) => {
            const newChartData = { ...chartData, title: e.target.value };
            onDataChange({ ...widgetData, data: newChartData });
          }}
          placeholder="Chart Title"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>X-Axis Label</Label>
          <Input
            value={chartData.xAxisLabel || ''}
            onChange={(e) => {
              const newChartData = { ...chartData, xAxisLabel: e.target.value };
              onDataChange({ ...widgetData, data: newChartData });
            }}
            placeholder="X-Axis Label"
          />
        </div>
        <div className="space-y-2">
          <Label>Y-Axis Label</Label>
          <Input
            value={chartData.yAxisLabel || ''}
            onChange={(e) => {
              const newChartData = { ...chartData, yAxisLabel: e.target.value };
              onDataChange({ ...widgetData, data: newChartData });
            }}
            placeholder="Y-Axis Label"
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-md font-medium">Data Points</h3>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={dataPoints.map(dp => dp.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {dataPoints.map((dataPoint, index) => (
                <SortableBarChartItem key={dataPoint.id} id={dataPoint.id}>
                  {(listeners, attributes) => (
                    <div className={`p-2 border rounded-lg ${isDragging ? 'bg-gray-100' : 'bg-white'}`}>
                      <div className="flex items-center space-x-2">
                        <button {...listeners} {...attributes} className="cursor-grab p-2">
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
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeDataPoint(index)}
                          className="text-red-500 hover:text-red-700 border-red-500 hover:border-red-700"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </Button>
                      </div>
                    </div>
                  )}
                </SortableBarChartItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      
      <Button type="button" onClick={addDataPoint} variant="outline" className="w-full">
        <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Data Point
      </Button>

      <div className="space-y-2">
        <Label>Preview</Label>
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="h-48 flex items-end space-x-2">
            {dataPoints.length > 0 ? (
              dataPoints.map((dataPoint) => {
                const maxValue = Math.max(...dataPoints.map(dp => Number(dp.value) || 0), 10);
                const height = maxValue > 0 ? `${(Number(dataPoint.value) / maxValue) * 100}%` : '0%';
                
                return (
                  <div key={dataPoint.id} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-3/4 rounded-t-sm" 
                      style={{
                        height,
                        backgroundColor: dataPoint.color || '#3b82f6',
                      }}
                    />
                    <div className="text-xs mt-1 text-center">
                      {dataPoint.label}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center text-gray-400">
                Add data points to see preview
              </div>
            )}
          </div>
          
          {chartData.xAxisLabel && (
            <div className="text-center text-xs text-gray-500 mt-2">
              {chartData.xAxisLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
