'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowRight, faCircleCheck, faCircleExclamation, 
  faCircleQuestion, faHandshake
} from '@fortawesome/free-solid-svg-icons';
import { 
  IFinancialHealthScorecardWidget, 
  INextBestActionWidget,
  IDebtVisualizerWidget,
  IRetirementReadinessWidget,
  IEnhancedSavingsGoalsWidget,
  IInsuranceCoverageWidget
} from '../types/dashboard-data.typings';
import { Widget } from './Widget';

// Financial Health Scorecard Widget
export function FinancialHealthScorecardWidget({ widget }: { widget: IFinancialHealthScorecardWidget }) {
  const { data } = widget;
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  return (
    <Widget widget={widget}>
      <div className="flex flex-col items-center">
        <div className="relative w-24 h-24 mb-3">
          <svg className="w-full h-full" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="2"
              strokeDasharray="100, 100"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#4F46E5"
              strokeWidth="2"
              strokeDasharray={`${data.score}, 100`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-2xl font-bold text-gray-800 dark:text-white">{data.score}</div>
          </div>
        </div>
        
        <div className={`font-medium mb-1 ${getScoreColor(data.score)}`}>
          {data.status}
        </div>
        
        <div className="text-sm text-center text-gray-600 dark:text-gray-300">
          {data.explanation}
        </div>
      </div>
    </Widget>
  );
}

// Next Best Action Widget
export function NextBestActionWidget({ widget }: { widget: INextBestActionWidget }) {
  const { data } = widget;
  
  return (
    <Widget widget={widget}>
      <div className="flex flex-col">
        <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          {data.message}
        </div>
        
        {data.callToAction && (
          <button className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
            {data.callToAction}
            <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-3 w-3" />
          </button>
        )}
      </div>
    </Widget>
  );
}

// Debt Visualizer Widget
export function DebtVisualizerWidget({ widget }: { widget: IDebtVisualizerWidget }) {
  const { data, strategy } = widget;
  
  // Sort debts based on strategy (snowball = balance, avalanche = interest rate)
  const sortedDebts = [...data].sort((a, b) => {
    if (strategy === 'snowball') {
      return a.currentBalance - b.currentBalance;
    }
    return b.interestRate - a.interestRate;
  });
  
  const totalOriginalBalance = data.reduce((sum, debt) => sum + debt.originalBalance, 0);
  const totalCurrentBalance = data.reduce((sum, debt) => sum + debt.currentBalance, 0);
  const totalPaid = totalOriginalBalance - totalCurrentBalance;
  const progressPercentage = (totalPaid / totalOriginalBalance) * 100;
  
  return (
    <Widget widget={widget}>
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Debt</div>
            <div className="text-xl font-bold text-gray-800 dark:text-white">
              ${totalCurrentBalance.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Progress</div>
            <div className="text-xl font-bold text-green-500">
              {progressPercentage.toFixed(1)}%
            </div>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        <div className="space-y-3">
          {sortedDebts.map((debt, index) => {
            const progress = (debt.originalBalance - debt.currentBalance) / debt.originalBalance * 100;
            
            return (
              <div key={index} className="border-b border-gray-100 dark:border-gray-700/30 pb-3 last:border-0">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {debt.name}
                    </span>
                    {index === 0 && strategy === 'snowball' && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Focus
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-white">
                    ${debt.currentBalance.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{debt.interestRate}% APR</span>
                  <span>Payoff: {debt.payoffDate}</span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="bg-primary h-1.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Widget>
  );
}

// Retirement Readiness Widget
export function RetirementReadinessWidget({ widget }: { widget: IRetirementReadinessWidget }) {
  const { data } = widget;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ahead': return 'text-green-500';
      case 'On Track': return 'text-blue-500';
      case 'Behind': return 'text-yellow-500';
      default: return 'text-red-500';
    }
  };
  
  return (
    <Widget widget={widget}>
      <div className="flex flex-col">
        <div className="flex items-center mb-3">
          <div className="relative w-16 h-16 mr-4">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="2"
                strokeDasharray="100, 100"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#4F46E5"
                strokeWidth="2"
                strokeDasharray={`${data.score}, 100`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-lg font-bold text-gray-800 dark:text-white">{data.score}</div>
            </div>
          </div>
          
          <div>
            <div className={`font-medium ${getStatusColor(data.status)}`}>
              {data.status}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Projected: ${(data.projectionAmount / 1000000).toFixed(1)}M by {data.projectionDate}
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          {data.explanation}
        </div>
      </div>
    </Widget>
  );
}

// Enhanced Savings Goals Widget
export function EnhancedSavingsGoalsWidget({ widget }: { widget: IEnhancedSavingsGoalsWidget }) {
  const { data } = widget;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ahead': return 'text-green-500';
      case 'On Track': return 'text-blue-500';
      default: return 'text-yellow-500';
    }
  };
  
  return (
    <Widget widget={widget}>
      <div className="space-y-4">
        {data.map((goal, index) => {
          const progress = (goal.savedAmount / goal.targetAmount) * 100;
          
          return (
            <div key={index} className="border-b border-gray-100 dark:border-gray-700/30 pb-3 last:border-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {goal.name}
                </span>
                <span className={`text-xs font-medium ${getStatusColor(goal.status)}`}>
                  {goal.status}
                </span>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>${goal.savedAmount.toLocaleString()} of ${goal.targetAmount.toLocaleString()}</span>
                <span>Est. completion: {goal.estimatedCompletionDate}</span>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                    goal.status === 'Behind' ? 'bg-yellow-500' : 'bg-primary'
                  }`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}

// Insurance Coverage Widget
export function InsuranceCoverageWidget({ widget }: { widget: IInsuranceCoverageWidget }) {
  const { data } = widget;
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Adequate': 
        return <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4 text-green-500" />;
      case 'Potential Gap': 
        return <FontAwesomeIcon icon={faCircleExclamation} className="h-4 w-4 text-yellow-500" />;
      default: 
        return <FontAwesomeIcon icon={faCircleQuestion} className="h-4 w-4 text-blue-500" />;
    }
  };
  
  return (
    <Widget widget={widget}>
      <div className="space-y-3">
        {data.map((insurance, index) => (
          <div 
            key={index} 
            className="flex items-start space-x-3 pb-3 border-b border-gray-100 dark:border-gray-700/30 last:border-0"
          >
            <div className="mt-0.5">
              {getStatusIcon(insurance.status)}
            </div>
            <div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {insurance.type}
                </span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {insurance.status}
                </span>
              </div>
              
              {insurance.suggestion && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {insurance.suggestion}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Widget>
  );
}
