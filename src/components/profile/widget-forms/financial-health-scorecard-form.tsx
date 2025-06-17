import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { IFinancialHealthScorecardWidget, IFinancialHealthItem, IFinancialHealthScorecardData } from '../types/dashboard-data.typings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

interface FinancialHealthScorecardFormProps {
  data: IFinancialHealthScorecardWidget;
  onDataChange: (newData: IFinancialHealthScorecardWidget) => void;
}

const statusOptions: IFinancialHealthItem['status'][] = ['Excellent', 'Good', 'Fair', 'Needs Attention'];

export function FinancialHealthScorecardForm({ data: widgetDataProp, onDataChange }: FinancialHealthScorecardFormProps) {
  const [items, setItems] = useState<IFinancialHealthItem[]>(widgetDataProp.data.items || []);
  const [showIndividualScores, setShowIndividualScores] = useState<boolean>(widgetDataProp.showIndividualScores === undefined ? true : widgetDataProp.showIndividualScores);
  const [widgetTitle, setWidgetTitle] = useState<string>(widgetDataProp.title);

  useEffect(() => {
    setItems(widgetDataProp.data.items || []);
    setShowIndividualScores(widgetDataProp.showIndividualScores === undefined ? true : widgetDataProp.showIndividualScores);
    setWidgetTitle(widgetDataProp.title);
  }, [widgetDataProp]);

  const handleItemChange = (index: number, field: keyof IFinancialHealthItem, value: string | number | IFinancialHealthItem['status']) => {
    const newItems = [...items];
    // Type assertion for score and weight
    if (field === 'score' || field === 'weight') {
        newItems[index] = { ...newItems[index], [field]: value === '' ? undefined : Number(value) };
    } else {
        newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
    triggerDataChange(newItems, showIndividualScores, widgetTitle);
  };

  const addItem = () => {
    const newItem: IFinancialHealthItem = {
      id: uuidv4(),
      category: 'New Category',
      score: 0,
      status: 'Fair',
      explanation: '',
      weight: 0.1,
      displayOrder: items.length,
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    triggerDataChange(newItems, showIndividualScores, widgetTitle);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    triggerDataChange(newItems, showIndividualScores, widgetTitle);
  };

  const handleShowIndividualScoresChange = (checked: boolean) => {
    setShowIndividualScores(checked);
    triggerDataChange(items, checked, widgetTitle);
  };
  
  const handleTitleChange = (newTitle: string) => {
    setWidgetTitle(newTitle);
    triggerDataChange(items, showIndividualScores, newTitle);
  };

  const triggerDataChange = useCallback((updatedItems: IFinancialHealthItem[], updatedShowScores: boolean, updatedTitle: string) => {
    const newWidgetData: IFinancialHealthScorecardWidget = {
      ...widgetDataProp,
      title: updatedTitle,
      showIndividualScores: updatedShowScores,
      data: {
        ...widgetDataProp.data,
        items: updatedItems,
        // overallScore and overallStatus are typically calculated by the display component, not stored here
      } as IFinancialHealthScorecardData,
    };
    onDataChange(newWidgetData);
  }, [widgetDataProp, onDataChange]);


  return (
    <div className="space-y-6 p-1">
      <div>
        <Label htmlFor="widget-title-fhs">Widget Title</Label>
        <Input
          id="widget-title-fhs"
          value={widgetTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Financial Health Scorecard Title"
          className="mt-1"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="showIndividualScores"
          checked={showIndividualScores}
          onCheckedChange={(checked) => handleShowIndividualScoresChange(checked as boolean)}
        />
        <Label htmlFor="showIndividualScores" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Show Individual Scores
        </Label>
      </div>

      {items.map((item, index) => (
        <div key={item.id} className="p-4 border rounded-md space-y-3 bg-slate-50 dark:bg-slate-800">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300">Item {index + 1}</h4>
            <Button variant="outline" onClick={() => removeItem(index)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900 border-red-500 hover:border-red-700">
            <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
            </Button>
          </div>
          
          <div>
            <Label htmlFor={`fhs-category-${item.id}`}>Category</Label>
            <Input
              id={`fhs-category-${item.id}`}
              value={item.category}
              onChange={(e) => handleItemChange(index, 'category', e.target.value)}
              placeholder="e.g., Credit Score, Savings Ratio"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`fhs-score-${item.id}`}>Score</Label>
              <Input
                id={`fhs-score-${item.id}`}
                type="number"
                value={item.score}
                onChange={(e) => handleItemChange(index, 'score', e.target.value)}
                placeholder="e.g., 750 or 15"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`fhs-status-${item.id}`}>Status</Label>
              <Select
                value={item.status}
                onValueChange={(value) => handleItemChange(index, 'status', value as IFinancialHealthItem['status'])}
              >
                <SelectTrigger id={`fhs-status-${item.id}`} className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor={`fhs-explanation-${item.id}`}>Explanation</Label>
            <Textarea
              id={`fhs-explanation-${item.id}`}
              value={item.explanation}
              onChange={(e) => handleItemChange(index, 'explanation', e.target.value)}
              placeholder="Brief explanation of the score and status"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor={`fhs-weight-${item.id}`}>Weight (Optional, 0.0 to 1.0)</Label>
            <Input
              id={`fhs-weight-${item.id}`}
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={item.weight === undefined ? '' : item.weight}
              onChange={(e) => handleItemChange(index, 'weight', e.target.value)}
              placeholder="e.g., 0.3"
              className="mt-1"
            />
          </div>
        </div>
      ))}
      <Button onClick={addItem} variant="outline" className="w-full">
        Add Score Item
      </Button>
    </div>
  );
}
