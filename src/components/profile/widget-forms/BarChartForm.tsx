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
  const chartData = widgetData.data || { series: [] };
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

  const handleSeriesChange = (index: number, field: keyof IChartDataPoint, value: string | number) => {
    const newSeries = [...chartData.series];
    newSeries[index] = { ...newSeries[index], [field]: value };
    onDataChange({
      ...widgetData,
      data: {
        ...chartData,
        series: newSeries,
      },
    });
  };

  const addSeries = useCallback(() => {
    const newSeries: IChartDataPoint = {
      id: `series-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label: `Series ${chartData.series.length + 1}`,
      value: 0,
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
    };
    
    onDataChange({
      ...widgetData,
      data: {
        ...chartData,
        series: [...chartData.series, newSeries],
      },
    });
  }, [chartData, widgetData, onDataChange]);

  const removeSeries = useCallback((index: number) => {
    const newSeries = [...chartData.series];
    newSeries.splice(index, 1);
    onDataChange({
      ...widgetData,
      data: {
        ...chartData,
        series: newSeries,
      },
    });
  }, [chartData, widgetData, onDataChange]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = chartData.series.findIndex((item) => item.id === active.id);
      const newIndex = chartData.series.findIndex((item) => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSeries = arrayMove(chartData.series, oldIndex, newIndex);
        
        onDataChange({
          ...widgetData,
          data: {
            ...chartData,
            series: newSeries,
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
          <Label>Data Series</Label>
          <Button type="button" size="sm" variant="outline" onClick={addSeries}>
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add Series
          </Button>
        </div>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
        >
          <SortableContext 
            items={chartData.series.map(item => item.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {chartData.series.map((series, index) => (
                <SortableBarChartItem key={series.id} id={series.id}>
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
                              value={series.label}
                              onChange={(e) => handleSeriesChange(index, 'label', e.target.value)}
                              placeholder="Label"
                            />
                          </div>
                          
                          <div>
                            <Label>Value</Label>
                            <Input
                              type="number"
                              value={series.value}
                              onChange={(e) => handleSeriesChange(index, 'value', Number(e.target.value))}
                              placeholder="Value"
                            />
                          </div>
                          
                          <div>
                            <Label>Color</Label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="color"
                                value={series.color}
                                onChange={(e) => handleSeriesChange(index, 'color', e.target.value)}
                                className="h-10 w-10 p-1 border rounded"
                              />
                              <Input
                                value={series.color}
                                onChange={(e) => handleSeriesChange(index, 'color', e.target.value)}
                                placeholder="Color code"
                                className="flex-1"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSeries(index)}
                          className="text-red-500 hover:text-red-700"
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
      
      <div className="space-y-2">
        <Label>Preview</Label>
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="h-48 flex items-end space-x-2">
            {chartData.series.length > 0 ? (
              chartData.series.map((series, index) => {
                const maxValue = Math.max(...chartData.series.map(s => Number(s.value) || 0), 10);
                const height = maxValue > 0 ? `${(Number(series.value) / maxValue) * 100}%` : '0%';
                
                return (
                  <div key={series.id} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-3/4 rounded-t-sm" 
                      style={{
                        height,
                        backgroundColor: series.color || '#3b82f6',
                      }}
                    />
                    <div className="text-xs mt-1 text-center">
                      {series.label}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center text-gray-400">
                Add data series to see preview
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
