import React, { useState, useEffect } from 'react';
import type { IMetricCardWidget, IMetricCardItem, IMetricTrend, IMetricCardData } from '../types/dashboard-data.typings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faArrowUp, faArrowDown, faMinus } from '@fortawesome/free-solid-svg-icons';
import { WidgetFormProps } from './types';

const trendOptions = [
  { value: 'up', label: 'Up', icon: faArrowUp, color: 'text-green-500' },
  { value: 'down', label: 'Down', icon: faArrowDown, color: 'text-red-500' },
  { value: 'neutral', label: 'Neutral', icon: faMinus, color: 'text-gray-500' },
];

export function MetricCardForm({ data: widgetDataProp, onDataChange }: WidgetFormProps<IMetricCardWidget>) {
  const actualCardData = widgetDataProp.data; // This is IMetricCardData | undefined

  // Local state for the form, initialized from actualCardData or defaults
  const [metricData, setMetricDataState] = useState<IMetricCardData>(() => ({
    title: actualCardData?.title || '',
    description: actualCardData?.description || '',
    metrics: actualCardData?.metrics || []
  }));

  const [activeTab, setActiveTab] = useState<'general' | 'metrics'>('general');

  // Effect to update local state if the incoming widgetDataProp.data changes (e.g. after save & re-edit)
  useEffect(() => {
    const newActualCardData = widgetDataProp.data;
    setMetricDataState({
        title: newActualCardData?.title || '',
        description: newActualCardData?.description || '',
        metrics: newActualCardData?.metrics || []
    });
  }, [widgetDataProp.data]);


  const handleGeneralChange = (field: 'title' | 'description', value: string) => {
    const updatedLocalMetricData = {
      ...metricData,
      [field]: value,
    };
    setMetricDataState(updatedLocalMetricData);
    onDataChange({
      ...widgetDataProp,
      data: updatedLocalMetricData,
    });
  };

  const handleMetricChange = (index: number, field: keyof IMetricCardItem, value: string | number | IMetricTrend | undefined) => {
    const newMetrics = [...metricData.metrics];
    // Ensure the metric item exists before trying to update it
    if (newMetrics[index]) {
      newMetrics[index] = { ...newMetrics[index], [field]: value };
    } else {
      // This case should ideally not happen if IDs are managed well, but as a fallback:
      console.warn(`Attempted to update non-existent metric at index ${index}`);
      return; // Or handle error appropriately
    }

    const updatedLocalMetricData = {
      ...metricData,
      metrics: newMetrics,
    };
    setMetricDataState(updatedLocalMetricData);
    onDataChange({
      ...widgetDataProp,
      data: updatedLocalMetricData,
    });
  };

  const addMetric = () => {
    const newMetric: IMetricCardItem = {
      id: `metric-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      description: `Metric ${metricData.metrics.length + 1}`,
      value: '0',
      currency: '$',
      trend: 'neutral',
      trendPercentage: '0',
    };
    
    const updatedLocalMetricData = {
      ...metricData,
      metrics: [...metricData.metrics, newMetric],
    };
    setMetricDataState(updatedLocalMetricData);
    onDataChange({
      ...widgetDataProp,
      data: updatedLocalMetricData,
    });
  };

  const removeMetric = (index: number) => {
    const newMetrics = [...metricData.metrics];
    newMetrics.splice(index, 1);
    
    const updatedLocalMetricData = {
      ...metricData,
      metrics: newMetrics,
    };
    setMetricDataState(updatedLocalMetricData);
    onDataChange({
      ...widgetDataProp,
      data: updatedLocalMetricData,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex border-b">
        <button
          type="button"
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'general' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          type="button"
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'metrics' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('metrics')}
        >
          Metrics ({(metricData.metrics || []).length})
        </button>
      </div>
      
      {activeTab === 'general' ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={metricData.title || ''}
              onChange={(e) => handleGeneralChange('title', e.target.value)}
              placeholder="Widget title"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              value={metricData.description || ''}
              onChange={(e) => handleGeneralChange('description', e.target.value)}
              placeholder="Widget description (optional)"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
            />
          </div>
          
          
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addMetric}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-1.5 h-3 w-3" />
              Add Metric
            </button>
          </div>
          
          {metricData.metrics.length > 0 ? (
            <div className="space-y-3">
              {(metricData.metrics || []).map((metric: IMetricCardItem, index: number) => (
                <div key={metric.id} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor={`metric-description-${index}`}>Label</Label>
                        <Input
                          id={`metric-description-${index}`}
                          value={metric.description || ''}
                          onChange={(e) => handleMetricChange(index, 'description', e.target.value)}
                          placeholder="Metric label"
                        />
                      </div>
                      
                      <div>
                        <Label>Value</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">
                            {metric.currency || '$'}
                          </span>
                          <Input
                            type="text"
                            value={metric.value}
                            onChange={(e) => handleMetricChange(index, 'value', e.target.value)}
                            placeholder="0.00"
                            className={'pl-6'}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>Trend Percentage</Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={metric.trendPercentage || ''}
                            onChange={(e) => handleMetricChange(index, 'trendPercentage', e.target.value)}
                            placeholder="0.0"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>Trend</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {trendOptions.map((trend) => (
                            <button
                              key={trend.value}
                              type="button"
                              className={`flex items-center justify-center p-2 rounded border ${
                                metric.trend === trend.value
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                              onClick={() => handleMetricChange(index, 'trend', trend.value as IMetricTrend)}
                              title={trend.label}
                            >
                              <FontAwesomeIcon 
                                icon={trend.icon} 
                                className={`${trend.color} ${trend.value === 'neutral' ? 'text-gray-400' : ''}`} 
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <FontAwesomeIcon
                      type="button"
                      icon={faTrash}
                      onClick={() => removeMetric(index)}
                      className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                    
                    />
                  </div>
                  
                  <div className="mt-3 flex items-center space-x-2">
                    <div className="flex-1">
                      <Label className="flex items-center">
                        <input
                          type="radio"
                          name={`format-${metric.id}`}
                          // checked={metric.format === 'number'} // format is not in IMetricCardItem
                          // onChange={() => handleMetricChange(index, 'format', 'number')} // format is not in IMetricCardItem
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2">Number</span>
                      </Label>
                    </div>
                    <div>
                      <Label className="flex items-center">
                        <input
                          type="radio"
                          name={`format-${metric.id}`}
                          // checked={metric.format === 'currency'} // format is not in IMetricCardItem
                          // onChange={() => handleMetricChange(index, 'format', 'currency')} // format is not in IMetricCardItem
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2">Currency</span>
                      </Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-gray-500">No metrics added yet. Click "Add Metric" to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
