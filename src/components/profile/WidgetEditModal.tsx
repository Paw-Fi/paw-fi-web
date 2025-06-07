'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { Modal } from '@/components/ui/modal';
import { BaseWidget, Widget } from './types/dashboard-data.typings';

interface WidgetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  widget: Widget | null;
  onSave: (updatedWidget: Widget) => void;
}

export function WidgetEditModal({ isOpen, onClose, widget, onSave }: WidgetEditModalProps) {
  const [title, setTitle] = useState('');
  const [widgetData, setWidgetData] = useState<any>(null);

  // Initialize form when widget changes
  useEffect(() => {
    if (widget) {
      setTitle(widget.title);
      setWidgetData(widget.data);
    }
  }, [widget]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!widget) return;
    
    const updatedWidget = {
      ...widget,
      title,
      data: widgetData
    };
    
    onSave(updatedWidget as Widget);
    onClose();
  };

  // Render different form fields based on widget type
  const renderWidgetFields = () => {
    if (!widget) return null;

    switch ((widget as any).type) {
      case 'metricCard':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={widgetData?.value || ''}
                onChange={(e) => setWidgetData({...widgetData, value: e.target.value})}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={widgetData?.description || ''}
                onChange={(e) => setWidgetData({...widgetData, description: e.target.value})}
              />
            </div>
          </>
        );
      
      case 'barChart':
      case 'lineChart':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Chart Data (comma-separated values)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={widgetData?.values?.join(', ') || ''}
              onChange={(e) => {
                const values = e.target.value.split(',').map(v => Number(v.trim()));
                setWidgetData({
                  ...widgetData,
                  values
                });
              }}
            />
            <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">Labels (comma-separated)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={widgetData?.labels?.join(', ') || ''}
              onChange={(e) => {
                const labels = e.target.value.split(',').map(l => l.trim());
                setWidgetData({
                  ...widgetData,
                  labels
                });
              }}
            />
          </div>
        );
      
      case 'quickCashFlowSummary':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Income</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={widgetData?.income || 0}
                onChange={(e) => setWidgetData({...widgetData, income: Number(e.target.value)})}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Expenses</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={widgetData?.expenses || 0}
                onChange={(e) => setWidgetData({...widgetData, expenses: Number(e.target.value)})}
              />
            </div>
          </>
        );
      
      default:
        return (
          <div className="p-4 bg-gray-100 rounded-md">
            <p className="text-gray-600">Advanced editing options for this widget type are not available in the UI.</p>
            <p className="text-gray-600 text-sm mt-2">Please contact support for custom widget configuration.</p>
          </div>
        );
    }
  };

  if (!widget) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      contentClassName="mx-auto max-w-lg flex flex-col rounded-xl bg-white p-6"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Edit Widget</h2>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <FontAwesomeIcon icon={faTimes} className="h-5 w-5 text-gray-500" />
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Widget Title</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        {renderWidgetFields()}
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
