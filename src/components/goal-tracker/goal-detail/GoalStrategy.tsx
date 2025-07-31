import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faLightbulb,
  faRobot,
  faChevronDown,
  faChevronUp,
  faBookOpen,
  faCheckCircle,
  faArrowRight,
  faBullseye,
  faChartLine,
  faShieldAlt,
  faDollarSign,
  faCalendarAlt,
  faPercent,
  faCopy,
  faDownload,
  faPrint,
  faQuoteLeft,
  faInfoCircle,
  faStar,
  faPlay
} from "@fortawesome/free-solid-svg-icons";
import { useState, useMemo } from "react";

interface GoalStrategyProps {
  strategy: string;
}

interface StrategySection {
  id: string;
  title: string;
  content: string;
  icon: any;
  color: string;
  bgColor: string;
  type: 'overview' | 'action' | 'tip' | 'warning' | 'calculation';
}

export function GoalStrategy({ strategy }: GoalStrategyProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Parse strategy content into structured sections
  const parsedStrategy = useMemo(() => {
    if (!strategy) return null;

    // Simple parsing logic to extract sections
    // In a real implementation, you'd have more sophisticated parsing
    const sections: StrategySection[] = [];
    
    // Look for common patterns in AI strategy responses
    const lines = strategy.split('\n').filter(line => line.trim());
    let currentSection: Partial<StrategySection> = {};
    let sectionIndex = 0;

    // Default overview section
    sections.push({
      id: 'overview',
      title: 'Strategy Overview',
      content: lines.slice(0, 3).join('\n'),
      icon: faLightbulb,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      type: 'overview'
    });

    // Extract action items (lines starting with numbers, bullets, or action words)
    const actionLines = lines.filter(line => 
      /^\d+\./.test(line.trim()) || 
      /^[-•]/.test(line.trim()) ||
      /^(start|begin|create|set|save|invest|allocate)/i.test(line.trim())
    );

    if (actionLines.length > 0) {
      sections.push({
        id: 'actions',
        title: 'Action Steps',
        content: actionLines.join('\n'),
        icon: faCheckCircle,
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        type: 'action'
      });
    }

    // Extract calculations and numbers
    const calculationLines = lines.filter(line => 
      /\$|%|\d+/.test(line) && 
      (line.includes('month') || line.includes('year') || line.includes('annual') || line.includes('target'))
    );

    if (calculationLines.length > 0) {
      sections.push({
        id: 'calculations',
        title: 'Financial Projections',
        content: calculationLines.join('\n'),
        icon: faChartLine,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        type: 'calculation'
      });
    }

    // Extract tips and recommendations
    const tipLines = lines.filter(line => 
      /tip|recommend|consider|suggest|important|note/i.test(line)
    );

    if (tipLines.length > 0) {
      sections.push({
        id: 'tips',
        title: 'Key Recommendations',
        content: tipLines.join('\n'),
        icon: faStar,
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        type: 'tip'
      });
    }

    // Extract risk warnings
    const warningLines = lines.filter(line => 
      /risk|warning|caution|careful|avoid|danger/i.test(line)
    );

    if (warningLines.length > 0) {
      sections.push({
        id: 'warnings',
        title: 'Risk Considerations',
        content: warningLines.join('\n'),
        icon: faShieldAlt,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        type: 'warning'
      });
    }

    return {
      sections,
      wordCount: strategy.split(' ').length,
      readTime: Math.ceil(strategy.split(' ').length / 200), // ~200 words per minute
      confidence: 85 // Mock confidence score
    };
  }, [strategy]);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleCopyStrategy = async () => {
    try {
      await navigator.clipboard.writeText(strategy);
      // Show success toast
    } catch (error) {
      console.error('Failed to copy strategy:', error);
    }
  };

  if (!parsedStrategy) {
    return (
      <div className="p-8 text-center">
        <FontAwesomeIcon icon={faLightbulb} className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No strategy available</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-hidden"
    >
      <div className="relative bg-gradient-to-br from-white via-white to-indigo-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-indigo-900/20 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-xl shadow-black/5 dark:shadow-black/20">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(99,102,241,0.05),transparent_60%)] dark:bg-[radial-gradient(circle_at_30%_70%,rgba(99,102,241,0.1),transparent_60%)]" />
        
        {/* Content */}
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 dark:from-indigo-400/30 dark:to-indigo-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-indigo-500/20 dark:border-indigo-400/30"
              >
                <FontAwesomeIcon
                  icon={faLightbulb}
                  className="w-7 h-7 text-indigo-600 dark:text-indigo-400"
                />
              </motion.div>
              
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-3 mb-2"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    AI Strategy
                  </h2>
                  <div className="flex items-center gap-2 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium">
                    <FontAwesomeIcon icon={faRobot} className="w-3 h-3" />
                    AI Generated
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
                >
                  <span>{parsedStrategy.wordCount} words</span>
                  <span>•</span>
                  <span>{parsedStrategy.readTime} min read</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <span>Confidence:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                      {parsedStrategy.confidence}%
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <motion.button
                onClick={handleCopyStrategy}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                title="Copy Strategy"
              >
                <FontAwesomeIcon icon={faCopy} className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </motion.button>
              
              <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
              >
                <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                <FontAwesomeIcon 
                  icon={isExpanded ? faChevronUp : faChevronDown} 
                  className="w-4 h-4" 
                />
              </motion.button>
            </div>
          </div>

          {/* Strategy Confidence Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50/50 dark:from-indigo-900/20 dark:to-blue-900/10 rounded-xl border border-indigo-200/50 dark:border-indigo-500/30 mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold text-gray-900 dark:text-white">Strategy Analysis</span>
              </div>
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {parsedStrategy.confidence}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-3">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${parsedStrategy.confidence}%` }}
                transition={{ duration: 1.5, delay: 0.8 }}
              />
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This strategy has been analyzed and optimized based on your financial profile and goal parameters.
            </p>
          </motion.div>

          {/* Strategy Sections */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {parsedStrategy.sections.map((section, index) => (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    <div className={`bg-white dark:bg-gray-700/50 rounded-xl border border-gray-200/50 dark:border-gray-600/50 overflow-hidden ${
                      selectedAction === section.id ? 'ring-2 ring-indigo-500/30' : ''
                    }`}>
                      {/* Section Header */}
                      <motion.button
                        onClick={() => toggleSection(section.id)}
                        whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
                        className="w-full p-6 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 ${section.bgColor} rounded-xl flex items-center justify-center`}>
                            <FontAwesomeIcon icon={section.icon} className={`w-6 h-6 ${section.color}`} />
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                              {section.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                              {section.type === 'overview' ? 'Strategic overview and summary' :
                               section.type === 'action' ? 'Actionable steps to achieve your goal' :
                               section.type === 'calculation' ? 'Financial calculations and projections' :
                               section.type === 'tip' ? 'Expert recommendations and best practices' :
                               section.type === 'warning' ? 'Important risks and considerations' :
                               'Additional information'}
                            </p>
                          </div>
                        </div>

                        <motion.div
                          animate={{ rotate: expandedSections.has(section.id) ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FontAwesomeIcon 
                            icon={faChevronDown} 
                            className="w-5 h-5 text-gray-400" 
                          />
                        </motion.div>
                      </motion.button>

                      {/* Section Content */}
                      <AnimatePresence>
                        {expandedSections.has(section.id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="px-6 pb-6"
                          >
                            <div className={`p-6 ${section.bgColor} rounded-xl border border-gray-200/50 dark:border-gray-600/50`}>
                              {/* Format content based on section type */}
                              {section.type === 'action' ? (
                                <div className="space-y-4">
                                  {section.content.split('\n').map((action, actionIndex) => (
                                    <motion.div
                                      key={actionIndex}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: actionIndex * 0.1 }}
                                      className="flex items-start gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg"
                                    >
                                      <div className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                                        {actionIndex + 1}
                                      </div>
                                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {action.replace(/^\d+\.|\-|\•/, '').trim()}
                                      </p>
                                    </motion.div>
                                  ))}
                                </div>
                              ) : section.type === 'calculation' ? (
                                <div className="space-y-3">
                                  {section.content.split('\n').map((calc, calcIndex) => (
                                    <motion.div
                                      key={calcIndex}
                                      initial={{ opacity: 0, scale: 0.98 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: calcIndex * 0.1 }}
                                      className="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg"
                                    >
                                      <FontAwesomeIcon icon={faDollarSign} className="w-4 h-4 text-purple-600" />
                                      <p className="text-gray-700 dark:text-gray-300 font-medium">
                                        {calc}
                                      </p>
                                    </motion.div>
                                  ))}
                                </div>
                              ) : (
                                <div className="prose prose-gray dark:prose-invert max-w-none">
                                  {section.content.split('\n').map((paragraph, pIndex) => (
                                    <motion.p
                                      key={pIndex}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: pIndex * 0.1 }}
                                      className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 last:mb-0"
                                    >
                                      {paragraph}
                                    </motion.p>
                                  ))}
                                </div>
                              )}

                              {/* Action Button for Action Sections */}
                              {section.type === 'action' && (
                                <motion.button
                                  onClick={() => setSelectedAction(section.id)}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
                                >
                                  <FontAwesomeIcon icon={faPlay} className="w-3 h-3" />
                                  Start This Phase
                                </motion.button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Summary (when collapsed) */}
          <AnimatePresence>
            {!isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="p-6 bg-gradient-to-r from-gray-50 to-indigo-50/50 dark:from-gray-700/50 dark:to-indigo-900/20 rounded-xl border border-gray-200/50 dark:border-gray-600/50"
              >
                <div className="flex items-start gap-4">
                  <FontAwesomeIcon icon={faQuoteLeft} className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mt-1" />
                  <div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                      {strategy.split('\n')[0]}...
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>{parsedStrategy.sections.length} sections</span>
                      <span>•</span>
                      <span>{parsedStrategy.wordCount} words</span>
                      <span>•</span>
                      <span>Click expand to view full strategy</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}