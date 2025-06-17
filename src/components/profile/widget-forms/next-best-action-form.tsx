import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { INextBestActionWidget, INextBestActionItem, INextBestActionData } from '../types/dashboard-data.typings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';

interface NextBestActionFormProps {
  data: INextBestActionWidget;
  onDataChange: (newData: INextBestActionWidget) => void;
}

const priorityOptions: INextBestActionItem['priority'][] = ['low', 'medium', 'high', 'urgent'];

export function NextBestActionForm({ data: widgetDataProp, onDataChange }: NextBestActionFormProps) {
  const [items, setItems] = useState<INextBestActionItem[]>(widgetDataProp.data || []);
  const [widgetTitle, setWidgetTitle] = useState<string>(widgetDataProp.title);
  const [maxDisplayItems, setMaxDisplayItems] = useState<number | undefined>(widgetDataProp.maxDisplayItems);
  const [filterByPriority, setFilterByPriority] = useState<INextBestActionItem['priority'] | undefined>(widgetDataProp.filterByPriority);

  useEffect(() => {
    setItems(widgetDataProp.data || []);
    setWidgetTitle(widgetDataProp.title);
    setMaxDisplayItems(widgetDataProp.maxDisplayItems);
    setFilterByPriority(widgetDataProp.filterByPriority);
  }, [widgetDataProp]);

  const handleItemChange = (index: number, field: keyof INextBestActionItem, value: string | boolean | INextBestActionItem['priority']) => {
    const newItems = [...items];
    if (field === 'isCompleted') {
      newItems[index] = { ...newItems[index], [field]: Boolean(value) };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
    triggerDataChange(newItems, widgetTitle, maxDisplayItems, filterByPriority);
  };

  const addItem = () => {
    const newItem: INextBestActionItem = {
      id: uuidv4(),
      title: 'New Action',
      message: '',
      priority: 'medium',
      isCompleted: false,
      displayOrder: items.length,
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    triggerDataChange(newItems, widgetTitle, maxDisplayItems, filterByPriority);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    triggerDataChange(newItems, widgetTitle, maxDisplayItems, filterByPriority);
  };
  
  const handleTitleChange = (newTitle: string) => {
    setWidgetTitle(newTitle);
    triggerDataChange(items, newTitle, maxDisplayItems, filterByPriority);
  };

  const handleMaxDisplayItemsChange = (value: string) => {
    const num = value === '' ? undefined : parseInt(value, 10);
    setMaxDisplayItems(num);
    triggerDataChange(items, widgetTitle, num, filterByPriority);
  };

  const handleFilterByPriorityChange = (value: string) => {
    const priority = value === 'all' || value === '' ? undefined : value as INextBestActionItem['priority'];
    setFilterByPriority(priority);
    triggerDataChange(items, widgetTitle, maxDisplayItems, priority);
  };

  const triggerDataChange = useCallback((
    currentItems: INextBestActionItem[],
    currentTitle: string,
    currentMaxItems: number | undefined,
    currentPriorityFilter: INextBestActionItem['priority'] | undefined
  ) => {
    const newWidgetData: INextBestActionWidget = {
      ...widgetDataProp,
      title: currentTitle,
      maxDisplayItems: currentMaxItems,
      filterByPriority: currentPriorityFilter,
      data: currentItems as INextBestActionData, // data is directly the array of items
    };
    onDataChange(newWidgetData);
  }, [widgetDataProp, onDataChange]);

  return (
    <div className="space-y-6 p-1">
      <div>
        <Label htmlFor="widget-title-nba">Widget Title</Label>
        <Input
          id="widget-title-nba"
          value={widgetTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Next Best Action Title"
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nba-max-items">Max Items to Display (Optional)</Label>
          <Input
            id="nba-max-items"
            type="number"
            min="1"
            value={maxDisplayItems === undefined ? '' : maxDisplayItems}
            onChange={(e) => handleMaxDisplayItemsChange(e.target.value)}
            placeholder="e.g., 3"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="nba-filter-priority">Filter by Priority (Optional)</Label>
          <Select
            value={filterByPriority || 'all'}
            onValueChange={handleFilterByPriorityChange}
          >
            <SelectTrigger id="nba-filter-priority" className="mt-1">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {priorityOptions.map(option => (
                <SelectItem key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {items.map((item, index) => (
        <div key={item.id} className="p-4 border rounded-md space-y-3 bg-slate-50 dark:bg-slate-800">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300">Action {index + 1}</h4>
            <Button variant="outline" size="icon" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900 border-red-500 hover:border-red-700">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div>
            <Label htmlFor={`nba-title-${item.id}`}>Title</Label>
            <Input
              id={`nba-title-${item.id}`}
              value={item.title}
              onChange={(e) => handleItemChange(index, 'title', e.target.value)}
              placeholder="Action Title"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor={`nba-message-${item.id}`}>Message</Label>
            <Textarea
              id={`nba-message-${item.id}`}
              value={item.message}
              onChange={(e) => handleItemChange(index, 'message', e.target.value)}
              placeholder="Detailed message for the action"
              className="mt-1"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`nba-priority-${item.id}`}>Priority</Label>
              <Select
                value={item.priority}
                onValueChange={(value) => handleItemChange(index, 'priority', value as INextBestActionItem['priority'])}
              >
                <SelectTrigger id={`nba-priority-${item.id}`} className="mt-1">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(option => (
                    <SelectItem key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor={`nba-category-${item.id}`}>Category (Optional)</Label>
              <Input
                id={`nba-category-${item.id}`}
                value={item.category || ''}
                onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                placeholder="e.g., Savings, Investment"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`nba-cta-${item.id}`}>Call to Action (Optional)</Label>
              <Input
                id={`nba-cta-${item.id}`}
                value={item.callToAction || ''}
                onChange={(e) => handleItemChange(index, 'callToAction', e.target.value)}
                placeholder="e.g., Learn More"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`nba-link-${item.id}`}>Action Link (Optional URL)</Label>
              <Input
                id={`nba-link-${item.id}`}
                value={item.actionLink || ''}
                onChange={(e) => handleItemChange(index, 'actionLink', e.target.value)}
                placeholder="https://example.com/learn"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <Label htmlFor={`nba-duedate-${item.id}`}>Due Date (Optional)</Label>
              <Input
                id={`nba-duedate-${item.id}`}
                type="date"
                value={item.dueDate || ''}
                onChange={(e) => handleItemChange(index, 'dueDate', e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-center space-x-2 pt-5">
              <Checkbox
                id={`nba-completed-${item.id}`}
                checked={item.isCompleted || false}
                onCheckedChange={(checked) => handleItemChange(index, 'isCompleted', checked as boolean)}
              />
              <Label htmlFor={`nba-completed-${item.id}`} className="text-sm font-medium leading-none">
                Completed
              </Label>
            </div>
          </div>

        </div>
      ))}
      <Button onClick={addItem} variant="outline" className="w-full">
        Add Next Best Action
      </Button>
    </div>
  );
}
