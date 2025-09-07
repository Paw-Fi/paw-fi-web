import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLightbulb, faArrowRight, faCheckCircle, faTrendingUp, faExclamationTriangle, faInfoCircle } from '@fortawesome/free-solid-svg-icons'

interface CalculatorResultsProps {
  title?: string
  results: Array<{
    label: string
    value: string | number
    explanation?: string
    comparison?: string
    status?: 'good' | 'warning' | 'excellent' | 'poor'
  }>
  nextSteps?: string[]
  insights?: string[]
  recommendations?: Array<{
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
  }>
  className?: string
}

interface ComparisonInsightProps {
  title: string
  userValue: string
  comparison: string
  interpretation: string
  status: 'good' | 'warning' | 'excellent' | 'poor'
  className?: string
}

// Enhanced Calculator Results Component
export function CalculatorResults({ 
  title = "Your Results",
  results,
  nextSteps = [],
  insights = [],
  recommendations = [],
  className = "" 
}: CalculatorResultsProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
      case 'good': return 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
      case 'poor': return 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
      default: return 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'excellent': return faCheckCircle
      case 'good': return faTrendingUp
      case 'warning': return faExclamationTriangle
      case 'poor': return faExclamationTriangle
      default: return faInfoCircle
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg ${className}`}>
      <h3 className="text-2xl font-bold text-foreground dark:text-dark-foreground mb-6">{title}</h3>
      
      {/* Results Grid */}
      <div className="space-y-4 mb-8">
        {results.map((result, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-foreground dark:text-dark-foreground">
                {result.label}
              </span>
              <div className="flex items-center gap-2">
                {result.status && (
                  <FontAwesomeIcon 
                    icon={getStatusIcon(result.status)} 
                    className={`w-4 h-4 ${getStatusColor(result.status).split(' ')[0]}`} 
                  />
                )}
                <span className="text-xl font-bold text-foreground dark:text-dark-foreground">
                  {result.value}
                </span>
              </div>
            </div>
            {result.explanation && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {result.explanation}
              </p>
            )}
            {result.comparison && (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {result.comparison}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5 text-yellow-500" />
            <h4 className="text-lg font-semibold text-foreground dark:text-dark-foreground">Key Insights</h4>
          </div>
          <ul className="space-y-2">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-3">
                <FontAwesomeIcon 
                  icon={faCheckCircle} 
                  className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" 
                />
                <span className="text-gray-700 dark:text-gray-300 text-sm">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-foreground dark:text-dark-foreground mb-3">Recommendations</h4>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg border-l-4 ${
                  rec.priority === 'high' 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : rec.priority === 'medium' 
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-1 text-xs rounded font-semibold ${
                    rec.priority === 'high' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                      : rec.priority === 'medium' 
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {rec.priority} priority
                  </span>
                  <h5 className="font-semibold text-foreground dark:text-dark-foreground">{rec.title}</h5>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{rec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      {nextSteps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5 text-green-500" />
            <h4 className="text-lg font-semibold text-foreground dark:text-dark-foreground">Next Steps</h4>
          </div>
          <ol className="space-y-2">
            {nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5 flex-shrink-0">
                  {index + 1}
                </div>
                <span className="text-gray-700 dark:text-gray-300 text-sm">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

// Comparison Insight Component for contextual analysis
export function ComparisonInsight({ 
  title, 
  userValue, 
  comparison, 
  interpretation, 
  status,
  className = "" 
}: ComparisonInsightProps) {
  const statusColors = {
    excellent: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    good: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    poor: 'border-red-500 bg-red-50 dark:bg-red-900/20'
  }

  const statusIcons = {
    excellent: faCheckCircle,
    good: faTrendingUp,
    warning: faExclamationTriangle,
    poor: faExclamationTriangle
  }

  const statusTextColors = {
    excellent: 'text-green-600 dark:text-green-400',
    good: 'text-blue-600 dark:text-blue-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    poor: 'text-red-600 dark:text-red-400'
  }

  return (
    <div className={`p-4 rounded-lg border-l-4 ${statusColors[status]} ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-foreground dark:text-dark-foreground">{title}</h4>
        <FontAwesomeIcon 
          icon={statusIcons[status]} 
          className={`w-5 h-5 ${statusTextColors[status]}`} 
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Your Value:</span>
          <p className="font-semibold text-foreground dark:text-dark-foreground">{userValue}</p>
        </div>
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Comparison:</span>
          <p className={`font-semibold ${statusTextColors[status]}`}>{comparison}</p>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{interpretation}</p>
    </div>
  )
}

// Action Items Component for next steps
export function ActionItems({ 
  title = "Action Items",
  actions,
  className = "" 
}: {
  title?: string
  actions: Array<{
    action: string
    priority: 'high' | 'medium' | 'low'
    timeframe: string
    description?: string
  }>
  className?: string
}) {
  const priorityColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  }

  return (
    <div className={`bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg ${className}`}>
      <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground mb-4">{title}</h3>
      <div className="space-y-4">
        {actions.map((action, index) => (
          <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`px-2 py-1 text-xs rounded font-semibold ${priorityColors[action.priority]}`}>
                {action.priority} priority
              </span>
              <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                {action.timeframe}
              </span>
            </div>
            <h4 className="font-semibold text-foreground dark:text-dark-foreground mb-1">
              {action.action}
            </h4>
            {action.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {action.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}