import React from 'react';
import { IDataListWidget, IDataListItem } from '../types/dashboard-data.typings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

interface WidgetFormProps<T = any> {
  data: T;
  onDataChange: (data: T) => void;
}

export function DataListForm({ data: widgetData, onDataChange }: WidgetFormProps<IDataListWidget>) {
  const items: IDataListItem[] = widgetData.data || [];
  
  const handleItemChange = (index: number, field: keyof IDataListItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onDataChange({ ...widgetData, data: newItems });
  };

  const addItem = () => {
    const newItem: IDataListItem = { 
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, 
      label: '', 
      value: '', 
      currency: '$', 
      displayOrder: items.length 
    };
    onDataChange({ ...widgetData, data: [...items, newItem] });
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onDataChange({ ...widgetData, data: newItems });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={widgetData.title || ''}
          onChange={(e) => onDataChange({ ...widgetData, title: e.target.value })}
          placeholder="Enter title"
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Items</Label>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add Item
          </Button>
        </div>
        
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center space-x-2 p-2 border rounded">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <Input
                  value={item.label}
                  onChange={(e) => handleItemChange(index, 'label', e.target.value)}
                  placeholder="Label"
                />
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 rounded-l-md bg-gray-100 text-gray-500 text-sm">
                    {item.currency}
                  </span>
                  <Input
                    type="number"
                    value={item.value}
                    onChange={(e) => handleItemChange(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="rounded-l-none"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700"
              >
                <FontAwesomeIcon icon={faTrash} />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
