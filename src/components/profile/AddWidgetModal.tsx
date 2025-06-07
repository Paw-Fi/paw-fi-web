'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { Modal } from '@/components/ui/modal';
import { BaseWidget, Widget } from './types/dashboard-data.typings';
import { v4 as uuidv4 } from 'uuid';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widget: Widget) => void;
}

// Widget template options
const WIDGET_TEMPLATES = [
  {
    type: 'metricCard',
    title: 'Metric Card',
    description: 'Display a single metric with a label',
    data: { value: '0', description: 'Description' }
  },
  {
    type: 'barChart',
    title: 'Bar Chart',
    description: 'Visualize data with a bar chart',
    data: { values: [10, 20, 30, 40], labels: ['Q1', 'Q2', 'Q3', 'Q4'] }
  },
  {
    type: 'lineChart',
    title: 'Line Chart',
    description: 'Show trends with a line chart',
    data: { values: [5, 15, 10, 20], labels: ['Jan', 'Feb', 'Mar', 'Apr'] }
  },
  {
    type: 'quickCashFlowSummary',
    title: 'Cash Flow Summary',
    description: 'Overview of income and expenses',
    data: { income: 1000, expenses: 800 }
  },
  {
    type: 'recentTransactions',
    title: 'Recent Transactions',
    description: 'List of recent financial transactions',
    data: { transactions: [] }
  }
];

export function AddWidgetModal({ isOpen, onClose, onAddWidget }: AddWidgetModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [widgetTitle, setWidgetTitle] = useState('');

  const handleAddWidget = () => {
    const template = WIDGET_TEMPLATES.find(t => t.type === selectedTemplate);
    if (!template) return;
    
    const newWidget = {
      id: uuidv4(),
      title: widgetTitle || template.title,
      type: template.type,
      columnSpan: 1,
      data: { ...template.data }
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
      contentClassName="mx-auto max-w-lg flex flex-col rounded-xl bg-white p-6"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <h3 className="font-medium text-gray-800">{template.title}</h3>
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
