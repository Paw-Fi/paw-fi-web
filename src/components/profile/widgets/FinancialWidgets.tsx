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
  const { data, showIndividualScores } = widget;

  const getStatusColor = (status?: string) => {
    if (!status) return 'text-gray-500 dark:text-gray-400';
    switch (status.toLowerCase()) {
      case 'excellent': return 'text-green-500 dark:text-green-400';
      case 'good': return 'text-blue-500 dark:text-blue-400';
      case 'fair': return 'text-yellow-500 dark:text-yellow-400';
      case 'needs improvement': return 'text-orange-500 dark:text-orange-400';
      case 'poor': return 'text-red-500 dark:text-red-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  if (!data) {
    return <Widget widget={widget} controls={widget.controls}><div className="p-4 text-sm text-slate-500 dark:text-slate-400">No financial health data available.</div></Widget>;
  }

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="flex flex-col p-1">
        <div className="flex items-center mb-3 justify-center">
          <div className="relative w-20 h-20 mr-4 shrink-0 translate-x-1/2">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${data.overallScore}, 100`}
                className={`transform -rotate-90 origin-center transition-all duration-1000 ease-out ${getStatusColor(data.overallStatus)}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{data.overallScore}</div>
            </div>
          </div>
          <div className="translate-x-1/2">
            <div className={`text-xl font-semibold ${getStatusColor(data.overallStatus)}`}>
              {data.overallStatus}
            </div>
            {/* Individual item explanations are shown below, no overallExplanation here */}
          </div>
        </div>

        {showIndividualScores && data.items && data.items.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 w-full">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Score Breakdown:</h4>
            <ul className="space-y-2">
              {data.items.map((item) => (
                <li key={item.id} className="text-xs p-2 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.category}</span>
                    <span className={`font-semibold ${getStatusColor(item.status)}`}>{item.score}/100</span>
                  </div>
                  {item.explanation && <p className="mt-1 text-slate-500 dark:text-slate-400 text-[11px]">{item.explanation}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Widget>
  );
}

// Next Best Action Widget
export function NextBestActionWidget({ widget }: { widget: INextBestActionWidget }) {
  const { data: actionsData, title, icon, maxDisplayItems, filterByPriority } = widget;

  const actionsToDisplay = useMemo(() => {
    if (!actionsData || !Array.isArray(actionsData)) return [];

    let filteredActions = [...actionsData];

    // Only filter if filterByPriority is one of the valid priorities
    if (filterByPriority && ['low', 'medium', 'high', 'urgent'].includes(filterByPriority as string)) {
      filteredActions = filteredActions.filter(action => action.priority === filterByPriority);
    }
    
    // Sort by displayOrder before slicing
    filteredActions.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    if (maxDisplayItems && maxDisplayItems > 0) {
      return filteredActions.slice(0, maxDisplayItems);
    }

    return filteredActions;
  }, [actionsData, maxDisplayItems, filterByPriority]);

  if (!actionsToDisplay || actionsToDisplay.length === 0) {
    return <Widget widget={widget} controls={widget.controls}><div className="p-4 text-sm text-slate-500 dark:text-slate-400">No current actions.</div></Widget>;
  }

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="flex flex-col p-1 space-y-3">
        {actionsToDisplay.map((action) => (
          <div key={action.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{action.title}</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 grow">{action.message}</p>
            <div className="mt-auto">
              {action.callToAction && (
                <a 
                  href={action.actionLink || '#'}
                  target={action.actionLink && action.actionLink.startsWith('http') ? '_blank' : '_self'}
                  rel={action.actionLink && action.actionLink.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-center text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 dark:focus:ring-primary-900 transition-colors duration-150 w-full sm:w-auto"
                >
                  {action.callToAction}
                  <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-2.5 w-2.5" />
                </a>
              )}
            </div>
          </div>
        ))}
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
    <Widget widget={widget} controls={widget.controls}>
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Debt</div>
            <div className="text-xl font-bold text-gray-800 dark:text-white">
              ${totalCurrentBalance?.toLocaleString()}
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
import { useState, useMemo } from 'react';

// ... (other imports remain the same)

// Retirement Readiness Widget
export function RetirementReadinessWidget({ widget }: { widget: IRetirementReadinessWidget }) {
  const { data: retirementData, title } = widget;
  const [selectedScenarioId, setSelectedScenarioId] = useState(retirementData.currentScenarioId);

  const currentScenario = useMemo(() => {
    return retirementData.scenarios.find(s => s.id === selectedScenarioId);
  }, [retirementData.scenarios, selectedScenarioId]);

  const getStatusColor = (status?: string) => {
    if (!status) return 'text-gray-500';
    switch (status) {
      case 'Ahead': return 'text-green-500 dark:text-green-400';
      case 'On Track': return 'text-blue-500 dark:text-blue-400';
      case 'Behind': return 'text-yellow-500 dark:text-yellow-400';
      case 'Needs Significant Work': return 'text-red-500 dark:text-red-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  if (!retirementData || !retirementData.scenarios || retirementData.scenarios.length === 0) {
    return <Widget widget={widget} controls={widget.controls}><div className="p-4 text-sm text-slate-500 dark:text-slate-400">No retirement scenarios available.</div></Widget>;
  }

  if (!currentScenario) {
    return <Widget widget={widget} controls={widget.controls}><div className="p-4 text-sm text-red-500 dark:text-red-400">Selected retirement scenario not found.</div></Widget>;
  }

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="flex flex-col p-1">
        {retirementData.scenarios.length > 1 && (
          <div className="mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
            <label htmlFor={`${widget.id}-scenario-select`} className="sr-only">Select Scenario</label>
            <select 
              id={`${widget.id}-scenario-select`}
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="w-full p-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:text-slate-200"
            >
              {retirementData.scenarios.map(scenario => (
                <option key={scenario.id} value={scenario.id}>{scenario.scenarioName}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center mb-3">
          <div className="relative w-16 h-16 mr-4 shrink-0">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${currentScenario.score}, 100`}
                className={`transform -rotate-90 origin-center transition-all duration-1000 ease-out ${getStatusColor(currentScenario.status)}`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{currentScenario.score}</div>
            </div>
          </div>
          
          <div className="flex-grow">
            <div className={`text-base font-semibold ${getStatusColor(currentScenario.status)}`}>
              {currentScenario.status}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Projected: <strong>${currentScenario.projectionAmount?.toLocaleString()}</strong> by {currentScenario.projectionDate}
            </div>
          </div>
        </div>
        
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-1">
          <p>{currentScenario.explanation}</p>
          {currentScenario.assumptions && <p><em>Assumptions: {currentScenario.assumptions}</em></p>}
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
    <Widget widget={widget} controls={widget.controls}>
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
                <span>${goal.savedAmount?.toLocaleString()} of ${goal?.targetAmount?.toLocaleString()}</span>
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
  // Handle both data structures: direct array or items property
  // This supports both the sample data format and the form component format
  const items = Array.isArray(widget.data) ? widget.data : widget.data?.items;

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="space-y-3">
        {Array.isArray(items) && items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-100">{item.type || item.policyName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.provider}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300 capitalize">
                  {item.status || item.policyType || 'Active'}
                </span>
              </div>
              <div className="mt-2 text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">Coverage</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {item.coverage ? item.coverage : 
                   (typeof item.coverageAmount === 'number' ? `$${item.coverageAmount.toLocaleString()}` : '$0')}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">No policies to display.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Click the pencil to add one.</p>
          </div>
        )}
      </div>
    </Widget>
  );
}
