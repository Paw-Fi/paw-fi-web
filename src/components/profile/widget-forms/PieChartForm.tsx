import React, { useState, useCallback } from 'react';
import { IPieChartWidget, IChartData, IChartDataPoint } from '../types/dashboard-data.typings';
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

interface SortablePieChartItemProps {
  id: UniqueIdentifier;
  children: (listeners: DraggableSyntheticListeners, attributesForDraggableNode: DraggableAttributes) => React.ReactNode;
}

export function SortablePieChartItem({ id, children }: SortablePieChartItemProps) {
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

export function PieChartForm({ data: widgetData, onDataChange }: WidgetFormProps<IPieChartWidget>) {
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
      label: `Slice ${dataPoints.length + 1}`,
      value: 0,
      color: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.8)`,
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

  const handleShowLegendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDataChange({
      ...widgetData,
      data: {
        ...chartData,
        showLegend: e.target.checked
      }
    });
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const height = parseInt(e.target.value, 10);
    onDataChange({
      ...widgetData,
      data: {
        ...chartData,
        height: isNaN(height) ? undefined : height
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="show-legend">Show Legend</Label>
          <div className="flex items-center">
            <input
              id="show-legend"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              checked={chartData.showLegend ?? true}
              onChange={handleShowLegendChange}
            />
            <label htmlFor="show-legend" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
              Display chart legend
            </label>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="chart-height">Chart Height (px)</Label>
          <Input
            id="chart-height"
            type="number"
            min={100}
            step={10}
            value={chartData.height || ''}
            onChange={handleHeightChange}
            placeholder="Auto"
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
                <SortablePieChartItem key={dataPoint.id} id={dataPoint.id}>
                  {(listeners, attributes) => (
                    <div className={`p-2 border rounded-lg ${isDragging ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}`}>
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
                                value={dataPoint.color?.startsWith('rgba') ? rgbaToHex(dataPoint.color) : dataPoint.color}
                                onChange={(e) => {
                                  const hexColor = e.target.value;
                                  const rgbaColor = hexToRgba(hexColor, 0.8);
                                  handleDataPointChange(index, 'color', rgbaColor);
                                }}
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
                </SortablePieChartItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      
      <Button type="button" onClick={addDataPoint} variant="outline" className="w-full">
        <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Data Point
      </Button>
    </div>
  );
}

// Helper functions for color conversion
function hexToRgba(hex: string, alpha: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgbaToHex(rgba: string): string {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (!match) return '#000000';
  
  const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
  const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
  const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
}
