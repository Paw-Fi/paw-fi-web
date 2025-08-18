import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faQuestionCircle, 
  faCog, 
  faToggleOn, 
  faToggleOff,
  faTimes,
  faInfo,
  faChartLine,
  faRefresh
} from '@fortawesome/free-solid-svg-icons';
import { dashboardGuidanceMonitor } from '@/utils/dashboard-guidance-monitor';

interface GuidanceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  trackUserAction?: (action: string, data?: any) => void;
  updatePreferences?: (preferences: any) => void;
  resetGuidanceState?: () => void;
  getGuidanceStats?: () => any;
}

export const GuidanceSettings = ({ 
  isOpen, 
  onClose, 
  trackUserAction,
  updatePreferences,
  resetGuidanceState,
  getGuidanceStats 
}: GuidanceSettingsProps) => {
  const [guidanceEnabled, setGuidanceEnabled] = useState(true);
  const [frequencyLevel, setFrequencyLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const [guidanceStats, setGuidanceStats] = useState<any>(null);

  useEffect(() => {
    if (isOpen && getGuidanceStats) {
      setGuidanceStats(getGuidanceStats());
    }
  }, [isOpen, getGuidanceStats]);

  const handleGuidanceToggle = (enabled: boolean) => {
    setGuidanceEnabled(enabled);
    if (updatePreferences) {
      updatePreferences({ guidanceEnabled: enabled });
    }
    if (trackUserAction) {
      trackUserAction('guidance_preferences_changed', { guidanceEnabled: enabled });
    }
  };

  const handleFrequencyChange = (level: 'high' | 'medium' | 'low') => {
    setFrequencyLevel(level);
    if (updatePreferences) {
      updatePreferences({ frequencyLevel: level });
    }
    if (trackUserAction) {
      trackUserAction('guidance_frequency_changed', { frequencyLevel: level });
    }
  };

  const handleReset = () => {
    if (resetGuidanceState) {
      resetGuidanceState();
      if (trackUserAction) {
        trackUserAction('guidance_state_reset');
      }
    }
  };

  const frequencyDescriptions = {
    high: 'More frequent helpful tips and guidance',
    medium: 'Balanced guidance when most beneficial',
    low: 'Minimal guidance, only for important features'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            className="fixed right-4 top-1/2 transform -translate-y-1/2 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50"
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm">
                  <FontAwesomeIcon 
                    icon={faQuestionCircle} 
                    className="h-5 w-5 text-white"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Dashboard Guidance
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Customize your learning experience
                  </p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FontAwesomeIcon
                  icon={faTimes}
                  className="h-5 w-5 text-gray-500 dark:text-gray-400"
                />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Guidance Toggle */}
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Smart Guidance
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Show contextual tips and feature introductions
                    </div>
                  </div>
                  <motion.button
                    onClick={() => handleGuidanceToggle(!guidanceEnabled)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 focus:outline-none ${
                      guidanceEnabled 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.span
                      className={`inline-block w-4 h-4 transform bg-white rounded-full shadow-lg transition-transform duration-200 ${
                        guidanceEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                      animate={{ 
                        x: guidanceEnabled ? 24 : 4,
                        scale: guidanceEnabled ? 1.1 : 1
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </label>
              </div>

              {/* Frequency Settings */}
              <AnimatePresence>
                {guidanceEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Frequency Level
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['low', 'medium', 'high'] as const).map((level) => (
                          <motion.button
                            key={level}
                            onClick={() => handleFrequencyChange(level)}
                            className={`px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                              frequencyLevel === level
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </motion.button>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {frequencyDescriptions[frequencyLevel]}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stats */}
              {guidanceStats && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <FontAwesomeIcon 
                      icon={faChartLine} 
                      className="h-4 w-4 text-blue-500"
                    />
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Your Progress
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {guidanceStats.routesVisited}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Areas Explored
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {guidanceStats.scenariosShown}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Tips Received
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reset Button */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <motion.button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FontAwesomeIcon icon={faRefresh} className="h-4 w-4" />
                  <span>Reset Guidance Progress</span>
                </motion.button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 rounded-b-2xl">
              <div className="flex items-start space-x-2">
                <FontAwesomeIcon 
                  icon={faInfo} 
                  className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0"
                />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Smart Guidance</strong> learns from your behavior and shows contextual tips when they're most helpful. You can always adjust these settings or reset your progress.
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Optional: Export a button component to trigger the settings
export const GuidanceSettingsButton = ({ 
  onOpen, 
  className = '' 
}: { 
  onOpen: () => void; 
  className?: string; 
}) => {
  return (
    <motion.button
      onClick={onOpen}
      className={`p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 group ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title="Guidance Settings"
    >
      <FontAwesomeIcon 
        icon={faQuestionCircle} 
        className="h-5 w-5 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors"
      />
    </motion.button>
  );
};