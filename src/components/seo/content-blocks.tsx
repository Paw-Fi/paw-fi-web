import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLightbulb, faInfoCircle, faCheckCircle, faChartLine, faBolt, faGraduationCap } from '@fortawesome/free-solid-svg-icons'

interface KeyTakeawayProps {
  title?: string
  points: string[]
  icon?: any
  className?: string
}

interface QuickFactProps {
  title?: string
  facts: Array<{
    label: string
    value: string
    description?: string
  }>
  className?: string
}

interface AtAGlanceProps {
  title?: string
  items: Array<{
    category: string
    details: string
  }>
  className?: string
}

interface FinancialTipProps {
  title?: string
  tips: string[]
  level?: 'beginner' | 'intermediate' | 'advanced'
  className?: string
}

// Key Takeaways Component - AI-optimized bullet points
export function KeyTakeaways({ 
  title = "Key Takeaways", 
  points, 
  icon = faLightbulb,
  className = "" 
}: KeyTakeawayProps) {
  return (
    <div className={`bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500 text-white rounded-lg">
          <FontAwesomeIcon icon={icon} className="w-5 h-5" />
        </div>
        <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">{title}</h3>
      </div>
      <ul className="space-y-3">
        {points.map((point, index) => (
          <li key={index} className="flex items-start gap-3">
            <FontAwesomeIcon 
              icon={faCheckCircle} 
              className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" 
            />
            <span className="text-foreground dark:text-dark-foreground leading-relaxed">
              {point}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Quick Facts Component - AI-friendly data points
export function QuickFacts({ 
  title = "Quick Facts", 
  facts, 
  className = "" 
}: QuickFactProps) {
  return (
    <div className={`bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-500 text-white rounded-lg">
          <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5" />
        </div>
        <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">{title}</h3>
      </div>
      <div className="grid gap-4">
        {facts.map((fact, index) => (
          <div key={index} className="border-l-4 border-green-500 pl-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold text-foreground dark:text-dark-foreground">
                {fact.label}:
              </span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {fact.value}
              </span>
            </div>
            {fact.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {fact.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// At a Glance Component - Summary information
export function AtAGlance({ 
  title = "At a Glance", 
  items, 
  className = "" 
}: AtAGlanceProps) {
  return (
    <div className={`bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-500 text-white rounded-lg">
          <FontAwesomeIcon icon={faBolt} className="w-5 h-5" />
        </div>
        <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">{title}</h3>
      </div>
      <div className="grid gap-3">
        {items.map((item, index) => (
          <div key={index} className="flex flex-col sm:flex-row sm:gap-4">
            <span className="font-semibold text-purple-600 dark:text-purple-400 sm:w-1/3">
              {item.category}:
            </span>
            <span className="text-foreground dark:text-dark-foreground sm:w-2/3">
              {item.details}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Financial Tips Component - Educational content
export function FinancialTips({ 
  title = "Pro Tips", 
  tips, 
  level = 'beginner',
  className = "" 
}: FinancialTipProps) {
  const levelColors = {
    beginner: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800',
    intermediate: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800',
    advanced: 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-800'
  }

  const levelIcons = {
    beginner: faGraduationCap,
    intermediate: faChartLine,
    advanced: faBolt
  }

  return (
    <div className={`bg-gradient-to-r ${levelColors[level]} p-6 rounded-xl border ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-500 text-white rounded-lg">
          <FontAwesomeIcon icon={levelIcons[level]} className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">{title}</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
            {level} Level
          </span>
        </div>
      </div>
      <ul className="space-y-3">
        {tips.map((tip, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5 flex-shrink-0">
              {index + 1}
            </div>
            <span className="text-foreground dark:text-dark-foreground leading-relaxed">
              {tip}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Comparison Block Component - Side-by-side comparisons
export function ComparisonBlock({ 
  title = "Comparison", 
  leftTitle, 
  rightTitle, 
  comparisons, 
  className = "" 
}: {
  title?: string
  leftTitle: string
  rightTitle: string
  comparisons: Array<{
    category: string
    left: string
    right: string
  }>
  className?: string
}) {
  return (
    <div className={`bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 p-6 rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}>
      <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground mb-6 text-center">{title}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Header */}
        <div className="font-semibold text-center text-gray-600 dark:text-gray-400">Category</div>
        <div className="font-semibold text-center text-blue-600 dark:text-blue-400">{leftTitle}</div>
        <div className="font-semibold text-center text-green-600 dark:text-green-400">{rightTitle}</div>
        
        {/* Comparison rows */}
        {comparisons.map((comparison, index) => (
          <React.Fragment key={index}>
            <div className="font-medium text-foreground dark:text-dark-foreground text-center md:text-left">
              {comparison.category}
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              {comparison.left}
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              {comparison.right}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}