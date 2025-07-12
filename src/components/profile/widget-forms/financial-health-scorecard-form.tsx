import React, { useState, useEffect, useCallback } from 'react';
import { IFinancialHealthScorecardWidget, IFinancialHealthScorecardData } from '../types/dashboard-data.typings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, type SelectOption } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPlus, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

interface FinancialHealthScorecardFormProps {
  data: IFinancialHealthScorecardWidget;
  onDataChange: (data: IFinancialHealthScorecardWidget) => void;
}

// Define quiz field structure for the form
interface QuizField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder: string;
  options?: string[];
  selectOptions?: SelectOption[];
}

// Helper function to convert string options to SelectOption[] format
const createSelectOptions = (options: string[]): SelectOption[] => {
  return options.map(option => ({
    value: option,
    label: option
  }));
};

// Sample quiz questions fields relevant to financial health
const quizFields: QuizField[] = [
  { id: 'savingsRate', label: 'Monthly Savings Rate (%)', type: 'number', placeholder: 'e.g. 15' },
  { id: 'emergencyFundMonths', label: 'Emergency Fund (months of expenses)', type: 'number', placeholder: 'e.g. 3' },
  { id: 'debtToIncomeRatio', label: 'Debt-to-Income Ratio (%)', type: 'number', placeholder: 'e.g. 30' },
  { id: 'creditScore', label: 'Credit Score', type: 'number', placeholder: 'e.g. 750' },
  { id: 'retirementContributions', label: 'Retirement Contributions (% of income)', type: 'number', placeholder: 'e.g. 10' },
  { 
    id: 'budgetAdherence', 
    label: 'Budget Adherence', 
    type: 'select', 
    placeholder: 'Select budget adherence level', 
    options: ['Excellent', 'Good', 'Fair', 'Poor', 'Not tracking'],
    selectOptions: createSelectOptions(['Excellent', 'Good', 'Fair', 'Poor', 'Not tracking'])
  },
  { 
    id: 'insuranceCoverage', 
    label: 'Insurance Coverage', 
    type: 'select', 
    placeholder: 'Select coverage level', 
    options: ['Complete', 'Partial', 'Minimal', 'None'],
    selectOptions: createSelectOptions(['Complete', 'Partial', 'Minimal', 'None'])
  },
  { 
    id: 'estatePlanning', 
    label: 'Estate Planning Status', 
    type: 'select', 
    placeholder: 'Select planning status', 
    options: ['Complete', 'In Progress', 'Not Started'],
    selectOptions: createSelectOptions(['Complete', 'In Progress', 'Not Started'])
  },
  { 
    id: 'taxStrategy', 
    label: 'Tax Strategy', 
    type: 'select', 
    placeholder: 'Select tax strategy', 
    options: ['Optimized', 'Basic', 'None'],
    selectOptions: createSelectOptions(['Optimized', 'Basic', 'None'])
  },
  { 
    id: 'financialKnowledge', 
    label: 'Financial Knowledge', 
    type: 'select', 
    placeholder: 'Select knowledge level', 
    options: ['Advanced', 'Intermediate', 'Basic', 'Minimal'],
    selectOptions: createSelectOptions(['Advanced', 'Intermediate', 'Basic', 'Minimal'])
  },
];

export function FinancialHealthScorecardForm({ data: widgetDataProp, onDataChange }: FinancialHealthScorecardFormProps) {
  const [quizAnswers, setQuizAnswers] = useState<{[key: string]: any}>(widgetDataProp.data.quizAnswers || {});
  const [showIndividualScores, setShowIndividualScores] = useState<boolean>(widgetDataProp.data.showIndividualScores !== false);
  const [widgetTitle, setWidgetTitle] = useState<string>(widgetDataProp.title);

  useEffect(() => {
    setQuizAnswers(widgetDataProp.data.quizAnswers || {});
    setShowIndividualScores(widgetDataProp.data.showIndividualScores !== false);
    setWidgetTitle(widgetDataProp.title);
  }, [widgetDataProp]);

  const handleQuizAnswerChange = (fieldId: string, value: any) => {
    const newQuizAnswers = { ...quizAnswers, [fieldId]: value };
    setQuizAnswers(newQuizAnswers);
    triggerDataChange(newQuizAnswers, showIndividualScores, widgetTitle);
  };

  const handleShowIndividualScoresChange = (checked: boolean) => {
    setShowIndividualScores(checked);
    triggerDataChange(quizAnswers, checked, widgetTitle);
  };
  
  const handleTitleChange = (newTitle: string) => {
    setWidgetTitle(newTitle);
    triggerDataChange(quizAnswers, showIndividualScores, newTitle);
  };

  const triggerDataChange = useCallback((updatedQuizAnswers: {[key: string]: any}, updatedShowScores: boolean, updatedTitle: string) => {
    const newWidgetData: IFinancialHealthScorecardWidget = {
      ...widgetDataProp,
      title: updatedTitle,
      data: {
        showIndividualScores: updatedShowScores,
        quizAnswers: updatedQuizAnswers,
        // Note: We no longer provide pre-computed scores, status, or items.
        // These will be calculated by the widget itself from the raw quiz answers.
      } as IFinancialHealthScorecardData,
    };
    onDataChange(newWidgetData);
  }, [widgetDataProp, onDataChange])

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
      
      <div className="p-4 border rounded-md space-y-4 bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center">
          <FontAwesomeIcon icon={faInfoCircle} className="mr-2 text-blue-500" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Enter financial information below. The widget will automatically calculate your financial health score based on these inputs.
          </p>
        </div>

        <div className="space-y-4">
          {quizFields.map((field) => (
            <div key={field.id} className="space-y-1">
              <Label htmlFor={`fhs-${field.id}`}>{field.label}</Label>
              {field.type === 'select' ? (
                <div>
                  <Select 
                    value={quizAnswers[field.id] || ''}
                    onValueChange={(value) => handleQuizAnswerChange(field.id, value)}
                    options={field.selectOptions || []}
                  >
                    <SelectTrigger id={`fhs-${field.id}`} className="mt-1">
                      <SelectValue>
                        {quizAnswers[field.id] || ''}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Input
                  id={`fhs-${field.id}`}
                  type={field.type}
                  value={quizAnswers[field.id] || ''}
                  onChange={(e) => handleQuizAnswerChange(field.id, 
                    field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
                  )}
                  placeholder={field.placeholder}
                  className="mt-1"
                />
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-md bg-blue-50 dark:bg-blue-900/20">
        <h4 className="text-md font-semibold text-blue-700 dark:text-blue-300 mb-2">How This Widget Works</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This widget calculates your financial health score based on the inputs you provide above. 
          The score is calculated automatically using industry standard criteria for savings rate, 
          emergency fund adequacy, debt management, and other financial metrics. 
          The more complete your information, the more accurate your score will be.
        </p>
      </div>
    </div>
  );
}
