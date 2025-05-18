'use client';

import { QuestionType } from '@/types/learning.types';

interface QuestionTypeSelectorProps {
  onSelect: (questionType: QuestionType) => void;
  onCancel: () => void;
}

interface QuestionTypeOption {
  type: QuestionType;
  label: string;
  description: string;
  icon: string;
}

export function QuestionTypeSelector({ onSelect, onCancel }: QuestionTypeSelectorProps) {
  const questionTypes: QuestionTypeOption[] = [
    {
      type: 'mcq',
      label: 'Multiple Choice',
      description: 'Multiple correct answers can be selected',
      icon: '☑️',
    },
    {
      type: 'scq',
      label: 'Single Choice',
      description: 'Only one correct answer can be selected',
      icon: '🔘',
    },
    {
      type: 'sort-order',
      label: 'Sorting',
      description: 'Arrange items in the correct order',
      icon: '📊',
    },
    {
      type: 'sort-categories',
      label: 'Categorization',
      description: 'Group items into correct categories',
      icon: '📋',
    },
    {
      type: 'match',
      label: 'Matching',
      description: 'Match items from two columns',
      icon: '🔄',
    },
    {
      type: 'text-input',
      label: 'Text Input',
      description: 'Type in the correct answer',
      icon: '📝',
    },
    {
      type: 'matrix-rating',
      label: 'Matrix Rating',
      description: 'Rate items on a scale',
      icon: '📏',
    },
    {
      type: 'image-choice',
      label: 'Image Choice',
      description: 'Select from image options',
      icon: '🖼️',
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {questionTypes.map((qType) => (
          <button
            key={qType.type}
            onClick={() => onSelect(qType.type)}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary hover:shadow-md transition-all flex flex-col items-center text-center"
          >
            <span className="text-3xl mb-2">{qType.icon}</span>
            <h3 className="font-medium mb-1">{qType.label}</h3>
            <p className="text-xs text-gray-600">{qType.description}</p>
          </button>
        ))}
      </div>
      
      <div className="mt-6 flex justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
