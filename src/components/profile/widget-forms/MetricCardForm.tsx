import React, { useState } from 'react';
import { IMetricCardWidget, IMetricCardItem, IMetricTrend } from '../types/dashboard-data.typings';
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

export function MetricCardForm({ data: widgetData, onDataChange }: WidgetFormProps<IMetricCardWidget>) {
  const [activeTab, setActiveTab] = useState<'general' | 'metrics'>('general');
  
  const metricData = widgetData.data || {
    title: '',
    description: '',
    metrics: [],
  };

  const handleGeneralChange = (field: 'title' | 'description', value: string) => {
    onDataChange({
      ...widgetData,
      data: {
        ...metricData,
        [field]: value,
      },
    });
  };

  const handleMetricChange = (index: number, field: keyof IMetricCardItem, value: string | number | IMetricTrend) => {
    const newMetrics = [...metricData.metrics];
    newMetrics[index] = { ...newMetrics[index], [field]: value };
    
    onDataChange({
      ...widgetData,
      data: {
        ...metricData,
        metrics: newMetrics,
      },
    });
  };

  const addMetric = () => {
    const newMetric: IMetricCardItem = {
      id: `metric-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label: `Metric ${metricData.metrics.length + 1}`,
      value: 0,
      change: 0,
      trend: 'neutral',
      format: 'number',
    };
    
    onDataChange({
      ...widgetData,
      data: {
        ...metricData,
        metrics: [...metricData.metrics, newMetric],
      },
    });
  };

  const removeMetric = (index: number) => {
    const newMetrics = [...metricData.metrics];
    newMetrics.splice(index, 1);
    
    onDataChange({
      ...widgetData,
      data: {
        ...metricData,
        metrics: newMetrics,
      },
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
          Metrics ({metricData.metrics.length})
        </button>
      </div>
      
      {activeTab === 'general' ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={metricData.title}
              onChange={(e) => handleGeneralChange('title', e.target.value)}
              placeholder="Widget title"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              value={metricData.description}
              onChange={(e) => handleGeneralChange('description', e.target.value)}
              placeholder="Widget description (optional)"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
            />
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Preview</h4>
            <div className="bg-white p-4 rounded border">
              {metricData.title ? (
                <h3 className="text-lg font-medium mb-1">{metricData.title}</h3>
              ) : (
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-1"></div>
              )}
              
              {metricData.description ? (
                <p className="text-sm text-gray-500 mb-4">{metricData.description}</p>
              ) : (
                <div className="h-4 bg-gray-100 rounded w-2/3 mb-4"></div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metricData.metrics.length > 0 ? (
                  metricData.metrics.slice(0, 4).map((metric, i) => (
                    <div key={i} className="p-3 border rounded">
                      <div className="text-sm text-gray-500">{metric.label || 'Metric'}</div>
                      <div className="text-xl font-bold">
                        {metric.format === 'currency' ? `$${metric.value}` : metric.value}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">Add metrics to see preview</div>
                )}
              </div>
            </div>
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
              {metricData.metrics.map((metric, index) => (
                <div key={metric.id} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label>Label</Label>
                        <Input
                          value={metric.label}
                          onChange={(e) => handleMetricChange(index, 'label', e.target.value)}
                          placeholder="Metric label"
                        />
                      </div>
                      
                      <div>
                        <Label>Value</Label>
                        <div className="relative">
                          {metric.format === 'currency' && (
                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                          )}
                          <Input
                            type="number"
                            value={metric.value}
                            onChange={(e) => handleMetricChange(index, 'value', Number(e.target.value))}
                            placeholder="Value"
                            className={metric.format === 'currency' ? 'pl-8' : ''}
                            min="0"
                            step={metric.format === 'currency' ? '0.01' : '1'}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>Change (%)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={metric.change}
                            onChange={(e) => handleMetricChange(index, 'change', Number(e.target.value))}
                            placeholder="Change"
                            step="0.1"
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
                    
                    <button
                      type="button"
                      onClick={() => removeMetric(index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                      title="Remove metric"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                  
                  <div className="mt-3 flex items-center space-x-2">
                    <div className="flex-1">
                      <Label className="flex items-center">
                        <input
                          type="radio"
                          name={`format-${metric.id}`}
                          checked={metric.format === 'number'}
                          onChange={() => handleMetricChange(index, 'format', 'number')}
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
                          checked={metric.format === 'currency'}
                          onChange={() => handleMetricChange(index, 'format', 'currency')}
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
