'use client';

import { useState, useEffect } from 'react';
import type { LearningQuizQuestion, QuestionType } from '@/types/learning.types';
import { generateUniqueId } from '@/utils/id-generator';

interface QuestionEditorProps {
  question: LearningQuizQuestion;
  onUpdate: (updatedQuestion: LearningQuizQuestion) => void;
}

export function QuestionEditor({ question, onUpdate }: QuestionEditorProps) {
  const [questionText, setQuestionText] = useState(question.question);
  const [explanation, setExplanation] = useState(question.explanation || '');
  const [incorrect_explanation, setIncorrectExplanation] = useState(question.incorrect_explanation || '');
  const [options, setOptions] = useState<any[]>(question.options || []);
  const [items, setItems] = useState<any[]>(question.items || []);
  const [correctAnswer, setCorrectAnswer] = useState<string | string[] | undefined>(
    question.correctAnswer || ''
  );

  // Update form when question prop changes
  useEffect(() => {
    setQuestionText(question.question);
    setExplanation(question.explanation || '');
    setIncorrectExplanation(question.incorrect_explanation || '');
    setOptions(question.options || []);
    setItems(question.items || []);
    setCorrectAnswer(question.correctAnswer || '');
  }, [question]);

  const handleSave = () => {
    const updatedQuestion: LearningQuizQuestion = {
      ...question,
      question: questionText,
      explanation,
      incorrect_explanation,
    };

    if (question.type === 'mcq' || question.type === 'scq' || question.type === 'image-choice') {
      updatedQuestion.options = options;
    }

    if (question.type === 'sort-order' || question.type === 'sort-categories') {
      updatedQuestion.items = items;
    }

    if (question.type === 'text-input') {
      updatedQuestion.correctAnswer = correctAnswer;
    }

    onUpdate(updatedQuestion);
  };

  const handleAddOption = () => {
    const newOption = {
      id: generateUniqueId(),
      content: `Option ${options.length + 1}`,
      isCorrect: false,
    };
    
    setOptions([...options, newOption]);
  };

  const handleUpdateOption = (index: number, field: string, value: any) => {
    const updatedOptions = [...options];
    updatedOptions[index] = {
      ...updatedOptions[index],
      [field]: value,
    };
    
    // For single choice questions, ensure only one option is correct
    if (question.type === 'scq' && field === 'isCorrect' && value === true) {
      updatedOptions.forEach((opt, i) => {
        if (i !== index) {
          updatedOptions[i] = { ...updatedOptions[i], isCorrect: false };
        }
      });
    }
    
    setOptions(updatedOptions);
  };

  const handleRemoveOption = (index: number) => {
    const updatedOptions = [...options];
    updatedOptions.splice(index, 1);
    setOptions(updatedOptions);
  };

  const handleAddItem = () => {
    const newItem = {
      id: generateUniqueId(),
      content: `Item ${items.length + 1}`,
    };
    
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    setItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);
  };

  return (
    <div className="space-y-6">
      {/* Common fields for all question types */}
      <div>
        <label htmlFor="question-text" className="block text-sm font-medium text-gray-700 mb-1">
          Question Text
        </label>
        <textarea
          id="question-text"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          rows={2}
        />
      </div>

      {/* Options for MCQ, SCQ */}
      {(question.type === 'mcq' || question.type === 'scq') && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              {question.type === 'mcq' ? 'Multiple Choice Options' : 'Single Choice Options'}
            </label>
            <button
              type="button"
              onClick={handleAddOption}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              + Add Option
            </button>
          </div>
          
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={option.id} className="flex items-start border border-gray-200 rounded-lg p-3">
                <div className="flex-grow">
                  <div className="flex items-center mb-2">
                    <input
                      type={question.type === 'mcq' ? 'checkbox' : 'radio'}
                      checked={option.isCorrect}
                      onChange={(e) => handleUpdateOption(index, 'isCorrect', e.target.checked)}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Correct Answer
                    </label>
                  </div>
                  <input
                    type="text"
                    value={option.content}
                    onChange={(e) => handleUpdateOption(index, 'content', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Option text"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  className="ml-3 text-red-500 hover:text-red-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items for sort-order and sort-categories */}
      {(question.type === 'sort-order' || question.type === 'sort-categories') && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              {question.type === 'sort-order' ? 'Sorting Items' : 'Categorization Items'}
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              + Add Item
            </button>
          </div>
          
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center border border-gray-200 rounded-lg p-3">
                <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-gray-500 mr-3">
                  {index + 1}
                </div>
                
                <input
                  type="text"
                  value={item.content}
                  onChange={(e) => handleUpdateItem(index, 'content', e.target.value)}
                  className="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Item text"
                />
                
                {question.type === 'sort-categories' && (
                  <select
                    value={item.category || ''}
                    onChange={(e) => handleUpdateItem(index, 'category', e.target.value)}
                    className="ml-3 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select Category</option>
                    <option value="cat-1">Category 1</option>
                    <option value="cat-2">Category 2</option>
                    <option value="cat-3">Category 3</option>
                  </select>
                )}
                
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="ml-3 text-red-500 hover:text-red-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text input for correct answer */}
      {question.type === 'text-input' && (
        <div>
          <label htmlFor="correct-answer" className="block text-sm font-medium text-gray-700 mb-1">
            Correct Answer
          </label>
          <input
            id="correct-answer"
            type="text"
            value={correctAnswer as string || ''}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Enter the correct answer"
          />
          <p className="mt-1 text-sm text-gray-500">
            For multiple acceptable answers, separate them with commas.
          </p>
        </div>
      )}

      {/* Explanations for all question types */}
      <div>
        <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-1">
          Explanation (Shown after correct answer)
        </label>
        <textarea
          id="explanation"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          rows={3}
          placeholder="Explain why the correct answer is correct"
        />
      </div>

      <div>
        <label htmlFor="incorrect-explanation" className="block text-sm font-medium text-gray-700 mb-1">
          Incorrect Explanation (Shown after wrong answer)
        </label>
        <textarea
          id="incorrect-explanation"
          value={incorrect_explanation}
          onChange={(e) => setIncorrectExplanation(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          rows={3}
          placeholder="Provide guidance for incorrect answers"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-primary text-white font-medium rounded-lg shadow transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
        >
          Save Question
        </button>
      </div>
    </div>
  );
}
