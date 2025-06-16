import React from 'react';
import { ICountdownCardWidget, ICountdownCardData } from '../types/dashboard-data.typings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WidgetFormProps } from './types';

import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

export function CountdownCardForm({ data: widgetData, onDataChange }: WidgetFormProps<ICountdownCardWidget>) {
  const countdownData: ICountdownCardData = widgetData.data || {
    id: uuidv4(), // Ensure ID is present
    title: '',
    image: '', // Initialize image
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    days: 0, // Initialize, though it's calculated elsewhere
    showDays: true,
    showHours: true,
    showMinutes: true,
    showSeconds: true,
  };

  const handleChange = (field: keyof ICountdownCardData, value: string | boolean) => {
    onDataChange({
      ...widgetData,
      data: {
        ...countdownData,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={countdownData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Countdown title"
        />
      </div>

      <div className="space-y-2">
        <Label>Image URL</Label>
        <Input
          value={countdownData.image}
          onChange={(e) => handleChange('image', e.target.value)}
          placeholder="https://example.com/image.png"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Target Date</Label>
        <Input
          type="date"
          value={countdownData.targetDate}
          onChange={(e) => handleChange('targetDate', e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-48"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Display Options</Label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={countdownData.showDays}
              onChange={(e) => handleChange('showDays', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Show Days</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={countdownData.showHours}
              onChange={(e) => handleChange('showHours', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Show Hours</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={countdownData.showMinutes}
              onChange={(e) => handleChange('showMinutes', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Show Minutes</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={countdownData.showSeconds}
              onChange={(e) => handleChange('showSeconds', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Show Seconds</span>
          </label>
        </div>
      </div>
      
      <div className="p-4 bg-blue-50 rounded-lg mt-4">
        <h4 className="font-medium text-blue-800 mb-2">Preview</h4>
        <div className="bg-white p-4 rounded border">
          {countdownData.title ? (
            <h3 className="text-lg font-medium mb-2">{countdownData.title}</h3>
          ) : (
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          )}
          
          <div className="flex items-center space-x-2">
            {countdownData.showDays && (
              <div className="text-center">
                <div className="text-2xl font-bold bg-gray-100 rounded p-2 min-w-[60px]">00</div>
                <div className="text-xs text-gray-500 mt-1">Days</div>
              </div>
            )}
            
            {countdownData.showHours && (
              <>
                <div className="text-xl text-gray-400">:</div>
                <div className="text-center">
                  <div className="text-2xl font-bold bg-gray-100 rounded p-2 min-w-[60px]">00</div>
                  <div className="text-xs text-gray-500 mt-1">Hours</div>
                </div>
              </>
            )}
            
            {countdownData.showMinutes && (
              <>
                <div className="text-xl text-gray-400">:</div>
                <div className="text-center">
                  <div className="text-2xl font-bold bg-gray-100 rounded p-2 min-w-[60px]">00</div>
                  <div className="text-xs text-gray-500 mt-1">Mins</div>
                </div>
              </>
            )}
            
            {countdownData.showSeconds && (
              <>
                <div className="text-xl text-gray-400">:</div>
                <div className="text-center">
                  <div className="text-2xl font-bold bg-gray-100 rounded p-2 min-w-[60px]">00</div>
                  <div className="text-xs text-gray-500 mt-1">Secs</div>
                </div>
              </>
            )}
          </div>
          
          <div className="mt-2 text-sm text-gray-500">
            Target: {countdownData.targetDate ? new Date(countdownData.targetDate).toLocaleDateString() : 'Not set'}
          </div>
        </div>
      </div>
    </div>
  );
}
