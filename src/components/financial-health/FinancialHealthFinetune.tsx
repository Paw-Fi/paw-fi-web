import React, { useState, useCallback, useRef } from 'react';
import { Widget } from '@/components/profile/types/dashboard-data.typings';
import { QuizAnswers } from './quiz-calculations'; // Assuming this type is defined elsewhere
import { useDispatch, useSelector } from 'react-redux';
import { updateWidgets } from '@/store/slices/dashboardSlice';
import { RootState } from '@/store';

// Define the finetunable parameters and their initial values
interface FinetuneParameters {
  'retirement-age': number;
  'annual-contribution': number;
  'return-rate': number; // as percentage
  'monthly-income': number;
  'monthly-expenses': number;
  'emergency-fund-months': number;
  'debt-amount-credit': number;
  'health-checkup-frequency': 'never' | 'yearly' | 'biannual' | 'asneeded';
}

interface FinancialHealthFinetuneProps {
  currentDashboardWidgets: Widget[];
  onUpdateDashboard: (widgets: Widget[]) => void;
}

// Helper function to extract initial FinetuneParameters from widgets
const extractFinetuneParameters = (widgets: Widget[]): FinetuneParameters => {
  const params: FinetuneParameters = {
    'retirement-age': 65,
    'annual-contribution': 0,
    'return-rate': 6,
    'monthly-income': 0,
    'monthly-expenses': 0,
    'emergency-fund-months': 3,
    'debt-amount-credit': 0,
    'health-checkup-frequency': 'yearly'
  };

  const financialHealthWidget = widgets.find(widget => widget.type === 'financialHealthScorecard');
  if (financialHealthWidget?.data && 'quizAnswers' in financialHealthWidget.data && financialHealthWidget.data.quizAnswers) {
    const quizAnswers = financialHealthWidget.data.quizAnswers as Record<string, any>;
    
    if (typeof quizAnswers['monthly-income'] === 'number') params['monthly-income'] = quizAnswers['monthly-income'];
    if (typeof quizAnswers['monthly-expenses'] === 'number') params['monthly-expenses'] = quizAnswers['monthly-expenses'];
    if (typeof quizAnswers['retirement-age'] === 'number') params['retirement-age'] = quizAnswers['retirement-age'];
    if (typeof quizAnswers['emergency-fund-months'] === 'number') params['emergency-fund-months'] = quizAnswers['emergency-fund-months'];
    if (typeof quizAnswers['debt-amount-credit'] === 'number') params['debt-amount-credit'] = quizAnswers['debt-amount-credit'];
    if (quizAnswers['health-checkup-frequency']) params['health-checkup-frequency'] = quizAnswers['health-checkup-frequency'];
    
    if (typeof quizAnswers['annual-contribution'] === 'number') {
      params['annual-contribution'] = quizAnswers['annual-contribution'];
    } else if (params['monthly-income'] > 0 && params['monthly-expenses'] > 0) {
      const monthlySavings = params['monthly-income'] - params['monthly-expenses'];
      if (monthlySavings > 0) params['annual-contribution'] = monthlySavings * 12;
    }
  }

  if (params['monthly-income'] === 0 || params['monthly-expenses'] === 0) {
    widgets.forEach(widget => {
      if (widget.type === 'retirementReadiness' && widget.data?.scenarios?.[0]) {
        const scenario = widget.data.scenarios[0];
        if (scenario.projectionDate && typeof scenario.projectionDate === 'string') {
          const match = scenario.projectionDate.match(/At Age (\d+)/);
          if (match?.[1]) params['retirement-age'] = parseInt(match[1], 10);
        }
      } else if (widget.type === 'quickCashFlowSummary' && widget.data) {
        if (widget.data.inflows?.[0]?.value !== undefined) params['monthly-income'] = widget.data.inflows[0].value;
        if (widget.data.outflows?.[0]?.value !== undefined) params['monthly-expenses'] = widget.data.outflows[0].value;
      }
    });
  }

  return params;
};


const FinancialHealthFinetune: React.FC<FinancialHealthFinetuneProps> = ({ currentDashboardWidgets, onUpdateDashboard }) => {
  const dispatch = useDispatch();
  const dashboardData = useSelector((state: RootState) => state.dashboard.data);
  const isUpdatingRef = useRef(false);

  const [finetuneParams, setFinetuneParams] = useState<FinetuneParameters>(() => {
    return extractFinetuneParameters(dashboardData || currentDashboardWidgets);
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const handleSliderChange = useCallback((param: keyof FinetuneParameters, value: number | string) => {
    setFinetuneParams(prev => {
      const newParams = { ...prev, [param]: value };
      
      if (!isUpdatingRef.current) {
        isUpdatingRef.current = true;
        
        const quizAnswers: QuizAnswers = {
          'retirement-age': newParams['retirement-age'],
          'annual-contribution': newParams['annual-contribution'],
          'expected-return': newParams['return-rate'] / 100,
          'monthly-income': newParams['monthly-income'],
          'monthly-expenses': newParams['monthly-expenses'],
          'emergency-fund-months': newParams['emergency-fund-months'],
          'debt-amount-credit': newParams['debt-amount-credit'],
          'health-checkup-frequency': newParams['health-checkup-frequency'],
          'current-age': 30,
          'current-assets': 50000,
          'target-retirement': 1000000,
          'debt-amount-mortgage': 200000,
          'debt-amount-student': 0,
          'debt-amount-other': 0,
          'insurance-policies': ['health', 'auto', 'home'],
        };
        
        const widgetsToUpdate = dashboardData || currentDashboardWidgets;
        const updatedWidgets = widgetsToUpdate.map(widget => {
          if (widget.type === 'financialHealthScorecard') {
            return { ...widget, data: { ...widget.data, quizAnswers } };
          }
          if (widget.type === 'retirementReadiness') {
            return { ...widget, data: { ...widget.data, quizAnswers } };
          }
          if (widget.type === 'quickCashFlowSummary') {
            return {
              ...widget,
              data: {
                ...widget.data,
                inflows: widget.data.inflows.map(inflow => ({ ...inflow, value: newParams['monthly-income'] })),
                outflows: widget.data.outflows.map(outflow => ({ ...outflow, value: newParams['monthly-expenses'] }))
              }
            };
          }
          return widget;
        });
        
        setTimeout(() => {
          dispatch(updateWidgets({ widgets: updatedWidgets, hasUnsavedChanges: false }));
          if (onUpdateDashboard) onUpdateDashboard(updatedWidgets);
          isUpdatingRef.current = false;
        }, 0);
      }
      return newParams;
    });
  }, [dispatch, onUpdateDashboard, dashboardData, currentDashboardWidgets]);

  const sliderClassName = "flex-grow custom-slider";

  return (
    <div className="p-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="space-y-2">
          <h3 className="text-md font-medium">Monthly Income</h3>
          <div className="flex items-center space-x-2">
            <input 
              type="range" 
              min="0" 
              max="20000" 
              step="100" 
              value={finetuneParams['monthly-income']} 
              onChange={(e) => handleSliderChange('monthly-income', parseInt(e.target.value, 10))} 
              className={sliderClassName}
              style={{ '--slider-progress': `${(finetuneParams['monthly-income'] / 20000) * 100}%` } as React.CSSProperties}
            />
            <span className="w-24 font-medium">{formatCurrency(finetuneParams['monthly-income'])}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Monthly Expenses</h3>
          <div className="flex items-center space-x-4">
            <input 
              type="range" 
              min="0" 
              max="20000" 
              step="100" 
              value={finetuneParams['monthly-expenses']} 
              onChange={(e) => handleSliderChange('monthly-expenses', parseInt(e.target.value, 10))} 
              className={sliderClassName}
              style={{ '--slider-progress': `${(finetuneParams['monthly-expenses'] / 20000) * 100}%` } as React.CSSProperties}
            />
            <span className="w-24 font-medium">{formatCurrency(finetuneParams['monthly-expenses'])}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Emergency Fund</h3>
          <div className="flex items-center space-x-4">
            <input 
              type="range" 
              min="0" 
              max="12" 
              step="1" 
              value={finetuneParams['emergency-fund-months']} 
              onChange={(e) => handleSliderChange('emergency-fund-months', parseInt(e.target.value, 10))} 
              className={sliderClassName}
              style={{ '--slider-progress': `${(finetuneParams['emergency-fund-months'] / 12) * 100}%` } as React.CSSProperties}
            />
            <span className="w-24 font-medium">{finetuneParams['emergency-fund-months']} months</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Credit Card Debt</h3>
          <div className="flex items-center space-x-4">
            <input 
              type="range" 
              min="0" 
              max="20000" 
              step="500" 
              value={finetuneParams['debt-amount-credit']} 
              onChange={(e) => handleSliderChange('debt-amount-credit', parseInt(e.target.value, 10))} 
              className={sliderClassName}
              style={{ '--slider-progress': `${(finetuneParams['debt-amount-credit'] / 20000) * 100}%` } as React.CSSProperties}
            />
            <span className="w-24 font-medium">{formatCurrency(finetuneParams['debt-amount-credit'])}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Health Checkup Frequency</h3>
          <div className="flex items-center space-x-4">
            <select value={finetuneParams['health-checkup-frequency']} onChange={(e) => handleSliderChange('health-checkup-frequency', e.target.value as any)} className="flex-grow p-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50">
              <option value="never">Never</option>
              <option value="asneeded">As needed</option>
              <option value="yearly">Yearly</option>
              <option value="biannual">Twice a year</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Retirement Age</h3>
          <div className="flex items-center space-x-4">
            <input 
              type="range" 
              min="55" 
              max="75" 
              step="1" 
              value={finetuneParams['retirement-age']} 
              onChange={(e) => handleSliderChange('retirement-age', parseInt(e.target.value, 10))} 
              className={sliderClassName}
              style={{ '--slider-progress': `${((finetuneParams['retirement-age'] - 55) / (75 - 55)) * 100}%` } as React.CSSProperties}
            />
            <span className="w-24 font-medium">Age {finetuneParams['retirement-age']}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Annual Retirement Contribution</h3>
          <div className="flex items-center space-x-4">
            <input 
              type="range" 
              min="0" 
              max="50000" 
              step="500" 
              value={finetuneParams['annual-contribution']} 
              onChange={(e) => handleSliderChange('annual-contribution', parseInt(e.target.value, 10))} 
              className={sliderClassName}
              style={{ '--slider-progress': `${(finetuneParams['annual-contribution'] / 50000) * 100}%` } as React.CSSProperties}
            />
            <span className="w-24 font-medium">{formatCurrency(finetuneParams['annual-contribution'])}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Expected Annual Return</h3>
          <div className="flex items-center space-x-4">
            <input 
              type="range" 
              min="1" 
              max="12" 
              step="0.5" 
              value={finetuneParams['return-rate']} 
              onChange={(e) => handleSliderChange('return-rate', parseFloat(e.target.value))} 
              className={sliderClassName}
              style={{ '--slider-progress': `${((finetuneParams['return-rate'] - 1) / (12 - 1)) * 100}%` } as React.CSSProperties}
            />
            <span className="w-24 font-medium">{finetuneParams['return-rate']}%</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FinancialHealthFinetune;