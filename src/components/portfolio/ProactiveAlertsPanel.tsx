import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faLightbulb,
  faShieldAlt,
  faUpLong,
  faInfoCircle,
  faCheckCircle,
  faTimes,
  faEye,
  faEyeSlash,
  faClock,
  faChartLine
} from '@fortawesome/free-solid-svg-icons';

interface ProactiveAlert {
  id: string;
  type: 'risk_alert' | 'opportunity' | 'goal_progress' | 'market_insight' | 'behavioral_coaching' | 'crisis_support';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  detailed_explanation: string;
  actionable: boolean;
  action_text?: string;
  action_url?: string;
  confidence_score: number;
  expires_at?: string;
  created_at: string;
  intervention_data?: {
    trigger_event: string;
    user_context: any;
    recommended_actions: string[];
    educational_content?: {
      key_concepts: string[];
      learning_opportunities: string[];
    };
  };
  transparency?: {
    reasoning_chain: string[];
    data_sources: string[];
    alternative_options: any[];
  };
}

interface ProactiveAlertsPanelProps {
  alerts?: ProactiveAlert[];
  userId?: string;
  goalId?: string;
  userPreferences?: any;
  onAlertAction?: (alertId: string, action: string) => void;
  onAlertDismiss?: (alertId: string) => void;
}

export const ProactiveAlertsPanel: React.FC<ProactiveAlertsPanelProps> = ({
  alerts = [],
  userId,
  goalId,
  userPreferences,
  onAlertAction,
  onAlertDismiss
}) => {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // Filter and sort alerts
  const activeAlerts = alerts
    .filter(alert => !dismissedAlerts.has(alert.id))
    .filter(alert => !alert.expires_at || new Date(alert.expires_at) > new Date())
    .sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

  const displayedAlerts = showAllAlerts ? activeAlerts : activeAlerts.slice(0, 3);

  const getAlertIcon = (type: string, priority: string) => {
    switch (type) {
      case 'risk_alert':
        return priority === 'urgent' ? faExclamationTriangle : faShieldAlt;
      case 'opportunity':
        return faLightbulb;
      case 'goal_progress':
        return faChartLine;
      case 'market_insight':
        return faUpLong;
      case 'behavioral_coaching':
        return faInfoCircle;
      case 'crisis_support':
        return faExclamationTriangle;
      default:
        return faInfoCircle;
    }
  };

  const getAlertColor = (type: string, priority: string) => {
    if (priority === 'urgent') return 'text-red-600 bg-red-50 border-red-200';
    
    switch (type) {
      case 'risk_alert':
        return priority === 'high' 
          ? 'text-orange-600 bg-orange-50 border-orange-200'
          : 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'opportunity':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'goal_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'market_insight':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'behavioral_coaching':
        return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'crisis_support':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleAlertDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    onAlertDismiss?.(alertId);
  };

  const handleAlertAction = (alertId: string, action: string) => {
    onAlertAction?.(alertId, action);
  };

  const toggleAlertExpansion = (alertId: string) => {
    setExpandedAlert(expandedAlert === alertId ? null : alertId);
  };

  if (activeAlerts.length === 0) {
    return (
      <div className="text-center py-8">
        <FontAwesomeIcon 
          icon={faCheckCircle} 
          className="text-4xl text-green-500 mb-4" 
        />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          All Clear!
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          No alerts at this time. Your portfolio is being monitored 24/7.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FontAwesomeIcon icon={faShieldAlt} className="text-blue-600" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {activeAlerts.length} Active Alert{activeAlerts.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {activeAlerts.length > 3 && (
          <button
            onClick={() => setShowAllAlerts(!showAllAlerts)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <FontAwesomeIcon icon={showAllAlerts ? faEyeSlash : faEye} />
            <span>{showAllAlerts ? 'Show Less' : `Show All (${activeAlerts.length})`}</span>
          </button>
        )}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        <AnimatePresence>
          {displayedAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`border rounded-lg p-4 ${getAlertColor(alert.type, alert.priority)}`}
            >
              {/* Alert Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <FontAwesomeIcon 
                    icon={getAlertIcon(alert.type, alert.priority)} 
                    className="text-lg mt-1" 
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-sm">{alert.title}</h4>
                      
                      {/* Priority Badge */}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        alert.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        alert.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {alert.priority.toUpperCase()}
                      </span>

                      {/* Confidence Score */}
                      {alert.confidence_score && (
                        <span className="text-xs opacity-75">
                          {Math.round(alert.confidence_score * 100)}% confidence
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm opacity-90 mb-2">{alert.description}</p>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {expandedAlert === alert.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 space-y-3"
                        >
                          {/* Detailed Explanation */}
                          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                            <h5 className="font-medium text-sm mb-2">Detailed Analysis:</h5>
                            <p className="text-sm opacity-90">{alert.detailed_explanation}</p>
                          </div>

                          {/* Transparency Information */}
                          {alert.transparency && (
                            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                              <h5 className="font-medium text-sm mb-2">AI Reasoning:</h5>
                              <ul className="text-sm space-y-1">
                                {alert.transparency.reasoning_chain.map((reason, idx) => (
                                  <li key={idx} className="flex items-start space-x-2">
                                    <span className="text-xs opacity-60 mt-1">{idx + 1}.</span>
                                    <span className="opacity-90">{reason}</span>
                                  </li>
                                ))}
                              </ul>
                              
                              {alert.transparency.data_sources.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-current/20">
                                  <span className="text-xs opacity-75">
                                    Data sources: {alert.transparency.data_sources.join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Educational Content */}
                          {alert.intervention_data?.educational_content && (
                            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                              <h5 className="font-medium text-sm mb-2">Learn More:</h5>
                              <div className="space-y-2">
                                {alert.intervention_data.educational_content.key_concepts.length > 0 && (
                                  <div>
                                    <span className="text-xs font-medium opacity-75">Key Concepts:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {alert.intervention_data.educational_content.key_concepts.map((concept, idx) => (
                                        <span key={idx} className="text-xs bg-white/70 px-2 py-1 rounded-full">
                                          {concept}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 mt-3">
                      {alert.actionable && alert.action_text && (
                        <button
                          onClick={() => handleAlertAction(alert.id, 'primary')}
                          className="text-xs bg-current/20 hover:bg-current/30 px-3 py-1 rounded-full font-medium transition-colors"
                        >
                          {alert.action_text}
                        </button>
                      )}
                      
                      <button
                        onClick={() => toggleAlertExpansion(alert.id)}
                        className="text-xs opacity-75 hover:opacity-100 transition-opacity"
                      >
                        {expandedAlert === alert.id ? 'Show Less' : 'Learn More'}
                      </button>

                      {/* Time Indicator */}
                      {alert.expires_at && (
                        <div className="flex items-center space-x-1 text-xs opacity-60 ml-auto">
                          <FontAwesomeIcon icon={faClock} />
                          <span>
                            Expires {new Date(alert.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={() => handleAlertDismiss(alert.id)}
                  className="text-current/60 hover:text-current/80 transition-colors ml-2"
                  title="Dismiss alert"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-sm" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          AI monitoring active 24/7 • Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default ProactiveAlertsPanel;
