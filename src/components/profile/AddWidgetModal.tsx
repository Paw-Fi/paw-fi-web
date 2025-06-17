'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { Modal } from '@/components/ui/modal';
import { IBaseWidget, Widget } from './types/dashboard-data.typings';
import { v4 as uuidv4 } from 'uuid';
import { widgetTypeConfig, WidgetTypeKey } from './WidgetEditModal';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widget: Widget) => void;
}

// Widget descriptions for the add widget modal
const widgetDescriptions: Record<WidgetTypeKey, string> = {
  metricCard: 'Display a single metric with a label',
  progressBarList: 'Show progress towards multiple goals',
  countdownCard: 'Count down to an important date',
  tipCard: 'Display helpful financial tips',
  dataList: 'Show a list of categorized data items',
  barChart: 'Visualize data with a bar chart',
  lineChart: 'Show trends with a line chart',
  financialHealthScorecard: 'View your overall financial health score',
  nextBestAction: 'Get recommendations for your next financial steps',
  quickCashFlowSummary: 'Overview of income and expenses',
  debtVisualizer: 'Visualize and plan debt payoff strategies',
  retirementReadiness: 'Track progress towards retirement goals',
  enhancedSavingsGoals: 'Set and monitor savings goals',
  insuranceCoverage: 'Track your insurance policies and coverage',
  checklist: 'Create a checklist of financial tasks'
};

// Create widget templates from widgetTypeConfig
const WIDGET_TEMPLATES = Object.entries(widgetTypeConfig).map(([type, config]) => ({
  type: type as WidgetTypeKey,
  title: config.title || type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
  description: widgetDescriptions[type as WidgetTypeKey] || 'Configure this widget',
  icon: config.icon,
  defaultData: config.defaultData
}));

export function AddWidgetModal({ isOpen, onClose, onAddWidget }: AddWidgetModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [widgetTitle, setWidgetTitle] = useState('');

  const handleAddWidget = () => {
    const template = WIDGET_TEMPLATES.find(t => t.type === selectedTemplate);
    if (!template) return;
    
    // Create a deep clone of the defaultData to avoid reference issues
    const defaultData = template.defaultData ? JSON.parse(JSON.stringify(template.defaultData)) : {};
    
    // Create a new widget with a unique ID
    const newWidget = {
      ...defaultData,
      id: uuidv4(),
      title: widgetTitle || template.title,
    } as Widget;
    
    onAddWidget(newWidget);
    resetForm();
    onClose();
  };
  
  const resetForm = () => {
    setSelectedTemplate(null);
    setWidgetTitle('');
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => {
        resetForm();
        onClose();
      }}
      contentClassName="mx-auto max-w-2xl flex flex-col rounded-xl bg-white p-6"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Add New Widget</h2>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <FontAwesomeIcon icon={faTimes} className="h-5 w-5 text-gray-500" />
        </button>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Widget Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
          {WIDGET_TEMPLATES.map((template) => (
            <div 
              key={template.type}
              className={`
                border rounded-lg p-3 cursor-pointer transition-all
                ${selectedTemplate === template.type 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                  : 'border-gray-200 hover:border-gray-300'}
              `}
              onClick={() => setSelectedTemplate(template.type)}
            >
              <div className="flex items-center">
                {template.icon && <FontAwesomeIcon icon={template.icon} className="h-4 w-4 mr-2 text-gray-600" />}
                <h3 className="font-medium text-gray-800">{template.title}</h3>
              </div>
              <p className="text-sm text-gray-500 mt-1">{template.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      {selectedTemplate && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Widget Title</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={widgetTitle}
            onChange={(e) => setWidgetTitle(e.target.value)}
            placeholder={WIDGET_TEMPLATES.find(t => t.type === selectedTemplate)?.title}
          />
        </div>
      )}
      
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={() => {
            resetForm();
            onClose();
          }}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleAddWidget}
          disabled={!selectedTemplate}
          className={`
            px-4 py-2 rounded-md
            ${!selectedTemplate 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-primary text-white hover:bg-primary-dark'}
          `}
        >
          Add Widget
        </button>
      </div>
    </Modal>
  );
}
